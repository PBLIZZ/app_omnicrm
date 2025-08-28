import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import {
  useAskAIAboutContact,
  useGenerateEmailSuggestion,
  useGenerateNoteSuggestions,
  useGenerateTaskSuggestions,
  useCreateContactNote,
  useCreateContactTask,
} from '../use-contact-ai-actions';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('Contact AI Actions Hooks', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('CRITICAL: useAskAIAboutContact', () => {
    it('successfully fetches AI insights for a contact', async () => {
      const mockResponse = {
        insights: 'This client shows consistent attendance patterns',
        suggestions: ['Follow up on advanced class interest'],
        nextSteps: ['Schedule consultation call'],
        confidence: 0.85,
        keyFindings: ['Regular attendee', 'High engagement'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useAskAIAboutContact(), {
        wrapper: createWrapper(),
      });

      const insights = await result.current.mutateAsync('contact-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/contacts/contact-1/ai-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(insights).toEqual(mockResponse);
    });

    it('handles API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'AI service unavailable' }),
      });

      const { result } = renderHook(() => useAskAIAboutContact(), {
        wrapper: createWrapper(),
      });

      await expect(result.current.mutateAsync('contact-1')).rejects.toThrow(
        'AI service unavailable'
      );
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAskAIAboutContact(), {
        wrapper: createWrapper(),
      });

      await expect(result.current.mutateAsync('contact-1')).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('HIGH: useGenerateEmailSuggestion', () => {
    it('generates email suggestion successfully', async () => {
      const mockResponse = {
        subject: 'Following up on your yoga practice',
        content: 'Hi John! Hope you enjoyed yesterday\'s session...',
        tone: 'friendly' as const,
        purpose: 'follow-up',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useGenerateEmailSuggestion(), {
        wrapper: createWrapper(),
      });

      const suggestion = await result.current.mutateAsync({
        contactId: 'contact-1',
        purpose: 'follow-up',
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/contacts/contact-1/email-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purpose: 'follow-up' }),
      });

      expect(suggestion).toEqual(mockResponse);
    });

    it('handles missing purpose parameter', async () => {
      const mockResponse = {
        subject: 'Checking in',
        content: 'Hi! How are things going?',
        tone: 'friendly' as const,
        purpose: 'general-check-in',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useGenerateEmailSuggestion(), {
        wrapper: createWrapper(),
      });

      const suggestion = await result.current.mutateAsync({
        contactId: 'contact-1',
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/contacts/contact-1/email-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purpose: undefined }),
      });

      expect(suggestion).toEqual(mockResponse);
    });
  });

  describe('HIGH: useGenerateNoteSuggestions', () => {
    it('generates note suggestions successfully', async () => {
      const mockResponse = {
        suggestions: [
          {
            content: 'Client showed great improvement in flexibility',
            category: 'observation' as const,
            priority: 'high' as const,
          },
          {
            content: 'Remember to follow up on nutrition plan',
            category: 'follow-up' as const,
            priority: 'medium' as const,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useGenerateNoteSuggestions(), {
        wrapper: createWrapper(),
      });

      const suggestions = await result.current.mutateAsync('contact-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/contacts/contact-1/note-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(suggestions).toEqual(mockResponse.suggestions);
    });
  });

  describe('HIGH: useGenerateTaskSuggestions', () => {
    it('generates task suggestions successfully', async () => {
      const mockResponse = {
        suggestions: [
          {
            title: 'Follow up with John Doe',
            description: 'Check on progress and book next session',
            priority: 'high' as const,
            estimatedMinutes: 15,
            category: 'follow-up' as const,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useGenerateTaskSuggestions(), {
        wrapper: createWrapper(),
      });

      const suggestions = await result.current.mutateAsync('contact-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/contacts/contact-1/task-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(suggestions).toEqual(mockResponse.suggestions);
    });
  });

  describe('MODERATE: useCreateContactNote', () => {
    it('creates a note successfully', async () => {
      const mockResponse = {
        id: 'note-1',
        content: 'Great session today!',
        contactId: 'contact-1',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useCreateContactNote(), {
        wrapper: createWrapper(),
      });

      const note = await result.current.mutateAsync({
        contactId: 'contact-1',
        content: 'Great session today!',
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/contacts/contact-1/notes/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: 'Great session today!' }),
      });

      expect(note).toEqual(mockResponse);
    });

    it('handles validation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Content is required' }),
      });

      const { result } = renderHook(() => useCreateContactNote(), {
        wrapper: createWrapper(),
      });

      await expect(
        result.current.mutateAsync({
          contactId: 'contact-1',
          content: '',
        })
      ).rejects.toThrow('Content is required');
    });
  });

  describe('MODERATE: useCreateContactTask', () => {
    it('creates a task successfully', async () => {
      const mockResponse = {
        id: 'task-1',
        title: 'Follow up with client',
        contactId: 'contact-1',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useCreateContactTask(), {
        wrapper: createWrapper(),
      });

      const task = await result.current.mutateAsync({
        contactId: 'contact-1',
        title: 'Follow up with client',
        description: 'Check on their progress',
        priority: 'high',
        estimatedMinutes: 15,
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/contacts/contact-1/tasks/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Follow up with client',
          description: 'Check on their progress',
          priority: 'high',
          estimatedMinutes: 15,
        }),
      });

      expect(task).toEqual(mockResponse);
    });

    it('creates task with minimal required fields', async () => {
      const mockResponse = {
        id: 'task-2',
        title: 'Simple task',
        contactId: 'contact-1',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useCreateContactTask(), {
        wrapper: createWrapper(),
      });

      const task = await result.current.mutateAsync({
        contactId: 'contact-1',
        title: 'Simple task',
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/contacts/contact-1/tasks/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Simple task',
          description: undefined,
          priority: undefined,
          estimatedMinutes: undefined,
        }),
      });

      expect(task).toEqual(mockResponse);
    });
  });

  describe('LOW: Error Handling and Edge Cases', () => {
    it('handles malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('Malformed JSON')),
      });

      const { result } = renderHook(() => useAskAIAboutContact(), {
        wrapper: createWrapper(),
      });

      await expect(result.current.mutateAsync('contact-1')).rejects.toThrow();
    });

    it('handles server timeouts', async () => {
      mockFetch.mockImplementationOnce(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const { result } = renderHook(() => useAskAIAboutContact(), {
        wrapper: createWrapper(),
      });

      await expect(result.current.mutateAsync('contact-1')).rejects.toThrow('Request timeout');
    });

    it('handles empty response bodies', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useGenerateNoteSuggestions(), {
        wrapper: createWrapper(),
      });

      const suggestions = await result.current.mutateAsync('contact-1');

      // Should handle missing suggestions array gracefully
      expect(suggestions).toEqual(undefined);
    });
  });
});
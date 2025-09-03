import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchPost } from '@/lib/api';

export interface ContactAIInsightResponse {
  insights: string;
  suggestions: string[];
  nextSteps: string[];
  confidence: number;
  keyFindings: string[];
}

export interface ContactEmailSuggestion {
  subject: string;
  content: string;
  tone: 'professional' | 'friendly' | 'casual' | 'formal';
  purpose: string;
}

export interface ContactNoteSuggestion {
  content: string;
  category: 'interaction' | 'observation' | 'follow-up' | 'preference';
  priority: 'high' | 'medium' | 'low';
}

export interface ContactTaskSuggestion {
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  estimatedMinutes: number;
  category: 'follow-up' | 'outreach' | 'service' | 'admin';
}

/**
 * Hook to ask AI about a contact and get insights
 */
export function useAskAIAboutContact(): UseMutationResult<ContactAIInsightResponse, Error, string, unknown> {
  return useMutation({
    mutationFn: async (contactId: string): Promise<ContactAIInsightResponse> => {
      return await fetchPost<ContactAIInsightResponse>(`/api/contacts-new/${contactId}/ai-insights`, {});
    },
    onError: (error) => {
      console.error('AI insights error:', error);
      toast.error('Failed to generate AI insights: ' + error.message);
    },
  });
}

/**
 * Hook to generate AI email suggestions for a contact
 */
export function useGenerateEmailSuggestion(): UseMutationResult<ContactEmailSuggestion, Error, { contactId: string; purpose?: string }, unknown> {
  return useMutation({
    mutationFn: async ({
      contactId,
      purpose,
    }: {
      contactId: string;
      purpose?: string;
    }): Promise<ContactEmailSuggestion> => {
      return await fetchPost<ContactEmailSuggestion>(`/api/contacts-new/${contactId}/email-suggestion`, { purpose });
    },
    onError: (error) => {
      console.error('Email suggestion error:', error);
      toast.error('Failed to generate email suggestion: ' + error.message);
    },
  });
}

/**
 * Hook to generate AI note suggestions for a contact
 */
export function useGenerateNoteSuggestions(): UseMutationResult<ContactNoteSuggestion[], Error, string, unknown> {
  return useMutation({
    mutationFn: async (contactId: string): Promise<ContactNoteSuggestion[]> => {
      const data = await fetchPost<{ suggestions: ContactNoteSuggestion[] }>(`/api/contacts-new/${contactId}/note-suggestions`, {});
      return data.suggestions;
    },
    onError: (error) => {
      console.error('Note suggestions error:', error);
      toast.error('Failed to generate note suggestions: ' + error.message);
    },
  });
}

/**
 * Hook to generate AI task suggestions for a contact
 */
export function useGenerateTaskSuggestions(): UseMutationResult<ContactTaskSuggestion[], Error, string, unknown> {
  return useMutation({
    mutationFn: async (contactId: string): Promise<ContactTaskSuggestion[]> => {
      const data = await fetchPost<{ suggestions: ContactTaskSuggestion[] }>(`/api/contacts-new/${contactId}/task-suggestions`, {});
      return data.suggestions;
    },
    onError: (error) => {
      console.error('Task suggestions error:', error);
      toast.error('Failed to generate task suggestions: ' + error.message);
    },
  });
}

/**
 * Hook to create a note for a contact
 */
export function useCreateContactNote(): UseMutationResult<unknown, Error, { contactId: string; content: string }, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactId,
      content,
    }: {
      contactId: string;
      content: string;
    }) => {
      return await fetchPost(`/api/contacts-new/${contactId}/notes`, { content });
    },
    onSuccess: () => {
      toast.success('Note created successfully');
      // Invalidate contacts query to refresh data
      void queryClient.invalidateQueries({ queryKey: ['/api/contacts-new'] });
    },
    onError: (error) => {
      console.error('Create note error:', error);
      toast.error('Failed to create note: ' + error.message);
    },
  });
}

/**
 * Hook to create a task for a contact
 */
export function useCreateContactTask(): UseMutationResult<unknown, Error, { contactId: string; title: string; description?: string; priority?: string; estimatedMinutes?: number }, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactId,
      title,
      description,
      priority,
      estimatedMinutes,
    }: {
      contactId: string;
      title: string;
      description?: string;
      priority?: string;
      estimatedMinutes?: number;
    }) => {
      return await fetchPost(`/api/contacts-new/${contactId}/tasks`, { title, description, priority, estimatedMinutes });
    },
    onSuccess: () => {
      toast.success('Task created successfully');
      // Invalidate tasks query to refresh data
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      console.error('Create task error:', error);
      toast.error('Failed to create task: ' + error.message);
    },
  });
}

/**
 * Hook to create a note from suggestion (alias for useCreateContactNote)
 */
export function useCreateNoteFromSuggestion(): UseMutationResult<unknown, Error, { contactId: string; content: string }, unknown> {
  return useCreateContactNote();
}

/**
 * Hook to create a task from suggestion (alias for useCreateContactTask)
 */
export function useCreateTaskFromSuggestion(): UseMutationResult<unknown, Error, { contactId: string; title: string; description?: string; priority?: string; estimatedMinutes?: number }, unknown> {
  return useCreateContactTask();
}
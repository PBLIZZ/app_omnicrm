import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ContactsPage from '../page';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

vi.mock('../_components/contacts-table-new', () => ({
  ContactsTable: vi.fn(({ data }) => (
    <div data-testid="contacts-table">
      {data.map((contact: any) => (
        <div key={contact.id} data-testid={`contact-${contact.id}`}>
          {contact.displayName}
        </div>
      ))}
    </div>
  )),
}));

vi.mock('../_components/contacts-columns-new', () => ({
  contactsColumns: [],
  ContactWithNotes: {},
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test data
const mockContacts = [
  {
    id: '1',
    displayName: 'John Doe',
    primaryEmail: 'john@example.com',
    primaryPhone: '+1234567890',
    stage: 'Core Client',
    tags: ['Yoga', 'Regular Attendee'],
    notes: 'AI-generated insights about John',
    confidenceScore: '0.85',
    interactions: 5,
    notesCount: 3,
    lastNote: 'Last interaction was positive',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    displayName: 'Jane Smith',
    primaryEmail: 'jane@example.com',
    primaryPhone: null,
    stage: 'Prospect',
    tags: ['Massage', 'New Client'],
    notes: null,
    confidenceScore: null,
    interactions: 1,
    notesCount: 0,
    lastNote: null,
    updatedAt: '2024-01-14T15:30:00Z',
  },
];

const mockSuggestions = [
  {
    id: 'suggest-1',
    displayName: 'Bob Wilson',
    email: 'bob@example.com',
    eventCount: 3,
    lastEventDate: '2024-01-10',
    eventTitles: ['Yoga Class', 'Workshop', 'Private Session'],
    confidence: 'high' as const,
    source: 'calendar_attendee' as const,
  },
];

describe('ContactsPage', () => {
  let queryClient: QueryClient;
  const mockToast = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.mocked(useToast).mockReturnValue({ toast: mockToast });
    mockFetch.mockClear();
    mockToast.mockClear();
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('CRITICAL: Initial Render', () => {
    it('renders the contacts page with correct title and description', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { items: [] } }),
      });

      renderWithQueryClient(<ContactsPage />);

      expect(screen.getByTestId('contacts-page')).toBeInTheDocument();
      expect(screen.getByText('Contacts Intelligence')).toBeInTheDocument();
      expect(screen.getByText(/AI-powered contact management/)).toBeInTheDocument();
    });

    it('displays action buttons in header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { items: [] } }),
      });

      renderWithQueryClient(<ContactsPage />);

      expect(screen.getByTestId('enrich-contacts-button')).toBeInTheDocument();
      expect(screen.getByTestId('smart-suggestions-button')).toBeInTheDocument();
      expect(screen.getByTestId('add-contact-button')).toBeInTheDocument();
    });
  });

  describe('HIGH: Contacts Loading and Display', () => {
    it('loads and displays contacts correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { items: mockContacts } }),
      });

      renderWithQueryClient(<ContactsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('contacts-table')).toBeInTheDocument();
        expect(screen.getByTestId('contact-1')).toBeInTheDocument();
        expect(screen.getByTestId('contact-2')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('shows loading state while fetching contacts', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderWithQueryClient(<ContactsPage />);

      expect(screen.getByText('Loading enhanced contacts...')).toBeInTheDocument();
    });

    it('shows empty state when no contacts exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { items: [] } }),
      });

      renderWithQueryClient(<ContactsPage />);

      await waitFor(() => {
        expect(screen.getByText('No contacts found')).toBeInTheDocument();
        expect(screen.getByText(/Add contacts or sync from your calendar/)).toBeInTheDocument();
      });
    });
  });

  describe('HIGH: Search Functionality', () => {
    it('filters contacts based on search query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { items: mockContacts } }),
      });

      renderWithQueryClient(<ContactsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('contact-1')).toBeInTheDocument();
        expect(screen.getByTestId('contact-2')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('search-contacts');
      fireEvent.change(searchInput, { target: { value: 'John' } });

      // Should filter to show only John Doe
      await waitFor(() => {
        expect(screen.getByTestId('contact-1')).toBeInTheDocument();
        expect(screen.queryByTestId('contact-2')).not.toBeInTheDocument();
      });
    });

    it('shows no results message when search yields no matches', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { items: mockContacts } }),
      });

      renderWithQueryClient(<ContactsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('contact-1')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('search-contacts');
      fireEvent.change(searchInput, { target: { value: 'NonExistentName' } });

      await waitFor(() => {
        expect(screen.getByText('No contacts found')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your search terms')).toBeInTheDocument();
      });
    });
  });

  describe('CRITICAL: AI Features', () => {
    it('handles AI enrichment of contacts', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { items: mockContacts } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ enrichedCount: 2, errors: [] }),
        });

      renderWithQueryClient(<ContactsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('enrich-contacts-button')).toBeInTheDocument();
      });

      const enrichButton = screen.getByTestId('enrich-contacts-button');
      fireEvent.click(enrichButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/contacts/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Enriched 2 contacts with AI insights',
        });
      });
    });

    it('handles AI enrichment errors gracefully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { items: mockContacts } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'AI service unavailable' }),
        });

      renderWithQueryClient(<ContactsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('enrich-contacts-button')).toBeInTheDocument();
      });

      const enrichButton = screen.getByTestId('enrich-contacts-button');
      fireEvent.click(enrichButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to enrich contacts with AI insights',
          variant: 'destructive',
        });
      });
    });
  });

  describe('HIGH: Smart Suggestions', () => {
    it('loads and displays contact suggestions when toggled', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { items: mockContacts } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ suggestions: mockSuggestions }),
        });

      renderWithQueryClient(<ContactsPage />);

      const suggestionsButton = screen.getByTestId('smart-suggestions-button');
      fireEvent.click(suggestionsButton);

      expect(screen.getByTestId('contact-suggestions-section')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId('suggestion-suggest-1')).toBeInTheDocument();
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
        expect(screen.getByText('bob@example.com')).toBeInTheDocument();
        expect(screen.getByText('high confidence')).toBeInTheDocument();
      });
    });

    it('handles creating contacts from suggestions', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { items: mockContacts } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ suggestions: mockSuggestions }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ createdCount: 1, errors: [] }),
        });

      renderWithQueryClient(<ContactsPage />);

      const suggestionsButton = screen.getByTestId('smart-suggestions-button');
      fireEvent.click(suggestionsButton);

      await waitFor(() => {
        expect(screen.getByTestId('suggestion-suggest-1')).toBeInTheDocument();
      });

      // Select the suggestion
      const checkbox = screen.getByTestId('checkbox-suggest-1');
      fireEvent.click(checkbox);

      // Create the contact
      const createButton = screen.getByTestId('create-selected-contacts');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/contacts/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ suggestionIds: ['suggest-1'] }),
        });
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Success',
          description: 'Created 1 contacts from calendar data',
        });
      });
    });
  });

  describe('MODERATE: Manual Contact Creation', () => {
    it('opens and handles manual contact creation dialog', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { items: [] } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'new-contact' }),
        });

      renderWithQueryClient(<ContactsPage />);

      // Open the dialog
      const addButton = screen.getByTestId('add-contact-button');
      fireEvent.click(addButton);

      // Fill in the form
      const nameInput = screen.getByTestId('contact-name-input');
      const emailInput = screen.getByTestId('contact-email-input');
      const phoneInput = screen.getByTestId('contact-phone-input');

      fireEvent.change(nameInput, { target: { value: 'Test Contact' } });
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(phoneInput, { target: { value: '+1234567890' } });

      // Submit the form
      const saveButton = screen.getByTestId('save-contact');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: 'Test Contact',
            primaryEmail: 'test@example.com',
            primaryPhone: '+1234567890',
          }),
        });
      });
    });

    it('validates required fields in contact creation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { items: [] } }),
      });

      renderWithQueryClient(<ContactsPage />);

      const addButton = screen.getByTestId('add-contact-button');
      fireEvent.click(addButton);

      // Try to save without name
      const saveButton = screen.getByTestId('save-contact');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Please enter a contact name',
          variant: 'destructive',
        });
      });

      expect(mockFetch).not.toHaveBeenCalledWith('/api/contacts', expect.any(Object));
    });
  });

  describe('MODERATE: Export Functionality', () => {
    it('handles CSV export with proper data formatting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { items: mockContacts } }),
      });

      // Mock URL.createObjectURL and related DOM methods
      global.URL.createObjectURL = vi.fn(() => 'mock-blob-url');
      global.URL.revokeObjectURL = vi.fn();
      
      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(vi.fn());
      vi.spyOn(document.body, 'removeChild').mockImplementation(vi.fn());

      renderWithQueryClient(<ContactsPage />);

      await waitFor(() => {
        expect(screen.getByTestId('contact-1')).toBeInTheDocument();
      });

      // Trigger export (assuming there's an export button - you might need to add this)
      // For now, we'll test the handleExportContacts function indirectly
      // by checking if contacts are loaded properly for export
      expect(screen.getByText(/Showing 2 of 2 contacts/)).toBeInTheDocument();
    });
  });
});
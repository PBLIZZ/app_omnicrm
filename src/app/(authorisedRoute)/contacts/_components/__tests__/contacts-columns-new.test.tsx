import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import { contactsColumns, ContactWithNotes } from '../contacts-columns-new';

// Mock dependencies
vi.mock('@/hooks/use-contact-ai-actions', () => ({
  useAskAIAboutContact: () => ({
    mutateAsync: vi.fn().mockResolvedValue({
      insights: 'AI generated insights',
      suggestions: ['Follow up next week'],
      nextSteps: ['Send email'],
      confidence: 0.85,
      keyFindings: ['Regular attendee'],
    }),
    isPending: false,
  }),
  useGenerateEmailSuggestion: () => ({
    mutateAsync: vi.fn().mockResolvedValue({
      subject: 'Following up on your yoga practice',
      content: 'Hi there! Just wanted to check in...',
      tone: 'friendly',
      purpose: 'follow-up',
    }),
    isPending: false,
  }),
  useGenerateNoteSuggestions: () => ({
    mutateAsync: vi.fn().mockResolvedValue([
      {
        content: 'Great progress in today\'s session',
        category: 'observation',
        priority: 'medium',
      },
    ]),
    isPending: false,
  }),
  useGenerateTaskSuggestions: () => ({
    mutateAsync: vi.fn().mockResolvedValue([
      {
        title: 'Follow up with client',
        description: 'Check on their progress',
        priority: 'high',
        estimatedMinutes: 15,
        category: 'follow-up',
      },
    ]),
    isPending: false,
  }),
}));

vi.mock('@/components/contacts/NotesHoverCard', () => ({
  NotesHoverCard: ({ contactId, contactName, notesCount }: any) => (
    <div data-testid={`notes-hover-card-${contactId}`}>
      <span>{contactName} - {notesCount} notes</span>
    </div>
  ),
}));

vi.mock('@/components/contacts/ContactAIInsightsDialog', () => ({
  ContactAIInsightsDialog: ({ open, contactName }: any) =>
    open ? <div data-testid="ai-insights-dialog">{contactName}</div> : null,
}));

vi.mock('@/components/contacts/ContactEmailDialog', () => ({
  ContactEmailDialog: ({ open, contactName }: any) =>
    open ? <div data-testid="email-dialog">{contactName}</div> : null,
}));

vi.mock('@/components/contacts/ContactNoteSuggestionsDialog', () => ({
  ContactNoteSuggestionsDialog: ({ open, contactName }: any) =>
    open ? <div data-testid="note-suggestions-dialog">{contactName}</div> : null,
}));

vi.mock('@/components/contacts/ContactTaskSuggestionsDialog', () => ({
  ContactTaskSuggestionsDialog: ({ open, contactName }: any) =>
    open ? <div data-testid="task-suggestions-dialog">{contactName}</div> : null,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

// Test component that uses the columns
function TestTable({ data }: { data: ContactWithNotes[] }) {
  const table = useReactTable({
    data,
    columns: contactsColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Mock data
const mockContact: ContactWithNotes = {
  id: '1',
  userId: 'user-1',
  displayName: 'John Doe',
  primaryEmail: 'john@example.com',
  primaryPhone: '+1234567890',
  source: 'gmail_import',
  notes: 'AI-generated insights about this client\'s preferences and history',
  stage: 'Core Client',
  tags: ['Yoga', 'Regular Attendee', 'VIP'],
  confidenceScore: '0.85',
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-15T14:30:00Z'),
  notesCount: 5,
  lastNote: 'Client enjoyed the advanced session today',
  interactions: 12,
};

const mockContactMinimal: ContactWithNotes = {
  id: '2',
  userId: 'user-1',
  displayName: 'Jane Smith',
  primaryEmail: null,
  primaryPhone: null,
  source: 'manual',
  notes: null,
  stage: null,
  tags: null,
  confidenceScore: null,
  createdAt: new Date('2024-01-10T09:00:00Z'),
  updatedAt: new Date('2024-01-10T09:00:00Z'),
  notesCount: 0,
  lastNote: null,
  interactions: 0,
};

describe('ContactsColumns', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('CRITICAL: Avatar Column', () => {
    it('renders contact avatar with fallback initials', () => {
      renderWithQueryClient(<TestTable data={[mockContact]} />);

      const avatar = screen.getByTestId('contact-avatar-1');
      expect(avatar).toBeInTheDocument();

      // Should show initials for fallback
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('handles single name initials correctly', () => {
      const singleNameContact = { ...mockContact, displayName: 'Madonna' };
      renderWithQueryClient(<TestTable data={[singleNameContact]} />);

      expect(screen.getByText('M')).toBeInTheDocument();
    });

    it('handles empty name with fallback', () => {
      const emptyNameContact = { ...mockContact, displayName: '' };
      renderWithQueryClient(<TestTable data={[emptyNameContact]} />);

      expect(screen.getByText('?')).toBeInTheDocument();
    });
  });

  describe('CRITICAL: AI Actions Column', () => {
    it('renders all AI action buttons', () => {
      renderWithQueryClient(<TestTable data={[mockContact]} />);

      expect(screen.getByTestId('ask-ai-1')).toBeInTheDocument();
      expect(screen.getByTestId('send-email-1')).toBeInTheDocument();
      expect(screen.getByTestId('take-note-1')).toBeInTheDocument();
      expect(screen.getByTestId('add-to-task-1')).toBeInTheDocument();
    });

    it('disables email button when no email address', () => {
      renderWithQueryClient(<TestTable data={[mockContactMinimal]} />);

      const emailButton = screen.getByTestId('send-email-2');
      expect(emailButton).toBeDisabled();
    });

    it('opens AI insights dialog when Ask AI clicked', async () => {
      renderWithQueryClient(<TestTable data={[mockContact]} />);

      const askAIButton = screen.getByTestId('ask-ai-1');
      fireEvent.click(askAIButton);

      await waitFor(() => {
        expect(screen.getByTestId('ai-insights-dialog')).toBeInTheDocument();
      });
    });

    it('opens email dialog when Send Email clicked', async () => {
      renderWithQueryClient(<TestTable data={[mockContact]} />);

      const emailButton = screen.getByTestId('send-email-1');
      fireEvent.click(emailButton);

      await waitFor(() => {
        expect(screen.getByTestId('email-dialog')).toBeInTheDocument();
      });
    });
  });

  describe('HIGH: Data Display Columns', () => {
    it('displays contact name with proper formatting', () => {
      renderWithQueryClient(<TestTable data={[mockContact]} />);

      const nameElement = screen.getByText('John Doe');
      expect(nameElement).toBeInTheDocument();
      expect(nameElement).toHaveClass('font-medium');
    });

    it('shows email or fallback message', () => {
      renderWithQueryClient(<TestTable data={[mockContact, mockContactMinimal]} />);

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('No email')).toBeInTheDocument();
    });

    it('shows phone or fallback message', () => {
      renderWithQueryClient(<TestTable data={[mockContact, mockContactMinimal]} />);

      expect(screen.getByText('+1234567890')).toBeInTheDocument();
      expect(screen.getByText('No phone')).toBeInTheDocument();
    });
  });

  describe('HIGH: Notes Column Integration', () => {
    it('renders NotesHoverCard with correct props', () => {
      renderWithQueryClient(<TestTable data={[mockContact]} />);

      const notesCard = screen.getByTestId('notes-hover-card-1');
      expect(notesCard).toBeInTheDocument();
      expect(notesCard).toHaveTextContent('John Doe - 5 notes');
    });

    it('handles zero notes correctly', () => {
      renderWithQueryClient(<TestTable data={[mockContactMinimal]} />);

      const notesCard = screen.getByTestId('notes-hover-card-2');
      expect(notesCard).toHaveTextContent('Jane Smith - 0 notes');
    });
  });

  describe('HIGH: Tags Column', () => {
    it('displays tags with proper styling and colors', () => {
      renderWithQueryClient(<TestTable data={[mockContact]} />);

      // Should show first 4 tags
      expect(screen.getByText('Yoga')).toBeInTheDocument();
      expect(screen.getByText('Regular Attendee')).toBeInTheDocument();
      expect(screen.getByText('VIP')).toBeInTheDocument();
    });

    it('shows overflow indicator for more than 4 tags', () => {
      const manyTagsContact = {
        ...mockContact,
        tags: ['Yoga', 'Massage', 'Regular', 'VIP', 'Advanced', 'Premium'],
      };
      renderWithQueryClient(<TestTable data={[manyTagsContact]} />);

      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('handles no tags gracefully', () => {
      renderWithQueryClient(<TestTable data={[mockContactMinimal]} />);

      expect(screen.getByText('No tags')).toBeInTheDocument();
    });

    it('applies correct color coding for service types', () => {
      renderWithQueryClient(<TestTable data={[mockContact]} />);

      const yogaTag = screen.getByText('Yoga');
      expect(yogaTag).toHaveClass('bg-blue-100', 'text-blue-800');
    });
  });

  describe('HIGH: Stage Column', () => {
    it('displays stage with correct color coding', () => {
      renderWithQueryClient(<TestTable data={[mockContact]} />);

      const stageElement = screen.getByText('Core Client');
      expect(stageElement).toBeInTheDocument();
      expect(stageElement).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('handles missing stage', () => {
      renderWithQueryClient(<TestTable data={[mockContactMinimal]} />);

      expect(screen.getByText('No stage')).toBeInTheDocument();
    });

    it('applies correct colors for different stages', () => {
      const vipContact = { ...mockContact, stage: 'VIP Client' };
      renderWithQueryClient(<TestTable data={[vipContact]} />);

      const stageElement = screen.getByText('VIP Client');
      expect(stageElement).toHaveClass('bg-purple-100', 'text-purple-800');
    });
  });

  describe('MODERATE: AI Insights Column', () => {
    it('displays AI insights with confidence score', () => {
      renderWithQueryClient(<TestTable data={[mockContact]} />);

      expect(screen.getByText(/AI-generated insights/)).toBeInTheDocument();
      expect(screen.getByText('Confidence: 85%')).toBeInTheDocument();
    });

    it('handles missing AI insights', () => {
      renderWithQueryClient(<TestTable data={[mockContactMinimal]} />);

      expect(screen.getByText('No insights')).toBeInTheDocument();
    });
  });

  describe('MODERATE: Interactions and Last Updated', () => {
    it('displays interaction count as badge', () => {
      renderWithQueryClient(<TestTable data={[mockContact]} />);

      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('shows last updated time in relative format', () => {
      renderWithQueryClient(<TestTable data={[mockContact]} />);

      // Should show relative time like "10 days ago"
      expect(screen.getByText(/ago$/)).toBeInTheDocument();
    });
  });

  describe('MODERATE: Actions Dropdown', () => {
    it('renders actions dropdown menu', () => {
      renderWithQueryClient(<TestTable data={[mockContact]} />);

      const actionsButton = screen.getByTestId('contact-actions-1');
      expect(actionsButton).toBeInTheDocument();

      fireEvent.click(actionsButton);

      expect(screen.getByTestId('edit-contact-1')).toBeInTheDocument();
      expect(screen.getByTestId('add-note-1')).toBeInTheDocument();
      expect(screen.getByTestId('view-notes-1')).toBeInTheDocument();
      expect(screen.getByTestId('delete-contact-1')).toBeInTheDocument();
    });
  });

  describe('LOW: Edge Cases and Error Handling', () => {
    it('handles malformed tags data', () => {
      const malformedContact = {
        ...mockContact,
        tags: 'not-an-array' as any,
      };
      renderWithQueryClient(<TestTable data={[malformedContact]} />);

      expect(screen.getByText('No tags')).toBeInTheDocument();
    });

    it('handles very long display names', () => {
      const longNameContact = {
        ...mockContact,
        displayName: 'This is a very long name that should be handled gracefully',
      };
      renderWithQueryClient(<TestTable data={[longNameContact]} />);

      expect(screen.getByText(/This is a very long name/)).toBeInTheDocument();
    });

    it('handles invalid confidence scores', () => {
      const invalidConfidenceContact = {
        ...mockContact,
        confidenceScore: 'invalid' as any,
      };
      renderWithQueryClient(<TestTable data={[invalidConfidenceContact]} />);

      // Should handle gracefully without crashing
      expect(screen.getByText(/AI-generated insights/)).toBeInTheDocument();
    });
  });
});
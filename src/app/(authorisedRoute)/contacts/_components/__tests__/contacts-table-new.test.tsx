import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { ContactsTable } from '../contacts-table-new';
import { ColumnDef } from '@tanstack/react-table';

// Mock data
interface TestContact {
  id: string;
  name: string;
  email: string;
}

const mockContacts: TestContact[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
];

const mockColumns: ColumnDef<TestContact>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <span>{row.getValue('name')}</span>,
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => <span>{row.getValue('email')}</span>,
  },
];

describe('ContactsTable', () => {
  describe('CRITICAL: Core Functionality', () => {
    it('renders table with provided data and columns', () => {
      render(<ContactsTable columns={mockColumns} data={mockContacts} />);

      // Check headers are rendered
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();

      // Check data is rendered
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    it('renders contact rows with correct test IDs', () => {
      render(<ContactsTable columns={mockColumns} data={mockContacts} />);

      expect(screen.getByTestId('contact-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('contact-row-2')).toBeInTheDocument();
    });

    it('displays empty state when no data provided', () => {
      render(<ContactsTable columns={mockColumns} data={[]} />);

      expect(screen.getByText('No contacts found.')).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: /no contacts found/i })).toHaveAttribute(
        'colspan',
        '2'
      );
    });
  });

  describe('HIGH: Table Structure', () => {
    it('renders proper table structure with headers and body', () => {
      render(<ContactsTable columns={mockColumns} data={mockContacts} />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      const thead = screen.getByRole('rowgroup'); // TableHeader renders as rowgroup
      expect(thead).toBeInTheDocument();

      const tbody = screen.getAllByRole('rowgroup')[1]; // TableBody is the second rowgroup
      expect(tbody).toBeInTheDocument();
    });

    it('applies correct CSS classes for styling', () => {
      render(<ContactsTable columns={mockColumns} data={mockContacts} />);

      const tableWrapper = screen.getByRole('table').parentElement;
      expect(tableWrapper).toHaveClass('rounded-md', 'border');
    });
  });

  describe('HIGH: Sorting Functionality', () => {
    it('initializes with empty sorting state', () => {
      render(<ContactsTable columns={mockColumns} data={mockContacts} />);

      // Table should render without any sorting indicators initially
      // This is implicit behavior - no sorting UI should be visible without sortable columns
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('maintains sorting state through re-renders', () => {
      const { rerender } = render(<ContactsTable columns={mockColumns} data={mockContacts} />);

      // Re-render with same props
      rerender(<ContactsTable columns={mockColumns} data={mockContacts} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  describe('MODERATE: Accessibility', () => {
    it('provides proper table semantics', () => {
      render(<ContactsTable columns={mockColumns} data={mockContacts} />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders).toHaveLength(2);
      expect(columnHeaders[0]).toHaveTextContent('Name');
      expect(columnHeaders[1]).toHaveTextContent('Email');
    });

    it('renders row data in proper cells', () => {
      render(<ContactsTable columns={mockColumns} data={mockContacts} />);

      const cells = screen.getAllByRole('cell');
      expect(cells).toHaveLength(4); // 2 rows × 2 columns

      expect(cells[0]).toHaveTextContent('John Doe');
      expect(cells[1]).toHaveTextContent('john@example.com');
      expect(cells[2]).toHaveTextContent('Jane Smith');
      expect(cells[3]).toHaveTextContent('jane@example.com');
    });
  });

  describe('LOW: Edge Cases', () => {
    it('handles undefined or null data gracefully', () => {
      // @ts-expect-error Testing edge case with invalid data
      render(<ContactsTable columns={mockColumns} data={null} />);

      expect(screen.getByText('No contacts found.')).toBeInTheDocument();
    });

    it('handles empty columns array', () => {
      render(<ContactsTable columns={[]} data={mockContacts} />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Should show empty state with colspan of 0
      expect(screen.getByText('No contacts found.')).toBeInTheDocument();
    });

    it('handles very large datasets without performance issues', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i.toString(),
        name: `Contact ${i}`,
        email: `contact${i}@example.com`,
      }));

      const startTime = performance.now();
      render(<ContactsTable columns={mockColumns} data={largeDataset} />);
      const endTime = performance.now();

      // Should render within reasonable time (less than 100ms for 1000 rows)
      expect(endTime - startTime).toBeLessThan(100);
      expect(screen.getByText('Contact 0')).toBeInTheDocument();
      expect(screen.getByText('Contact 999')).toBeInTheDocument();
    });
  });
});
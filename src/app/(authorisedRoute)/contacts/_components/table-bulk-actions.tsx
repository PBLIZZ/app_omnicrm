"use client";

import { Button } from "@/components/ui/button";
import { useBulkDeleteContacts } from "@/hooks/use-contact-delete";
import type { Table } from "@tanstack/react-table";
import type { ContactWithNotes } from "./contacts-columns-new";

interface TableBulkActionsProps {
  table: Table<ContactWithNotes>;
  rowSelection: Record<string, boolean>;
  onClearSelection: () => void;
}

export function TableBulkActions({
  table,
  rowSelection,
  onClearSelection,
}: TableBulkActionsProps) {
  const bulkDeleteContacts = useBulkDeleteContacts();
  const selectedCount = Object.keys(rowSelection).length;

  if (selectedCount === 0) {
    return null;
  }

  const handleBulkDelete = () => {
    const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
    const selectedRows = table.getSelectedRowModel().rows;
    const contactNames = selectedRows
      .map((row) => row.original.displayName)
      .join(", ");

    if (
      confirm(
        `Are you sure you want to delete ${selectedIds.length} contact(s)?\n\nContacts: ${contactNames}\n\nThis action cannot be undone.`
      )
    ) {
      bulkDeleteContacts.mutate(selectedIds, {
        onSuccess: () => {
          onClearSelection();
        },
      });
    }
  };

  const handleBulkEnrich = () => {
    // TODO: Implement bulk enrichment
    alert(`Bulk enrich ${selectedCount} contacts - Coming soon!`);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-muted/50 border rounded-lg">
      <div className="text-sm font-medium">
        {selectedCount} contact(s) selected
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" onClick={onClearSelection}>
          Clear Selection
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={bulkDeleteContacts.isPending}
          onClick={handleBulkDelete}
        >
          {bulkDeleteContacts.isPending ? "Deleting..." : "Delete Selected"}
        </Button>
        <Button variant="default" size="sm" onClick={handleBulkEnrich}>
          Bulk Enrich
        </Button>
      </div>
    </div>
  );
}
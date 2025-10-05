"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContactFilterDialog } from "./ContactFilterDialog";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  VisibilityState,
  SortingState,
  RowSelectionState,
  ColumnFiltersState,
  useReactTable,
  Updater,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Settings2,
  Brain,
  Download,
} from "lucide-react";
import { useBulkDeleteContacts } from "@/hooks/use-contact-delete";
import { useBulkEnrichContacts } from "@/hooks/use-contacts-bridge";
import type { ContactSearchFilters, ContactWithLastNote } from "./types";
import { toast } from "sonner";
import { parseVisibilityState } from "@/lib/utils/type-guards/contacts";

interface ContactsTableProps {
  columns: ColumnDef<ContactWithLastNote>[];
  data: ContactWithLastNote[];
}

export function ContactsTable({ columns, data }: ContactsTableProps): JSX.Element {
  const bulkDeleteContacts = useBulkDeleteContacts();
  const bulkEnrichContacts = useBulkEnrichContacts();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Initialize column visibility from localStorage
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("contacts-column-visibility");
      if (saved) {
        const parsed = parseVisibilityState(saved);
        if (parsed) {
          return parsed;
        }
      }
    }
    return {};
  });

  // Save column visibility to localStorage when it changes
  const handleColumnVisibilityChange = (updater: Updater<VisibilityState>): void => {
    const newVisibility = typeof updater === "function" ? updater(columnVisibility) : updater;
    setColumnVisibility(newVisibility);
    if (typeof window !== "undefined") {
      localStorage.setItem("contacts-column-visibility", JSON.stringify(newVisibility));
    }
  };

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Filter state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState<ContactSearchFilters>({});
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Calculate active filters count
  const calculateActiveFilters = (filterState: ContactSearchFilters): number => {
    let count = 0;
    if (filterState.query?.trim()) count++;
    if (filterState.tags?.length) count++;
    if (filterState.lifecycleStage?.length) count++;
    if (filterState.source?.length) count++;
    if (filterState.dateRange) count++;
    if (filterState.hasNotes !== undefined) count++;
    if (filterState.confidenceScore) count++;
    return count;
  };

  // Update active filters count when filters change and apply to column filters
  const updateFilters = useCallback((newFilters: ContactSearchFilters): void => {
    setFilters(newFilters);
    setActiveFiltersCount(calculateActiveFilters(newFilters));

    // Convert filters to TanStack Table column filters format
    const newColumnFilters: ColumnFiltersState = [];

    if (newFilters.lifecycleStage?.length) {
      newColumnFilters.push({ id: "lifecycleStage", value: newFilters.lifecycleStage });
    }

    if (newFilters.source?.length) {
      newColumnFilters.push({ id: "source", value: newFilters.source });
    }

    setColumnFilters(newColumnFilters);
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback((): void => {
    updateFilters({});
    setColumnFilters([]);
  }, [updateFilters]);

  // Optimized clear selection handler
  const handleClearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  const handleExportContacts = useCallback((): void => {
    try {
      if (data.length === 0) {
        toast.error("No data to export");
        return;
      }

      const headers = ["Name", "Email", "Phone", "Stage", "Tags", "Last Note", "Last Updated"];
      const rows = data.map((contact) => {
        return [
          contact.displayName ?? "",
          contact.primaryEmail ?? "",
          contact.primaryPhone ?? "",
          contact.lifecycleStage ?? "",
          Array.isArray(contact.tags) ? contact.tags.join(", ") : "",
          contact.lastNote ?? "",
          contact.updatedAt ? new Date(contact.updatedAt).toLocaleDateString() : "",
        ];
      });

      const escapeCsv = (val: string): string => {
        const needsQuotes = /[",\n]/.test(val);
        const escaped = val.replace(/"/g, '""');
        return needsQuotes ? `"${escaped}"` : escaped;
      };

      const csv = [headers, ...rows]
        .map((r) => r.map((v) => escapeCsv(String(v ?? ""))).join(","))
        .join("\n");

      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contacts-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${data.length} contacts to CSV`);
    } catch {
      toast.error("Failed to export contacts");
    }
  }, [data]);

  // Apply hasNotes filter manually since it's not a column
  const filteredDataForNotes = useMemo(() => {
    if (filters.hasNotes === undefined) return data;

    return data.filter((contact) => {
      const hasNotes = contact.lastNote !== null && contact.lastNote.trim().length > 0;
      return filters.hasNotes ? hasNotes : !hasNotes;
    });
  }, [data, filters.hasNotes]);

  const table = useReactTable<ContactWithLastNote>({
    data: filteredDataForNotes,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    enableRowSelection: true,
    getRowId: (row) => row.id, // Use contact ID instead of array index
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    meta: {
      activeFilters: filters, // Pass filter state to columns via meta
    },
    initialState: {
      pagination: {
        pageSize: 25,
      },
      columnVisibility: {
        // Hide phone and email by default as requested
        primaryPhone: false,
        primaryEmail: false,
        // Hide source column by default (used for filtering only)
        source: false,
        // Ensure notes column is always visible
        lastNote: true,
      },
    },
  });

  // Get selected contact info for bulk operations
  const selectedContactInfo = useMemo(() => {
    const selectedRows = table.getSelectedRowModel().rows;
    const selectedIds = selectedRows.map((row) => row.id);
    const contactNames = selectedRows
      .map((row) => row.original.displayName)
      .filter((name) => name !== "Unknown");

    return { selectedIds, contactNames, count: selectedIds.length };
  }, [table]);

  // Show bulk delete confirmation dialog
  const handleBulkDeleteClick = useCallback(() => {
    if (selectedContactInfo.count === 0) {
      toast.error("No contacts selected");
      return;
    }
    setBulkDeleteDialogOpen(true);
  }, [selectedContactInfo.count]);

  // Execute bulk delete after confirmation
  const confirmBulkDelete = useCallback(() => {
    bulkDeleteContacts.mutate(selectedContactInfo.selectedIds, {
      onSuccess: () => {
        setRowSelection({}); // Clear selection after successful delete
        setBulkDeleteDialogOpen(false);
      },
      onError: () => {
        setBulkDeleteDialogOpen(false);
      },
    });
  }, [selectedContactInfo.selectedIds, bulkDeleteContacts, setRowSelection]);

  // Optimized bulk enrich handler - defined after table creation
  const handleBulkEnrich = useCallback(() => {
    const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
    const selectedRows = table.getSelectedRowModel().rows;
    const contactNames = selectedRows.map((row) => row.original.displayName);

    if (
      confirm(
        `Are you sure you want to enrich ${selectedIds.length} Contact(s) with AI insights?\n\nContacts: ${contactNames.join(", ")}\n\nThis may take a few minutes.`,
      )
    ) {
      bulkEnrichContacts.mutate(selectedIds, {
        onSuccess: () => {
          setRowSelection({}); // Clear selection after successful enrich
        },
      });
    }
  }, [rowSelection, table, bulkEnrichContacts]);

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedContactInfo.count > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted/50 border rounded-lg">
          <div className="text-sm font-medium">{selectedContactInfo.count} Contact(s) selected</div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleClearSelection}>
              Clear Selection
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={bulkDeleteContacts.isPending}
              onClick={handleBulkDeleteClick}
            >
              {bulkDeleteContacts.isPending ? "Deleting..." : "Delete Selected"}
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={bulkEnrichContacts.isPending}
              onClick={handleBulkEnrich}
            >
              <Brain className="mr-2 h-4 w-4" />
              {bulkEnrichContacts.isPending ? "Enriching..." : "Bulk Enrich"}
            </Button>
          </div>
        </div>
      )}

      {/* Column Visibility Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} Contact(s) found
        </div>
        <div className="flex items-center space-x-2">
          <ContactFilterDialog
            isOpen={isFilterDialogOpen}
            onOpenChange={setIsFilterDialogOpen}
            filters={filters}
            onFiltersChange={updateFilters}
            activeFiltersCount={activeFiltersCount}
            onClearAll={clearAllFilters}
          />
          <Button variant="outline" size="sm" onClick={handleExportContacts}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="mr-2 h-4 w-4" />
                Columns ({table.getVisibleLeafColumns().length})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="end">
              <div className="px-4 py-3 border-b">
                <h4 className="font-semibold text-sm">Toggle Columns</h4>
                <p className="text-xs text-muted-foreground">Choose which columns to display</p>
              </div>
              <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    const columnName =
                      column.id === "primaryEmail"
                        ? "Email"
                        : column.id === "primaryPhone"
                          ? "Phone"
                          : column.id === "displayName"
                            ? "Name"
                            : column.id === "lastNote"
                              ? "Notes"
                              : column.id === "updatedAt"
                                ? "Last Updated"
                                : column.id === "aiActions"
                                  ? "AI Actions"
                                  : column.id === "lifecycleStage"
                                    ? "Lifecycle Stage"
                                    : column.id === "tags"
                                      ? "Tags"
                                      : column.id === "source"
                                        ? "Source"
                                        : column.id === "notes"
                                          ? "AI Insights"
                                          : column.id;

                    return (
                      <div
                        key={column.id}
                        className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-sm cursor-pointer"
                        onClick={() => column.toggleVisibility()}
                      >
                        <div
                          className={`w-4 h-4 border border-primary rounded-sm flex items-center justify-center ${
                            column.getIsVisible() ? "bg-primary" : "bg-transparent"
                          }`}
                        >
                          {column.getIsVisible() && (
                            <div className="w-2 h-2 bg-primary-foreground rounded-[1px]" />
                          )}
                        </div>
                        <span className="text-sm flex-1">{columnName}</span>
                      </div>
                    );
                  })}
              </div>
              <div className="px-4 py-3 border-t">
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.toggleAllColumnsVisible(false)}
                  >
                    Hide All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.toggleAllColumnsVisible(true)}
                  >
                    Show All
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="rounded-md border overflow-auto max-h-[calc(100vh-24rem)]">
        <Table className="w-full relative">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="sticky top-0 bg-background z-10 border-b">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  data-testid={`contact-row-${row.id}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No contacts found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between space-x-2 py-4 px-4 border-t">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              data.length,
            )}{" "}
            of {data.length} contacts
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 25, 50, 100].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex w-[120px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Delete {selectedContactInfo.count} Contact(s)</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the following contacts? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-2 text-sm font-medium">Contacts to be deleted:</div>
            <div className="max-h-[200px] overflow-y-auto rounded-md border p-3">
              <ul className="space-y-1 text-sm">
                {selectedContactInfo.contactNames.map((name, index) => (
                  <li key={index} className="text-muted-foreground">
                    • {name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
              disabled={bulkDeleteContacts.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBulkDelete}
              disabled={bulkDeleteContacts.isPending}
            >
              {bulkDeleteContacts.isPending ? "Deleting..." : "Delete Contacts"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

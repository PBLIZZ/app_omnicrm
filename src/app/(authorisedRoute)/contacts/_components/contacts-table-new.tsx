"use client";

import { useState } from "react";
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
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  VisibilityState,
  SortingState,
  RowSelectionState,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Settings2 } from "lucide-react";
import { useBulkDeleteContacts } from "@/hooks/use-contact-delete";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function ContactsTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>): JSX.Element {
  const bulkDeleteContacts = useBulkDeleteContacts();
  const [sorting, setSorting] = useState<SortingState>([]);
  // Initialize column visibility from localStorage
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("contacts-column-visibility");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.warn("Failed to parse saved column visibility:", e);
        }
      }
    }
    return {};
  });

  // Save column visibility to localStorage when it changes
  const handleColumnVisibilityChange = (updater: any): void => {
    const newVisibility = typeof updater === "function" ? updater(columnVisibility) : updater;
    setColumnVisibility(newVisibility);
    if (typeof window !== "undefined") {
      localStorage.setItem("contacts-column-visibility", JSON.stringify(newVisibility));
    }
  };
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 25,
      },
      columnVisibility: {
        // Hide phone and email by default as requested
        primaryPhone: false,
        primaryEmail: false,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {Object.keys(rowSelection).length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted/50 border rounded-lg">
          <div className="text-sm font-medium">
            {Object.keys(rowSelection).length} contact(s) selected
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setRowSelection({})}>
              Clear Selection
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={bulkDeleteContacts.isPending}
              onClick={() => {
                const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
                const selectedRows = table.getSelectedRowModel().rows;
                const contactNames = selectedRows
                  .map((row) => (row.original as any).displayName)
                  .join(", ");

                if (
                  confirm(
                    `Are you sure you want to delete ${selectedIds.length} contact(s)?\n\nContacts: ${contactNames}\n\nThis action cannot be undone.`,
                  )
                ) {
                  bulkDeleteContacts.mutate(selectedIds, {
                    onSuccess: () => {
                      setRowSelection({}); // Clear selection after successful delete
                    },
                  });
                }
              }}
            >
              {bulkDeleteContacts.isPending ? "Deleting..." : "Delete Selected"}
            </Button>
            <Button variant="default" size="sm">
              Bulk Enrich
            </Button>
          </div>
        </div>
      )}

      {/* Column Visibility Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} contact(s) found
        </div>
        <div className="flex items-center space-x-2">
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
                            : column.id === "notesCount"
                              ? "Notes Count"
                              : column.id === "updatedAt"
                                ? "Last Updated"
                                : column.id === "aiActions"
                                  ? "AI Actions"
                                  : column.id === "stage"
                                    ? "Stage"
                                    : column.id === "tags"
                                      ? "Tags"
                                      : column.id === "notes"
                                        ? "AI Insights"
                                        : column.id === "interactions"
                                          ? "Interactions"
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
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
                  data-testid={`contact-row-${(row.original as any).id}`}
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
    </div>
  );
}

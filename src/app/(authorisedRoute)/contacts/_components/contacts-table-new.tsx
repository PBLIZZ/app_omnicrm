"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader as UITableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { TableBulkActions } from "./table-bulk-actions";
import { TableToolbarHeader } from "./table-header";
import { TablePagination } from "./table-pagination-new";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function ContactsTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
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
  const handleColumnVisibilityChange = (updater: any) => {
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
      <TableBulkActions
        table={table as any}
        rowSelection={rowSelection}
        onClearSelection={() => setRowSelection({})}
      />

      {/* Table Header with Column Controls */}
      <TableToolbarHeader table={table} totalCount={data.length} />

      <div className="rounded-md border">
        <Table>
          <UITableHeader>
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
          </UITableHeader>
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
      <TablePagination table={table} dataLength={data.length} />
    </div>
  );
}

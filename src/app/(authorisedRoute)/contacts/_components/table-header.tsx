"use client";

import { TableColumnVisibility } from "./table-column-visibility";
import type { Table } from "@tanstack/react-table";

interface TableToolbarHeaderProps<TData> {
  table: Table<TData>;
  totalCount: number;
}

export function TableToolbarHeader<TData>({ table, totalCount }: TableToolbarHeaderProps<TData>) {
  const filteredCount = table.getFilteredRowModel().rows.length;
  const isFiltered = totalCount !== filteredCount;

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        {isFiltered ? (
          <>
            {filteredCount} of {totalCount} contact(s) found
          </>
        ) : (
          <>{totalCount} contact(s) found</>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <TableColumnVisibility table={table} />
      </div>
    </div>
  );
}

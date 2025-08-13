import { useEffect, useMemo, useState } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  RowSelectionState,
  SortingState,
  Updater,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ContactRow {
  id: string;
  displayName: string;
  primaryEmail?: string | undefined;
  primaryPhone?: string | undefined;
  createdAt?: string | undefined;
}

interface Props {
  data: ContactRow[];
  onOpen?: (id: string) => void;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (updater: Updater<RowSelectionState>) => void;
  onSelectionChange?: (ids: string[]) => void;
}

export function ContactTable({
  data,
  onOpen,
  rowSelection,
  onRowSelectionChange,
  onSelectionChange,
}: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "displayName", desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  function isInRange(
    dateIso: string | undefined,
    mode: string,
    from?: string,
    to?: string,
  ): boolean {
    if (!dateIso) return false;
    const d = new Date(dateIso);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (mode) {
      case "today":
        return d >= startOfDay;
      case "week": {
        const day = startOfDay.getDay();
        const diff = (day + 6) % 7; // Monday as start
        const weekStart = new Date(startOfDay);
        weekStart.setDate(startOfDay.getDate() - diff);
        return d >= weekStart;
      }
      case "month":
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      case "quarter": {
        const q = Math.floor(now.getMonth() / 3);
        const qStart = new Date(now.getFullYear(), q * 3, 1);
        return d >= qStart;
      }
      case "year":
        return d.getFullYear() === now.getFullYear();
      case "range": {
        if (!from || !to) return true;
        const f = new Date(from);
        const t = new Date(to);
        return d >= f && d <= t;
      }
      default:
        return true;
    }
  }
  const columns = useMemo<ColumnDef<ContactRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => {
          const checked = table.getIsAllPageRowsSelected();
          const indeterminate = table.getIsSomePageRowsSelected();
          return (
            <input
              type="checkbox"
              aria-label="Select all contacts"
              checked={checked}
              ref={(el) => {
                if (el) el.indeterminate = indeterminate && !checked;
              }}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
              className="cursor-pointer"
            />
          );
        },
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Select ${row.original.displayName}`}
            checked={row.getIsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = row.getIsSomeSelected();
            }}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
            className="cursor-pointer"
          />
        ),
        size: 36,
      },
      {
        accessorKey: "displayName",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="px-0"
            onClick={column.getToggleSortingHandler() || (() => {})}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                const h = column.getToggleSortingHandler();
                if (h) h(e);
              }
            }}
            aria-label={`Sort by name ${column.getIsSorted() === "asc" ? "descending" : "ascending"}`}
          >
            Name
            {column.getIsSorted() === "asc" ? " ▲" : column.getIsSorted() === "desc" ? " ▼" : ""}
          </Button>
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.displayName}</span>,
        enableSorting: true,
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "primaryEmail",
        header: "Email",
        cell: ({ row }) => row.original.primaryEmail || "—",
      },
      {
        accessorKey: "primaryPhone",
        header: "Phone",
        cell: ({ row }) => row.original.primaryPhone || "—",
      },
      {
        accessorKey: "createdAt",
        header: ({ column, table }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="px-0"
              onClick={column.getToggleSortingHandler() || (() => {})}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  const h2 = column.getToggleSortingHandler();
                  if (h2) h2(e);
                }
              }}
              aria-label={`Sort by date added ${column.getIsSorted() === "asc" ? "descending" : "ascending"}`}
            >
              Added
              {column.getIsSorted() === "asc" ? " ▲" : column.getIsSorted() === "desc" ? " ▼" : ""}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Filter by date added"
                  aria-haspopup="menu"
                >
                  Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {[
                  { k: "any", l: "Any time" },
                  { k: "today", l: "Today" },
                  { k: "week", l: "This week" },
                  { k: "month", l: "This month" },
                  { k: "quarter", l: "Last 3 months" },
                  { k: "year", l: "This year" },
                ].map((opt) => (
                  <DropdownMenuItem
                    key={opt.k}
                    onClick={() => {
                      table.getColumn("createdAt")?.setFilterValue({ mode: opt.k });
                    }}
                  >
                    {opt.l}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  onClick={() => {
                    table.getColumn("createdAt")?.setFilterValue(undefined);
                  }}
                >
                  Clear filter
                </DropdownMenuItem>
                <div className="p-3 w-72 border-t">
                  <div className="text-xs text-muted-foreground mb-2">Custom range</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      className="border rounded px-2 py-1 text-sm flex-1"
                      aria-label="Filter from date"
                      onChange={(e) => {
                        const current =
                          (table.getColumn("createdAt")?.getFilterValue() as {
                            mode?: string;
                            from?: string;
                            to?: string;
                          }) || {};
                        table
                          .getColumn("createdAt")
                          ?.setFilterValue({ ...current, mode: "range", from: e.target.value });
                      }}
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <input
                      type="date"
                      className="border rounded px-2 py-1 text-sm flex-1"
                      aria-label="Filter to date"
                      onChange={(e) => {
                        const current =
                          (table.getColumn("createdAt")?.getFilterValue() as {
                            mode?: string;
                            from?: string;
                            to?: string;
                          }) || {};
                        table
                          .getColumn("createdAt")
                          ?.setFilterValue({ ...current, mode: "range", to: e.target.value });
                      }}
                    />
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        cell: ({ row }) =>
          row.original.createdAt
            ? new Date(row.original.createdAt).toLocaleDateString("en-GB")
            : "—",
        filterFn: (row, _columnId, value) => {
          const v = value as { mode?: string; from?: string; to?: string } | undefined;
          if (!v || !v.mode || v.mode === "any") return true;
          return isInRange(row.original.createdAt, v.mode, v.from, v.to);
        },
        enableSorting: true,
        sortingFn: "datetime",
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    state: { rowSelection: rowSelection ?? {}, sorting, columnFilters },
    enableRowSelection: true,
    onRowSelectionChange: onRowSelectionChange as (updater: Updater<RowSelectionState>) => void,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  useEffect(() => {
    if (!onSelectionChange) return;
    const ids = table.getSelectedRowModel().rows.map((r) => r.original.id);
    onSelectionChange(ids);
  }, [rowSelection, data, onSelectionChange, table]);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer focus-within:bg-muted/50 hover:bg-muted/50"
                onClick={() => onOpen?.(row.original.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onOpen?.(row.original.id);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Open contact ${row.original.displayName}`}
                data-testid={`open-contact-${row.original.id}`}
                data-state={row.getIsSelected() ? "selected" : undefined}
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
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                No contacts found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

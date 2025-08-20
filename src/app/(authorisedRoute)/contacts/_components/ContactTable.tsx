import React, { useEffect, useMemo, useState } from "react";
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
  getPaginationRowModel,
  useReactTable,
  Table as ReactTable,
  Column,
  Row,
  Cell,
  Header,
  HeaderGroup,
  VisibilityState,
  ExpandedState,
  getExpandedRowModel,
} from "@tanstack/react-table";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Avatar,
  AvatarFallback,
  AvatarImage,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Badge,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Edit,
  Trash2,
  Phone,
  Mail,
  Calendar,
  Filter,
  SortAsc,
  SortDesc,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export interface ContactRow {
  id: string;
  displayName: string;
  primaryEmail?: string | undefined;
  primaryPhone?: string | undefined;
  createdAt?: string | undefined;
  avatar?: string | undefined;
  tags?: string[];
  lifecycleStage?: "lead" | "prospect" | "customer" | "advocate" | undefined;
  lastContactDate?: string | undefined;
  notes?: string | undefined;
  company?: string | undefined;
}

interface DateFilterValue {
  mode?: string;
  from?: string;
  to?: string;
}

interface Props {
  data: ContactRow[];
  onOpen?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (updater: Updater<RowSelectionState>) => void;
  onSelectionChange?: (ids: string[]) => void;
  pageSize?: number;
  showPagination?: boolean;
}

export function ContactTable({
  data,
  onOpen,
  onEdit,
  onDelete,
  rowSelection,
  onRowSelectionChange,
  onSelectionChange,
  pageSize = 25,
  showPagination = true,
}: Props): JSX.Element {
  const [sorting, setSorting] = useState<SortingState>([{ id: "displayName", desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });

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
  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getLifecycleBadgeVariant = (
    stage?: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (stage) {
      case "lead":
        return "secondary";
      case "prospect":
        return "outline";
      case "customer":
        return "default";
      case "advocate":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const columns = useMemo<ColumnDef<ContactRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }: { table: ReactTable<ContactRow> }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all contacts"
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }: { row: Row<ContactRow> }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={`Select ${row.original.displayName}`}
            className="translate-y-[2px]"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
      {
        id: "expand",
        header: () => null,
        cell: ({ row }: { row: Row<ContactRow> }) => {
          if (!row.original.notes && !row.original.company) return null;
          return (
            <Button
              variant="ghost"
              className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                row.toggleExpanded();
              }}
            >
              {row.getIsExpanded() ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span className="sr-only">Toggle row expansion</span>
            </Button>
          );
        },
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
      {
        accessorKey: "displayName",
        header: ({ column }: { column: Column<ContactRow> }) => (
          <Button
            variant="ghost"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            {column.getIsSorted() === "asc" ? (
              <SortAsc className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <SortDesc className="ml-2 h-4 w-4" />
            ) : (
              <Filter className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }: { row: Row<ContactRow> }) => {
          const contact = row.original;
          return (
            <HoverCard>
              <HoverCardTrigger asChild>
                <div className="flex items-center space-x-3 cursor-pointer">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={contact.avatar} alt={contact.displayName} />
                    <AvatarFallback className="text-xs">
                      {getInitials(contact.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">{contact.displayName}</span>
                    {contact.company && (
                      <span className="text-sm text-muted-foreground">{contact.company}</span>
                    )}
                  </div>
                </div>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="flex justify-between space-x-4">
                  <Avatar>
                    <AvatarImage src={contact.avatar} />
                    <AvatarFallback>{getInitials(contact.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">{contact.displayName}</h4>
                    {contact.company && (
                      <p className="text-sm text-muted-foreground">{contact.company}</p>
                    )}
                    {contact.primaryEmail && (
                      <div className="flex items-center pt-2">
                        <Mail className="mr-2 h-4 w-4 opacity-70" />
                        <span className="text-xs text-muted-foreground">
                          {contact.primaryEmail}
                        </span>
                      </div>
                    )}
                    {contact.primaryPhone && (
                      <div className="flex items-center">
                        <Phone className="mr-2 h-4 w-4 opacity-70" />
                        <span className="text-xs text-muted-foreground">
                          {contact.primaryPhone}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          );
        },
        enableSorting: true,
        sortingFn: "alphanumeric",
      },
      {
        accessorKey: "primaryEmail",
        header: ({ column }: { column: Column<ContactRow> }) => (
          <Button
            variant="ghost"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Email
            {column.getIsSorted() === "asc" ? (
              <SortAsc className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <SortDesc className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        ),
        cell: ({ row }: { row: Row<ContactRow> }) => {
          const email = row.original.primaryEmail;
          return email ? (
            <a
              href={`mailto:${email}`}
              className="text-blue-600 hover:text-blue-800 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {email}
            </a>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: "primaryPhone",
        header: ({ column }: { column: Column<ContactRow> }) => (
          <Button
            variant="ghost"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Phone
            {column.getIsSorted() === "asc" ? (
              <SortAsc className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <SortDesc className="ml-2 h-4 w-4" />
            ) : null}
          </Button>
        ),
        cell: ({ row }: { row: Row<ContactRow> }) => {
          const phone = row.original.primaryPhone;
          return phone ? (
            <a
              href={`tel:${phone}`}
              className="text-blue-600 hover:text-blue-800 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {phone}
            </a>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: "lifecycleStage",
        header: ({ column }: { column: Column<ContactRow> }) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              className="-ml-3 h-8 data-[state=open]:bg-accent"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Stage
              {column.getIsSorted() === "asc" ? (
                <SortAsc className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <SortDesc className="ml-2 h-4 w-4" />
              ) : null}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {["lead", "prospect", "customer", "advocate"].map((stage) => (
                  <DropdownMenuItem
                    key={stage}
                    onClick={() => {
                      const filterValue = column.getFilterValue();
                      if (filterValue === stage) {
                        column.setFilterValue(undefined);
                      } else {
                        column.setFilterValue(stage);
                      }
                    }}
                    className="capitalize"
                  >
                    <Checkbox checked={column.getFilterValue() === stage} className="mr-2" />
                    {stage}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => column.setFilterValue(undefined)}>
                  Clear filter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        cell: ({ row }: { row: Row<ContactRow> }) => {
          const stage = row.original.lifecycleStage;
          return stage ? (
            <Badge variant={getLifecycleBadgeVariant(stage)} className="capitalize">
              {stage}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
        filterFn: (row, id, value) => {
          return value ? row.getValue(id) === value : true;
        },
        enableSorting: true,
      },
      {
        accessorKey: "tags",
        header: "Tags",
        cell: ({ row }: { row: Row<ContactRow> }) => {
          const tags = row.original.tags;
          return tags && tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {tags.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{tags.length - 2}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
        enableSorting: false,
        filterFn: (row, id, value: string) => {
          if (!value) return true;
          const tags = row.original.tags ?? [];
          return tags.some((tag) => tag.toLowerCase().includes(value.toLowerCase()));
        },
      },
      {
        accessorKey: "createdAt",
        header: ({
          column,
          table,
        }: {
          column: Column<ContactRow>;
          table: ReactTable<ContactRow>;
        }) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              className="-ml-3 h-8 data-[state=open]:bg-accent"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              Added
              {column.getIsSorted() === "asc" ? (
                <SortAsc className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <SortDesc className="ml-2 h-4 w-4" />
              ) : null}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
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
                    <Calendar className="mr-2 h-4 w-4" />
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        cell: ({ row }: { row: Row<ContactRow> }) =>
          row.original.createdAt
            ? new Date(row.original.createdAt).toLocaleDateString("en-GB")
            : "—",
        filterFn: (row: Row<ContactRow>, _columnId: string, value: DateFilterValue | undefined) => {
          const v = value;
          if (!v?.mode || v.mode === "any") return true;
          return isInRange(row.original.createdAt, v.mode, v.from, v.to);
        },
        enableSorting: true,
        sortingFn: "datetime",
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }: { row: Row<ContactRow> }) => {
          const contact = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[160px]">
                <DropdownMenuItem onClick={() => onOpen?.(contact.id)}>
                  <Calendar className="mr-2 h-4 w-4" />
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(contact.id)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit contact
                </DropdownMenuItem>
                {contact.primaryEmail && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`mailto:${contact.primaryEmail}`, "_blank");
                    }}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send email
                  </DropdownMenuItem>
                )}
                {contact.primaryPhone && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`tel:${contact.primaryPhone}`, "_blank");
                    }}
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    Call contact
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onDelete?.(contact.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
    ],
    [onOpen, onEdit, onDelete],
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection: rowSelection ?? {},
      sorting,
      columnFilters,
      columnVisibility,
      expanded,
      pagination,
    },
    enableRowSelection: true,
    enableExpanding: true,
    onRowSelectionChange: onRowSelectionChange as (updater: Updater<RowSelectionState>) => void,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onExpandedChange: setExpanded,
    onPaginationChange: setPagination,
    getRowId: (row: ContactRow) => row.id,
    getRowCanExpand: (row) => Boolean(row.original.notes ?? row.original.company),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  useEffect(() => {
    if (!onSelectionChange) return;
    const ids = table.getSelectedRowModel().rows.map((r: Row<ContactRow>) => r.original.id);
    onSelectionChange(ids);
  }, [rowSelection, data, onSelectionChange, table]);

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup: HeaderGroup<ContactRow>) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header: Header<ContactRow, unknown>) => (
                  <TableHead key={header.id} className="h-12">
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
              table.getRowModel().rows.map((row: Row<ContactRow>) => (
                <React.Fragment key={row.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50 data-[state=selected]:bg-muted"
                    onClick={() => onOpen?.(row.original.id)}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                  >
                    {row.getVisibleCells().map((cell: Cell<ContactRow, unknown>) => (
                      <TableCell key={cell.id} className="h-16">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() && (row.original.notes ?? row.original.company) && (
                    <TableRow>
                      <TableCell />
                      <TableCell colSpan={columns.length - 1} className="bg-muted/25">
                        <div className="py-4 px-4 space-y-3">
                          {row.original.company && (
                            <div>
                              <h4 className="text-sm font-medium mb-1">Company</h4>
                              <p className="text-sm text-muted-foreground">
                                {row.original.company}
                              </p>
                            </div>
                          )}
                          {row.original.notes && (
                            <div>
                              <h4 className="text-sm font-medium mb-1">Notes</h4>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {row.original.notes}
                              </p>
                            </div>
                          )}
                          {row.original.lastContactDate && (
                            <div>
                              <h4 className="text-sm font-medium mb-1">Last Contact</h4>
                              <p className="text-sm text-muted-foreground">
                                {new Date(row.original.lastContactDate).toLocaleDateString(
                                  "en-GB",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  },
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
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

      {showPagination && (
        <div className="flex items-center justify-between px-2">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="flex items-center space-x-6 lg:space-x-8">
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
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
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
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

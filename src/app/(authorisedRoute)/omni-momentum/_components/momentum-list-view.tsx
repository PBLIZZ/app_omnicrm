"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  MoreHorizontal,
  Edit,
  Trash2,
  Clock,
  User,
  Bot,
  Calendar,
  Flag,
  CheckSquare,
} from "lucide-react";
import { format } from "date-fns";
import type { Momentum } from "@/server/db/schema";

interface MomentumListViewProps {
  momentums: Array<Momentum & { taggedContactsData?: Array<{ id: string; displayName: string }> }>;
  isLoading: boolean;
}

// Helper functions for display
const getStatusBadge = (status: string): JSX.Element => {
  const statusVariants = {
    todo: "secondary",
    in_progress: "default",
    waiting: "outline",
    done: "secondary",
    cancelled: "destructive",
  } as const;

  const labels = {
    todo: "To Do",
    in_progress: "In Progress",
    waiting: "Waiting",
    done: "Done",
    cancelled: "Cancelled",
  } as const;

  return (
    <Badge variant={statusVariants[status as keyof typeof statusVariants] || "secondary"}>
      {labels[status as keyof typeof labels] || status}
    </Badge>
  );
};

const getPriorityBadge = (priority: string): JSX.Element => {
  const colors = {
    low: "text-green-600 dark:text-green-400",
    medium: "text-blue-600 dark:text-blue-400",
    high: "text-orange-600 dark:text-orange-400",
    urgent: "text-red-600 dark:text-red-400",
  } as const;

  return (
    <div className="flex items-center gap-2">
      <Flag className={`h-3 w-3 ${colors[priority as keyof typeof colors] || ""}`} />
      <span className="capitalize">{priority}</span>
    </div>
  );
};

export function MomentumListView({ momentums, isLoading }: MomentumListViewProps): JSX.Element {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const columns: ColumnDef<
    Momentum & { taggedContactsData?: Array<{ id: string; displayName: string }> }
  >[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value);
            if (value) {
              setSelectedTasks(momentums.map((t) => t.id));
            } else {
              setSelectedTasks([]);
            }
          }}
          aria-label="Select all"
          data-testid="checkbox-select-all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => {
            row.toggleSelected(!!value);
            if (value) {
              setSelectedTasks((prev) => [...prev, row.original.id]);
            } else {
              setSelectedTasks((prev) => prev.filter((id) => id !== row.original.id));
            }
          }}
          aria-label="Select row"
          data-testid={`checkbox-select-${row.original.id}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent p-0 h-auto font-medium justify-start"
          data-testid="button-sort-title"
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const task = row.original;
        return (
          <div className="space-y-1">
            <div className="font-medium flex items-center gap-2">
              {task.source === "ai_generated" && <Bot className="h-3 w-3 text-blue-500" />}
              {task.title}
            </div>
            {task.description && (
              <div className="text-sm text-muted-foreground line-clamp-2">{task.description}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent p-0 h-auto font-medium justify-start"
          data-testid="button-sort-status"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => getStatusBadge(row.getValue("status")),
    },
    {
      accessorKey: "priority",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent p-0 h-auto font-medium justify-start"
          data-testid="button-sort-priority"
        >
          Priority
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => getPriorityBadge(row.getValue("priority")),
    },
    {
      accessorKey: "assignee",
      header: "Assignee",
      cell: ({ row }) => {
        const assignee = row.getValue("assignee") as string;
        return (
          <div className="flex items-center gap-2">
            {assignee === "ai" ? (
              <>
                <Bot className="h-4 w-4 text-blue-500" />
                <span>AI</span>
              </>
            ) : (
              <>
                <User className="h-4 w-4 text-green-600" />
                <span>Me</span>
              </>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "taggedContacts",
      header: "Contacts",
      cell: ({ row }) => {
        const contacts = row.original.taggedContactsData || [];
        if (contacts.length === 0) return <span className="text-muted-foreground">—</span>;

        return (
          <div className="flex items-center gap-1">
            {contacts.slice(0, 3).map((contact) => (
              <Avatar key={contact.id} className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {contact.displayName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            ))}
            {contacts.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{contacts.length - 3}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "dueDate",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent p-0 h-auto font-medium justify-start"
          data-testid="button-sort-due-date"
        >
          Due Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const dueDate = row.getValue("dueDate") as Date | null;
        if (!dueDate) return <span className="text-muted-foreground">—</span>;

        const isOverdue = new Date() > dueDate;
        return (
          <div className={`flex items-center gap-2 ${isOverdue ? "text-red-600" : ""}`}>
            <Calendar className="h-3 w-3" />
            {format(dueDate, "MMM dd, yyyy")}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent p-0 h-auto font-medium justify-start"
          data-testid="button-sort-created"
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const createdAt = row.getValue("createdAt") as Date;
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            {format(createdAt, "MMM dd")}
          </div>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const task = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                data-testid={`button-actions-${task.id}`}
              >
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit Task
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: momentums,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="w-full h-16" />
        ))}
      </div>
    );
  }

  if (momentums.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto max-w-sm">
          <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No tasks found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            No tasks match your current filters. Try adjusting your search or create a new task.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedTasks.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedTasks.length} task{selectedTasks.length === 1 ? "" : "s"} selected
          </span>
          <Button variant="outline" size="sm">
            Mark as Done
          </Button>
          <Button variant="outline" size="sm">
            Change Status
          </Button>
          <Button variant="outline" size="sm" className="text-red-600">
            Delete
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border" data-testid="table-tasks">
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  data-testid={`row-task-${row.original.id}`}
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
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

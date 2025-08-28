import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Calendar,
  Clock,
  User,
  Tag,
  ArrowUpDown,
  Filter,
  Search,
  CheckCircle,
  Circle,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { EnhancedTask } from "@/lib/task-utils";
import {
  getPriorityColor,
  getUrgencyColor,
  getEisenhowerQuadrantInfo,
  getStatusIcon,
} from "@/lib/task-utils";

interface TasksTableViewProps {
  tasks: EnhancedTask[];
  onEditTask: (task: EnhancedTask) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleComplete: (task: EnhancedTask) => void;
  isLoading?: boolean;
}

const columnHelper = createColumnHelper<EnhancedTask>();

export function TasksTableView({
  tasks,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
  isLoading = false,
}: TasksTableViewProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "urgency", desc: true },
    { id: "priority", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo(
    () => [
      // Status column with completion toggle
      columnHelper.accessor("status", {
        id: "status",
        header: "Status",
        size: 80,
        cell: ({ row, getValue }) => {
          const status = getValue();
          const task = row.original;
          return (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onToggleComplete(task)}
              >
                {task.completed ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4 text-gray-400" />
                )}
              </Button>
              <span className="text-lg">{getStatusIcon(status)}</span>
            </div>
          );
        },
      }),

      // Title with progress bar
      columnHelper.accessor("title", {
        id: "title",
        header: "Task",
        size: 300,
        cell: ({ row, getValue }) => {
          const title = getValue();
          const task = row.original;
          return (
            <div className="space-y-2">
              <div className="font-medium text-sm leading-tight">{title}</div>
              {task.description && (
                <div className="text-xs text-muted-foreground line-clamp-2">{task.description}</div>
              )}
              {task.completionPercentage > 0 && (
                <Progress value={task.completionPercentage} className="h-1" />
              )}
              {task.subtasks && task.subtasks.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {task.subtasks.filter((st) => st.completed).length}/{task.subtasks.length}{" "}
                  subtasks
                </div>
              )}
            </div>
          );
        },
      }),

      // Priority with color coding
      columnHelper.accessor("priority", {
        id: "priority",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Priority
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        size: 100,
        cell: ({ getValue }) => {
          const priority = getValue();
          const colors = {
            low: "bg-green-100 text-green-800",
            medium: "bg-blue-100 text-blue-800",
            high: "bg-orange-100 text-orange-800",
            urgent: "bg-red-100 text-red-800",
          };
          return (
            <Badge className={colors[priority as keyof typeof colors] || colors.medium}>
              {priority.toUpperCase()}
            </Badge>
          );
        },
        sortingFn: (rowA, rowB) => {
          const priorityOrder = { low: 1, medium: 2, high: 3, urgent: 4 };
          const a = priorityOrder[rowA.original.priority as keyof typeof priorityOrder] || 2;
          const b = priorityOrder[rowB.original.priority as keyof typeof priorityOrder] || 2;
          return a - b;
        },
      }),

      // Urgency with color coding
      columnHelper.accessor("urgency", {
        id: "urgency",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Urgency
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        size: 120,
        cell: ({ getValue, row }) => {
          const urgency = getValue();
          const task = row.original;
          return (
            <div className="space-y-1">
              <Badge className={getUrgencyColor(urgency)}>
                {urgency.replace("_", " ").toUpperCase()}
              </Badge>
              {urgency === "overdue" && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  Overdue
                </div>
              )}
            </div>
          );
        },
        sortingFn: (rowA, rowB) => {
          const urgencyOrder = { future: 1, due_soon: 2, due_today: 3, overdue: 4 };
          const a = urgencyOrder[rowA.original.urgency] || 1;
          const b = urgencyOrder[rowB.original.urgency] || 1;
          return a - b;
        },
      }),

      // Eisenhower Quadrant
      columnHelper.accessor("eisenhowerQuadrant", {
        id: "eisenhowerQuadrant",
        header: "Matrix",
        size: 120,
        cell: ({ getValue }) => {
          const quadrant = getValue();
          const quadrantInfo = getEisenhowerQuadrantInfo(quadrant);
          return (
            <div className="space-y-1">
              <Badge className={quadrantInfo.color}>Q{quadrant}</Badge>
              <div className="text-xs text-muted-foreground">{quadrantInfo.label}</div>
            </div>
          );
        },
      }),

      // Due Date
      columnHelper.accessor("dueDate", {
        id: "dueDate",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2"
          >
            Due Date
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        size: 120,
        cell: ({ getValue, row }) => {
          const dueDate = getValue();
          const task = row.original;
          if (!dueDate) return <span className="text-muted-foreground">-</span>;

          return (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm">
                <Calendar className="h-3 w-3" />
                {format(new Date(dueDate), "MMM d")}
              </div>
              {task.urgency === "overdue" && (
                <div className="text-xs text-red-600 font-medium">
                  {Math.abs(
                    Math.floor(
                      (new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24),
                    ),
                  )}{" "}
                  days overdue
                </div>
              )}
            </div>
          );
        },
      }),

      // Estimated Time
      columnHelper.accessor("estimatedMinutes", {
        id: "estimatedMinutes",
        header: "Time",
        size: 80,
        cell: ({ getValue, row }) => {
          const estimated = getValue();
          const actual = row.original.actualMinutes;
          if (!estimated) return <span className="text-muted-foreground">-</span>;

          return (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm">
                <Clock className="h-3 w-3" />
                {Math.round(estimated / 60)}h
              </div>
              {actual && (
                <div className="text-xs text-muted-foreground">
                  Actual: {Math.round(actual / 60)}h
                </div>
              )}
            </div>
          );
        },
      }),

      // Category & Tags
      columnHelper.accessor("category", {
        id: "category",
        header: "Category",
        size: 150,
        cell: ({ getValue, row }) => {
          const category = getValue();
          const tags = row.original.tags;
          return (
            <div className="space-y-1">
              {category && (
                <Badge variant="outline" className="text-xs">
                  {category}
                </Badge>
              )}
              {tags && tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      <Tag className="h-2 w-2 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                  {tags.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{tags.length - 2}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          );
        },
      }),

      // Assigned Contacts
      columnHelper.accessor("taggedContactsData", {
        id: "contacts",
        header: "Contacts",
        size: 120,
        cell: ({ getValue }) => {
          const contacts = getValue();
          if (!contacts || contacts.length === 0) {
            return <span className="text-muted-foreground">-</span>;
          }

          return (
            <div className="flex items-center gap-1">
              <div className="flex -space-x-1">
                {contacts.slice(0, 3).map((contact) => (
                  <Avatar key={contact.id} className="h-6 w-6 border-2 border-background">
                    <AvatarFallback className="text-xs">
                      {contact.displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {contacts.length > 3 && (
                <span className="text-xs text-muted-foreground ml-1">+{contacts.length - 3}</span>
              )}
            </div>
          );
        },
      }),

      // Workspace & Project
      columnHelper.accessor("workspaceName", {
        id: "workspace",
        header: "Context",
        size: 150,
        cell: ({ getValue, row }) => {
          const workspace = getValue();
          const project = row.original.projectName;
          return (
            <div className="space-y-1">
              {workspace && <div className="text-xs text-muted-foreground">📁 {workspace}</div>}
              {project && <div className="text-xs text-muted-foreground">📋 {project}</div>}
            </div>
          );
        },
      }),

      // Actions
      columnHelper.display({
        id: "actions",
        size: 60,
        cell: ({ row }) => {
          const task = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEditTask(task)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleComplete(task)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {task.completed ? "Mark Incomplete" : "Mark Complete"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDeleteTask(task.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      }),
    ],
    [onEditTask, onDeleteTask, onToggleComplete],
  );

  const table = useReactTable({
    data: tasks,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tasks List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Tasks List</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="px-4 py-3"
                    >
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
                    className={`hover:bg-muted/50 ${row.original.completed ? "opacity-60" : ""} ${
                      row.original.urgency === "overdue" ? "bg-red-50 hover:bg-red-100" : ""
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No tasks found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Showing{" "}
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length,
            )}{" "}
            of {table.getFilteredRowModel().rows.length} tasks
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

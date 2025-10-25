"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { Search, ListTodo, Plus } from "lucide-react";
import { useMomentum } from "@/hooks/use-momentum";
import { useZones } from "@/hooks/use-zones";
import type { Task } from "@/server/db/schema";

/**
 * ActionsListView - Full TanStack Table for All Tasks
 *
 * Features:
 * - Pagination
 * - Filtering (by zone, status, priority)
 * - Search
 * - Sorting
 * - Grouping by time of day
 */
export function ActionsListView(): JSX.Element {
  const { tasks, isLoadingTasks } = useMomentum();
  const { zones } = useZones();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<ColumnDef<Task>[]>(
    () => [
      {
        id: "select",
        header: "",
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300"
            checked={row.original.status === "done"}
            onChange={() => {
              // TODO: Implement task completion toggle
            }}
          />
        ),
        size: 40,
      },
      {
        accessorKey: "name",
        header: "Task",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-sm text-gray-900">{row.original.name}</span>
            {row.original.details && typeof row.original.details === "object" && (
              <span className="text-xs text-gray-500 mt-0.5">
                {(row.original.details as { description?: string }).description}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => {
          const priority = row.original.priority;
          const colors: Record<string, string> = {
            urgent: "bg-red-100 text-red-800 border-red-200",
            high: "bg-orange-100 text-orange-800 border-orange-200",
            medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
            low: "bg-green-100 text-green-800 border-green-200",
          };
          return (
            <Badge className={`text-xs border ${colors[priority] || colors["medium"]}`}>
              {priority}
            </Badge>
          );
        },
        size: 100,
      },
      {
        accessorKey: "zoneId",
        header: "Zone",
        cell: ({ row }) => {
          const zoneId = row.original.zoneId;
          const zone = zones.find((z) => z.id === zoneId);
          return zone ? (
            <Badge
              variant="outline"
              className="text-xs"
              style={{
                borderColor: zone.color || "#6366F1",
                color: zone.color || "#6366F1",
              }}
            >
              {zone.name}
            </Badge>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          );
        },
        size: 120,
      },
      {
        accessorKey: "dueDate",
        header: "Due",
        cell: ({ row }) => {
          const dueDate = row.original.dueDate;
          if (!dueDate) return <span className="text-xs text-gray-400">—</span>;
          return (
            <span className="text-xs text-gray-600">{format(new Date(dueDate), "MMM d")}</span>
          );
        },
        size: 100,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status;
          const colors: Record<string, string> = {
            todo: "bg-gray-100 text-gray-800",
            in_progress: "bg-blue-100 text-blue-800",
            done: "bg-green-100 text-green-800",
            canceled: "bg-red-100 text-red-800",
          };
          return (
            <Badge className={`text-xs ${colors[status] || colors["todo"]}`}>
              {status.replace("_", " ")}
            </Badge>
          );
        },
        size: 120,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: tasks,
    columns,
    state: {
      columnFilters,
      sorting,
      globalFilter,
    },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  if (isLoadingTasks) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Actions List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 bg-gray-100 rounded" />
              </div>
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
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-blue-600" />
            Actions List
          </CardTitle>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-1" />
            New Task
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search tasks..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={(columnFilters.find((f) => f.id === "status")?.value as string) ?? "all"}
            onValueChange={(value) => {
              if (value === "all") {
                setColumnFilters((prev) => prev.filter((f) => f.id !== "status"));
              } else {
                setColumnFilters((prev) => [
                  ...prev.filter((f) => f.id !== "status"),
                  { id: "status", value },
                ]);
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={(columnFilters.find((f) => f.id === "priority")?.value as string) ?? "all"}
            onValueChange={(value) => {
              if (value === "all") {
                setColumnFilters((prev) => prev.filter((f) => f.id !== "priority"));
              } else {
                setColumnFilters((prev) => [
                  ...prev.filter((f) => f.id !== "priority"),
                  { id: "priority", value },
                ]);
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <table className="w-full">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center">
                    <ListTodo className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No tasks found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Use Magic Inbox above to add your first task
                    </p>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 cursor-pointer transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {table.getRowModel().rows.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              Showing{" "}
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length,
              )}{" "}
              of {table.getFilteredRowModel().rows.length} tasks
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

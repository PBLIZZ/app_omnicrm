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
  Checkbox,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type ExpandedState,
  type RowSelectionState,
  flexRender,
} from "@tanstack/react-table";
import { formatOrdinal } from "@/lib/utils/date-helpers";
import {
  Search,
  ListTodo,
  Plus,
  Check,
  Circle,
  Flag,
  ChevronRight,
  ChevronDown,
  Trash2,
  Tag as TagIcon,
  ArrowUpDown,
  CheckSquare,
} from "lucide-react";
import { useMomentum } from "@/hooks/use-momentum";
import { useZones } from "@/hooks/use-zones";
import { TAG_CATEGORY_TEXT_COLORS, TAG_CATEGORY_BORDER_COLORS, type TagCategory } from "@/lib/tag-categories";
import type { Task as BaseTask } from "@/server/db/schema";

// Subtask type from details.subtasks JSONB
interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  duration?: string;
}

// Tag type from task tags
interface TaskTag {
  id: string;
  name: string;
  color: string;
  category: string | null;
}

// Extended Task type with optional tags
type Task = BaseTask & {
  tags?: TaskTag[];
};

// Helper to extract subtasks from task details
function getSubtasks(task: Task): Subtask[] {
  if (!task.details || typeof task.details !== "object") return [];
  const details = task.details as { subtasks?: Subtask[] };
  return details.subtasks || [];
}

/**
 * ActionsListView - Simplified Task Management Table
 *
 * Features:
 * - Select mode toggle (checkboxes hidden by default)
 * - Simple todo/done status (removed in-progress, canceled)
 * - Any.do-style completed tasks (grey circle, white checkmark, strikethrough, lighter text)
 * - Bulk actions: mark done, delete, change priority
 * - Priority flags with tooltips
 * - Enhanced due date format
 * - Tags with overflow badges
 * - Project column
 * - Expandable subtasks
 */
export function ActionsListView(): JSX.Element {
  const { tasks, isLoadingTasks, updateTask, deleteTask, projects } = useMomentum();
  const { zones } = useZones();

  // Table state
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [selectMode, setSelectMode] = useState(false);

  // Column definitions
  const columns = useMemo<ColumnDef<Task>[]>(
    () => {
      const baseColumns: ColumnDef<Task>[] = [];

      // Conditionally add select checkbox column (only in select mode)
      if (selectMode) {
        baseColumns.push({
          id: "select",
          header: ({ table }) => (
            <Checkbox
              checked={table.getIsAllPageRowsSelected()}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
              aria-label="Select all tasks"
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
              aria-label="Select task"
            />
          ),
          size: 50,
          enableSorting: false,
        });
      }

      // Expand arrow column for subtasks
      baseColumns.push({
        id: "expand",
        header: "",
        cell: ({ row }) => {
          const subtasks = getSubtasks(row.original);
          if (subtasks.length === 0) return null;

          return (
            <button
              onClick={() => row.toggleExpanded()}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {row.getIsExpanded() ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          );
        },
        size: 40,
        enableSorting: false,
      });

      // Completion toggle column with Any.do style
      baseColumns.push({
        id: "complete",
        header: "",
        cell: ({ row }) => {
          const isDone = row.original.status === "done";
          return (
            <button
              onClick={() => {
                updateTask(row.original.id, {
                  status: isDone ? "todo" : "done",
                  completedAt: isDone ? null : new Date(),
                });
              }}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                isDone
                  ? "bg-gray-500 hover:bg-gray-600"
                  : "border-2 border-gray-300 hover:border-gray-500"
              }`}
              aria-label={isDone ? "Mark as incomplete" : "Mark as complete"}
            >
              {isDone && <Check className="w-4 h-4 text-white" />}
            </button>
          );
        },
        size: 50,
        enableSorting: false,
      });

      // Task name and description with completed styling
      baseColumns.push({
        accessorKey: "name",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 hover:text-gray-900"
          >
            Task
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => {
          const isDone = row.original.status === "done";
          const description =
            row.original.details &&
            typeof row.original.details === "object" &&
            "description" in row.original.details
              ? (row.original.details as { description?: string }).description
              : undefined;

          return (
            <div className="flex flex-col">
              <span
                className={`font-medium text-sm ${
                  isDone
                    ? "line-through text-gray-400"
                    : "text-gray-900"
                }`}
              >
                {row.original.name}
              </span>
              {description && (
                <span
                  className={`text-xs mt-0.5 ${
                    isDone ? "line-through text-gray-300" : "text-gray-500"
                  }`}
                >
                  {description}
                </span>
              )}
            </div>
          );
        },
      });

      // Priority column with flag icons
      baseColumns.push({
        accessorKey: "priority",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 hover:text-gray-900"
          >
            Priority
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => {
          const priority = row.original.priority;
          const config = {
            high: {
              color: "text-red-500",
              tooltip: "High Priority",
            },
            medium: {
              color: "text-yellow-500",
              tooltip: "Medium Priority",
            },
            low: {
              color: "text-green-500",
              tooltip: "Low Priority",
            },
          };
          const { color, tooltip } = config[priority];

          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Flag className={`w-4 h-4 ${color}`} />
                </TooltipTrigger>
                <TooltipContent>{tooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
        size: 80,
        filterFn: "equals",
      });

      // Due date with enhanced format
      baseColumns.push({
        accessorKey: "dueDate",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 hover:text-gray-900"
          >
            Due Date
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        cell: ({ row }) => {
          const dueDate = row.original.dueDate;
          const isDone = row.original.status === "done";
          if (!dueDate) return <span className="text-xs text-gray-400">—</span>;

          const date = new Date(dueDate);
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <span className={`text-xs ${isDone ? "text-gray-400" : "text-gray-600"}`}>
                    {formatOrdinal(date)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{formatOrdinal(date)}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
        size: 180,
        sortingFn: "datetime",
      });

      // Tags column with badges
      baseColumns.push({
        id: "tags",
        header: "Tags",
        cell: ({ row }) => {
          const tags = row.original.tags || [];
          const isDone = row.original.status === "done";
          if (tags.length === 0) return <span className="text-xs text-gray-400">—</span>;

          const visibleTags = tags.slice(0, 3);
          const remainingCount = tags.length - 3;

          return (
            <div className={`flex flex-wrap gap-1 ${isDone ? "opacity-50" : ""}`}>
              {visibleTags.map((tag) => {
                // Get text and border colors based on category
                const textColor = tag.category
                  ? TAG_CATEGORY_TEXT_COLORS[tag.category as TagCategory] || "#334155"
                  : "#334155";
                const borderColor = tag.category
                  ? TAG_CATEGORY_BORDER_COLORS[tag.category as TagCategory] || "#cbd5e1"
                  : "#cbd5e1";

                return (
                  <Badge
                    key={tag.id}
                    className="text-xs"
                    style={{
                      backgroundColor: tag.color,
                      color: textColor,
                      borderColor: borderColor,
                      borderWidth: "1px",
                      borderStyle: "solid"
                    }}
                  >
                    {tag.name}
                  </Badge>
                );
              })}
              {remainingCount > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="text-xs">
                        +{remainingCount} more
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="flex flex-col gap-1">
                        {tags.slice(3).map((tag) => (
                          <span key={tag.id}>{tag.name}</span>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          );
        },
        size: 200,
        enableSorting: false,
      });

      // Project column
      baseColumns.push({
        id: "project",
        header: "Project",
        cell: ({ row }) => {
          const projectId = row.original.projectId;
          const isDone = row.original.status === "done";
          if (!projectId) return <span className="text-xs text-gray-400">—</span>;

          const project = projects.find((p) => p.id === projectId);
          return project ? (
            <Badge variant="outline" className={`text-xs ${isDone ? "opacity-50" : ""}`}>
              {project.name}
            </Badge>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          );
        },
        size: 150,
        enableSorting: false,
      });

      // Zone column
      baseColumns.push({
        accessorKey: "zoneUuid",
        header: "Zone",
        cell: ({ row }) => {
          const zoneUuid = row.original.zoneUuid;
          const isDone = row.original.status === "done";
          const zone = zones.find((z) => z.uuidId === zoneUuid);
          return zone ? (
            <Badge
              variant="outline"
              className={`text-xs ${isDone ? "opacity-50" : ""}`}
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
      });

      return baseColumns;
    },
    [zones, projects, updateTask, selectMode],
  );

  // Table instance
  const table = useReactTable({
    data: tasks,
    columns,
    state: {
      columnFilters,
      sorting,
      globalFilter,
      rowSelection,
      expanded,
    },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: (row) => getSubtasks(row.original).length > 0,
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  // Multi-select actions
  const selectedRowIds = Object.keys(rowSelection);
  const selectedTasks = table.getSelectedRowModel().rows.map((row) => row.original);

  const handleBulkDelete = (): void => {
    if (confirm(`Delete ${selectedTasks.length} task(s)?`)) {
      selectedTasks.forEach((task) => deleteTask(task.id));
      setRowSelection({});
      setSelectMode(false);
    }
  };

  const handleBulkMarkDone = (): void => {
    selectedTasks.forEach((task) => {
      updateTask(task.id, { status: "done", completedAt: new Date() });
    });
    setRowSelection({});
    setSelectMode(false);
  };

  const handleBulkPriorityChange = (priority: "low" | "medium" | "high"): void => {
    selectedTasks.forEach((task) => {
      updateTask(task.id, { priority });
    });
    setRowSelection({});
  };

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
          <div className="flex gap-2">
            {!selectMode && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectMode(true)}
              >
                <CheckSquare className="w-4 h-4 mr-1" />
                Select
              </Button>
            )}
            {selectMode && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectMode(false);
                  setRowSelection({});
                }}
              >
                Cancel
              </Button>
            )}
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-1" />
              New Task
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Multi-select actions toolbar */}
        {selectMode && selectedRowIds.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedRowIds.length} task(s) selected
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleBulkMarkDone}>
                <Check className="w-4 h-4 mr-1" />
                Mark Done
              </Button>
              <Select onValueChange={(value) => handleBulkPriorityChange(value as "low" | "medium" | "high")}>
                <SelectTrigger className="h-8 w-[140px]">
                  <Flag className="w-4 h-4 mr-1" />
                  <SelectValue placeholder="Set Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    <span className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-red-500" />
                      High
                    </span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-yellow-500" />
                      Medium
                    </span>
                  </SelectItem>
                  <SelectItem value="low">
                    <span className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-green-500" />
                      Low
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                <TagIcon className="w-4 h-4 mr-1" />
                Add Tags
              </Button>
              <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        )}

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
                  <>
                    {/* Main task row */}
                    <tr
                      key={row.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 text-sm">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>

                    {/* Subtask rows (when expanded) */}
                    {row.getIsExpanded() && (
                      <tr key={`${row.id}-subtasks`}>
                        <td colSpan={columns.length} className="px-4 py-2 bg-gray-50">
                          <div className="ml-12 space-y-1">
                            <p className="text-xs font-medium text-gray-600 mb-2">Subtasks:</p>
                            {getSubtasks(row.original).map((subtask) => (
                              <div
                                key={subtask.id}
                                className="flex items-center gap-2 text-sm text-gray-700"
                              >
                                {subtask.completed ? (
                                  <div className="w-4 h-4 rounded-full bg-gray-500 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                ) : (
                                  <Circle className="w-4 h-4 text-gray-400" />
                                )}
                                <span
                                  className={
                                    subtask.completed ? "line-through text-gray-400" : ""
                                  }
                                >
                                  {subtask.title}
                                </span>
                                {subtask.duration && (
                                  <span className="text-xs text-gray-400">
                                    ({subtask.duration})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
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

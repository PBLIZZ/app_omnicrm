"use client";

import { useState, useCallback, useMemo } from "react";
import { CLIENT_STAGES } from "@/constants/clientStages";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Filter,
} from "lucide-react";
import { useBulkDeleteOmniClients } from "@/hooks/use-client-delete";
import { useBulkEnrichOmniClients } from "@/hooks/use-omni-clients-bridge";
import type {
  ExportableClientData,
  DataTableProps,
  ClientSearchFilters,
  ClientWithNotes,
} from "./types";
import { toast } from "sonner";

export function OmniClientsTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>): JSX.Element {
  const bulkDeleteOmniClients = useBulkDeleteOmniClients();
  const bulkEnrichOmniClients = useBulkEnrichOmniClients();
  const [sorting, setSorting] = useState<SortingState>([]);

  // Initialize column visibility from localStorage
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("omni-clients-column-visibility");
      if (saved) {
        try {
          return JSON.parse(saved) as VisibilityState;
        } catch {
          // Failed to parse saved column visibility, use default
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
      localStorage.setItem("omni-clients-column-visibility", JSON.stringify(newVisibility));
    }
  };

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Filter state
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState<ClientSearchFilters>({});
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Calculate active filters count
  const calculateActiveFilters = (filterState: ClientSearchFilters): number => {
    let count = 0;
    if (filterState.query?.trim()) count++;
    if (filterState.tags?.length) count++;
    if (filterState.stage?.length) count++;
    if (filterState.source?.length) count++;
    if (filterState.dateRange) count++;
    if (filterState.hasNotes !== undefined) count++;
    if (filterState.hasInteractions !== undefined) count++;
    if (filterState.confidenceScore) count++;
    return count;
  };

  // Update active filters count when filters change
  const updateFilters = useCallback((newFilters: ClientSearchFilters): void => {
    setFilters(newFilters);
    setActiveFiltersCount(calculateActiveFilters(newFilters));
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback((): void => {
    updateFilters({});
  }, [updateFilters]);

  // Optimized clear selection handler
  const handleClearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  const handleExportClients = useCallback((): void => {
    try {
      if (data.length === 0) {
        toast.error("No data to export");
        return;
      }

      const headers = ["Name", "Email", "Phone", "Stage", "Tags", "AI Insights", "Last Updated"];
      const rows = data.map((item) => {
        const client = item as ClientWithNotes;
        return [
          client.displayName ?? "",
          client.primaryEmail ?? "",
          client.primaryPhone ?? "",
          client.lifecycleStage ?? "",
          Array.isArray(client.tags) ? client.tags.join(", ") : "",
          "", // Notes are stored separately
          new Date(client.updatedAt).toLocaleDateString(),
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
      a.download = `omni-clients-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${data.length} clients to CSV`);
    } catch {
      toast.error("Failed to export clients");
    }
  }, [data]);

  // Apply client-side filtering with memoization
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const client = item as ClientWithNotes;

      // Stage filter
      if (filters.stage?.length && !filters.stage.includes(client.lifecycleStage || "")) {
        return false;
      }

      // Source filter
      if (filters.source?.length && !filters.source.includes(client.source)) {
        return false;
      }

      // Has notes filter
      if (filters.hasNotes && (!client.lastNote || client.lastNote.trim() === "")) {
        return false;
      }

      // Has interactions filter
      if (filters.hasInteractions && (!client.interactions || client.interactions === 0)) {
        return false;
      }

      return true;
    });
  }, [data, filters]);

  const table = useReactTable({
    data: filteredData,
    columns: columns as ColumnDef<TData, unknown>[],
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getRowId: (row) => {
      const client = row as ClientWithNotes;
      return client.id;
    }, // Use contact ID instead of array index
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
        // Ensure notes column is always visible
        lastNote: true,
      },
    },
  });

  // Optimized bulk delete handler - defined after table creation
  const handleBulkDelete = useCallback(() => {
    const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
    const selectedRows = table.getSelectedRowModel().rows;
    const omniClientNames = selectedRows
      .map((row) => (row.original as ClientWithNotes).displayName)
      .join(", ");

    if (
      confirm(
        `Are you sure you want to delete ${selectedIds.length} OmniClient(s)?\n\nOmniClients: ${omniClientNames}\n\nThis action cannot be undone.`,
      )
    ) {
      bulkDeleteOmniClients.mutate(selectedIds, {
        onSuccess: () => {
          setRowSelection({}); // Clear selection after successful delete
        },
      });
    }
  }, [rowSelection, table, bulkDeleteOmniClients]);

  // Optimized bulk enrich handler - defined after table creation
  const handleBulkEnrich = useCallback(() => {
    const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
    const selectedRows = table.getSelectedRowModel().rows;
    const omniClientNames = selectedRows
      .map((row) => (row.original as ClientWithNotes).displayName)
      .join(", ");

    if (
      confirm(
        `Are you sure you want to enrich ${selectedIds.length} OmniClient(s) with AI insights?\n\nOmniClients: ${omniClientNames}\n\nThis may take a few minutes.`,
      )
    ) {
      bulkEnrichOmniClients.mutate(selectedIds, {
        onSuccess: () => {
          setRowSelection({}); // Clear selection after successful enrich
        },
      });
    }
  }, [rowSelection, table, bulkEnrichOmniClients]);

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {Object.keys(rowSelection).length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted/50 border rounded-lg">
          <div className="text-sm font-medium">
            {Object.keys(rowSelection).length} OmniClient(s) selected
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleClearSelection}>
              Clear Selection
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={bulkDeleteOmniClients.isPending}
              onClick={handleBulkDelete}
            >
              {bulkDeleteOmniClients.isPending ? "Deleting..." : "Delete Selected"}
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={bulkEnrichOmniClients.isPending}
              onClick={handleBulkEnrich}
            >
              <Brain className="mr-2 h-4 w-4" />
              {bulkEnrichOmniClients.isPending ? "Enriching..." : "Bulk Enrich"}
            </Button>
          </div>
        </div>
      )}

      {/* Column Visibility Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} OmniClient(s) found
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Filter className="h-4 w-4 mr-2" />
                Filter
                {activeFiltersCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Filter Clients</span>
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Clear all
                    </Button>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Stage filter */}
                <div className="space-y-2">
                  <Label>Client Stage</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {CLIENT_STAGES.map((stage) => (
                      <div key={stage} className="flex items-center space-x-2">
                        <Checkbox
                          id={`stage-${stage}`}
                          checked={filters.stage?.includes(stage) ?? false}
                          onCheckedChange={(checked) => {
                            const currentStages = filters.stage ?? [];
                            const newStages = checked
                              ? [...currentStages, stage]
                              : currentStages.filter((s) => s !== stage);
                            updateFilters({
                              ...filters,
                              stage: newStages.length > 0 ? newStages : undefined,
                            } as ClientSearchFilters);
                          }}
                        />
                        <Label htmlFor={`stage-${stage}`} className="text-sm">
                          {stage}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Source filter */}
                <div className="space-y-2">
                  <Label>Source</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {["manual", "gmail_import", "upload", "calendar_import"].map((source) => (
                      <div key={source} className="flex items-center space-x-2">
                        <Checkbox
                          id={`source-${source}`}
                          checked={filters.source?.includes(source) ?? false}
                          onCheckedChange={(checked) => {
                            const currentSources = filters.source ?? [];
                            const newSources = checked
                              ? [...currentSources, source]
                              : currentSources.filter((s) => s !== source);
                            updateFilters({
                              ...filters,
                              source: newSources.length > 0 ? newSources : undefined,
                            } as ClientSearchFilters);
                          }}
                        />
                        <Label htmlFor={`source-${source}`} className="text-sm capitalize">
                          {source.replaceAll("_", " ")}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Data presence filters */}
                <div className="space-y-2">
                  <Label>Data Presence</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has-notes"
                        checked={filters.hasNotes ?? false}
                        onCheckedChange={(checked) => {
                          updateFilters({
                            ...filters,
                            hasNotes: checked || undefined,
                          } as ClientSearchFilters);
                        }}
                      />
                      <Label htmlFor="has-notes" className="text-sm">
                        Has Notes
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has-interactions"
                        checked={filters.hasInteractions ?? false}
                        onCheckedChange={(checked) => {
                          updateFilters({
                            ...filters,
                            hasInteractions: checked || undefined,
                          } as ClientSearchFilters);
                        }}
                      />
                      <Label htmlFor="has-interactions" className="text-sm">
                        Has Interactions
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Apply button */}
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsFilterDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsFilterDialogOpen(false)}>Apply Filters</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={handleExportClients}>
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
                  data-testid={`client-row-${(row.original as ClientWithNotes).id}`}
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
                  No clients found.
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
            of {data.length} clients
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

"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings2 } from "lucide-react";
import type { Table } from "@tanstack/react-table";

interface TableColumnVisibilityProps<TData> {
  table: Table<TData>;
}

export function TableColumnVisibility<TData>({ table }: TableColumnVisibilityProps<TData>) {
  // Column name mapping for better display
  const getColumnDisplayName = (columnId: string): string => {
    const nameMap: Record<string, string> = {
      primaryEmail: "Email",
      primaryPhone: "Phone",
      displayName: "Name",
      notesCount: "Notes Count",
      updatedAt: "Last Updated",
      aiActions: "AI Actions",
      stage: "Stage",
      tags: "Tags",
      notes: "AI Insights",
      interactions: "Interactions",
    };
    return nameMap[columnId] || columnId;
  };

  const visibleColumnsCount = table.getVisibleLeafColumns().length;
  const hiddenColumnsCount = table.getAllColumns().filter(col => col.getCanHide() && !col.getIsVisible()).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="mr-2 h-4 w-4" />
          Columns ({visibleColumnsCount})
          {hiddenColumnsCount > 0 && (
            <span className="ml-1 text-xs text-muted-foreground">
              +{hiddenColumnsCount} hidden
            </span>
          )}
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
              const displayName = getColumnDisplayName(column.id);
              const isVisible = column.getIsVisible();

              return (
                <div
                  key={column.id}
                  className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-sm cursor-pointer"
                  onClick={() => column.toggleVisibility()}
                >
                  <div
                    className={`w-4 h-4 border border-primary rounded-sm flex items-center justify-center ${
                      isVisible ? "bg-primary" : "bg-transparent"
                    }`}
                  >
                    {isVisible && (
                      <div className="w-2 h-2 bg-primary-foreground rounded-[1px]" />
                    )}
                  </div>
                  <span className="text-sm flex-1">{displayName}</span>
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
  );
}
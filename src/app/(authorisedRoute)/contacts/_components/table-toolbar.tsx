"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  Input,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Button,
  DropdownMenuTrigger,
} from "@/components/ui";
import { Search, SlidersHorizontal } from "lucide-react";

interface TableToolbarProps {
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
}

// Simplified TableToolbar component with search and column visibility only
// Bulk operations are temporarily disabled until backend endpoints are implemented
export function TableToolbar({
  globalFilter,
  onGlobalFilterChange,
}: TableToolbarProps): JSX.Element {
  return (
    <div className="space-y-4">
      {/* Search and Column Visibility */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={globalFilter ?? ""}
              onChange={(event) => onGlobalFilterChange(String(event.target.value))}
              className="pl-8 w-[300px]"
            />
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              View
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[150px]">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Grid3X3, 
  List, 
  BarChart3, 
  Clock,
  Target,
  Filter,
  SortAsc
} from "lucide-react";

interface MatrixViewToggleProps {
  currentView: "matrix" | "list" | "analytics";
  onViewChange: (view: "matrix" | "list" | "analytics") => void;
  taskCounts?: {
    urgentImportant: number;
    importantNotUrgent: number;
    urgentNotImportant: number;
    notUrgentNotImportant: number;
  };
  showFilters?: boolean;
  onFilterToggle?: () => void;
  sortBy?: "priority" | "dueDate" | "created";
  onSortChange?: (sort: "priority" | "dueDate" | "created") => void;
}

const viewOptions = [
  {
    key: "matrix" as const,
    label: "Matrix",
    icon: <Grid3X3 className="h-4 w-4" />,
    description: "2x2 Eisenhower grid"
  },
  {
    key: "list" as const,
    label: "List",
    icon: <List className="h-4 w-4" />,
    description: "Linear task list"
  },
  {
    key: "analytics" as const,
    label: "Analytics", 
    icon: <BarChart3 className="h-4 w-4" />,
    description: "Task distribution insights"
  }
];

const sortOptions = [
  {
    key: "priority" as const,
    label: "Priority",
    icon: <Target className="h-3 w-3" />
  },
  {
    key: "dueDate" as const,
    label: "Due Date",
    icon: <Clock className="h-3 w-3" />
  },
  {
    key: "created" as const,
    label: "Created",
    icon: <SortAsc className="h-3 w-3" />
  }
];

export function MatrixViewToggle({
  currentView,
  onViewChange,
  taskCounts,
  showFilters = false,
  onFilterToggle,
  sortBy = "priority",
  onSortChange,
}: MatrixViewToggleProps) {
  const totalTasks = taskCounts 
    ? Object.values(taskCounts).reduce((sum, count) => sum + count, 0)
    : 0;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">View Options</h3>
          
          {totalTasks > 0 && (
            <Badge variant="secondary" className="text-xs">
              {totalTasks} total
            </Badge>
          )}
        </div>

        {/* View Toggle Buttons */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {viewOptions.map((option) => (
            <Button
              key={option.key}
              variant={currentView === option.key ? "default" : "outline"}
              size="sm"
              onClick={() => onViewChange(option.key)}
              className="flex flex-col items-center gap-1 h-auto py-2"
            >
              {option.icon}
              <span className="text-xs">{option.label}</span>
            </Button>
          ))}
        </div>

        {/* Quadrant Counts (Matrix view only) */}
        {currentView === "matrix" && taskCounts && (
          <>
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">Quadrant Distribution</h4>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Do First: {taskCounts.urgentImportant}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Schedule: {taskCounts.importantNotUrgent}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span>Delegate: {taskCounts.urgentNotImportant}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-500" />
                  <span>Eliminate: {taskCounts.notUrgentNotImportant}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Controls */}
        <Separator className="my-4" />
        
        <div className="space-y-3">
          {/* Filter Toggle */}
          {onFilterToggle && (
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={onFilterToggle}
              className="w-full justify-start h-8"
            >
              <Filter className="h-3 w-3 mr-2" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          )}

          {/* Sort Options */}
          {onSortChange && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">Sort By</h4>
              <div className="grid grid-cols-1 gap-1">
                {sortOptions.map((option) => (
                  <Button
                    key={option.key}
                    variant={sortBy === option.key ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => onSortChange(option.key)}
                    className="justify-start h-7 text-xs"
                  >
                    {option.icon}
                    <span className="ml-2">{option.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Tip */}
        <Separator className="my-4" />
        
        <div className="p-2 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border">
          <div className="flex items-start gap-2">
            <Target className="h-3 w-3 text-purple-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-purple-700 leading-relaxed">
              <strong>Focus Tip:</strong> Spend 70% of your time in "Schedule" (Important + Not Urgent) 
              to prevent tasks from becoming crises.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
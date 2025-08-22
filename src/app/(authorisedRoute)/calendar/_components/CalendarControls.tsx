import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CalendarControlsProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onFilterChange?: (filter: string) => void;
  selectedFilter?: string;
}

export function CalendarControls({
  searchValue = "",
  onSearchChange,
  onFilterChange,
  selectedFilter = "all",
}: CalendarControlsProps): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search events..."
          className="pl-10 w-[200px]"
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
        />
      </div>

      {/* Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onClick={() => onFilterChange?.("all")}
            className={selectedFilter === "all" ? "bg-accent" : ""}
          >
            All Events
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onFilterChange?.("meeting")}
            className={selectedFilter === "meeting" ? "bg-accent" : ""}
          >
            Meetings
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onFilterChange?.("task")}
            className={selectedFilter === "task" ? "bg-accent" : ""}
          >
            Tasks
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onFilterChange?.("appointment")}
            className={selectedFilter === "appointment" ? "bg-accent" : ""}
          >
            Appointments
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onFilterChange?.("reminder")}
            className={selectedFilter === "reminder" ? "bg-accent" : ""}
          >
            Reminders
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

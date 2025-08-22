import { View, Views } from "react-big-calendar";
import { CalendarDays, CalendarCheck, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarViewToggleProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export function CalendarViewToggle({
  currentView,
  onViewChange,
}: CalendarViewToggleProps): JSX.Element {
  return (
    <div className="flex items-center gap-1 border rounded-lg p-1">
      <Button
        variant={currentView === Views.DAY ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange(Views.DAY)}
        className="flex items-center gap-2"
      >
        <CalendarDays className="h-4 w-4" />
        Day
      </Button>
      <Button
        variant={currentView === Views.WEEK ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange(Views.WEEK)}
        className="flex items-center gap-2"
      >
        <CalendarCheck className="h-4 w-4" />
        Week
      </Button>
      <Button
        variant={currentView === Views.MONTH ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange(Views.MONTH)}
        className="flex items-center gap-2"
      >
        <CalendarRange className="h-4 w-4" />
        Month
      </Button>
    </div>
  );
}

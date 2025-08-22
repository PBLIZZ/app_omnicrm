import { Clock, TrendingUp, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CalendarStatsCardsProps {
  todayEvents: number;
  weekEvents: number;
  onNewEvent?: () => void;
  onSettings?: () => void;
}

export function CalendarStatsCards({
  todayEvents,
  weekEvents,
  onNewEvent,
  onSettings,
}: CalendarStatsCardsProps): JSX.Element {
  return (
    <div className="flex gap-4 md:w-2/3 md:justify-end">
      {/* Today's Events Card */}
      <Card className="flex-1 min-w-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold">{todayEvents}</p>
              <p className="text-sm text-muted-foreground truncate">Today&apos;s Events</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Week Events Card */}
      <Card className="flex-1 min-w-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold">{weekEvents}</p>
              <p className="text-sm text-muted-foreground truncate">This Week</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions Card */}
      <Card className="flex-1 min-w-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={onSettings}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button size="sm" className="flex-1" onClick={onNewEvent}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

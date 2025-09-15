"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, CheckCircle, Download, Settings } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { CalendarItem } from "./types";

export function CalendarSyncSetup(): JSX.Element {
  const router = useRouter();
  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"all" | "custom">("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ syncedEvents: number } | null>(null);
  const [daysPast, setDaysPast] = useState(365);
  const [daysFuture, setDaysFuture] = useState(90);
  const [autoSync, setAutoSync] = useState(false);

  useEffect(() => {
    const run = async (): Promise<void> => {
      try {
        const resp = await apiClient.get<{ calendars: CalendarItem[] }>(
          "/api/google/calendar/list",
        );
        const items = resp.calendars ?? [];
        setCalendars(items);
        // Pre-select primary calendar in custom mode by default
        const defaults: Record<string, boolean> = {};
        for (const c of items) {
          if (c.primary) defaults[c.id] = true;
        }
        setSelected(defaults);
      } catch (err) {
        toast.error("Failed to load calendars", {
          description: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  // Remove automatic syncing - user must manually trigger import

  const startImport = async (): Promise<void> => {
    setIsImporting(true);
    setProgress(0);
    setResult(null);

    try {
      // Show indeterminate progress since we don't have real-time updates
      setProgress(-1); // Use -1 to indicate indeterminate progress

      const calendarIds =
        mode === "all" ? undefined : Object.keys(selected).filter((id) => selected[id]);
      const resp = await apiClient.post<{ message: string; syncedEvents: number }>(
        "/api/google/calendar/import",
        {
          calendarIds,
          daysPast,
          daysFuture,
        },
      );

      // Only show 100% when actually complete
      setProgress(100);
      setResult({ syncedEvents: resp.syncedEvents });
      toast.success("Calendar import complete", {
        description: `${resp.syncedEvents} events imported`,
      });
      // Clean up URL and go to Rhythm home after short delay
      setTimeout(() => {
        router.replace("/omni-rhythm");
      }, 1500);
    } catch (err) {
      toast.error("Calendar import failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
      setProgress(0);
    } finally {
      setIsImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Preparing Calendar Import…</CardTitle>
            <CardDescription>Fetching your calendar list</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={35} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-green-800">Import Complete</CardTitle>
            <CardDescription className="text-green-700">
              Successfully imported {result.syncedEvents} events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={100} />
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => router.push("/omni-rhythm")} className="mt-4">
              Continue to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl p-6">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Calendar className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle>Google Calendar Connected!</CardTitle>
          <CardDescription>Import last 365 days and next 90 days</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Calendar Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <Label className="text-sm font-medium">Calendar Selection</Label>
            </div>
            <div className="flex gap-3">
              <Button
                variant={mode === "all" ? "default" : "outline"}
                onClick={() => setMode("all")}
              >
                Import All Calendars
              </Button>
              <Button
                variant={mode === "custom" ? "default" : "outline"}
                onClick={() => setMode("custom")}
              >
                Choose Calendars…
              </Button>
            </div>
            {mode === "custom" && (
              <div className="mt-4 border rounded-md divide-y">
                {calendars.length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground">No calendars found</div>
                )}
                {calendars.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 p-3 text-sm">
                    <Checkbox
                      checked={Boolean(selected[c.id])}
                      onCheckedChange={(v) =>
                        setSelected((prev) => ({ ...prev, [c.id]: Boolean(v) }))
                      }
                    />
                    <span className="truncate">
                      {c.summary}
                      {c.primary ? " (primary)" : ""}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Time Range Preferences */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Import Time Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="days-past" className="text-xs text-muted-foreground">
                  Days in the past
                </Label>
                <Select value={daysPast.toString()} onValueChange={(v) => setDaysPast(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">6 months</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="days-future" className="text-xs text-muted-foreground">
                  Days in the future
                </Label>
                <Select
                  value={daysFuture.toString()}
                  onValueChange={(v) => setDaysFuture(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">6 months</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Auto-sync Preference */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-sync"
                checked={autoSync}
                onCheckedChange={(checked) => setAutoSync(Boolean(checked))}
              />
              <Label htmlFor="auto-sync" className="text-sm">
                Enable automatic daily sync (recommended)
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled, your calendar will sync automatically once per day to keep data
              up-to-date.
            </p>
          </div>

          {isImporting && (
            <div className="space-y-2">
              {progress === -1 ? (
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="h-2 bg-primary rounded-full animate-pulse"></div>
                </div>
              ) : (
                <Progress value={progress} />
              )}
              <p className="text-sm text-muted-foreground text-center">
                {progress === -1
                  ? "Fetching and processing your calendar events... This may take a few minutes."
                  : "Import complete!"}
              </p>
            </div>
          )}

          <div className="p-4 bg-blue-50 rounded-md border text-sm text-blue-900 flex items-center gap-2">
            <Download className="h-4 w-4" />
            We will import all event data: titles, times, attendees, locations, descriptions, and
            metadata.
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" size="lg" disabled={isImporting} onClick={startImport}>
            {isImporting ? "Importing…" : "Start Calendar Import"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

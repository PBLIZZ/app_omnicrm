"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Calendar, Clock, AlertTriangle, Info, CalendarDays } from "lucide-react";
import type { CalendarPreferences, SyncPreviewResponse } from "@/lib/validation/schemas/sync";
import type { CalendarItem } from "@/app/(authorisedRoute)/omni-rhythm/_components/types";
import { get } from "@/lib/api";

interface CalendarPreferencesProps {
  onPreferencesChange: (preferences: CalendarPreferences) => void;
  onPreview: (preferences: CalendarPreferences) => Promise<void>;
  isPreviewLoading?: boolean;
  previewData?: SyncPreviewResponse | null;
  disabled?: boolean;
}

export function CalendarPreferences({
  onPreferencesChange,
  onPreview,
  isPreviewLoading = false,
  previewData,
  disabled = false,
}: CalendarPreferencesProps) {
  const [pastDays, setPastDays] = useState<number>(365);
  const [futureDays, setFutureDays] = useState<number>(90);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [includePrivate, setIncludePrivate] = useState<boolean>(false);
  const [includeOrganizerSelf, setIncludeOrganizerSelf] = useState<boolean>(true);
  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState<boolean>(true);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  const preferences: CalendarPreferences = {
    selectedCalendarIds,
    pastDays,
    futureDays,
    includePrivate,
    includeOrganizerSelf,
  };

  // Load available calendars
  useEffect(() => {
    const loadCalendars = async () => {
      try {
        setIsLoadingCalendars(true);
        setCalendarError(null);
        const response = await get<{ calendars: CalendarItem[] }>("/api/google/calendar/list");

        setCalendars(response.calendars);
        // Auto-select primary calendar
        const primaryCalendar = response.calendars.find((cal: CalendarItem) => cal.primary);
        if (primaryCalendar) {
          setSelectedCalendarIds([primaryCalendar.id]);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load calendars";
        setCalendarError(errorMessage);
        console.error("Failed to load calendars:", error);
      } finally {
        setIsLoadingCalendars(false);
      }
    };

    loadCalendars();
  }, []);

  // Update preferences when any value changes
  useEffect(() => {
    onPreferencesChange(preferences);
  }, [pastDays, futureDays, selectedCalendarIds, includePrivate, includeOrganizerSelf]);

  const handlePastDaysChange = (value: number[]) => {
    setPastDays(value[0] ?? 365);
  };

  const handleFutureDaysChange = (value: number[]) => {
    setFutureDays(value[0] ?? 90);
  };

  const handleCalendarToggle = (calendarId: string, checked: boolean) => {
    if (checked) {
      setSelectedCalendarIds((prev) => [...prev, calendarId]);
    } else {
      setSelectedCalendarIds((prev) => prev.filter((id) => id !== calendarId));
    }
  };

  const handleSelectAllCalendars = () => {
    setSelectedCalendarIds(calendars.map((cal: CalendarItem) => cal.id));
  };

  const handleDeselectAllCalendars = () => {
    setSelectedCalendarIds([]);
  };

  const handleGeneratePreview = async () => {
    await onPreview(preferences);
  };

  const formatDateRange = () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - pastDays);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + futureDays);

    return `${pastDate.toLocaleDateString()} - ${futureDate.toLocaleDateString()}`;
  };

  const isValidPreferences = selectedCalendarIds.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar Sync Preferences
        </h3>
        <p className="text-sm text-muted-foreground">
          Configure your Google Calendar import preferences. This is a one-time setup and cannot be
          changed after the initial sync.
        </p>
      </div>

      {/* Calendar Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calendar Selection</CardTitle>
          <CardDescription>Choose which calendars to sync from your Google account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {calendarError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{calendarError}</AlertDescription>
            </Alert>
          )}

          {isLoadingCalendars ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner className="mr-2 h-4 w-4" />
              Loading calendars...
            </div>
          ) : (
            <>
              {calendars.length > 0 && (
                <div className="flex gap-2 mb-4">
                  <Button
                    onClick={handleSelectAllCalendars}
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                  >
                    Select All
                  </Button>
                  <Button
                    onClick={handleDeselectAllCalendars}
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                  >
                    Deselect All
                  </Button>
                </div>
              )}

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {calendars.map((calendar) => (
                  <div key={calendar.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`calendar-${calendar.id}`}
                      checked={selectedCalendarIds.includes(calendar.id)}
                      onCheckedChange={(checked) =>
                        handleCalendarToggle(calendar.id, checked === true)
                      }
                      disabled={disabled}
                    />
                    <Label
                      htmlFor={`calendar-${calendar.id}`}
                      className="flex-1 flex items-center gap-2 text-sm"
                    >
                      {calendar.summary}
                      {calendar.primary && (
                        <Badge variant="secondary" className="text-xs">
                          Primary
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">({calendar.accessRole})</span>
                    </Label>
                  </div>
                ))}
              </div>

              {selectedCalendarIds.length === 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You must select at least one calendar to sync.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Date Range Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Date Range</CardTitle>
          <CardDescription>Configure the time window for calendar events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Past Days Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="past-days" className="text-sm font-medium">
                Past Events: {pastDays} days
              </Label>
              <Badge variant="outline" className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {pastDays} days back
              </Badge>
            </div>
            <Slider
              id="past-days"
              min={1}
              max={365}
              step={1}
              value={[pastDays]}
              onValueChange={handlePastDaysChange}
              disabled={disabled}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 day</span>
              <span>365 days (1 year max)</span>
            </div>
          </div>

          {/* Future Days Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="future-days" className="text-sm font-medium">
                Future Events: {futureDays} days
              </Label>
              <Badge variant="outline" className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {futureDays} days ahead
              </Badge>
            </div>
            <Slider
              id="future-days"
              min={0}
              max={90}
              step={1}
              value={[futureDays]}
              onValueChange={handleFutureDaysChange}
              disabled={disabled}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 days</span>
              <span>90 days (3 months max)</span>
            </div>
          </div>

          {/* Full Date Range Display */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Complete Date Range</p>
            <p className="text-sm text-muted-foreground">{formatDateRange()}</p>
          </div>
        </CardContent>
      </Card>

      {/* Additional Options Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Additional Options</CardTitle>
          <CardDescription>Configure additional calendar sync settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="include-private" className="text-sm font-medium">
                Include Private Events
              </Label>
              <p className="text-xs text-muted-foreground">Import events marked as private</p>
            </div>
            <Switch
              id="include-private"
              checked={includePrivate}
              onCheckedChange={setIncludePrivate}
              disabled={disabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="include-organizer-self" className="text-sm font-medium">
                Include Self-Organized Events
              </Label>
              <p className="text-xs text-muted-foreground">
                Import events where you are the organizer
              </p>
            </div>
            <Switch
              id="include-organizer-self"
              checked={includeOrganizerSelf}
              onCheckedChange={setIncludeOrganizerSelf}
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview Button */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={() => void handleGeneratePreview()}
            disabled={disabled || isPreviewLoading || !isValidPreferences}
            className="w-full"
            variant="outline"
          >
            {isPreviewLoading ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Generating Preview...
              </>
            ) : (
              <>
                <Clock className="mr-2 h-4 w-4" />
                Preview Sync Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview Results */}
      {previewData?.service === "calendar" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sync Preview</CardTitle>
            <CardDescription>
              Estimated events that will be imported from selected calendars
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overall Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Events</p>
                <p className="text-2xl font-semibold">
                  {previewData.estimatedItems.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Estimated Size</p>
                <p className="text-2xl font-semibold">{previewData.estimatedSizeMB} MB</p>
              </div>
            </div>

            {/* Calendar Breakdown */}
            {previewData.details.calendars?.length && previewData.details.calendars.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Events by Calendar</p>
                <div className="space-y-2">
                  {previewData.details.calendars.map((cal) => (
                    <div
                      key={cal.id}
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <span className="text-sm">{cal.name}</span>
                      <Badge variant="outline">{cal.eventCount.toLocaleString()} events</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Date Range */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Date Range</p>
              <p className="text-sm">
                {new Date(previewData.dateRange.start).toLocaleDateString()} -{" "}
                {new Date(previewData.dateRange.end).toLocaleDateString()}
              </p>
            </div>

            {/* Warnings */}
            {previewData.warnings.length > 0 && (
              <div className="space-y-2">
                {previewData.warnings.map((warning, index) => (
                  <Alert key={index} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{warning}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* One-time setup notice */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Important:</strong> This is a one-time setup. After the initial sync, only
                new and updated events will be imported automatically. You cannot change these
                preferences later.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

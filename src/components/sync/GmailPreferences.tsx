"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Calendar, Clock, Mail, AlertTriangle, Info } from "lucide-react";

// Types for sync preferences
type GmailPreferences = {
  gmailQuery?: string;
  gmailLabelIncludes?: string[];
  gmailLabelExcludes?: string[];
  gmailTimeRangeDays?: number;
  importEverything?: boolean;
};

type SyncPreviewResponse = {
  itemsFound: number;
  estimatedSizeMB?: number;
  dateRange?: {
    from: string;
    to: string;
  };
  error?: string;
  warnings?: string[];
};

interface GmailPreferencesProps {
  onPreferencesChange: (preferences: GmailPreferences) => void;
  onPreview: (preferences: GmailPreferences) => Promise<void>;
  isPreviewLoading?: boolean;
  previewData?: SyncPreviewResponse | null;
  disabled?: boolean;
}

/**
 * Renders the Gmail sync preferences UI and manages local preference state.
 *
 * Provides controls to choose a time range and toggle importing everything, emits preference
 * changes via `onPreferencesChange`, and can request a sync preview via `onPreview`.
 *
 * @param onPreferencesChange - Callback invoked with updated GmailPreferences when user changes preferences.
 * @param onPreview - Callback invoked to generate a sync preview for the current preferences.
 * @param isPreviewLoading - Whether a preview generation is in progress; disables the preview button and shows a loading state when true.
 * @param previewData - Optional preview results used to display estimated items, size, date range, and warnings.
 * @param disabled - If true, disables interactive controls.
 * @returns A React element that displays the Gmail sync preferences form and optional preview results.
 */
export function GmailPreferences({
  onPreferencesChange,
  onPreview,
  isPreviewLoading = false,
  previewData,
  disabled = false,
}: GmailPreferencesProps) {
  const [gmailTimeRangeDays, setGmailTimeRangeDays] = useState<number>(365);
  const [importEverything, setImportEverything] = useState<boolean>(true);

  const preferences: GmailPreferences = {
    gmailTimeRangeDays,
    importEverything,
  };

  const handleTimeRangeChange = (value: number[]) => {
    const days = value[0] ?? 365;
    setGmailTimeRangeDays(days);
    const updatedPrefs = { ...preferences, gmailTimeRangeDays: days };
    onPreferencesChange(updatedPrefs);
  };

  const handleImportEverythingChange = (checked: boolean) => {
    setImportEverything(checked);
    const updatedPrefs = { ...preferences, importEverything: checked };
    onPreferencesChange(updatedPrefs);
  };

  const handleGeneratePreview = async () => {
    await onPreview(preferences);
  };

  const formatDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - gmailTimeRangeDays);
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Gmail Sync Preferences
        </h3>
        <p className="text-sm text-muted-foreground">
          Configure your Gmail import preferences. This is a one-time setup and cannot be changed
          after the initial sync.
        </p>
      </div>

      {/* Preferences Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import Settings</CardTitle>
          <CardDescription>
            Choose how much Gmail data to import for your initial sync
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Time Range Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="time-range" className="text-sm font-medium">
                Time Range: {gmailTimeRangeDays} days
              </Label>
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDateRange()}
              </Badge>
            </div>
            <Slider
              id="time-range"
              min={1}
              max={365}
              step={1}
              value={[gmailTimeRangeDays]}
              onValueChange={handleTimeRangeChange}
              disabled={disabled}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 day</span>
              <span>365 days (1 year max)</span>
            </div>
          </div>

          {/* Import Everything Switch */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="import-everything" className="text-sm font-medium">
                  Import Everything
                </Label>
                <p className="text-xs text-muted-foreground">
                  Import all emails from all sources (inbox, sent, drafts, chats, categories,
                  labels)
                </p>
              </div>
              <Switch
                id="import-everything"
                checked={importEverything}
                onCheckedChange={handleImportEverythingChange}
                disabled={disabled}
              />
            </div>

            {importEverything && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Everything includes:</strong> Inbox, Sent Items, Drafts, Chats, All
                  Categories (Primary, Social, Promotions, Updates, Forums), and All Labels/Folders
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Preview Button */}
          <div className="pt-4 border-t">
            <Button
              onClick={() => void handleGeneratePreview()}
              disabled={disabled || isPreviewLoading}
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
          </div>
        </CardContent>
      </Card>

      {/* Preview Results */}
      {previewData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sync Preview</CardTitle>
            <CardDescription>Estimated data that will be imported from Gmail</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Estimated Emails</p>
                <p className="text-2xl font-semibold">{previewData.itemsFound.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Estimated Size</p>
                <p className="text-2xl font-semibold">{previewData.estimatedSizeMB} MB</p>
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Date Range</p>
              <p className="text-sm">
                {previewData.dateRange?.from && previewData.dateRange?.to
                  ? `${new Date(previewData.dateRange.from).toLocaleDateString()} - ${new Date(previewData.dateRange.to).toLocaleDateString()}`
                  : "Date range not available"}
              </p>
            </div>

            {/* Warnings */}
            {previewData.warnings && previewData.warnings.length > 0 && (
              <div className="space-y-2">
                {previewData.warnings.map((warning: string, index: number) => (
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
                new emails will be imported automatically. You cannot change these preferences
                later.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
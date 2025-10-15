"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Clock, AlertTriangle, Info, Construction } from "lucide-react";

// Types for Drive sync preferences
type DrivePreferences = {
  driveIngestionMode?: "none" | "picker" | "folders";
  driveFolderIds?: string[];
  selectedFolderId?: string;
  driveMaxSizeMB?: number;
};

// Supported sync services
export type SyncService = "google" | "dropbox" | "onedrive";

type SyncPreviewResponse = {
  itemsFound: number;
  service?: SyncService;
  estimatedSizeMB?: number;
  dateRange?: {
    from: string;
    to: string;
  };
  error?: string;
  warnings?: string[];
};

interface DrivePreferencesProps {
  onPreferencesChange: (preferences: DrivePreferences) => void;
  onPreview: (preferences: DrivePreferences) => Promise<void>;
  isPreviewLoading?: boolean;
  previewData?: SyncPreviewResponse | null;
  disabled?: boolean;
}

/**
 * Render the Google Drive sync preferences UI and, when available, a sync preview card.
 *
 * Renders a disabled placeholder for folder selection and size-limit settings, a disabled
 * preview action, informational guidelines about the 5MB limit, and a conditional "Sync Preview"
 * section when preview results for Google Drive are provided.
 *
 * @param onPreview - Callback invoked with the current Drive preferences to request a preview.
 * @param previewData - Optional preview results; when present and `service === "google"`, a Sync
 *                      Preview card with estimated files, size, date range, and warnings is shown.
 * @returns A React element containing the Drive preferences interface and optional preview output.
 */
export function DrivePreferences({ onPreview, previewData }: DrivePreferencesProps) {
  const [selectedFolderId] = useState<string>("");
  const [driveMaxSizeMB] = useState<number>(5);

  const preferences: DrivePreferences = {
    selectedFolderId,
    driveMaxSizeMB,
  };

  const handleGeneratePreview = async () => {
    await onPreview(preferences);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Google Drive Sync Preferences
        </h3>
        <p className="text-sm text-muted-foreground">
          Configure your Google Drive import preferences. This feature will be available in a future
          update.
        </p>
      </div>

      {/* Coming Soon Notice */}
      <Alert>
        <Construction className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Coming Soon:</strong> Google Drive sync functionality is currently under
          development and will be available in a future update.
        </AlertDescription>
      </Alert>

      {/* Placeholder Preferences Card */}
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle className="text-base">Folder Selection</CardTitle>
          <CardDescription>Choose a folder from your Google Drive to sync</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Folder Browser Placeholder */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select Drive Folder</Label>
            <div className="p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg text-center">
              <FolderOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Folder browser will be available here</p>
            </div>
          </div>

          {/* Size Limit Info */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Size Limit</Label>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm">Maximum sync size:</span>
                <Badge variant="outline">{driveMaxSizeMB} MB</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Files exceeding this limit will be skipped during sync
              </p>
            </div>
          </div>

          {/* Features Preview */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Planned Features</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full"></div>
                Browse and select any folder in your Google Drive
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full"></div>
                Real-time size calculation before sync
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full"></div>
                Automatic file type filtering
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full"></div>
                5MB size limit validation with clear warnings
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full"></div>
                Preview of files to be synced
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Button (Disabled) */}
      <Card className="opacity-50">
        <CardContent className="pt-6">
          <Button
            onClick={() => void handleGeneratePreview()}
            disabled={true}
            className="w-full"
            variant="outline"
          >
            <Clock className="mr-2 h-4 w-4" />
            Preview Sync Data (Coming Soon)
          </Button>
        </CardContent>
      </Card>

      {/* Size Limit Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Size Limit Guidelines</CardTitle>
          <CardDescription>Understanding the 5MB sync limit for Google Drive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p className="text-sm">
                <strong>Why 5MB limit?</strong> This ensures fast sync times and prevents
                overwhelming the system with large files.
              </p>
              <div className="text-sm space-y-1">
                <p>
                  <strong>Typical file sizes:</strong>
                </p>
                <ul className="text-xs text-muted-foreground ml-4 space-y-0.5">
                  <li>• Documents (Word, PDF): 100KB - 2MB</li>
                  <li>• Spreadsheets: 50KB - 1MB</li>
                  <li>• Images: 500KB - 3MB</li>
                  <li>• Small videos/audio: 1MB - 5MB</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Files exceeding 5MB will be skipped</strong> during sync with clear
              notifications about which files were excluded.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Future Preview Results Placeholder */}
      {previewData && previewData.service === "google" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sync Preview</CardTitle>
            <CardDescription>
              Estimated files that will be imported from selected folder
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Estimated Files</p>
                <p className="text-2xl font-semibold">
                  {previewData.itemsFound?.toLocaleString() ?? "0"}
                </p>
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
                    <AlertDescription className="text-sm">
                      <strong>Warnings:</strong>
                      <ul className="mt-1 list-disc list-inside">
                        <li>{warning}</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Important:</strong> This is a one-time setup. After the initial sync, only
                new files will be imported automatically. You cannot change these preferences later.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
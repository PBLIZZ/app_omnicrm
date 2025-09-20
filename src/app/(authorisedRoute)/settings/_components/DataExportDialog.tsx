"use client";

import { useState } from "react";
import { Download, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Alert,
  AlertDescription,
} from "@/components/ui";

interface DataExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataExportDialog({ open, onOpenChange }: DataExportDialogProps): JSX.Element {
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = (): void => {
    setIsExporting(true);
    setExportError(null);
    setExportComplete(false);
    void (async (): Promise<void> => {
      try {
        // Note: Using raw fetch here is appropriate for blob downloads
        // The centralized API utilities don't support direct access to response headers and blob()
        const response = await fetch("/api/user/export", {
          method: "GET",
          credentials: "same-origin",
          headers: {
            "x-csrf-token":
              document.cookie
                .split("; ")
                .find((row) => row.startsWith("csrf="))
                ?.split("=")[1] ?? "",
          },
        });

        if (!response.ok) {
          throw new Error(`Export failed: ${response.statusText}`);
        }

        // Get the filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get("Content-Disposition");
        const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/);
        const filename =
          filenameMatch?.[1] ??
          `omnicrm-data-export-${new Date().toISOString().split("T")[0]}.json`;

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setExportComplete(true);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        setExportError(msg);
      } finally {
        setIsExporting(false);
      }
    })();
  };

  const handleClose = (): void => {
    if (!isExporting) {
      setExportComplete(false);
      setExportError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Your Data
          </DialogTitle>
          <DialogDescription>
            Download a complete copy of all your data in JSON format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isExporting && !exportComplete && !exportError && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will create a JSON file containing all your contacts, interactions, AI
                analysis, and settings. The file will be downloaded to your device.
              </AlertDescription>
            </Alert>
          )}

          {isExporting && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Preparing your data export...</span>
              </div>
              <div className="h-1.5 w-full rounded bg-muted overflow-hidden">
                <div className="h-full w-1/3 animate-pulse bg-primary/60" />
              </div>
              <p className="text-xs text-muted-foreground">
                This may take a few moments depending on the amount of data.
              </p>
            </div>
          )}

          {exportComplete && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>Export completed successfully!</strong> Your data has been downloaded as a
                JSON file. You can now safely close this dialog.
              </AlertDescription>
            </Alert>
          )}

          {exportError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Export failed:</strong> {exportError}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isExporting}>
            {exportComplete ? "Close" : "Cancel"}
          </Button>
          {!exportComplete && (
            <Button onClick={handleExport} disabled={isExporting} className="gap-2">
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export Data
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

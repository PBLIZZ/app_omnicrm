"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CheckCircle, ArrowLeft, ArrowRight, Settings, Info, AlertTriangle } from "lucide-react";
import { GmailPreferences } from "./GmailPreferences";
import { CalendarPreferences } from "./CalendarPreferences";
import { DrivePreferences } from "./DrivePreferences";
import { SyncProgressModal } from "./SyncProgressModal";
import type {
  GmailPreferences as GmailPrefsType,
  CalendarPreferences as CalendarPrefsType,
  DrivePreferences as DrivePrefsType,
  SyncPreviewResponse,
  SyncPreferencesSetup,
} from "@/lib/validation/schemas/sync";
import { fetchPost } from "@/lib/api";

type ServiceType = "gmail" | "calendar" | "drive";

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceType;
  onComplete: (preferences: SyncPreferencesSetup) => void;
  enableImmediateSync?: boolean; // New prop to enable Phase 4 sync after setup
}

const STEPS = [
  { id: "preferences", title: "Set Preferences", description: "Configure your sync settings" },
  { id: "preview", title: "Review Preview", description: "Review what will be synced" },
  { id: "confirm", title: "Confirm Setup", description: "Confirm and save preferences" },
];

export function PreferencesModal({ isOpen, onClose, service, onComplete, enableImmediateSync = false }: PreferencesModalProps): React.JSX.Element {
  const [currentStep, setCurrentStep] = useState(0);
  const [preferences, setPreferences] = useState<{
    gmail?: GmailPrefsType;
    calendar?: CalendarPrefsType;
    drive?: DrivePrefsType;
  }>({});
  const [previewData, setPreviewData] = useState<SyncPreviewResponse | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phase 4 sync states
  const [showSyncProgress, setShowSyncProgress] = useState(false);
  const [syncSessionId, setSyncSessionId] = useState<string | null>(null);

  const currentPreferences = preferences[service];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === STEPS.length - 1;
  const canProceed = currentPreferences && (currentStep === 0 || previewData);

  const handlePreferencesChange = (newPrefs: GmailPrefsType | CalendarPrefsType | DrivePrefsType) => {
    setPreferences(prev => ({
      ...prev,
      [service]: newPrefs,
    }));
    setError(null);
  };

  const handlePreview = async (prefs: GmailPrefsType | CalendarPrefsType | DrivePrefsType) => {
    try {
      setIsPreviewLoading(true);
      setError(null);

      const response = await fetchPost<SyncPreviewResponse>(
        `/api/google/${service}/preview`,
        prefs
      );

      setPreviewData(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate preview. Please try again.";
      setError(errorMessage);
      console.error("Preview error:", err);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 0 && currentPreferences) {
      // Generate preview automatically when moving to preview step
      await handlePreview(currentPreferences);
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    if (!currentPreferences || !previewData) return;

    try {
      setIsSaving(true);
      setError(null);

      const setupData: SyncPreferencesSetup = {
        service,
        [service]: currentPreferences,
      };

      // Save preferences to backend
      await fetchPost("/api/google/prefs", {
        ...currentPreferences,
        initialSyncCompleted: false,
        initialSyncDate: new Date().toISOString(),
      });

      // If immediate sync is enabled, trigger Phase 4 blocking sync
      if (enableImmediateSync && (service === "gmail" || service === "calendar")) {
        try {
          // Start blocking sync with the preferences
          const syncResponse = await fetchPost<{ sessionId: string; stats: Record<string, unknown> }>(
            `/api/google/${service}/sync-blocking`,
            {
              preferences: currentPreferences,
              incremental: false, // Full sync for initial setup
            }
          );

          // Show sync progress modal
          setSyncSessionId(syncResponse.sessionId);
          setShowSyncProgress(true);

          // Hide preferences modal (sync modal will take over)
          // Note: Don't call onClose() yet - wait for sync completion
        } catch (syncError) {
          // If sync fails, still complete the preferences setup
          console.error("Sync failed after preferences setup:", syncError);
          setError("Preferences saved, but sync failed to start. You can manually sync later.");

          // Complete setup even if sync fails
          onComplete(setupData);
          setTimeout(() => onClose(), 2000); // Close after showing error
        }
      } else {
        // No immediate sync - complete setup normally
        onComplete(setupData);
        onClose();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save preferences. Please try again.";
      setError(errorMessage);
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving && !showSyncProgress) {
      onClose();
    }
  };

  const handleSyncComplete = (result: { success: boolean; stats?: Record<string, unknown>; error?: string }) => {
    setShowSyncProgress(false);
    setSyncSessionId(null);

    if (result.success) {
      // Sync completed successfully
      const setupData: SyncPreferencesSetup = {
        service,
        [service]: currentPreferences!,
      };
      onComplete(setupData);
      onClose();
    } else {
      // Sync failed - show error but keep modal open
      setError(`Sync failed: ${result.error ?? "Unknown error"}`);
    }
  };

  const handleSyncModalClose = () => {
    // Called when user closes sync modal (should only be possible after completion)
    setShowSyncProgress(false);
    setSyncSessionId(null);
    onClose();
  };

  const getServiceDisplayName = () => {
    switch (service) {
      case "gmail": return "Gmail";
      case "calendar": return "Google Calendar";
      case "drive": return "Google Drive";
      default: return "Google Service";
    }
  };

  const renderPreferencesStep = () => {
    switch (service) {
      case "gmail":
        return (
          <GmailPreferences
            onPreferencesChange={handlePreferencesChange}
            onPreview={handlePreview}
            isPreviewLoading={isPreviewLoading}
            previewData={previewData}
            disabled={isSaving}
          />
        );
      case "calendar":
        return (
          <CalendarPreferences
            onPreferencesChange={handlePreferencesChange}
            onPreview={handlePreview}
            isPreviewLoading={isPreviewLoading}
            previewData={previewData}
            disabled={isSaving}
          />
        );
      case "drive":
        return (
          <DrivePreferences
            onPreferencesChange={handlePreferencesChange}
            onPreview={handlePreview}
            isPreviewLoading={isPreviewLoading}
            previewData={previewData}
            disabled={isSaving}
          />
        );
      default:
        return null;
    }
  };

  const renderPreviewStep = () => {
    if (!previewData) {
      return (
        <div className="text-center py-8">
          <LoadingSpinner className="h-8 w-8 mx-auto mb-4" />
          <p className="text-muted-foreground">Generating preview...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Sync Preview for {getServiceDisplayName()}</h3>
          <p className="text-sm text-muted-foreground">
            Review the data that will be imported during your initial sync
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{previewData.estimatedItems.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">
              {service === "gmail" ? "Emails" : service === "calendar" ? "Events" : "Files"}
            </p>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{previewData.estimatedSizeMB} MB</p>
            <p className="text-sm text-muted-foreground">Estimated Size</p>
          </div>
        </div>

        {/* Date Range */}
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium mb-2">Date Range</h4>
          <p className="text-sm text-muted-foreground">
            {new Date(previewData.dateRange.start).toLocaleDateString()} -{" "}
            {new Date(previewData.dateRange.end).toLocaleDateString()}
          </p>
        </div>

        {/* Service-specific details */}
        {previewData.details.calendars && (
          <div className="space-y-2">
            <h4 className="font-medium">Selected Calendars</h4>
            {previewData.details.calendars.map((cal) => (
              <div key={cal.id} className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-sm">{cal.name}</span>
                <Badge variant="outline">{cal.eventCount.toLocaleString()} events</Badge>
              </div>
            ))}
          </div>
        )}

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
      </div>
    );
  };

  const renderConfirmStep = () => {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Ready to Set Up {getServiceDisplayName()}</h3>
          <p className="text-sm text-muted-foreground">
            Your preferences are configured and ready to be saved
          </p>
        </div>

        {previewData && (
          <div className="p-4 border rounded-lg space-y-3">
            <h4 className="font-medium">Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Items to sync:</span>
                <span className="ml-2 font-medium">{previewData.estimatedItems.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Estimated size:</span>
                <span className="ml-2 font-medium">{previewData.estimatedSizeMB} MB</span>
              </div>
            </div>
          </div>
        )}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p className="text-sm">
              <strong>Important:</strong> These preferences cannot be changed after the initial sync.
              Only new data will be synced automatically going forward.
            </p>
            <p className="text-sm">
              Click "Complete Setup" to save your preferences and enable syncing.
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderPreferencesStep();
      case 1:
        return renderPreviewStep();
      case 2:
        return renderConfirmStep();
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={isOpen && !showSyncProgress} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {getServiceDisplayName()} Sync Setup
            </DialogTitle>
            <DialogDescription>
              Configure your {getServiceDisplayName()} sync preferences for the first time
            </DialogDescription>
          </DialogHeader>

        {/* Progress Steps */}
        <div className="space-y-4">
          <Progress value={((currentStep + 1) / STEPS.length) * 100} className="w-full" />
          <div className="flex justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center gap-1">
                <Badge
                  variant={index <= currentStep ? "default" : "outline"}
                  className="w-8 h-8 rounded-full flex items-center justify-center p-0"
                >
                  {index < currentStep ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                </Badge>
                <div className="text-center">
                  <p className="text-xs font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            onClick={handleBack}
            variant="outline"
            disabled={isFirstStep || isSaving}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="flex gap-2">
            <Button onClick={handleClose} variant="outline" disabled={isSaving}>
              Cancel
            </Button>

            {isLastStep ? (
              <Button onClick={() => void handleComplete()} disabled={!canProceed || isSaving}>
                {isSaving ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    {enableImmediateSync ? "Starting Sync..." : "Saving..."}
                  </>
                ) : (
                  enableImmediateSync ? "Complete Setup & Sync Now" : "Complete Setup"
                )}
              </Button>
            ) : (
              <Button
                onClick={() => void handleNext()}
                disabled={!canProceed || isPreviewLoading}
              >
                {isPreviewLoading ? (
                  <>
                    <LoadingSpinner className="mr-2 h-4 w-4" />
                    Loading...
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
        </DialogContent>
      </Dialog>

      {/* Phase 4 Sync Progress Modal */}
      <SyncProgressModal
        isOpen={showSyncProgress}
        onClose={handleSyncModalClose}
        sessionId={syncSessionId}
        service={service as "gmail" | "calendar"}
        onComplete={handleSyncComplete}
      />
    </>
  );
}
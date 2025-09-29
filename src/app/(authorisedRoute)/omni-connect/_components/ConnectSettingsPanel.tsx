"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/observability";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings, Save, X, Plus, Info } from "lucide-react";
import { ErrorHandler } from "@/lib/errors/app-error";
import { get, post, put } from "@/lib/api/client";

interface GmailSettings {
  gmailQuery: string;
  gmailLabelIncludes: string[];
  gmailLabelExcludes: string[];
  maxEmailsPerSync: number;
  dateRangeDays: number;
}

interface GmailSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isInitialSetup?: boolean;
  onInitialSyncStarted?: () => void;
}

export function GmailSettingsPanel({
  isOpen,
  onClose,
  isInitialSetup = false,
  onInitialSyncStarted,
}: GmailSettingsPanelProps): JSX.Element | null {
  const [settings, setSettings] = useState<GmailSettings>({
    gmailQuery: "category:primary -in:chats -in:drafts newer_than:30d",
    gmailLabelIncludes: [],
    gmailLabelExcludes: ["Promotions", "Social", "Forums", "Updates"],
    maxEmailsPerSync: 1000,
    dateRangeDays: 90,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [newLabelInclude, setNewLabelInclude] = useState("");
  const [newLabelExclude, setNewLabelExclude] = useState("");

  const loadSettings = useCallback(async (): Promise<void> => {
    try {
      const data = await get<{
        gmailQuery?: string;
        gmailLabelIncludes?: unknown;
        gmailLabelExcludes?: unknown;
      }>("/api/google/prefs");

      if (data.gmailQuery || data.gmailLabelIncludes || data.gmailLabelExcludes) {
        setSettings({
          gmailQuery: data.gmailQuery ?? settings.gmailQuery,
          gmailLabelIncludes:
            Array.isArray(data.gmailLabelIncludes) &&
            data.gmailLabelIncludes.every(
              (item: unknown): item is string => typeof item === "string",
            )
              ? data.gmailLabelIncludes
              : [],
          gmailLabelExcludes:
            Array.isArray(data.gmailLabelExcludes) &&
            data.gmailLabelExcludes.every(
              (item: unknown): item is string => typeof item === "string",
            )
              ? data.gmailLabelExcludes
              : settings.gmailLabelExcludes,
          maxEmailsPerSync: settings.maxEmailsPerSync,
          dateRangeDays: settings.dateRangeDays,
        });
      }
    } catch (error) {
      await logger.error(
        "gmail_settings_load_failed",
        {
          operation: "load_gmail_settings",
          additionalData: { component: "GmailSettingsPanel" },
        },
        ErrorHandler.fromError(error),
      );
    }
  }, [settings, setSettings]);

  useEffect(() => {
    if (isOpen) {
      loadSettings().catch((error) => {
        logger
          .error(
            "gmail_settings_load_failed_on_open",
            {
              operation: "load_gmail_settings_on_open",
              additionalData: { component: "GmailSettingsPanel" },
            },
            ErrorHandler.fromError(error),
          )
          .catch(() => {
            // Failed to log error - ignore silently to avoid cascading errors
          });
      });
    }
  }, [isOpen, loadSettings]);

  const saveSettings = async (): Promise<void> => {
    setIsSaving(true);
    try {
      const payload = {
        gmailQuery: settings.gmailQuery,
        gmailLabelIncludes: settings.gmailLabelIncludes,
        gmailLabelExcludes: settings.gmailLabelExcludes,
      };

      if (isInitialSetup) {
        // Call the initial sync API endpoint
        const data = await post<{ message?: string }>("/api/sync/initial/gmail", payload);
        toast({
          title: "Success",
          description: data.message ?? "Settings saved and initial sync started!",
        });
        onInitialSyncStarted?.();
      } else {
        // Call the regular settings API endpoint
        await put("/api/google/prefs", payload);
        toast({
          title: "Success",
          description: "Gmail settings saved successfully",
        });
        onClose();
      }
    } catch (error) {
      await logger.error(
        "gmail_settings_save_failed",
        {
          operation: isInitialSetup ? "save_initial_gmail_settings" : "save_gmail_settings",
          additionalData: { component: "GmailSettingsPanel", isInitialSetup },
        },
        ErrorHandler.fromError(error),
      );
      toast({
        title: "Error",
        description: isInitialSetup
          ? "Failed to save settings and start initial sync"
          : "Failed to save Gmail settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addLabelInclude = (): void => {
    if (newLabelInclude.trim() && !settings.gmailLabelIncludes.includes(newLabelInclude.trim())) {
      setSettings((prev) => ({
        ...prev,
        gmailLabelIncludes: [...prev.gmailLabelIncludes, newLabelInclude.trim()],
      }));
      setNewLabelInclude("");
    }
  };

  const removeLabelInclude = (label: string): void => {
    setSettings((prev) => ({
      ...prev,
      gmailLabelIncludes: prev.gmailLabelIncludes.filter((l) => l !== label),
    }));
  };

  const addLabelExclude = (): void => {
    if (newLabelExclude.trim() && !settings.gmailLabelExcludes.includes(newLabelExclude.trim())) {
      setSettings((prev) => ({
        ...prev,
        gmailLabelExcludes: [...prev.gmailLabelExcludes, newLabelExclude.trim()],
      }));
      setNewLabelExclude("");
    }
  };

  const removeLabelExclude = (label: string): void => {
    setSettings((prev) => ({
      ...prev,
      gmailLabelExcludes: prev.gmailLabelExcludes.filter((l) => l !== label),
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <h2 className="text-xl font-semibold">
                {isInitialSetup ? "Configure Gmail Sync" : "Gmail Sync Settings"}
              </h2>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Gmail Query */}
              <div className="space-y-2">
                <Label htmlFor="gmail-query" className="text-sm font-medium">
                  Gmail Search Query
                </Label>
                <Textarea
                  id="gmail-query"
                  value={settings.gmailQuery}
                  onChange={(e) => setSettings((prev) => ({ ...prev, gmailQuery: e.target.value }))}
                  placeholder="e.g., category:primary -in:chats -in:drafts newer_than:30d"
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  Use Gmail search operators to filter which emails to sync.{" "}
                  <a
                    href="https://support.google.com/mail/answer/7190"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Learn more about Gmail search
                  </a>
                </p>
              </div>

              <Separator />

              {/* Label Filters */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Include Only These Labels
                  </Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Only sync emails with these labels (leave empty to include all)
                  </p>

                  <div className="flex gap-2 mb-3">
                    <Input
                      value={newLabelInclude}
                      onChange={(e) => setNewLabelInclude(e.target.value)}
                      placeholder="Enter label name"
                      onKeyPress={(e) => e.key === "Enter" && addLabelInclude()}
                    />
                    <Button onClick={addLabelInclude} size="sm" variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {settings.gmailLabelIncludes.map((label) => (
                      <Badge key={label} variant="secondary" className="flex items-center gap-1">
                        {label}
                        <button
                          onClick={() => removeLabelInclude(label)}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Exclude These Labels</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Skip emails with these labels (common exclusions: Promotions, Social, Forums,
                    Updates)
                  </p>

                  <div className="flex gap-2 mb-3">
                    <Input
                      value={newLabelExclude}
                      onChange={(e) => setNewLabelExclude(e.target.value)}
                      placeholder="Enter label name"
                      onKeyPress={(e) => e.key === "Enter" && addLabelExclude()}
                    />
                    <Button onClick={addLabelExclude} size="sm" variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {settings.gmailLabelExcludes.map((label) => (
                      <Badge key={label} variant="default" className="flex items-center gap-1">
                        {label}
                        <button
                          onClick={() => removeLabelExclude(label)}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Advanced Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Advanced Settings</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-emails" className="text-sm">
                      Max Emails Per Sync
                    </Label>
                    <Input
                      id="max-emails"
                      type="number"
                      value={settings.maxEmailsPerSync}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          maxEmailsPerSync: parseInt(e.target.value) || 1000,
                        }))
                      }
                      min="100"
                      max="10000"
                    />
                    <p className="text-xs text-muted-foreground">
                      Limit to prevent timeouts (100-10000)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date-range" className="text-sm">
                      Default Date Range (days)
                    </Label>
                    <Input
                      id="date-range"
                      type="number"
                      value={settings.dateRangeDays}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          dateRangeDays: parseInt(e.target.value) || 30,
                        }))
                      }
                      min="7"
                      max="365"
                    />
                    <p className="text-xs text-muted-foreground">
                      How far back to sync by default (7-365 days)
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900 mb-1">Sync Behavior</p>
                      <ul className="text-blue-800 space-y-1 text-xs">
                        <li>• Emails are processed in batches to avoid timeouts</li>
                        <li>• Duplicate contacts are automatically merged</li>
                        <li>• Only new emails since last sync are processed</li>
                        <li>• Large attachments are skipped for performance</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <div className="text-sm text-muted-foreground">
              {isInitialSetup
                ? "Your first Gmail sync will start after saving"
                : "Changes will apply to your next Gmail sync"}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={saveSettings} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Save className="h-4 w-4 mr-2 animate-spin" />
                    {isInitialSetup ? "Starting Sync..." : "Saving..."}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isInitialSetup ? "Save & Start Initial Sync" : "Save Settings"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

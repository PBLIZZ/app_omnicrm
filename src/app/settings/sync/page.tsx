"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import {
  getSyncStatus,
  getSyncPreferences,
  updateSyncPreferences,
  previewGmailSync,
  previewCalendarSync,
  approveGmailSync,
  approveCalendarSync,
  runJobs,
  undoSync,
  type SyncStatus,
  type SyncPreferences,
  type PreviewGmailResponse,
  type PreviewCalendarResponse,
} from "@/lib/api/sync";

export default function SyncSettingsPage() {
  const [gmail, setGmail] = useState<PreviewGmailResponse | null>(null);
  const [calendar, setCalendar] = useState<PreviewCalendarResponse | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [prefs, setPrefs] = useState<SyncPreferences | null>(null);

  async function refreshStatus() {
    try {
      setBusy(true);
      const statusData = await getSyncStatus();
      setStatus(statusData);
      toast.success("Status refreshed");
    } catch (error) {
      toast.error("Failed to refresh status", { description: "Network error" });
      logger.error("Failed to refresh status", error, "SyncSettingsPage");
    } finally {
      setBusy(false);
    }
  }

  async function loadPrefs() {
    try {
      setBusy(true);
      const preferences = await getSyncPreferences();
      setPrefs(preferences);
      toast.success("Preferences loaded");
    } catch (error) {
      toast.error("Failed to load preferences", { description: "Network error" });
      logger.error("Failed to load preferences", error, "SyncSettingsPage");
    } finally {
      setBusy(false);
    }
  }

  async function savePrefs() {
    if (!prefs) return;

    try {
      setBusy(true);
      await updateSyncPreferences(prefs);
      toast.success("Preferences saved successfully");
    } catch (error) {
      toast.error("Failed to save preferences", { description: "Network error" });
      logger.error("Failed to save preferences", error, "SyncSettingsPage");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-8" aria-busy={busy}>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {busy ? "Working…" : ""}
      </div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sync Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your Google account connections and sync preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sync Status</CardTitle>
              <CardDescription>Current connection and sync information</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={refreshStatus} disabled={busy}>
              {busy ? "Loading…" : "Refresh Status"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {status && (
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <Label>Google Connected</Label>
                <Badge variant={status.googleConnected ? "default" : "secondary"}>
                  {status.googleConnected ? "Connected" : "Not Connected"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <Label>Gmail Access</Label>
                <Badge variant={status.flags?.gmail ? "default" : "outline"}>
                  {status.flags?.gmail ? "Authorized" : "Not Authorized"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <Label>Calendar Access</Label>
                <Badge variant={status.flags?.calendar ? "default" : "outline"}>
                  {status.flags?.calendar ? "Authorized" : "Not Authorized"}
                </Badge>
              </div>

              {(status.lastSync?.gmail || status.lastSync?.calendar) && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Last Sync</Label>
                    <div className="grid gap-1 text-sm text-muted-foreground">
                      {status.lastSync.gmail && <div>Gmail: {status.lastSync.gmail}</div>}
                      {status.lastSync.calendar && <div>Calendar: {status.lastSync.calendar}</div>}
                    </div>
                  </div>
                </>
              )}

              {status.jobs && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Background Jobs</Label>
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Queued:</span>
                        <Badge variant="outline">{status.jobs.queued}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Completed:</span>
                        <Badge variant="default">{status.jobs.done}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Errors:</span>
                        <Badge variant={status.jobs.error > 0 ? "destructive" : "outline"}>
                          {status.jobs.error}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connect Accounts</CardTitle>
          <CardDescription>
            Connect your Google services with incremental consent - only authorize what you need.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a href={`/api/google/oauth?scope=gmail`}>Connect Gmail (read-only)</a>
            </Button>
            <Button asChild variant="outline">
              <a href={`/api/google/oauth?scope=calendar`}>Connect Calendar (read-only)</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sync Preferences</CardTitle>
              <CardDescription>Configure how your data is synchronized</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadPrefs} disabled={busy}>
                {busy ? "Loading..." : "Load Settings"}
              </Button>
              <Button variant="outline" size="sm" onClick={savePrefs} disabled={busy || !prefs}>
                {busy ? "Saving..." : "Save Settings"}
              </Button>
              {status?.lastBatchId && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (!status.lastBatchId) return;
                    try {
                      setBusy(true);
                      await undoSync(status.lastBatchId);
                      toast.success("Import undone successfully");
                      const newStatus = { ...status };
                      delete newStatus.lastBatchId;
                      setStatus(newStatus);
                    } catch (error) {
                      toast.error("Failed to undo import", { description: "Network error" });
                      logger.error("Failed to undo import", error, "SyncSettingsPage");
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                >
                  Undo Last Import
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {prefs ? (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Gmail Settings</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="gmail-query">Gmail Query</Label>
                    <Input
                      id="gmail-query"
                      placeholder="e.g., has:attachment newer_than:30d"
                      value={prefs.gmailQuery ?? ""}
                      onChange={(e) =>
                        setPrefs((p) =>
                          p ? { ...p, gmailQuery: e.target.value } : { gmailQuery: e.target.value },
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gmail-include">Include Labels (comma-separated)</Label>
                    <Input
                      id="gmail-include"
                      placeholder="e.g., IMPORTANT, INBOX"
                      value={(prefs.gmailLabelIncludes ?? []).join(", ")}
                      onChange={(e) =>
                        setPrefs((p) =>
                          p
                            ? {
                                ...p,
                                gmailLabelIncludes: e.target.value
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              }
                            : {
                                gmailLabelIncludes: e.target.value
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              },
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gmail-exclude">Exclude Labels (comma-separated)</Label>
                    <Input
                      id="gmail-exclude"
                      placeholder="e.g., SPAM, TRASH"
                      value={(prefs.gmailLabelExcludes ?? []).join(", ")}
                      onChange={(e) =>
                        setPrefs((p) =>
                          p
                            ? {
                                ...p,
                                gmailLabelExcludes: e.target.value
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              }
                            : {
                                gmailLabelExcludes: e.target.value
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              },
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Calendar Settings</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-organizer" className="text-sm">
                      Include events you organize
                    </Label>
                    <Switch
                      id="include-organizer"
                      checked={prefs.calendarIncludeOrganizerSelf === "true"}
                      onCheckedChange={(checked) =>
                        setPrefs((p) =>
                          p
                            ? {
                                ...p,
                                calendarIncludeOrganizerSelf: checked ? "true" : "false",
                              }
                            : {
                                calendarIncludeOrganizerSelf: checked ? "true" : "false",
                              },
                        )
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-private" className="text-sm">
                      Include private events
                    </Label>
                    <Switch
                      id="include-private"
                      checked={prefs.calendarIncludePrivate === "true"}
                      onCheckedChange={(checked) =>
                        setPrefs((p) =>
                          p
                            ? {
                                ...p,
                                calendarIncludePrivate: checked ? "true" : "false",
                              }
                            : {
                                calendarIncludePrivate: checked ? "true" : "false",
                              },
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time-window">Sync Time Window (days)</Label>
                    <Input
                      id="time-window"
                      type="number"
                      min="1"
                      max="365"
                      value={prefs.calendarTimeWindowDays ?? 60}
                      onChange={(e) =>
                        setPrefs((p) =>
                          p
                            ? {
                                ...p,
                                calendarTimeWindowDays: Number(e.target.value) || 60,
                              }
                            : {
                                calendarTimeWindowDays: Number(e.target.value) || 60,
                              },
                        )
                      }
                      placeholder="60"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Click &quot;Load Settings&quot; to configure your sync preferences.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Preview Imports</h2>
        <div className="flex gap-3">
          <Button
            disabled={busy}
            variant="outline"
            onClick={async () => {
              try {
                setBusy(true);
                const result = await previewGmailSync();
                setGmail(result);
              } catch (error) {
                toast.error("Gmail preview failed", { description: "Network error" });
                logger.error("Failed to preview Gmail", error, "SyncSettingsPage");
              } finally {
                setBusy(false);
              }
            }}
          >
            Preview Gmail
          </Button>
          <Button
            disabled={busy}
            variant="outline"
            onClick={async () => {
              try {
                setBusy(true);
                const result = await previewCalendarSync();
                setCalendar(result);
              } catch (error) {
                toast.error("Calendar preview failed", { description: "Network error" });
                logger.error("Failed to preview Calendar", error, "SyncSettingsPage");
              } finally {
                setBusy(false);
              }
            }}
          >
            Preview Calendar
          </Button>
        </div>

        {gmail && (
          <div className="text-sm border rounded p-3">
            <div className="font-medium">Gmail preview</div>
            <div className="mt-1">Labels:</div>
            <ul className="list-disc ml-5">
              {Object.entries(gmail.countByLabel).map(([k, v]) => (
                <li key={k}>
                  {k}: {v}
                </li>
              ))}
            </ul>
            <div className="mt-1">Samples:</div>
            <ul className="list-disc ml-5">
              {gmail.sampleSubjects.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        {calendar && (
          <div className="text-sm border rounded p-3">
            <div className="font-medium">Calendar preview</div>
            <div>Count: {calendar.count}</div>
            <ul className="list-disc ml-5">
              {calendar.sampleTitles.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Approve & Run</h2>
        <div className="flex gap-3">
          <Button
            disabled={busy}
            variant="outline"
            onClick={async () => {
              try {
                setBusy(true);
                const result = await approveGmailSync();
                setBatchId(result.batchId);
                toast.success("Gmail sync approved", {
                  description: `Batch ID: ${result.batchId}`,
                });
              } catch (error) {
                toast.error("Failed to approve Gmail sync", { description: "Network error" });
                logger.error("Failed to approve Gmail sync", error, "SyncSettingsPage");
              } finally {
                setBusy(false);
              }
            }}
          >
            Approve Gmail Import
          </Button>
          <Button
            disabled={busy}
            variant="outline"
            onClick={async () => {
              try {
                setBusy(true);
                const result = await approveCalendarSync();
                setBatchId(result.batchId);
                toast.success("Calendar sync approved", {
                  description: `Batch ID: ${result.batchId}`,
                });
              } catch (error) {
                toast.error("Failed to approve Calendar sync", { description: "Network error" });
                logger.error("Failed to approve Calendar sync", error, "SyncSettingsPage");
              } finally {
                setBusy(false);
              }
            }}
          >
            Approve Calendar Import
          </Button>
          <Button
            disabled={busy}
            variant="outline"
            onClick={async () => {
              try {
                setBusy(true);
                const result = await runJobs();
                toast.success("Jobs processed successfully", {
                  description: `Processed ${result.processed} jobs`,
                });
              } catch (error) {
                toast.error("Failed to run jobs", { description: "Network error" });
                logger.error("Failed to run jobs", error, "SyncSettingsPage");
              } finally {
                setBusy(false);
              }
            }}
          >
            Run Jobs
          </Button>
        </div>
        {batchId && <div className="text-sm text-neutral-600">Last batchId: {batchId}</div>}
      </section>
    </div>
  );
}

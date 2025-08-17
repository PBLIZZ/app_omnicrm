"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type PreviewGmail = { countByLabel: Record<string, number>; sampleSubjects: string[] };
type PreviewCalendar = { count: number; sampleTitles: string[] };

interface SyncStatus {
  googleConnected: boolean;
  flags?: {
    gmail: boolean;
    calendar: boolean;
  };
  lastSync?: {
    gmail: string | null;
    calendar: string | null;
  };
  jobs?: {
    queued: number;
    done: number;
    error: number;
  };
  lastBatchId?: string;
}

interface SyncPreferences {
  gmailQuery?: string;
  gmailLabelIncludes?: string[];
  gmailLabelExcludes?: string[];
  calendarIncludeOrganizerSelf?: string;
  calendarIncludePrivate?: string;
  calendarTimeWindowDays?: number;
}

interface APIResponse {
  ok?: boolean;
  error?: string;
  batchId?: string;
  processed?: number;
}

interface PreviewAPIResponse extends APIResponse {
  data?: {
    countByLabel?: Record<string, number>;
    sampleSubjects?: string[];
    count?: number;
    sampleTitles?: string[];
  };
}

export default function SyncSettingsPage() {
  const [gmail, setGmail] = useState<PreviewGmail | null>(null);
  const [calendar, setCalendar] = useState<PreviewCalendar | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const base = ""; // same-origin

  const [prefs, setPrefs] = useState<SyncPreferences | null>(null);
  // Read CSRF token from cookie (double-submit) and include in mutating requests
  function getCsrf(): string {
    if (typeof document === "undefined") return "";
    const m = document.cookie.match(/(?:^|; )csrf=([^;]+)/);
    return m ? decodeURIComponent(m[1] ?? "") : "";
  }

  async function refreshStatus() {
    try {
      setBusy(true);
      const response = await fetch(`/api/settings/sync/status`);
      if (!response.ok) {
        toast.error("Failed to refresh status", { description: `HTTP ${response.status}` });
        return;
      }
      const statusData = (await response.json()) as SyncStatus;
      setStatus(statusData);
      toast.success("Status refreshed");
    } catch {
      toast.error("Failed to refresh status", { description: "Network error" });
    } finally {
      setBusy(false);
    }
  }

  async function loadPrefs() {
    try {
      setBusy(true);
      const res = await fetch(`/api/settings/sync/prefs`);
      if (!res.ok) {
        toast.error("Failed to load preferences", { description: `HTTP ${res.status}` });
        return;
      }
      const j = (await res.json()) as SyncPreferences;
      setPrefs(j);
      toast.success("Preferences loaded");
    } catch {
      toast.error("Failed to load preferences", { description: "Network error" });
    } finally {
      setBusy(false);
    }
  }

  async function savePrefs() {
    try {
      setBusy(true);
      const res = await fetch(`/api/settings/sync/prefs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrf() || "" },
        body: JSON.stringify(prefs ?? {}),
      });
      if (!res.ok) {
        toast.error("Failed to save preferences", { description: `HTTP ${res.status}` });
        return;
      }
      toast.success("Preferences saved");
    } catch {
      toast.error("Failed to save preferences", { description: "Network error" });
    } finally {
      setBusy(false);
    }
  }

  async function callJSON(url: string, body?: Record<string, unknown>): Promise<APIResponse> {
    setBusy(true);
    try {
      const doPost = async () =>
        fetch(url, {
          method: "POST",
          credentials: "same-origin",
          headers: { "x-csrf-token": getCsrf() || "", "content-type": "application/json" },
          body: body ? JSON.stringify(body) : null,
        });

      // First attempt
      let res = await doPost();
      let j = (await res.json()) as APIResponse;
      if (res.ok) return j;
      // If server just issued CSRF cookies, retry once with fresh header
      if (res.status === 403 && j?.error === "missing_csrf") {
        // allow cookies to be persisted to document.cookie before retrying
        await new Promise((r) => setTimeout(r, 50));
        res = await doPost();
        j = (await res.json()) as APIResponse;
        if (res.ok) return j;
      }
      throw new Error(j?.error || res.statusText);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Sync Settings</h1>
      <div className="text-sm text-neutral-600">
        <Button variant="outline" size="sm" onClick={refreshStatus} disabled={busy}>
          {busy ? "Loading..." : "Refresh Status"}
        </Button>
        {status && (
          <div className="mt-2 grid gap-1">
            <div>Google connected: {String(status.googleConnected)}</div>
            <div>
              Flags: Gmail {String(status.flags?.gmail)} / Calendar {String(status.flags?.calendar)}
            </div>
            <div>
              Last sync — Gmail: {status.lastSync?.gmail ?? "-"} / Calendar:{" "}
              {status.lastSync?.calendar ?? "-"}
            </div>
            <div>
              Jobs — queued: {status.jobs?.queued} done: {status.jobs?.done} error:{" "}
              {status.jobs?.error}
            </div>
          </div>
        )}
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Connect Accounts</h2>
        <div className="flex gap-3">
          <Button asChild>
            <a href={`/api/google/oauth?scope=gmail`}>Connect Gmail (read-only)</a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/api/google/oauth?scope=calendar`}>Connect Calendar (read-only)</a>
          </Button>
        </div>
        <p className="text-sm text-neutral-500">Incremental consent; only the scope you pick.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Preferences</h2>
        <div className="flex gap-2 items-end">
          <Button variant="outline" size="sm" onClick={refreshStatus} disabled={busy}>
            {busy ? "Loading..." : "Refresh Status"}
          </Button>
          {status?.lastBatchId && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  setBusy(true);
                  const res = await fetch(`/api/sync/undo`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "x-csrf-token": getCsrf() || "",
                    },
                    body: JSON.stringify({ batchId: status.lastBatchId }),
                  });
                  const j = (await res.json()) as APIResponse;
                  if (j.ok) {
                    toast.success("Import undone successfully");
                    // Refresh status to update UI
                    await refreshStatus();
                  } else {
                    toast.error("Failed to undo import", {
                      description: j.error ?? "Unknown error occurred",
                    });
                  }
                } catch {
                  toast.error("Failed to undo import", { description: "Network error" });
                } finally {
                  setBusy(false);
                }
              }}
            >
              Undo Last Import
            </Button>
          )}
        </div>
        <div className="grid gap-2 border rounded p-3 text-sm">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadPrefs} disabled={busy}>
              {busy ? "Loading..." : "Load Prefs"}
            </Button>
            <Button variant="outline" size="sm" onClick={savePrefs} disabled={busy || !prefs}>
              {busy ? "Saving..." : "Save Prefs"}
            </Button>
          </div>
          {prefs && (
            <>
              <label className="grid gap-1">
                <span>Gmail query</span>
                <Input
                  value={prefs.gmailQuery ?? ""}
                  onChange={(e) =>
                    setPrefs((p) =>
                      p ? { ...p, gmailQuery: e.target.value } : { gmailQuery: e.target.value },
                    )
                  }
                  placeholder="e.g., has:attachment newer_than:30d"
                />
              </label>
              <label className="grid gap-1">
                <span>Gmail include labels (comma)</span>
                <Input
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
                  placeholder="e.g., IMPORTANT, INBOX"
                />
              </label>
              <label className="grid gap-1">
                <span>Gmail exclude labels (comma)</span>
                <Input
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
                  placeholder="e.g., SPAM, TRASH"
                />
              </label>
              <div className="grid gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={prefs.calendarIncludeOrganizerSelf === "true"}
                    onChange={(e) =>
                      setPrefs((p) =>
                        p
                          ? {
                              ...p,
                              calendarIncludeOrganizerSelf: e.target.checked ? "true" : "false",
                            }
                          : {
                              calendarIncludeOrganizerSelf: e.target.checked ? "true" : "false",
                            },
                      )
                    }
                  />
                  <span>Include organizer self</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={prefs.calendarIncludePrivate === "true"}
                    onChange={(e) =>
                      setPrefs((p) =>
                        p
                          ? {
                              ...p,
                              calendarIncludePrivate: e.target.checked ? "true" : "false",
                            }
                          : {
                              calendarIncludePrivate: e.target.checked ? "true" : "false",
                            },
                      )
                    }
                  />
                  <span>Include private events</span>
                </label>
                <label className="grid gap-1">
                  <span>Calendar time window (days)</span>
                  <Input
                    type="number"
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
                    min="1"
                    max="365"
                    placeholder="60"
                  />
                </label>
              </div>
            </>
          )}
        </div>
        {status && (
          <div className="mt-2 grid gap-1 text-sm text-neutral-600">
            <div>Google connected: {String(status.googleConnected)}</div>
            <div>
              Flags: Gmail {String(status.flags?.gmail)} / Calendar {String(status.flags?.calendar)}
            </div>
            <div>
              Last sync — Gmail: {status.lastSync?.gmail ?? "-"} / Calendar:{" "}
              {status.lastSync?.calendar ?? "-"}
            </div>
            <div>
              Jobs — queued: {status.jobs?.queued} done: {status.jobs?.done} error:{" "}
              {status.jobs?.error}
            </div>
            <div>Last batchId: {status.lastBatchId ?? "-"}</div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Preview Imports</h2>
        <div className="flex gap-3">
          <Button
            disabled={busy}
            variant="outline"
            onClick={async () => {
              const result = (await callJSON(
                `${base}/api/sync/preview/gmail`,
              )) as PreviewAPIResponse;
              const d = result?.data;
              if (result.ok && d?.countByLabel && d?.sampleSubjects) {
                setGmail({ countByLabel: d.countByLabel, sampleSubjects: d.sampleSubjects });
              } else if (!result.ok) {
                toast.error("Gmail preview failed", {
                  description: result.error ?? "Unknown error occurred",
                });
              }
            }}
          >
            Preview Gmail
          </Button>
          <Button
            disabled={busy}
            variant="outline"
            onClick={async () => {
              const result = (await callJSON(
                `${base}/api/sync/preview/calendar`,
              )) as PreviewAPIResponse;
              const d = result?.data;
              if (result.ok && d && d.count !== undefined && d.sampleTitles) {
                setCalendar({ count: d.count, sampleTitles: d.sampleTitles });
              } else if (!result.ok) {
                toast.error("Calendar preview failed", {
                  description: result.error ?? "Unknown error occurred",
                });
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
              const j = (await callJSON(`${base}/api/sync/approve/gmail`)) as {
                ok?: boolean;
                data?: { batchId?: string };
                error?: string;
              };
              if (j.ok) {
                setBatchId(j.data?.batchId ?? null);
                toast.success("Gmail sync approved", {
                  description: `Batch ID: ${j.data?.batchId}`,
                });
              } else {
                toast.error("Failed to approve Gmail sync", {
                  description: j.error ?? "Unknown error occurred",
                });
              }
            }}
          >
            Approve Gmail Import
          </Button>
          <Button
            disabled={busy}
            variant="outline"
            onClick={async () => {
              const j = (await callJSON(`${base}/api/sync/approve/calendar`)) as {
                ok?: boolean;
                data?: { batchId?: string };
                error?: string;
              };
              if (j.ok) {
                setBatchId(j.data?.batchId ?? null);
                toast.success("Calendar sync approved", {
                  description: `Batch ID: ${j.data?.batchId}`,
                });
              } else {
                toast.error("Failed to approve Calendar sync", {
                  description: j.error ?? "Unknown error occurred",
                });
              }
            }}
          >
            Approve Calendar Import
          </Button>
          <Button
            disabled={busy}
            variant="outline"
            onClick={async () => {
              const j = (await callJSON(`${base}/api/jobs/runner`, {})) as {
                ok?: boolean;
                data?: { processed?: number };
                error?: string;
              };
              if (j.ok) {
                toast.success("Jobs processed successfully", {
                  description: `Processed ${j.data?.processed ?? 0} jobs`,
                });
              } else {
                toast.error("Failed to run jobs", {
                  description: j.error ?? "Unknown error occurred",
                });
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

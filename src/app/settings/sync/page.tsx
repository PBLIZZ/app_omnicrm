"use client";

import { useState } from "react";

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
  countByLabel?: Record<string, number>;
  sampleSubjects?: string[];
  count?: number;
  sampleTitles?: string[];
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

  async function loadPrefs() {
    const res = await fetch(`/api/settings/sync/prefs`);
    const j = (await res.json()) as SyncPreferences;
    setPrefs(j);
  }
  async function savePrefs() {
    await fetch(`/api/settings/sync/prefs`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-csrf-token": getCsrf() || "" },
      body: JSON.stringify(prefs ?? {}),
    });
  }

  async function callJSON(url: string, body?: Record<string, unknown>): Promise<APIResponse> {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "x-csrf-token": getCsrf() || "", "content-type": "application/json" },
        body: body ? JSON.stringify(body) : null,
      });
      const j = (await res.json()) as APIResponse;
      if (!res.ok) throw new Error(j?.error || res.statusText);
      return j;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Sync Settings</h1>
      <div className="text-sm text-neutral-600">
        <button
          className="px-2 py-1 rounded border"
          onClick={async () =>
            setStatus((await (await fetch(`/api/settings/sync/status`)).json()) as SyncStatus)
          }
        >
          Refresh Status
        </button>
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
          <a className="px-3 py-2 rounded border" href={`/api/google/oauth?scope=gmail`}>
            Connect Gmail (read-only)
          </a>
          <a className="px-3 py-2 rounded border" href={`/api/google/oauth?scope=calendar`}>
            Connect Calendar (read-only)
          </a>
        </div>
        <p className="text-sm text-neutral-500">Incremental consent; only the scope you pick.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Preferences</h2>
        <div className="flex gap-2 items-end">
          <button
            className="px-2 py-1 rounded border"
            onClick={async () =>
              setStatus((await (await fetch(`/api/settings/sync/status`)).json()) as SyncStatus)
            }
          >
            Refresh Status
          </button>
          {status?.lastBatchId && (
            <button
              className="px-2 py-1 rounded border"
              onClick={async () => {
                const res = await fetch(`/api/sync/undo`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ batchId: status.lastBatchId }),
                });
                const j = (await res.json()) as APIResponse;
                alert(`Undo: ${j.ok ? "ok" : j.error}`);
              }}
            >
              Undo Last Import
            </button>
          )}
        </div>
        <div className="grid gap-2 border rounded p-3 text-sm">
          <div className="flex items-center gap-2">
            <button className="px-2 py-1 rounded border" onClick={loadPrefs}>
              Load Prefs
            </button>
            <button className="px-2 py-1 rounded border" onClick={savePrefs}>
              Save Prefs
            </button>
          </div>
          {prefs && (
            <>
              <label className="grid gap-1">
                <span>Gmail query</span>
                <input
                  className="border rounded px-2 py-1"
                  value={prefs.gmailQuery ?? ""}
                  onChange={(e) =>
                    setPrefs((p) =>
                      p ? { ...p, gmailQuery: e.target.value } : { gmailQuery: e.target.value },
                    )
                  }
                />
              </label>
              <label className="grid gap-1">
                <span>Gmail include labels (comma)</span>
                <input
                  className="border rounded px-2 py-1"
                  value={(prefs.gmailLabelIncludes ?? []).join(",")}
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
              </label>
              <label className="grid gap-1">
                <span>Gmail exclude labels (comma)</span>
                <input
                  className="border rounded px-2 py-1"
                  value={(prefs.gmailLabelExcludes ?? []).join(",")}
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
                  <input
                    type="number"
                    className="border rounded px-2 py-1"
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
          <button
            disabled={busy}
            className="px-3 py-2 rounded border"
            onClick={async () => {
              const result = (await callJSON(
                `${base}/api/sync/preview/gmail`,
              )) as PreviewAPIResponse;
              if (result.countByLabel && result.sampleSubjects) {
                setGmail({
                  countByLabel: result.countByLabel,
                  sampleSubjects: result.sampleSubjects,
                });
              }
            }}
          >
            Preview Gmail
          </button>
          <button
            disabled={busy}
            className="px-3 py-2 rounded border"
            onClick={async () => {
              const result = (await callJSON(
                `${base}/api/sync/preview/calendar`,
              )) as PreviewAPIResponse;
              if (result.count !== undefined && result.sampleTitles) {
                setCalendar({ count: result.count, sampleTitles: result.sampleTitles });
              }
            }}
          >
            Preview Calendar
          </button>
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
          <button
            disabled={busy}
            className="px-3 py-2 rounded border"
            onClick={async () => {
              const j = await callJSON(`${base}/api/sync/approve/gmail`);
              setBatchId(j.batchId ?? null);
            }}
          >
            Approve Gmail Import
          </button>
          <button
            disabled={busy}
            className="px-3 py-2 rounded border"
            onClick={async () => {
              const j = await callJSON(`${base}/api/sync/approve/calendar`);
              setBatchId(j.batchId ?? null);
            }}
          >
            Approve Calendar Import
          </button>
          <button
            disabled={busy}
            className="px-3 py-2 rounded border"
            onClick={async () => {
              const j = await callJSON(`${base}/api/jobs/runner`, {});
              alert(`Processed: ${j.processed}`);
            }}
          >
            Run Jobs
          </button>
        </div>
        {batchId && <div className="text-sm text-neutral-600">Last batchId: {batchId}</div>}
      </section>
    </div>
  );
}

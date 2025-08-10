"use client";

import { useState } from "react";

type PreviewGmail = { countByLabel: Record<string, number>; sampleSubjects: string[] };
type PreviewCalendar = { count: number; sampleTitles: string[] };

export default function SyncSettingsPage() {
  const [gmail, setGmail] = useState<PreviewGmail | null>(null);
  const [calendar, setCalendar] = useState<PreviewCalendar | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const base = ""; // same-origin

  async function callJSON(url: string, body?: any) {
    setBusy(true);
    try {
      const res = await fetch(url, { method: "POST", body: body ? JSON.stringify(body) : null });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || res.statusText);
      return j;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Sync Settings</h1>

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

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Preview Imports</h2>
        <div className="flex gap-3">
          <button
            disabled={busy}
            className="px-3 py-2 rounded border"
            onClick={async () => setGmail(await callJSON(`${base}/api/sync/preview/gmail`))}
          >
            Preview Gmail
          </button>
          <button
            disabled={busy}
            className="px-3 py-2 rounded border"
            onClick={async () => setCalendar(await callJSON(`${base}/api/sync/preview/calendar`))}
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
              setBatchId(j.batchId);
            }}
          >
            Approve Gmail Import
          </button>
          <button
            disabled={busy}
            className="px-3 py-2 rounded border"
            onClick={async () => {
              const j = await callJSON(`${base}/api/sync/approve/calendar`);
              setBatchId(j.batchId);
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

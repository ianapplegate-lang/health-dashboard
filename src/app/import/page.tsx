"use client";
import { useState } from "react";
import type { ImportSummary } from "@/lib/import/takeout";

export default function ImportPage() {
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ImportSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResults(null);
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    if (!fileInput.files?.[0]) return;

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", fileInput.files[0]);
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `Import failed: ${res.status}`);
        return;
      }
      setResults(json.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Import Takeout</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Upload a Google Takeout zip containing your Fitbit or Google Fit data. Daily
          steps, sleep, and resting HR will be ingested into the dashboard.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="rounded-2xl bg-zinc-900 ring-1 ring-zinc-800 p-5 space-y-4"
      >
        <input
          type="file"
          name="file"
          accept=".zip"
          required
          className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:text-black hover:file:bg-emerald-400"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-emerald-500 text-black px-4 py-2 text-sm font-medium hover:bg-emerald-400 disabled:opacity-50"
        >
          {busy ? "Importing…" : "Import"}
        </button>
      </form>

      {error ? (
        <div className="rounded-2xl bg-red-950 ring-1 ring-red-900 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {results ? (
        <div className="space-y-3">
          {results.map((r) => (
            <div
              key={r.source}
              className="rounded-2xl bg-zinc-900 ring-1 ring-zinc-800 p-4"
            >
              <div className="text-sm font-medium uppercase tracking-wide text-zinc-300">
                {r.source}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                <Stat label="Files" value={r.filesScanned} />
                <Stat label="Daily" value={r.dailyMetricsUpserted} />
                <Stat label="Sleep" value={r.sleepUpserted} />
              </div>
              {r.warnings.length > 0 ? (
                <details className="mt-3 text-xs text-zinc-500">
                  <summary>{r.warnings.length} warnings</summary>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    {r.warnings.slice(0, 50).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

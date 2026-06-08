"use client";
import type { Provider } from "@/db/schema";

const PROVIDERS: { id: Provider; label: string; syncable: boolean }[] = [
  { id: "strava", label: "Strava", syncable: true },
  { id: "withings", label: "Withings", syncable: true },
  { id: "google-calendar", label: "Calendar", syncable: false },
];

export function ConnectionsRow({ connected }: { connected: Provider[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PROVIDERS.map((p) => {
        const isConnected = connected.includes(p.id);
        return (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-full bg-zinc-900 px-4 py-2 ring-1 ring-zinc-800"
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isConnected ? "bg-emerald-400" : "bg-zinc-600"
              }`}
            />
            <span className="text-sm">{p.label}</span>
            {isConnected ? (
              p.syncable ? (
                <button
                  onClick={() => sync(p.id)}
                  className="text-xs rounded-full bg-zinc-800 px-2 py-1 hover:bg-zinc-700"
                >
                  Sync
                </button>
              ) : (
                <span className="text-xs text-zinc-500">Connected</span>
              )
            ) : (
              <a
                href={`/api/connect/${p.id}`}
                className="text-xs rounded-full bg-emerald-500 text-black px-2 py-1 hover:bg-emerald-400"
              >
                Connect
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

async function sync(p: Provider) {
  const res = await fetch(`/api/sync/${p}`, { method: "POST" });
  const json = await res.json();
  if (!res.ok) {
    alert(`Sync failed: ${json.error ?? res.status}`);
    return;
  }
  alert(`Synced ${json.upserts} items from ${p}`);
  location.reload();
}

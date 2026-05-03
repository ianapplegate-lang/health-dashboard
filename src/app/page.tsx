import { getOrCreateDevUser } from "@/lib/session";
import {
  recentWorkouts,
  dailyMetricsLast,
  recentSleep,
  recentWeights,
  connectedProviders,
} from "@/lib/queries";
import { StatCard } from "@/components/StatCard";
import { ConnectionsRow } from "@/components/ConnectionsRow";

export const dynamic = "force-dynamic";

function fmtDuration(sec: number | null) {
  if (sec == null) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

function fmtDistance(m: number | null) {
  if (m == null) return "—";
  const km = m / 1000;
  return km >= 1 ? `${km.toFixed(2)} km` : `${m.toFixed(0)} m`;
}

export default async function Home() {
  const user = await getOrCreateDevUser().catch(() => null);

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Health Dashboard</h1>
        <p className="mt-4 text-zinc-400">
          Database not configured. Set <code>DATABASE_URL</code> in <code>.env.local</code>{" "}
          and run <code>npm run db:push</code>.
        </p>
      </main>
    );
  }

  const [connected, workouts, daily, sleep, weights] = await Promise.all([
    connectedProviders(user.id),
    recentWorkouts(user.id, 10),
    dailyMetricsLast(user.id, 14),
    recentSleep(user.id, 14),
    recentWeights(user.id, 30),
  ]);

  const lastDay = daily[0];
  const lastSleep = sleep[0];
  const lastWeight = weights[0];
  const stepsAvg =
    daily.length > 0
      ? Math.round(daily.reduce((s, d) => s + (d.steps ?? 0), 0) / daily.length)
      : null;

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6 space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Health Dashboard</h1>
          <p className="text-sm text-zinc-400">
            Logged in as {user.displayName ?? user.email} ·{" "}
            <a href="/import" className="underline hover:text-zinc-200">
              Import Takeout
            </a>
          </p>
        </div>
        <ConnectionsRow connected={connected} />
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Steps today"
          value={lastDay?.steps?.toLocaleString() ?? "—"}
          sub={stepsAvg ? `${stepsAvg.toLocaleString()} 14d avg` : undefined}
        />
        <StatCard
          label="Resting HR"
          value={lastDay?.restingHr ? `${lastDay.restingHr} bpm` : "—"}
        />
        <StatCard
          label="Last sleep"
          value={fmtDuration(lastSleep?.durationSec ?? null)}
          sub={
            lastSleep?.efficiency
              ? `${Math.round(lastSleep.efficiency * 100)}% efficient`
              : undefined
          }
        />
        <StatCard
          label="Weight"
          value={lastWeight ? `${lastWeight.weightKg.toFixed(1)} kg` : "—"}
          sub={
            lastWeight
              ? new Date(lastWeight.measuredAt).toLocaleDateString()
              : undefined
          }
        />
      </section>

      <section className="rounded-2xl bg-zinc-900 ring-1 ring-zinc-800">
        <div className="border-b border-zinc-800 px-4 py-3 text-sm font-medium">
          Recent workouts
        </div>
        {workouts.length === 0 ? (
          <div className="p-6 text-sm text-zinc-500">
            No workouts yet. Connect Strava and click Sync.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {workouts.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{w.name ?? w.sport}</div>
                  <div className="text-xs text-zinc-500">
                    {new Date(w.startedAt).toLocaleString()} · {w.sport}
                  </div>
                </div>
                <div className="flex shrink-0 gap-4 text-right tabular-nums">
                  <div>
                    <div className="text-xs text-zinc-500">dur</div>
                    <div>{fmtDuration(w.durationSec)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">dist</div>
                    <div>{fmtDistance(w.distanceM)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">avg HR</div>
                    <div>{w.avgHr ?? "—"}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

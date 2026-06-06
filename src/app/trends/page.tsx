import { getCurrentDbUser } from "@/lib/session";
import {
  stepsSeries,
  sleepSeries,
  restingHrSeries,
  weightSeries,
  sportBreakdown,
} from "@/lib/trends";
import { LineTrend } from "@/components/charts/LineTrend";
import { SportBreakdown } from "@/components/charts/SportBreakdown";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const user = await getCurrentDbUser();

  const [steps, sleep, rhr, weight, sports] = await Promise.all([
    stepsSeries(user.id, 90),
    sleepSeries(user.id, 90),
    restingHrSeries(user.id, 90),
    weightSeries(user.id, 365),
    sportBreakdown(user.id, 90),
  ]);

  const stepsAvg = avg(steps.map((s) => s.value));
  const sleepAvg = avg(sleep.map((s) => s.value));
  const rhrAvg = avg(rhr.map((s) => s.value));

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6 space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trends</h1>
          <p className="text-sm text-zinc-400">Last 90 days · weight last 365</p>
        </div>
        <a href="/" className="text-sm text-zinc-400 underline hover:text-zinc-200">
          ← Dashboard
        </a>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel
          title="Steps"
          subtitle={stepsAvg ? `avg ${stepsAvg.toLocaleString()}/day` : undefined}
        >
          <LineTrend data={steps} unit="steps" />
        </Panel>

        <Panel
          title="Sleep duration"
          subtitle={sleepAvg ? `avg ${sleepAvg.toFixed(1)}h` : undefined}
        >
          <LineTrend data={sleep} unit="h" color="#a78bfa" yDomain={[0, "auto"]} />
        </Panel>

        <Panel
          title="Resting heart rate"
          subtitle={rhrAvg ? `avg ${Math.round(rhrAvg)} bpm` : undefined}
        >
          <LineTrend data={rhr} unit="bpm" color="#f87171" />
        </Panel>

        <Panel title="Weight" subtitle="365 day window">
          <LineTrend data={weight} unit="kg" color="#60a5fa" />
        </Panel>
      </div>

      <Panel title="Sport breakdown" subtitle="last 90 days · workout count">
        <SportBreakdown data={sports} metric="count" />
      </Panel>

      <Panel title="Sport breakdown" subtitle="last 90 days · minutes">
        <SportBreakdown data={sports} metric="minutes" />
      </Panel>
    </main>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-zinc-900 ring-1 ring-zinc-800 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-medium tracking-wide text-zinc-200">{title}</h2>
        {subtitle ? <span className="text-xs text-zinc-500">{subtitle}</span> : null}
      </div>
      {children}
    </section>
  );
}

function avg(values: (number | null)[]): number | null {
  const real = values.filter((v): v is number => v != null);
  if (real.length === 0) return null;
  return real.reduce((a, b) => a + b, 0) / real.length;
}

const COLORS: Record<string, string> = {
  Strava: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  Withings: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
  Kaiser: "bg-red-500/15 text-red-300 ring-red-500/30",
  "Health Connect": "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  Fitbit: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  "Google Fit": "bg-blue-500/15 text-blue-300 ring-blue-500/30",
  Calendar: "bg-yellow-500/15 text-yellow-300 ring-yellow-500/30",
  Manual: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
};

export function SourcePill({ source }: { source: string }) {
  const cls = COLORS[source] ?? "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ${cls}`}
    >
      {source}
    </span>
  );
}

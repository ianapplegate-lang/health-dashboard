import type { WeekItem } from "@/lib/queries/overview";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dayIndex(d: Date, weekStart: Date): number {
  const ms = d.getTime() - weekStart.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function WeekActivity({
  weekStart,
  items,
  calendarStub = true,
}: {
  weekStart: Date;
  items: WeekItem[];
  calendarStub?: boolean;
}) {
  const days: WeekItem[][] = [[], [], [], [], [], [], []];
  for (const it of items) {
    const i = dayIndex(it.startedAt, weekStart);
    if (i >= 0 && i < 7) days[i].push(it);
  }

  const fmtRange = () => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const m = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${m(weekStart)} – ${m(end)}`;
  };

  return (
    <section className="rounded-2xl bg-zinc-900 ring-1 ring-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-200">This week</h2>
        <span className="text-xs text-zinc-500">{fmtRange()}</span>
      </div>
      <div className="grid grid-cols-7 divide-x divide-zinc-800">
        {DAY_LABELS.map((label, i) => {
          const dayDate = new Date(weekStart);
          dayDate.setDate(dayDate.getDate() + i);
          const isToday =
            new Date().toDateString() === dayDate.toDateString();
          return (
            <div key={label} className="min-h-[160px] p-2">
              <div
                className={`flex items-baseline justify-between mb-2 ${
                  isToday ? "text-emerald-400" : "text-zinc-400"
                }`}
              >
                <span className="text-[11px] uppercase tracking-wide font-medium">
                  {label}
                </span>
                <span className="text-[11px] tabular-nums">{dayDate.getDate()}</span>
              </div>
              <div className="space-y-1.5">
                {days[i].length === 0 ? (
                  <div className="text-[10px] text-zinc-600">—</div>
                ) : (
                  days[i].map((it, idx) => (
                    <div
                      key={idx}
                      className={`rounded-md px-1.5 py-1 text-[11px] leading-tight ${
                        it.source === "training-planned"
                          ? "bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/20"
                          : it.source === "training-completed"
                          ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30"
                          : "bg-zinc-800 text-zinc-200"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span>{it.emoji}</span>
                        <span className="truncate font-medium">{it.label}</span>
                      </div>
                      {it.detail ? (
                        <div className="text-[10px] text-zinc-400">{it.detail}</div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      {calendarStub ? (
        <div className="border-t border-zinc-800 px-4 py-2 text-[11px] text-zinc-500">
          Sculpt + football class bookings will appear here once Google Calendar is connected.{" "}
          <span className="text-zinc-600">(pending)</span>
        </div>
      ) : null}
    </section>
  );
}

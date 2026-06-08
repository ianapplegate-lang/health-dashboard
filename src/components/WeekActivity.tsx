import type { WeekItem } from "@/lib/queries/overview";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dayIndex(d: Date, weekStart: Date): number {
  const ms = d.getTime() - weekStart.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function itemClasses(source: WeekItem["source"]): {
  bg: string;
  fg: string;
  ring: string;
} {
  switch (source) {
    case "training-planned":
      return {
        bg: "rgba(227,179,65,0.10)",
        fg: "#e3b341",
        ring: "rgba(227,179,65,0.25)",
      };
    case "training-completed":
      return {
        bg: "rgba(26,171,127,0.15)",
        fg: "#1aab7f",
        ring: "rgba(26,171,127,0.3)",
      };
    case "calendar":
      return {
        bg: "rgba(74,158,255,0.12)",
        fg: "#4a9eff",
        ring: "rgba(74,158,255,0.3)",
      };
    case "workout":
    default:
      return {
        bg: "rgba(255,255,255,0.05)",
        fg: "#e6edf3",
        ring: "rgba(255,255,255,0.09)",
      };
  }
}

export function WeekActivity({
  weekStart,
  items,
  calendarConnected,
}: {
  weekStart: Date;
  items: WeekItem[];
  calendarConnected: boolean;
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
    <div className="cs" style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid var(--b0)",
        }}
      >
        <div className="ct" style={{ margin: 0 }}>This week</div>
        <span className="csub" style={{ margin: 0 }}>{fmtRange()}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {DAY_LABELS.map((label, i) => {
          const dayDate = new Date(weekStart);
          dayDate.setDate(dayDate.getDate() + i);
          const isToday = new Date().toDateString() === dayDate.toDateString();
          return (
            <div
              key={label}
              style={{
                minHeight: 170,
                padding: 8,
                borderRight: i < 6 ? "1px solid var(--b0)" : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 6,
                  color: isToday ? "var(--teal)" : "var(--mu)",
                  fontFamily: "var(--fm)",
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <span>{label}</span>
                <span>{dayDate.getDate()}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {days[i].length === 0 ? (
                  <div style={{ fontSize: 10, color: "var(--dm)" }}>—</div>
                ) : (
                  days[i].map((it, idx) => {
                    const c = itemClasses(it.source);
                    return (
                      <div
                        key={idx}
                        style={{
                          borderRadius: 5,
                          padding: "4px 6px",
                          background: c.bg,
                          color: c.fg,
                          border: `1px solid ${c.ring}`,
                          fontSize: 11,
                          lineHeight: 1.3,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontWeight: 500,
                          }}
                        >
                          <span>{it.emoji}</span>
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {it.label}
                          </span>
                        </div>
                        {it.detail ? (
                          <div
                            style={{
                              fontSize: 10,
                              color: "var(--mu)",
                              fontFamily: "var(--fm)",
                              marginTop: 1,
                            }}
                          >
                            {it.detail}
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
      {!calendarConnected ? (
        <div
          style={{
            borderTop: "1px solid var(--b0)",
            padding: "8px 16px",
            fontSize: 11,
            color: "var(--mu)",
            fontFamily: "var(--fm)",
          }}
        >
          Sculpt + football class bookings will appear here once Google Calendar is connected.{" "}
          <a
            href="/api/connect/google-calendar"
            style={{ color: "var(--blue)", textDecoration: "underline" }}
          >
            Connect now
          </a>
        </div>
      ) : null}
    </div>
  );
}

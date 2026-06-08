import { getCurrentDbUser } from "@/lib/session";
import { timeline, type TimelineEvent } from "@/lib/queries/timeline";

export const dynamic = "force-dynamic";

const CATEGORY_COLORS: Record<TimelineEvent["category"], string> = {
  workout: "#4a9eff",
  body: "#f778ba",
  clinical: "#1aab7f",
  training: "#a371f7",
  sleep: "#e3b341",
  hrv: "#a371f7",
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function TimelinePage() {
  const user = await getCurrentDbUser();
  const events = await timeline(user.id);

  return (
    <>
      <div className="note" style={{ marginBottom: 16 }}>
        Integrated timeline: Strava (blue), Withings body (pink), Sleep (amber), HRV
        (purple), Clinical (teal), Training plan (purple). Derived from your live tables —
        the milestones update as data flows in.
      </div>
      <div style={{ padding: "4px 0" }}>
        {events.map((e, i) => {
          const color = CATEGORY_COLORS[e.category];
          const isLast = i === events.length - 1;
          return (
            <div key={i} style={{ display: "flex", gap: 12, padding: "0 0 16px" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: 13,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    flexShrink: 0,
                    marginTop: 3,
                    border: `2px solid ${color}`,
                    background: `${color}22`,
                  }}
                />
                {!isLast ? (
                  <div
                    style={{
                      width: 1,
                      flex: 1,
                      marginTop: 3,
                      background: "var(--b1)",
                      minHeight: 14,
                    }}
                  />
                ) : null}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--mu)",
                  fontFamily: "var(--fm)",
                  minWidth: 90,
                  paddingTop: 2,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {fmtDate(e.date)}
              </div>
              <div>
                <div style={{ fontSize: 13, color: "var(--tx)" }}>{e.title}</div>
                {e.subtitle ? (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--mu)",
                      marginTop: 2,
                      fontFamily: "var(--fm)",
                    }}
                  >
                    {e.subtitle}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

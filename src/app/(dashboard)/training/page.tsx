import { getCurrentDbUser } from "@/lib/session";
import {
  allTrainingSessions,
  sessionTemplates,
  trainingOverview,
} from "@/lib/queries/training";
import { SessionCard } from "@/components/training/SessionCard";
import type { TrainingMovement } from "@/db/schema";

export const dynamic = "force-dynamic";

function fmtShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function dayOfWeek(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

export default async function TrainingPage() {
  const user = await getCurrentDbUser();
  const [overview, templates, allSessions] = await Promise.all([
    trainingOverview(user.id),
    sessionTemplates(user.id),
    allTrainingSessions(user.id),
  ]);

  const sessionA = templates.find((t) => t.sessionType === "A");
  const sessionB = templates.find((t) => t.sessionType === "B");

  // Build "weekly schedule" view: group plannedFor dates by ISO week
  function isoWeekKey(d: Date): string {
    const t = new Date(d);
    t.setHours(0, 0, 0, 0);
    t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
    const week1 = new Date(t.getFullYear(), 0, 4);
    const weekNum =
      1 +
      Math.round(
        ((t.getTime() - week1.getTime()) / 86400000 -
          3 +
          ((week1.getDay() + 6) % 7)) /
          7,
      );
    return `${t.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
  }

  type WeekRow = { weekKey: string; dates: { type: string; date: Date; completed: boolean }[] };
  const weekMap = new Map<string, WeekRow>();
  for (const s of allSessions) {
    const k = isoWeekKey(s.plannedFor);
    let row = weekMap.get(k);
    if (!row) {
      row = { weekKey: k, dates: [] };
      weekMap.set(k, row);
    }
    row.dates.push({
      type: s.sessionType,
      date: s.plannedFor,
      completed: s.completedAt != null,
    });
  }
  const weeks = Array.from(weekMap.values()).sort((a, b) =>
    a.weekKey.localeCompare(b.weekKey),
  );

  return (
    <>
      <div className="mrow">
        <div className="mc g">
          <div className="ml">💪 Total sessions</div>
          <div className="mv g">{overview.total}</div>
          <div className="ms">
            {fmtDate(overview.earliest)} → {fmtDate(overview.latest)}
          </div>
        </div>
        <div className="mc b">
          <div className="ml">✅ Completed</div>
          <div className="mv b">{overview.completed}</div>
          <div className="ms">marked as done</div>
        </div>
        <div className="mc b">
          <div className="ml">📅 Schedule</div>
          <div className="mv b" style={{ fontSize: 16, marginTop: 3 }}>
            Thu + Sat
          </div>
          <div className="ms">06:00 reminders set</div>
        </div>
        <div className="mc p">
          <div className="ml">🏋️ Load</div>
          <div className="mv p">2×20 lb</div>
          <div className="ms">block 1 dumbbells</div>
        </div>
      </div>

      <div className="note" style={{ marginBottom: 14 }}>
        📌 Two sessions per week, alternating A and B. Thursdays = Session A (posterior
        chain + push). Saturdays = Session B (legs + shoulders). The full workout lives
        in each Google Calendar event — reminders fire at 5:00am and 5:50am.
      </div>

      {sessionA ? (
        <SessionCard
          emoji="💥"
          title="Session A — Thursdays"
          subtitle="Posterior chain + push · ⏱️ tempo is the point — slow down, that's what creates the stimulus"
          dates={sessionA.dates.map(fmtShort)}
          movements={sessionA.exampleMovements as TrainingMovement[]}
          note="⏱️ Rest 60–75s between sets. 📝 Write down your reps — next Thursday you beat them."
        />
      ) : null}

      {sessionB ? (
        <SessionCard
          emoji="🦵"
          title="Session B — Saturdays"
          subtitle="Legs dominant + shoulders · ⏰ wake 05:40 · start 06:00"
          dates={sessionB.dates.map(fmtShort)}
          movements={sessionB.exampleMovements as TrainingMovement[]}
          note="⏱️ Rest 60–75s between sets. 📝 If any movement feels easy by week 3 — that's your shopping list for Block 2."
        />
      ) : null}

      <div className="cs" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 18px 6px" }}>
          <div className="ct">📆 4-week schedule</div>
          <div className="csub">
            Progressive loading — each week&apos;s focus is written in the calendar event description
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--b1)" }}>
              <th
                style={{
                  textAlign: "left",
                  padding: "7px 11px",
                  fontFamily: "var(--fm)",
                  fontSize: 10,
                  color: "var(--mu)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 400,
                }}
              >
                Week
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "7px 11px",
                  fontFamily: "var(--fm)",
                  fontSize: 10,
                  color: "var(--mu)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 400,
                }}
              >
                Dates
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "7px 11px",
                  fontFamily: "var(--fm)",
                  fontSize: 10,
                  color: "var(--mu)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 400,
                }}
              >
                Sessions
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "7px 11px",
                  fontFamily: "var(--fm)",
                  fontSize: 10,
                  color: "var(--mu)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 400,
                }}
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w, i) => {
              const a = w.dates.find((d) => d.type === "A");
              const b = w.dates.find((d) => d.type === "B");
              const allCompleted = w.dates.every((d) => d.completed);
              const anyCompleted = w.dates.some((d) => d.completed);
              return (
                <tr key={w.weekKey} style={{ borderBottom: "1px solid var(--b0)" }}>
                  <td
                    style={{
                      padding: "8px 11px",
                      fontFamily: "var(--fm)",
                      color: "var(--blue)",
                    }}
                  >
                    {i + 1} {i === weeks.length - 1 ? "✈️" : "📈"}
                  </td>
                  <td
                    style={{
                      padding: "8px 11px",
                      fontFamily: "var(--fm)",
                      fontSize: 11,
                      color: "var(--mu)",
                    }}
                  >
                    {[a, b]
                      .filter(Boolean)
                      .map((d) => fmtShort(d!.date))
                      .join(" + ")}
                  </td>
                  <td style={{ padding: "8px 11px" }}>
                    {a ? (
                      <span style={{ marginRight: 8 }}>
                        💥 {dayOfWeek(a.date).slice(0, 3)} · {fmtShort(a.date)}
                      </span>
                    ) : null}
                    {b ? (
                      <span>
                        🦵 {dayOfWeek(b.date).slice(0, 3)} · {fmtShort(b.date)}
                      </span>
                    ) : null}
                  </td>
                  <td
                    style={{
                      padding: "8px 11px",
                      fontFamily: "var(--fm)",
                      fontSize: 11,
                      color: allCompleted
                        ? "var(--teal)"
                        : anyCompleted
                        ? "var(--amb)"
                        : "var(--mu)",
                    }}
                  >
                    {allCompleted ? "✅ Done" : anyCompleted ? "⏳ Partial" : "📋 Planned"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="cs">
        <div className="ct">🗓️ Why these days — scheduling logic</div>
        <div className="csub">Built around your actual calendar, sleep pattern, and recovery needs</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid var(--b0)" }}>
              <td style={{ padding: "7px 11px", fontFamily: "var(--fm)", color: "var(--teal)", width: 140 }}>
                Thursday 💥
              </td>
              <td style={{ padding: "7px 11px", color: "var(--teal)", width: 110 }}>✅ Session A</td>
              <td style={{ padding: "7px 11px", fontSize: 12 }}>
                No sculpt typically booked. No football. Clean 06:00 slot before work.
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--b0)" }}>
              <td style={{ padding: "7px 11px", fontFamily: "var(--fm)", color: "var(--teal)" }}>
                Saturday 🦵
              </td>
              <td style={{ padding: "7px 11px", color: "var(--teal)" }}>✅ Session B</td>
              <td style={{ padding: "7px 11px", fontSize: 12 }}>
                Wake 05:40. No sculpt. No football. Free morning.
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--b0)" }}>
              <td style={{ padding: "7px 11px", fontFamily: "var(--fm)", color: "var(--mu)" }}>
                Monday 😴
              </td>
              <td style={{ padding: "7px 11px", color: "var(--mu)" }}>Rest</td>
              <td style={{ padding: "7px 11px", fontSize: 12 }}>
                Day after Sunday football. Leg recovery priority.
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--b0)" }}>
              <td style={{ padding: "7px 11px", fontFamily: "var(--fm)", color: "var(--mu)" }}>
                Tuesday ⚽🧘
              </td>
              <td style={{ padding: "7px 11px", color: "var(--mu)" }}>Rest</td>
              <td style={{ padding: "7px 11px", fontSize: 12 }}>
                Sculpt AM + indoor football PM = already a double day.
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--b0)" }}>
              <td style={{ padding: "7px 11px", fontFamily: "var(--fm)", color: "var(--mu)" }}>
                Wednesday 🌅
              </td>
              <td style={{ padding: "7px 11px", color: "var(--mu)" }}>Rest</td>
              <td style={{ padding: "7px 11px", fontSize: 12 }}>
                Often 05:45 sculpt — too early to add loading on top.
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid var(--b0)" }}>
              <td style={{ padding: "7px 11px", fontFamily: "var(--fm)", color: "var(--mu)" }}>
                Friday 🔄
              </td>
              <td style={{ padding: "7px 11px", color: "var(--mu)" }}>Flex</td>
              <td style={{ padding: "7px 11px", fontSize: 12 }}>
                Reserve for sculpt or rest. Backup if Thu was missed.
              </td>
            </tr>
            <tr>
              <td style={{ padding: "7px 11px", fontFamily: "var(--fm)", color: "var(--mu)" }}>
                Sunday ⚽🚴
              </td>
              <td style={{ padding: "7px 11px", color: "var(--mu)" }}>Football</td>
              <td style={{ padding: "7px 11px", fontSize: 12 }}>
                Outdoor football + bike commute. Already meaningful load.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="cs">
        <div className="ct">🧠 Why this produces muscle growth</div>
        <div className="csub">What&apos;s different from yoga sculpt and why it matters</div>
        <div style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.7 }}>
          <p style={{ marginBottom: 10 }}>
            💚 Yoga sculpt maintains muscle beautifully — Withings data confirms it, with
            muscle mass holding flat throughout your 21 lb weight loss. But it
            doesn&apos;t build new muscle because the weights (5–15 lb) don&apos;t create
            the mechanical tension needed to trigger the mTOR pathway that drives
            hypertrophy.
          </p>
          <p style={{ marginBottom: 10 }}>
            ⚡ What does trigger it: a load that makes the last 2–3 reps of a set
            genuinely difficult, combined with a slow, controlled lowering phase. A 3–4
            second descent at 40 lb creates far more stimulus than 15 quick reps at 15 lb.
          </p>
          <p>
            ⏳ Expect nothing to look different for 6–8 weeks. What you&apos;ll notice
            first is the reps feeling easier (strength improving). Visible changes follow
            around weeks 8–12.
          </p>
        </div>
      </div>
    </>
  );
}

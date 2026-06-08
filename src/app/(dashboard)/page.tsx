import { getCurrentDbUser } from "@/lib/session";
import {
  overviewMetrics,
  yearActivityVolume,
  yearAvgWeightLb,
  monthlySteps,
  trainingHeatmapData,
} from "@/lib/queries/overview-aggregates";
import {
  weekActivity,
  latestSleepDetail,
  nextTrainingSession,
  recentWorkoutsLite,
} from "@/lib/queries/overview";
import { OverviewChart } from "@/components/charts/OverviewChart";
import { StepsMonthlyChart } from "@/components/charts/StepsMonthlyChart";
import { TrainingHeatmap } from "@/components/charts/TrainingHeatmap";
import { WeekActivity } from "@/components/WeekActivity";
import type { TrainingMovement } from "@/db/schema";

export const dynamic = "force-dynamic";

function fmtRangeYears(min: Date | null, max: Date | null) {
  if (!min || !max) return "—";
  const fmt = (d: Date) =>
    d.toLocaleString("en-US", { month: "short", year: "numeric" });
  return `${fmt(min)} → ${fmt(max)}`;
}

function fmtDuration(sec: number | null) {
  if (sec == null) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

function fmtDistance(m: number | null) {
  if (m == null || m === 0) return "—";
  return `${(m / 1000).toFixed(2)} km`;
}

function sportEmoji(sport: string): string {
  const s = sport.toLowerCase();
  if (s === "soccer" || s.includes("football")) return "⚽";
  if (s === "ride" || s === "virtualride" || s === "ebikeride") return "🚴";
  if (s === "run" || s === "trailrun") return "🏃";
  if (s === "hike") return "🥾";
  if (s === "yoga" || s === "workout") return "🧘";
  if (s === "snowboard") return "🏂";
  if (s === "walk") return "🚶";
  if (s === "weighttraining" || s === "strength") return "💪";
  return "🏅";
}

function fmtRelativeDate(d: Date): string {
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays > -7) return `${Math.abs(diffDays)} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function OverviewPage() {
  const user = await getCurrentDbUser();

  const [
    metrics,
    yearVol,
    yearWeight,
    steps,
    heatmap,
    week,
    latestSleep,
    nextTraining,
    recentWorkouts,
  ] = await Promise.all([
    overviewMetrics(user.id),
    yearActivityVolume(user.id),
    yearAvgWeightLb(user.id),
    monthlySteps(user.id, 2022),
    trainingHeatmapData(user.id, 30),
    weekActivity(user.id),
    latestSleepDetail(user.id),
    nextTrainingSession(user.id),
    recentWorkoutsLite(user.id, 8),
  ]);

  const sleepHours = latestSleep?.durationSec
    ? (latestSleep.durationSec / 3600).toFixed(1)
    : null;
  const sleepEff =
    latestSleep?.efficiency != null
      ? Math.round(latestSleep.efficiency * 100)
      : null;

  return (
    <>
      <div className="mrow">
        <div className="mc b">
          <div className="ml">Activities</div>
          <div className="mv b">{metrics.activityCount.toLocaleString()}</div>
          <div className="ms">{fmtRangeYears(metrics.activityMin, metrics.activityMax)}</div>
        </div>
        <div className="mc p">
          <div className="ml">Weight change</div>
          <div className="mv p">
            {metrics.weightDropLb != null
              ? `${metrics.weightDropLb >= 0 ? "−" : "+"}${Math.abs(metrics.weightDropLb).toFixed(0)} lb`
              : "—"}
          </div>
          <div className="ms">
            {metrics.peakLb && metrics.latestLb
              ? `${metrics.peakLb.toFixed(0)}→${metrics.latestLb.toFixed(0)} lb`
              : "—"}
          </div>
        </div>
        <div className="mc g">
          <div className="ml">Body fat change</div>
          <div className="mv g">
            {metrics.bfDelta != null
              ? `${metrics.bfDelta >= 0 ? "+" : "−"}${Math.abs(metrics.bfDelta).toFixed(1)} ppt`
              : "—"}
          </div>
          <div className="ms">
            {metrics.earliestBf != null && metrics.latestBf != null
              ? `${metrics.earliestBf.toFixed(0)}% → ${metrics.latestBf.toFixed(0)}%`
              : "—"}
          </div>
        </div>
        <div className="mc g">
          <div className="ml">Resting HR</div>
          <div className="mv g">{metrics.latestRhr ?? "—"}{metrics.latestRhr ? " bpm" : ""}</div>
          <div className="ms">latest from Health Connect</div>
        </div>
        <div className="mc p">
          <div className="ml">HRV RMSSD</div>
          <div className="mv p">
            {metrics.hrvAvg != null ? `${Math.round(metrics.hrvAvg)} ms` : "—"}
          </div>
          <div className="ms">
            {metrics.hrvN > 0 ? `${metrics.hrvN}-night avg` : "no data"}
          </div>
        </div>
        <div className="mc g">
          <div className="ml">Last night</div>
          <div className="mv g">{sleepHours ? `${sleepHours} h` : "—"}</div>
          <div className="ms">
            {latestSleep
              ? `${new Date(latestSleep.startedAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}${sleepEff != null ? ` · ${sleepEff}% eff` : ""}`
              : "no sleep data"}
          </div>
        </div>
        <div className="mc g">
          <div className="ml">No AFib</div>
          <div className="mv g" style={{ fontSize: 15, marginTop: 3 }}>0 episodes</div>
          <div className="ms">full monitoring period</div>
        </div>
        <div className="mc g">
          <div className="ml">Alcohol-free</div>
          <div className="mv g" style={{ fontSize: 15, marginTop: 3 }}>Aug 2024</div>
          <div className="ms">~22 months</div>
        </div>
      </div>

      {nextTraining ? (
        <div className="cs">
          <div className="ct">
            💪 Next training session — {fmtRelativeDate(nextTraining.plannedFor)}
          </div>
          <div className="csub">
            Session {nextTraining.sessionType} · {nextTraining.plannedFor.toLocaleString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
            {nextTraining.calendarEventId ? " · synced to Google Calendar" : ""}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
            {(nextTraining.movements ?? []).map((m: TrainingMovement, i: number) => (
              <div key={i} className="pc">
                <div className="pl">
                  {i + 1}. {m.name}
                </div>
                <div className="pv">
                  {m.sets} sets × {m.repsTarget ?? "?"} reps
                  {m.weightKg ? ` @ ${(m.weightKg * 2.2046).toFixed(0)} lb` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <WeekActivity
        weekStart={week.weekStart}
        items={week.items}
        calendarConnected={week.calendarConnected}
      />

      <div className="cs">
        <div className="ct">
          Recent activity <span className="src-pill">Strava + Health Connect</span>
        </div>
        <div className="csub">Last {recentWorkouts.length} workouts</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--b1)" }}>
              <th style={{ textAlign: "left", padding: "7px 6px", fontFamily: "var(--fm)", fontSize: 10, color: "var(--mu)", textTransform: "uppercase" }}>
                Date
              </th>
              <th style={{ textAlign: "left", padding: "7px 6px", fontFamily: "var(--fm)", fontSize: 10, color: "var(--mu)", textTransform: "uppercase" }}>
                Activity
              </th>
              <th style={{ textAlign: "right", padding: "7px 6px", fontFamily: "var(--fm)", fontSize: 10, color: "var(--mu)", textTransform: "uppercase" }}>
                Time
              </th>
              <th style={{ textAlign: "right", padding: "7px 6px", fontFamily: "var(--fm)", fontSize: 10, color: "var(--mu)", textTransform: "uppercase" }}>
                Dist
              </th>
              <th style={{ textAlign: "right", padding: "7px 6px", fontFamily: "var(--fm)", fontSize: 10, color: "var(--mu)", textTransform: "uppercase" }}>
                HR
              </th>
            </tr>
          </thead>
          <tbody>
            {recentWorkouts.map((w) => (
              <tr key={w.id} style={{ borderBottom: "1px solid var(--b0)" }}>
                <td style={{ padding: "6px", fontFamily: "var(--fm)", fontSize: 10, color: "var(--mu)" }}>
                  {new Date(w.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </td>
                <td style={{ padding: "6px" }}>
                  <span style={{ marginRight: 6 }}>{sportEmoji(w.sport)}</span>
                  {w.name ?? w.sport}
                </td>
                <td style={{ padding: "6px", textAlign: "right", fontFamily: "var(--fm)", fontSize: 11 }}>
                  {fmtDuration(w.durationSec)}
                </td>
                <td style={{ padding: "6px", textAlign: "right", fontFamily: "var(--fm)", fontSize: 11 }}>
                  {fmtDistance(w.distanceM)}
                </td>
                <td style={{ padding: "6px", textAlign: "right", fontFamily: "var(--fm)", fontSize: 11 }}>
                  {w.avgHr ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cs">
        <div className="ct">
          Activity volume + weight — the eight-year arc
        </div>
        <div className="csub">
          Stacked sessions by type (left) · weight in lb (right, pink) · sources: Strava + Withings
        </div>
        <div className="leg">
          <div className="li">
            <span className="ld" style={{ background: "#f47067" }}></span>Run
          </div>
          <div className="li">
            <span className="ld" style={{ background: "#4a9eff" }}></span>Ride
          </div>
          <div className="li">
            <span className="ld" style={{ background: "#a371f7" }}></span>Workout
          </div>
          <div className="li">
            <span className="ld" style={{ background: "#e3b341" }}></span>Soccer + other
          </div>
          <div className="li">
            <span className="ld" style={{ background: "#f778ba" }}></span>Weight lb (right)
          </div>
        </div>
        <div className="cw">
          <OverviewChart rows={yearVol} weightByYear={yearWeight} />
        </div>
      </div>

      <div className="cs">
        <div className="ct">
          Daily steps — monthly average <span className="src-pill">Google Fit</span>
        </div>
        <div className="csub">From daily_metrics — fills in further once Health Connect syncs</div>
        <div className="cw">
          <StepsMonthlyChart data={steps} />
        </div>
      </div>

      <div className="cs">
        <div className="ct">
          Training load heatmap — last 30 months <span className="src-pill">Strava</span>
        </div>
        <div className="csub">Intensity = sessions × avg HR · hover for detail</div>
        <TrainingHeatmap days={heatmap} />
        <div className="hmlegrow">
          <span>Lower</span>
          <span className="hmlegsq" style={{ background: "rgba(74,158,255,0.1)" }}></span>
          <span className="hmlegsq" style={{ background: "rgba(74,158,255,0.3)" }}></span>
          <span className="hmlegsq" style={{ background: "rgba(74,158,255,0.6)" }}></span>
          <span className="hmlegsq" style={{ background: "#4a9eff" }}></span>
          <span>Higher</span>
        </div>
      </div>
    </>
  );
}

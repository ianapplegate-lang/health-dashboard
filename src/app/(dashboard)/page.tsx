import { getCurrentDbUser } from "@/lib/session";
import {
  overviewMetrics,
  yearActivityVolume,
  yearAvgWeightLb,
  monthlySteps,
  trainingHeatmapData,
} from "@/lib/queries/overview-aggregates";
import { weekActivity } from "@/lib/queries/overview";
import { OverviewChart } from "@/components/charts/OverviewChart";
import { StepsMonthlyChart } from "@/components/charts/StepsMonthlyChart";
import { TrainingHeatmap } from "@/components/charts/TrainingHeatmap";
import { WeekActivity } from "@/components/WeekActivity";

export const dynamic = "force-dynamic";

function fmtRangeYears(min: Date | null, max: Date | null) {
  if (!min || !max) return "—";
  const fmt = (d: Date) =>
    d.toLocaleString("en-US", { month: "short", year: "numeric" });
  return `${fmt(min)} → ${fmt(max)}`;
}

export default async function OverviewPage() {
  const user = await getCurrentDbUser();

  const [metrics, yearVol, yearWeight, steps, heatmap, week] = await Promise.all([
    overviewMetrics(user.id),
    yearActivityVolume(user.id),
    yearAvgWeightLb(user.id),
    monthlySteps(user.id, 2022),
    trainingHeatmapData(user.id, 30),
    weekActivity(user.id),
  ]);

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
          <div className="ml">Avg sleep</div>
          <div className="mv g">
            {metrics.avgSleepHours != null ? `${metrics.avgSleepHours.toFixed(1)} h` : "—"}
          </div>
          <div className="ms">
            {metrics.deepPct != null && metrics.remPct != null
              ? `${Math.round(metrics.deepPct * 100)}% deep · ${Math.round(metrics.remPct * 100)}% REM`
              : "—"}
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

      <WeekActivity weekStart={week.weekStart} items={week.items} />

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
          Daily steps — monthly average <span className="src-pill">Withings</span>
        </div>
        <div className="csub">From daily_metrics — fills in once Health Connect syncs</div>
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

import { getCurrentDbUser } from "@/lib/session";
import {
  nightlyHrv,
  hrvMonthly,
  rhrMonthly,
  exerciseHrMonthly,
  hrvHrStats,
} from "@/lib/queries/hrv";
import { HrvChart } from "@/components/charts/HrvChart";
import { HrvRhrChart } from "@/components/charts/HrvRhrChart";
import { ExerciseHrChart } from "@/components/charts/ExerciseHrChart";
import { hrvInsights } from "@/lib/queries/insights";
import { InsightGrid, InsightStat, InsightCallout } from "@/components/Insight";

export const dynamic = "force-dynamic";

function fmtMonth(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", { month: "short", year: "numeric" });
}

export default async function HrvPage() {
  const user = await getCurrentDbUser();
  const [nightly, hrvM, rhrM, exHr, stats, insights] = await Promise.all([
    nightlyHrv(user.id),
    hrvMonthly(user.id),
    rhrMonthly(user.id),
    exerciseHrMonthly(user.id, 2022),
    hrvHrStats(user.id),
    hrvInsights(user.id),
  ]);

  return (
    <>
      <div className="mrow">
        <div className="mc p">
          <div className="ml">HRV RMSSD avg</div>
          <div className="mv p">
            {stats.hrvAvg != null ? `${Math.round(stats.hrvAvg)} ms` : "—"}
          </div>
          <div className="ms">{stats.hrvNights} nights</div>
        </div>
        <div className="mc p">
          <div className="ml">HRV latest month</div>
          <div className="mv p">
            {stats.hrvLatestMonthAvg != null
              ? `${stats.hrvLatestMonthAvg.toFixed(1)} ms`
              : "—"}
          </div>
          <div className="ms">{stats.hrvLatestMonth ?? "—"}</div>
        </div>
        <div className="mc g">
          <div className="ml">Resting HR (daily)</div>
          <div className="mv g">
            {stats.rhrDaily != null ? `${stats.rhrDaily} bpm` : "—"}
          </div>
          <div className="ms">latest Health Connect</div>
        </div>
        <div className="mc g">
          <div className="ml">Resting HR (clinic)</div>
          <div className="mv g">
            {stats.rhrClinic != null ? `${stats.rhrClinic} bpm` : "—"}
          </div>
          <div className="ms">{fmtMonth(stats.rhrClinicDate)}</div>
        </div>
        <div className="mc b">
          <div className="ml">All-time max HR</div>
          <div className="mv b">
            {stats.maxHrEver != null ? `${Math.round(stats.maxHrEver)} bpm` : "—"}
          </div>
          <div className="ms">workouts table</div>
        </div>
      </div>

      <div className="cs">
        <div className="ct">📊 Insights</div>
        <div className="csub">Recent trend vs baseline, plus sleep correlation</div>
        <InsightGrid>
          <InsightStat
            label="Last 7 nights"
            value={insights.avg7d != null ? `${insights.avg7d.toFixed(1)} ms` : "—"}
            detail={
              insights.avg7d != null && insights.baseline != null
                ? `vs ${insights.baseline.toFixed(1)} ms baseline`
                : undefined
            }
            tone={
              insights.avg7d != null && insights.baseline != null
                ? insights.avg7d > insights.baseline
                  ? "good"
                  : insights.avg7d < insights.baseline * 0.9
                  ? "warn"
                  : "default"
                : "default"
            }
          />
          <InsightStat
            label="Last 30 nights"
            value={insights.avg30d != null ? `${insights.avg30d.toFixed(1)} ms` : "—"}
            detail="rolling monthly avg"
          />
          <InsightStat
            label="Baseline"
            value={insights.baseline != null ? `${insights.baseline.toFixed(1)} ms` : "—"}
            detail="first 30 nights tracked"
          />
        </InsightGrid>

        {insights.hrvBySleepBucket ? (
          (() => {
            const { good, ok, short } = insights.hrvBySleepBucket;
            if (good.n + ok.n + short.n < 10) return null;
            const lines: string[] = [];
            if (good.avg != null) lines.push(`≥7h sleep → ${good.avg.toFixed(1)} ms (${good.n}n)`);
            if (ok.avg != null) lines.push(`6–7h → ${ok.avg.toFixed(1)} ms (${ok.n}n)`);
            if (short.avg != null) lines.push(`<6h → ${short.avg.toFixed(1)} ms (${short.n}n)`);
            const gap = good.avg != null && short.avg != null ? good.avg - short.avg : null;
            return (
              <InsightCallout>
                💤 HRV by sleep length: {lines.join(" · ")}.
                {gap != null && Math.abs(gap) > 3
                  ? ` Sleeping ≥7h gives you ${gap > 0 ? "+" : ""}${gap.toFixed(1)} ms over short nights.`
                  : ""}
              </InsightCallout>
            );
          })()
        ) : null}
      </div>

      <div className="cs">
        <div className="ct">
          HRV RMSSD — nightly readings <span className="src-pill">Withings</span>
        </div>
        <div className="csub">
          {nightly.length} nights · orange band = biopsy + antiviral period · higher = better recovery
        </div>
        <div className="leg">
          <div className="li">
            <span className="ld" style={{ background: "#a371f7" }}></span>Nightly RMSSD (ms)
          </div>
          <div className="li">
            <span
              className="ld"
              style={{ background: "rgba(163,113,247,0.55)" }}
            ></span>
            7-day rolling avg
          </div>
        </div>
        <div className="cw">
          <HrvChart points={nightly} />
        </div>
        <div className="note">
          A HRV RMSSD of 50+ ms is considered good for your age; 65+ is excellent. Dips
          around the late-March biopsy and early-April antiviral start are a normal
          autonomic stress response. The recovery trajectory afterward is the signal.
        </div>
      </div>

      <div className="cs">
        <div className="ct">
          Monthly HRV + resting HR convergence{" "}
          <span className="src-pill">Withings · Health Connect</span>
        </div>
        <div className="csub">
          Two independent measures of the same underlying autonomic state (right axis reversed)
        </div>
        <div className="leg">
          <div className="li">
            <span className="ld" style={{ background: "#a371f7" }}></span>HRV RMSSD (ms)
          </div>
          <div className="li">
            <span className="ld" style={{ background: "#1aab7f" }}></span>Resting HR (bpm)
          </div>
        </div>
        <div className="cw">
          <HrvRhrChart hrvMonthly={hrvM} rhrMonthly={rhrM} />
        </div>
        <div className="note">
          HRV and resting HR move inversely — higher HRV and lower resting HR both
          signal a recovered, efficient autonomic nervous system.
        </div>
      </div>

      <div className="cs">
        <div className="ct">
          Exercise avg HR trend — monthly{" "}
          <span className="src-pill">Strava</span>
        </div>
        <div className="csub">
          Reflects both sport-mix change and cardiovascular improvement
        </div>
        <div className="leg">
          <div className="li">
            <span className="ld" style={{ background: "rgba(244,112,103,0.7)" }}></span>
            Monthly avg
          </div>
          <div className="li">
            <span className="ld" style={{ background: "rgba(74,158,255,0.7)" }}></span>
            6-month rolling avg
          </div>
        </div>
        <div className="cw">
          <ExerciseHrChart points={exHr} />
        </div>
      </div>
    </>
  );
}

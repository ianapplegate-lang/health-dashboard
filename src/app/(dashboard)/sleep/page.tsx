import { getCurrentDbUser } from "@/lib/session";
import { sleepOverview, nightlySleepSeries } from "@/lib/queries/sleep";
import { sleepInsights } from "@/lib/queries/insights";
import { SleepDurationChart } from "@/components/charts/SleepDurationChart";
import { SleepStagesDonut } from "@/components/charts/SleepStagesDonut";
import { DeepSleepBars } from "@/components/charts/DeepSleepBars";
import { SleepHeatmap } from "@/components/charts/SleepHeatmap";
import { InsightGrid, InsightStat, InsightCallout } from "@/components/Insight";

export const dynamic = "force-dynamic";

export default async function SleepPage() {
  const user = await getCurrentDbUser();
  const [overview, nights, insights] = await Promise.all([
    sleepOverview(user.id),
    nightlySleepSeries(user.id),
    sleepInsights(user.id),
  ]);

  const worstDow = insights.byDow.length
    ? insights.byDow
        .filter((d) => d.avgHours != null && d.count >= 3)
        .reduce<{ day: string; avgHours: number | null; count: number } | null>(
          (w, d) => (w == null || (d.avgHours ?? Infinity) < (w.avgHours ?? Infinity) ? d : w),
          null,
        )
    : null;

  const deepBars = nights.map((n) => ({
    date: n.date,
    deepPct:
      n.deepSec != null && n.hours > 0
        ? n.deepSec / (n.hours * 3600)
        : null,
  }));

  const dateRange = nights.length
    ? `${nights[0].date} → ${nights[nights.length - 1].date}`
    : "—";

  return (
    <>
      <div className="mrow">
        <div className="mc b">
          <div className="ml">Nights tracked</div>
          <div className="mv b">{overview.nights}</div>
          <div className="ms">{dateRange}</div>
        </div>
        <div className="mc b">
          <div className="ml">Avg duration</div>
          <div className="mv b">
            {overview.avgDurationHours != null
              ? `${overview.avgDurationHours.toFixed(1)} h`
              : "—"}
          </div>
          <div className="ms">per night</div>
        </div>
        <div className="mc g">
          <div className="ml">Avg deep sleep</div>
          <div className="mv g">
            {overview.deepPct != null ? `${Math.round(overview.deepPct * 100)}%` : "—"}
          </div>
          <div className="ms">restorative</div>
        </div>
        <div className="mc b">
          <div className="ml">Avg REM</div>
          <div className="mv b">
            {overview.remPct != null ? `${Math.round(overview.remPct * 100)}%` : "—"}
          </div>
          <div className="ms">cognitive</div>
        </div>
        <div className="mc g">
          <div className="ml">Avg light</div>
          <div className="mv g">
            {overview.lightPct != null ? `${Math.round(overview.lightPct * 100)}%` : "—"}
          </div>
          <div className="ms">bulk of the night</div>
        </div>
        <div className="mc g">
          <div className="ml">Efficiency</div>
          <div className="mv g">
            {overview.avgEfficiency != null
              ? `${Math.round(overview.avgEfficiency * 100)}%`
              : "—"}
          </div>
          <div className="ms">time asleep / time in bed</div>
        </div>
      </div>

      <div className="cs">
        <div className="ct">📊 Insights</div>
        <div className="csub">Patterns across your sleep history</div>
        <InsightGrid>
          <InsightStat
            label="Best night (30d)"
            value={
              insights.bestNight ? `${insights.bestNight.hours.toFixed(1)} h` : "—"
            }
            detail={
              insights.bestNight
                ? `${insights.bestNight.date}${insights.bestNight.quality != null ? ` · ${Math.round(insights.bestNight.quality * 100)}% quality` : ""}`
                : undefined
            }
            tone="good"
          />
          <InsightStat
            label="Worst night (30d)"
            value={
              insights.worstNight ? `${insights.worstNight.hours.toFixed(1)} h` : "—"
            }
            detail={insights.worstNight?.date}
            tone="bad"
          />
          <InsightStat
            label="Avg last 7d"
            value={insights.avg7d != null ? `${insights.avg7d.toFixed(1)} h` : "—"}
            detail={
              insights.avg7d != null && insights.avg30d != null
                ? `vs ${insights.avg30d.toFixed(1)} h 30d`
                : undefined
            }
            tone={
              insights.avg7d != null && insights.avg30d != null
                ? insights.avg7d >= insights.avg30d
                  ? "good"
                  : "warn"
                : "default"
            }
          />
          <InsightStat
            label="Short nights (30d)"
            value={`${insights.shortNightsLast30 ?? "—"}`}
            detail="under 6 hours"
            tone={
              (insights.shortNightsLast30 ?? 0) > 7
                ? "bad"
                : (insights.shortNightsLast30 ?? 0) > 3
                ? "warn"
                : "good"
            }
          />
        </InsightGrid>

        {worstDow ? (
          <InsightCallout>
            🗓️ {worstDow.day}s are your worst sleep day on average —{" "}
            {worstDow.avgHours?.toFixed(1)} h vs the other days. (across {worstDow.count}{" "}
            {worstDow.day} nights tracked)
          </InsightCallout>
        ) : null}

        {insights.satAfterFridayFootball ? (
          (() => {
            const { satAvg, satAfterFootballAvg, n } = insights.satAfterFridayFootball;
            const diff = satAfterFootballAvg - satAvg;
            const pct = Math.abs((diff / satAvg) * 100);
            return (
              <InsightCallout tone={diff < -0.2 ? "warn" : "good"}>
                ⚽ Saturdays after Friday football average {satAfterFootballAvg.toFixed(1)} h —{" "}
                {diff < 0
                  ? `${pct.toFixed(0)}% less than your typical Saturday (${satAvg.toFixed(1)} h)`
                  : `comparable to your typical Saturday (${satAvg.toFixed(1)} h)`}
                . Based on {n} Saturday{n === 1 ? "" : "s"}.
              </InsightCallout>
            );
          })()
        ) : null}
      </div>

      <div className="cs">
        <div className="ct">
          Nightly sleep duration <span className="src-pill">Withings · Health Connect</span>
        </div>
        <div className="csub">
          Each bar = one night · coloured by quality (deep + REM %) — greener = better
        </div>
        <div className="cw">
          <SleepDurationChart
            data={nights.map((n) => ({
              date: n.date,
              hours: n.hours,
              qualityPct: n.qualityPct,
            }))}
          />
        </div>
      </div>

      <div className="g2">
        <div className="cs">
          <div className="ct">
            Sleep stage distribution <span className="src-pill">Withings</span>
          </div>
          <div className="csub">
            Average across {overview.nights} nights
          </div>
          <div className="cw">
            <SleepStagesDonut
              deepPct={overview.deepPct}
              remPct={overview.remPct}
              lightPct={overview.lightPct}
              awakePct={overview.awakePct}
            />
          </div>
        </div>
        <div className="cs">
          <div className="ct">
            Deep sleep % per night <span className="src-pill">Withings</span>
          </div>
          <div className="csub">Teal bars ≥ 25% = excellent restorative night</div>
          <div className="cw">
            <DeepSleepBars data={deepBars} />
          </div>
        </div>
      </div>

      <div className="cs">
        <div className="ct">Sleep quality heatmap</div>
        <div className="csub">
          Each cell = one night · colour = deep + REM % quality proxy
        </div>
        <SleepHeatmap
          days={nights.map((n) => ({
            date: n.date,
            qualityPct: n.qualityPct,
            hours: n.hours,
          }))}
        />
        <div className="hmlegrow">
          <span>Lower</span>
          <span className="hmlegsq" style={{ background: "rgba(244,112,103,0.5)" }}></span>
          <span className="hmlegsq" style={{ background: "rgba(74,158,255,0.5)" }}></span>
          <span className="hmlegsq" style={{ background: "rgba(26,171,127,0.4)" }}></span>
          <span className="hmlegsq" style={{ background: "rgba(26,171,127,0.75)" }}></span>
          <span className="hmlegsq" style={{ background: "#1aab7f" }}></span>
          <span>Higher quality</span>
        </div>
      </div>
    </>
  );
}

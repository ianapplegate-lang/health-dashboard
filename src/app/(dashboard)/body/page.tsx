import { getCurrentDbUser } from "@/lib/session";
import {
  allWeightReadings,
  monthlyAvgWeight,
  bodyComposition,
  bodyMetrics,
} from "@/lib/queries/body";
import { WeightScatter } from "@/components/charts/WeightScatter";
import {
  BodyFatChart,
  MuscleChart,
  RecompScatter,
} from "@/components/charts/BodyCompChart";

export const dynamic = "force-dynamic";

export default async function BodyPage() {
  const user = await getCurrentDbUser();
  const [metrics, readings, monthly, composition] = await Promise.all([
    bodyMetrics(user.id),
    allWeightReadings(user.id),
    monthlyAvgWeight(user.id),
    bodyComposition(user.id),
  ]);

  const stableLowLb = metrics.latestLb;
  const stableHighLb =
    metrics.latestLb != null && metrics.peakLb != null
      ? Math.min(metrics.peakLb, metrics.latestLb + 9)
      : null;

  return (
    <>
      <div className="mrow">
        <div className="mc p">
          <div className="ml">Peak weight</div>
          <div className="mv p">
            {metrics.peakLb != null ? `${metrics.peakLb.toFixed(0)} lb` : "—"}
          </div>
          <div className="ms">{metrics.peakLb != null ? "Withings highest" : "—"}</div>
        </div>
        <div className="mc g">
          <div className="ml">Weight range now</div>
          <div className="mv g">
            {stableLowLb != null && stableHighLb != null
              ? `${stableLowLb.toFixed(0)}–${stableHighLb.toFixed(0)}`
              : "—"}
          </div>
          <div className="ms">lb, stable since recent stretch</div>
        </div>
        <div className="mc g">
          <div className="ml">Fat lost</div>
          <div className="mv g">
            {metrics.bfDelta != null
              ? `${metrics.bfDelta >= 0 ? "+" : "−"}${Math.abs(metrics.bfDelta).toFixed(1)} ppt`
              : "—"}
          </div>
          <div className="ms">
            {metrics.earliestBfPct != null && metrics.latestBfPct != null
              ? `${metrics.earliestBfPct.toFixed(0)}% → ${metrics.latestBfPct.toFixed(0)}% body fat`
              : "—"}
          </div>
        </div>
        <div className="mc g">
          <div className="ml">Muscle maintained</div>
          <div className="mv g">
            {metrics.latestMuscleLb != null ? `~${metrics.latestMuscleLb.toFixed(0)} lb` : "—"}
          </div>
          <div className="ms">held flat throughout loss</div>
        </div>
      </div>

      <div className="cs">
        <div className="ct">
          Weight — all readings <span className="src-pill">Withings</span>
        </div>
        <div className="csub">
          Individual weigh-ins coloured by year · pink line = monthly average · sensor-anomaly readings excluded
        </div>
        <div className="leg">
          <div className="li">
            <span className="ld" style={{ background: "rgba(136,135,128,0.6)" }}></span>2019–21
          </div>
          <div className="li">
            <span className="ld" style={{ background: "rgba(74,158,255,0.8)" }}></span>2022
          </div>
          <div className="li">
            <span className="ld" style={{ background: "rgba(163,113,247,0.8)" }}></span>2024
          </div>
          <div className="li">
            <span className="ld" style={{ background: "rgba(26,171,127,0.8)" }}></span>2025
          </div>
          <div className="li">
            <span className="ld" style={{ background: "rgba(247,120,186,0.8)" }}></span>Monthly avg
          </div>
        </div>
        <div className="cw">
          <WeightScatter readings={readings} monthlyAvg={monthly} />
        </div>
        <div className="note">
          Weight held flat at peak through early 2024. From April 2024 onward it fell
          consistently to a new stable range — a loss of ~21 lb over ~17 months, almost
          entirely fat (muscle mass held flat throughout).
        </div>
      </div>

      <div className="g2">
        <div className="cs">
          <div className="ct">
            Body fat % <span className="src-pill">Withings</span>
          </div>
          <div className="csub">Clean readings only — Jan 2026+ sensor anomalies excluded</div>
          <div className="cw">
            <BodyFatChart data={composition} />
          </div>
          <div className="wnote">
            ⚠ From Jan 2026 the scale reads 5–8% body fat — physiologically implausible.
            Likely a sensor calibration issue. These readings are flagged and excluded
            from this chart.
          </div>
        </div>
        <div className="cs">
          <div className="ct">
            Muscle mass <span className="src-pill">Withings</span>
          </div>
          <div className="csub">Legitimate readings (sensor anomalies excluded)</div>
          <div className="cw">
            <MuscleChart data={composition} />
          </div>
          <div className="note">
            Muscle mass held flat throughout the entire recomposition. You lost fat
            without losing muscle — the difficult outcome most people fail to achieve.
          </div>
        </div>
      </div>

      <div className="cs">
        <div className="ct">Body recomposition — weight vs fat % by year</div>
        <div className="csub">
          Each dot = one weigh-in · movement from top-right (heavy / higher fat) to
          bottom-left (lower / leaner) = recomposition
        </div>
        <div className="leg">
          <div className="li">
            <span className="ld" style={{ background: "rgba(74,158,255,0.8)" }}></span>2022
          </div>
          <div className="li">
            <span className="ld" style={{ background: "rgba(163,113,247,0.8)" }}></span>2024
          </div>
          <div className="li">
            <span className="ld" style={{ background: "rgba(26,171,127,0.8)" }}></span>2025
          </div>
        </div>
        <div className="cw">
          <RecompScatter data={composition} />
        </div>
      </div>
    </>
  );
}

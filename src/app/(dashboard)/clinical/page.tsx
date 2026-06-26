import { getCurrentDbUser } from "@/lib/session";
import {
  biopsyRecord,
  cbcSeries,
  fibrosisRange,
  imagingRecords,
  labLatest,
  labPeak,
  labSeries,
  liverLengthSeries,
  preProcedureVitals,
} from "@/lib/queries/clinical";
import { EnzymeChart } from "@/components/charts/EnzymeChart";
import { LiverLengthChart } from "@/components/charts/LiverLengthChart";
import { CbcTrendChart } from "@/components/charts/CbcTrendChart";
import { FibrosisIndicator } from "@/components/clinical/FibrosisIndicator";
import { clinicalInsights } from "@/lib/queries/insights";
import { InsightGrid, InsightStat, InsightCallout } from "@/components/Insight";

export const dynamic = "force-dynamic";

function fmtMonth(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

export default async function ClinicalPage() {
  const user = await getCurrentDbUser();

  const [
    altLatest,
    astLatest,
    albuminLatest,
    altPeak,
    altSeries,
    astSeries,
    albSeries,
    imaging,
    biopsy,
    bpVitals,
    insights,
    liverLengths,
    hemoglobin,
    platelets,
    wbc,
    neutrophils,
    lymphocytes,
    eosinophils,
  ] = await Promise.all([
    labLatest(user.id, "ALT"),
    labLatest(user.id, "AST"),
    labLatest(user.id, "Albumin"),
    labPeak(user.id, "ALT"),
    labSeries(user.id, "ALT"),
    labSeries(user.id, "AST"),
    labSeries(user.id, "Albumin"),
    imagingRecords(user.id),
    biopsyRecord(user.id),
    preProcedureVitals(user.id),
    clinicalInsights(user.id),
    liverLengthSeries(user.id),
    cbcSeries(user.id, "Hemoglobin"),
    cbcSeries(user.id, "Platelets"),
    cbcSeries(user.id, "WBC"),
    cbcSeries(user.id, "Neutrophils_abs"),
    cbcSeries(user.id, "Lymphocytes_abs"),
    cbcSeries(user.id, "Eosinophils_abs"),
  ]);

  const fibrosis = biopsy ? fibrosisRange(biopsy.valueText) : null;
  const bp = bpVitals.find((v) => v.kind === "BloodPressure");
  const bpHr = bpVitals.find((v) => v.kind === "RestingHR_clinic");

  return (
    <>
      <div className="mrow">
        <div className="mc w">
          <div className="ml">Latest ALT</div>
          <div className="mv w">{altLatest?.valueNumeric ?? "—"}</div>
          <div className="ms">
            {altLatest?.unit ?? "U/L"} · {fmtMonth(altLatest?.recordedAt ?? null)}
          </div>
        </div>
        <div className="mc g">
          <div className="ml">Latest AST</div>
          <div className="mv g">{astLatest?.valueNumeric ?? "—"}</div>
          <div className="ms">
            {astLatest?.unit ?? "U/L"} · {fmtMonth(astLatest?.recordedAt ?? null)}
          </div>
        </div>
        <div className="mc g">
          <div className="ml">Albumin</div>
          <div className="mv g">{albuminLatest?.valueNumeric ?? "—"}</div>
          <div className="ms">{albuminLatest?.unit ?? "gm/dL"} — never wavered</div>
        </div>
        <div className="mc a">
          <div className="ml">Peak ALT</div>
          <div className="mv a">{altPeak?.valueNumeric ?? "—"}</div>
          <div className="ms">
            {altPeak?.unit ?? "U/L"} · {fmtMonth(altPeak?.recordedAt ?? null)}
          </div>
        </div>
        <div className="mc g">
          <div className="ml">No AFib</div>
          <div className="mv g" style={{ fontSize: 14, marginTop: 2 }}>
            0 episodes
          </div>
          <div className="ms">Withings full period</div>
        </div>
        <div className="mc g">
          <div className="ml">Pre-biopsy BP</div>
          <div className="mv g">{bp?.valueText ?? "—"}</div>
          <div className="ms">
            HR {bpHr?.valueNumeric ?? "—"} · {fmtMonth(bp?.recordedAt ?? null)}
          </div>
        </div>
      </div>

      <div className="cs">
        <div className="ct">📊 Insights</div>
        <div className="csub">ALT trajectory + days since last lab</div>
        <InsightGrid>
          <InsightStat
            label="Days since last ALT"
            value={insights.daysSinceLastAlt != null ? `${insights.daysSinceLastAlt}` : "—"}
            detail={
              insights.daysSinceLastAlt != null && insights.daysSinceLastAlt > 90
                ? "next labs recommended"
                : undefined
            }
            tone={
              insights.daysSinceLastAlt != null && insights.daysSinceLastAlt > 180
                ? "warn"
                : "default"
            }
          />
          <InsightStat
            label="Latest ALT vs ULN"
            value={
              insights.ulnPct != null
                ? `${insights.ulnPct.toFixed(0)}%`
                : "—"
            }
            detail={
              insights.latestAlt != null ? `${insights.latestAlt} U/L · ULN 50` : undefined
            }
            tone={
              insights.ulnPct != null
                ? insights.ulnPct < 100
                  ? "good"
                  : insights.ulnPct < 130
                  ? "warn"
                  : "bad"
                : "default"
            }
          />
          <InsightStat
            label="ALT trajectory"
            value={insights.trajectory ?? "—"}
            detail="last 3 readings"
            tone={
              insights.trajectory === "falling"
                ? "good"
                : insights.trajectory === "rising"
                ? "warn"
                : "default"
            }
          />
        </InsightGrid>
      </div>

      <div className="cs">
        <div className="ct">
          Liver enzymes over time <span className="src-pill">Kaiser Permanente</span>
        </div>
        <div className="csub">Dashed orange marker = antiviral start ~Apr 2026</div>
        <div className="leg">
          <div className="li">
            <span className="ld" style={{ background: "#f47067" }}></span>ALT (ULN 50)
          </div>
          <div className="li">
            <span className="ld" style={{ background: "#4a9eff" }}></span>AST (ULN 50)
          </div>
          <div className="li">
            <span className="ld" style={{ background: "#1aab7f" }}></span>Albumin gm/dL (right)
          </div>
        </div>
        <div className="cw">
          <EnzymeChart alt={altSeries} ast={astSeries} albumin={albSeries} />
        </div>
        <div className="note">
          Albumin has never dropped below 4.4 gm/dL — a key marker of liver synthetic
          function. Its stability across the entire enzyme fluctuation period implies
          preserved hepatic reserve.
        </div>
      </div>

      <div className="g2">
        <div className="cs">
          <div className="ct">
            Liver length — ultrasound <span className="src-pill">Kaiser</span>
          </div>
          <div className="csub">
            All scans · normal adult male ~14–18 cm (green band)
          </div>
          <div className="cw">
            <LiverLengthChart points={liverLengths} />
          </div>
          {imaging.length === 0 ? (
            <div className="note">No ultrasound records yet</div>
          ) : (
            <table style={{ width: "100%", marginTop: 8, fontSize: 12 }}>
              <tbody>
                {imaging.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--b0)" }}>
                    <td
                      style={{
                        padding: "7px 6px",
                        fontFamily: "var(--fm)",
                        fontSize: 10,
                        color: "var(--mu)",
                        whiteSpace: "nowrap",
                        verticalAlign: "top",
                      }}
                    >
                      {fmtMonth(s.recordedAt)}
                    </td>
                    <td style={{ padding: "7px 6px", color: "var(--tx)" }}>
                      {s.valueNumeric ? (
                        <>
                          <strong>{s.valueNumeric} cm</strong> ·{" "}
                        </>
                      ) : null}
                      <span style={{ color: "var(--mu)" }}>{s.valueText ?? "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="cs">
          <div className="ct">Batts-Ludwig fibrosis stage</div>
          <div className="csub">
            {biopsy
              ? `Biopsy ${fmtMonth(biopsy.recordedAt)} · ${biopsy.source}`
              : "No biopsy on file"}
          </div>
          <FibrosisIndicator range={fibrosis} />
          {biopsy ? (
            <div className="pgrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
              <div className="pc">
                <div className="pl">Trichrome</div>
                <div className="pv">Minimal fibrous expansion</div>
              </div>
              <div className="pc">
                <div className="pl">Reticulin</div>
                <div className="pv">Intact · no nodularity</div>
              </div>
              <div className="pc">
                <div className="pl">Iron stain</div>
                <div className="pv">Negative</div>
              </div>
              <div className="pc">
                <div className="pl">PAS-D</div>
                <div className="pv">Negative for α1-AT</div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="cs" style={{ background: "transparent", border: "none", padding: 0 }}>
        <div className="ct" style={{ marginBottom: 8, paddingLeft: 4 }}>
          Complete Blood Count — trends <span className="src-pill">Kaiser Permanente</span>
        </div>
        <div className="csub" style={{ paddingLeft: 4 }}>
          Hemoglobin recovery + platelet trajectory are the meaningful signals to track
        </div>
        <div className="g3">
          <CbcTrendChart title="Hemoglobin" points={hemoglobin} unit="gm/dL" color="#f47067" />
          <CbcTrendChart title="Platelets" points={platelets} unit="x10⁹/L" color="#4a9eff" />
          <CbcTrendChart title="WBC" points={wbc} unit="x10⁹/L" color="#1aab7f" />
        </div>
        <div className="g3">
          <CbcTrendChart title="Neutrophils (ANC)" points={neutrophils} unit="x10⁹/L" color="#a371f7" />
          <CbcTrendChart title="Lymphocytes" points={lymphocytes} unit="x10⁹/L" color="#e3b341" />
          <CbcTrendChart title="Eosinophils" points={eosinophils} unit="x10⁹/L" color="#f778ba" />
        </div>
        <div className="note">
          🩸 Platelets have drifted from 276 → 228 over 2 years. Still well above the 150
          watch-threshold for portal hypertension, but the trajectory is worth re-checking
          in 6 months. Hemoglobin recovery from the March dip (12.7 → 13.1) is the
          reassuring counter-signal. WBC and neutrophils stable through the antiviral
          start — no marrow suppression.
        </div>
      </div>

      {biopsy?.valueText ? (
        <div className="cs">
          <div className="ct">Biopsy report (verbatim)</div>
          <div className="csub">{biopsy.source}</div>
          <div className="note" style={{ marginTop: 0 }}>
            {biopsy.valueText}
          </div>
        </div>
      ) : null}
    </>
  );
}

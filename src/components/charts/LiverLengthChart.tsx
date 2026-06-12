"use client";
import { Line } from "react-chartjs-2";
import { registerChartJS } from "./setup";

registerChartJS();

export type LiverPoint = {
  date: string;
  cm: number;
  notes: string | null;
  severity: "normal" | "mild" | "moderate" | "unknown";
};

const SEVERITY_COLOR: Record<LiverPoint["severity"], string> = {
  normal: "#1aab7f",
  mild: "#e3b341",
  moderate: "#f47067",
  unknown: "#7d8590",
};

const SEVERITY_LABEL: Record<LiverPoint["severity"], string> = {
  normal: "Normal echotexture",
  mild: "Mild coarsening",
  moderate: "Hyperechoic / diffuse hepatocellular",
  unknown: "Unclassified",
};

export function LiverLengthChart({ points }: { points: LiverPoint[] }) {
  if (points.length === 0) {
    return (
      <div
        style={{ height: 220 }}
        className="flex items-center justify-center text-xs text-[color:var(--mu)]"
      >
        No ultrasound length readings yet
      </div>
    );
  }

  const labels = points.map((p) => p.date);
  const colors = points.map((p) => SEVERITY_COLOR[p.severity]);

  const data = {
    labels,
    datasets: [
      {
        label: "Liver length",
        data: points.map((p) => +p.cm.toFixed(1)),
        borderColor: "rgba(74,158,255,0.6)",
        backgroundColor: "rgba(74,158,255,0.10)",
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: colors,
        pointBorderColor: colors,
        tension: 0.25,
        fill: false,
      },
      // 14–18 cm reference band (two stacked datasets that fill between)
      {
        label: "Upper normal",
        data: labels.map(() => 18),
        borderColor: "transparent",
        backgroundColor: "rgba(26,171,127,0.08)",
        pointRadius: 0,
        fill: "+1",
      },
      {
        label: "Lower normal",
        data: labels.map(() => 14),
        borderColor: "transparent",
        backgroundColor: "transparent",
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  // Date-based interpolation between labels so a marker at e.g. Mar 26 lands
  // 60% of the way between the Dec-25 and Jun-26 scans instead of snapping to
  // the next label.
  function dateToFraction(targetIso: string): number | null {
    if (labels.length < 2) return null;
    const t = new Date(targetIso).getTime();
    const first = new Date(labels[0]).getTime();
    const last = new Date(labels[labels.length - 1]).getTime();
    if (t <= first) return 0;
    if (t >= last) return 1;
    for (let i = 0; i < labels.length - 1; i++) {
      const a = new Date(labels[i]).getTime();
      const b = new Date(labels[i + 1]).getTime();
      if (t >= a && t <= b) {
        const seg = (t - a) / (b - a);
        return (i + seg) / (labels.length - 1);
      }
    }
    return null;
  }

  const biopsyDate = "2026-03-26";
  const antiviralDate = "2026-04-07";
  const biopsyFrac = dateToFraction(biopsyDate);
  const antiviralFrac = dateToFraction(antiviralDate);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#161b22",
        borderColor: "rgba(255,255,255,0.09)",
        borderWidth: 1,
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null }; dataIndex: number }) => {
            if (ctx.dataset.label !== "Liver length") return "";
            const p = points[ctx.dataIndex];
            const sev = SEVERITY_LABEL[p.severity];
            return [`${ctx.parsed.y} cm`, sev];
          },
          afterLabel: (ctx: { dataset: { label?: string }; dataIndex: number }) => {
            if (ctx.dataset.label !== "Liver length") return "";
            const p = points[ctx.dataIndex];
            if (!p.notes) return "";
            // Wrap long notes
            const txt = p.notes.length > 200 ? p.notes.slice(0, 200) + "…" : p.notes;
            return "\n" + txt;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#7d8590" },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
      y: {
        ticks: { color: "#7d8590" },
        grid: { color: "rgba(255,255,255,0.04)" },
        title: { display: true, text: "cm", color: "#7d8590" },
        suggestedMin: 12,
        suggestedMax: 20,
      },
    },
  };

  return (
    <>
      <div style={{ height: 240, position: "relative" }}>
        <Line data={data} options={options} />
        {biopsyFrac != null ? (
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 24,
              left: `${biopsyFrac * 92 + 4}%`,
              width: 1,
              background: "rgba(74,158,255,0.4)",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 2,
                left: 4,
                fontSize: 9,
                color: "#4a9eff",
                fontFamily: "var(--fm)",
                whiteSpace: "nowrap",
                background: "rgba(74,158,255,0.1)",
                padding: "1px 4px",
                borderRadius: 3,
              }}
            >
              biopsy
            </div>
          </div>
        ) : null}
        {antiviralFrac != null ? (
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 24,
              left: `${antiviralFrac * 92 + 4}%`,
              width: 1,
              background: "rgba(26,171,127,0.45)",
              borderLeft: "1px dashed rgba(26,171,127,0.5)",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 16,
                left: 4,
                fontSize: 9,
                color: "#1aab7f",
                fontFamily: "var(--fm)",
                whiteSpace: "nowrap",
                background: "rgba(26,171,127,0.1)",
                padding: "1px 4px",
                borderRadius: 3,
              }}
            >
              antiviral
            </div>
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 8,
          fontSize: 11,
          color: "var(--mu)",
          fontFamily: "var(--fm)",
        }}
      >
        {(["normal", "mild", "moderate"] as const).map((s) => (
          <span
            key={s}
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: SEVERITY_COLOR[s],
                display: "inline-block",
              }}
            />
            {SEVERITY_LABEL[s]}
          </span>
        ))}
      </div>
    </>
  );
}

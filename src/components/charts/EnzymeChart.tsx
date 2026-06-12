"use client";
import { Chart } from "react-chartjs-2";
import { registerChartJS } from "./setup";

registerChartJS();

export type EnzymePoint = { date: string; value: number };

export function EnzymeChart({
  alt,
  ast,
  albumin,
  biopsyDate = "2026-03-26",
  antiviralStart = "2026-04-07",
}: {
  alt: EnzymePoint[];
  ast: EnzymePoint[];
  albumin: EnzymePoint[];
  biopsyDate?: string;
  antiviralStart?: string;
}) {
  const allDates = Array.from(
    new Set([...alt, ...ast, ...albumin].map((p) => p.date)),
  ).sort();

  const valueByDate = (series: EnzymePoint[]) => {
    const m = new Map(series.map((p) => [p.date, p.value]));
    return allDates.map((d) => m.get(d) ?? null);
  };

  function dateToFraction(targetIso: string): number | null {
    if (allDates.length < 2) return null;
    const t = new Date(targetIso).getTime();
    const first = new Date(allDates[0]).getTime();
    const last = new Date(allDates[allDates.length - 1]).getTime();
    if (t <= first) return 0;
    if (t >= last) return 1;
    for (let i = 0; i < allDates.length - 1; i++) {
      const a = new Date(allDates[i]).getTime();
      const b = new Date(allDates[i + 1]).getTime();
      if (t >= a && t <= b) {
        const seg = (t - a) / (b - a);
        return (i + seg) / (allDates.length - 1);
      }
    }
    return null;
  }

  const biopsyFrac = dateToFraction(biopsyDate);
  const antiviralFrac = dateToFraction(antiviralStart);

  const data = {
    labels: allDates,
    datasets: [
      {
        type: "line" as const,
        label: "ALT",
        data: valueByDate(alt),
        borderColor: "#f47067",
        backgroundColor: "#f4706722",
        pointRadius: 4,
        pointBackgroundColor: "#f47067",
        tension: 0.2,
        yAxisID: "y",
        spanGaps: true,
      },
      {
        type: "line" as const,
        label: "AST",
        data: valueByDate(ast),
        borderColor: "#4a9eff",
        backgroundColor: "#4a9eff22",
        pointRadius: 4,
        pointBackgroundColor: "#4a9eff",
        tension: 0.2,
        yAxisID: "y",
        spanGaps: true,
      },
      {
        type: "line" as const,
        label: "Albumin",
        data: valueByDate(albumin),
        borderColor: "#1aab7f",
        backgroundColor: "#1aab7f22",
        pointRadius: 4,
        pointBackgroundColor: "#1aab7f",
        tension: 0.2,
        yAxisID: "y1",
        spanGaps: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: "#161b22", borderColor: "rgba(255,255,255,0.09)", borderWidth: 1 },
    },
    scales: {
      x: {
        ticks: { color: "#7d8590", maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
      y: {
        position: "left" as const,
        title: { display: true, text: "U/L (ALT, AST)", color: "#7d8590" },
        grid: { color: "rgba(255,255,255,0.04)" },
        ticks: { color: "#7d8590" },
        suggestedMin: 0,
        suggestedMax: 80,
      },
      y1: {
        position: "right" as const,
        title: { display: true, text: "gm/dL (Albumin)", color: "#1aab7f" },
        grid: { drawOnChartArea: false },
        ticks: { color: "#1aab7f" },
        suggestedMin: 3.5,
        suggestedMax: 5.5,
      },
    },
  };

  return (
    <div style={{ height: 265, position: "relative" }}>
      <Chart type="line" data={data} options={options} />
      {biopsyFrac != null ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 28,
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
              padding: "1px 5px",
              borderRadius: 3,
              border: "1px solid rgba(74,158,255,0.3)",
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
            bottom: 28,
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
              padding: "1px 5px",
              borderRadius: 3,
              border: "1px solid rgba(26,171,127,0.3)",
            }}
          >
            antiviral
          </div>
        </div>
      ) : null}
    </div>
  );
}

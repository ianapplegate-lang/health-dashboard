"use client";
import { Chart } from "react-chartjs-2";
import { registerChartJS } from "./setup";

registerChartJS();

export type EnzymePoint = { date: string; value: number };

export function EnzymeChart({
  alt,
  ast,
  albumin,
  antiviralStart = "2026-04-07",
}: {
  alt: EnzymePoint[];
  ast: EnzymePoint[];
  albumin: EnzymePoint[];
  antiviralStart?: string;
}) {
  // Build a unified date axis (sorted unique dates across all three series).
  const allDates = Array.from(
    new Set([...alt, ...ast, ...albumin].map((p) => p.date)),
  ).sort();

  const valueByDate = (series: EnzymePoint[]) => {
    const m = new Map(series.map((p) => [p.date, p.value]));
    return allDates.map((d) => m.get(d) ?? null);
  };

  const antiviralIndex = allDates.findIndex((d) => d >= antiviralStart);

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
      annotation: undefined, // placeholder if we wire annotations later
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
      {antiviralIndex >= 0 ? (
        <div
          style={{
            position: "absolute",
            bottom: 30,
            left: `${(antiviralIndex / Math.max(1, allDates.length - 1)) * 92 + 4}%`,
            fontSize: 9,
            color: "#e3b341",
            fontFamily: "var(--fm)",
            background: "rgba(227,179,65,0.1)",
            padding: "1px 5px",
            borderRadius: 4,
            border: "1px solid rgba(227,179,65,0.3)",
            pointerEvents: "none",
          }}
        >
          antiviral
        </div>
      ) : null}
    </div>
  );
}

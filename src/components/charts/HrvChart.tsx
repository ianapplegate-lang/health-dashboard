"use client";
import { Line } from "react-chartjs-2";
import { registerChartJS } from "./setup";

registerChartJS();

export type HrvPoint = { date: string; rmssd: number };

function rolling(arr: (number | null)[], window: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < arr.length; i++) {
    const slice = arr.slice(Math.max(0, i - window + 1), i + 1).filter(
      (v): v is number => v != null,
    );
    out.push(slice.length > 0 ? slice.reduce((a, b) => a + b, 0) / slice.length : null);
  }
  return out;
}

export function HrvChart({
  points,
  biopsyStart = "2026-03-26",
  biopsyEnd = "2026-04-30",
}: {
  points: HrvPoint[];
  biopsyStart?: string;
  biopsyEnd?: string;
}) {
  const labels = points.map((p) => p.date);
  const values = points.map((p) => +p.rmssd.toFixed(1));
  const avg7 = rolling(values, 7);

  const data = {
    labels,
    datasets: [
      {
        label: "Nightly RMSSD (ms)",
        data: values,
        borderColor: "#a371f7",
        backgroundColor: "rgba(163,113,247,0.1)",
        pointRadius: 1.5,
        pointBackgroundColor: "#a371f7",
        tension: 0.2,
      },
      {
        label: "7-day rolling avg",
        data: avg7,
        borderColor: "rgba(163,113,247,0.55)",
        borderDash: [4, 3],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4,
      },
    ],
  };

  const biopsyStartIdx = labels.findIndex((d) => d >= biopsyStart);
  const biopsyEndIdx = labels.findIndex((d) => d >= biopsyEnd);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: "#161b22" },
    },
    scales: {
      x: {
        ticks: {
          color: "#7d8590",
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
      y: {
        ticks: { color: "#7d8590" },
        grid: { color: "rgba(255,255,255,0.04)" },
        title: { display: true, text: "ms", color: "#7d8590" },
      },
    },
  };

  return (
    <div style={{ height: 265, position: "relative" }}>
      <Line data={data} options={options} />
      {biopsyStartIdx >= 0 && labels.length > 1 ? (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: `${(biopsyStartIdx / (labels.length - 1)) * 90 + 5}%`,
            right:
              biopsyEndIdx >= 0
                ? `${100 - ((biopsyEndIdx / (labels.length - 1)) * 90 + 5)}%`
                : "60%",
            bottom: 28,
            background: "rgba(227,179,65,0.07)",
            borderLeft: "1px dashed rgba(227,179,65,0.4)",
            borderRight: "1px dashed rgba(227,179,65,0.4)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 4,
              fontSize: 9,
              color: "#e3b341",
              fontFamily: "var(--fm)",
            }}
          >
            biopsy + antiviral
          </div>
        </div>
      ) : null}
    </div>
  );
}

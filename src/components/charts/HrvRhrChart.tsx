"use client";
import { Line } from "react-chartjs-2";
import { registerChartJS } from "./setup";

registerChartJS();

export function HrvRhrChart({
  hrvMonthly,
  rhrMonthly,
}: {
  hrvMonthly: { ym: string; v: number }[];
  rhrMonthly: { ym: string; v: number }[];
}) {
  // Build a unified date axis spanning both series.
  const labels = Array.from(
    new Set([...hrvMonthly.map((p) => p.ym), ...rhrMonthly.map((p) => p.ym)]),
  ).sort();

  const hrvMap = new Map(hrvMonthly.map((p) => [p.ym, p.v]));
  const rhrMap = new Map(rhrMonthly.map((p) => [p.ym, p.v]));

  const data = {
    labels,
    datasets: [
      {
        label: "HRV RMSSD (ms)",
        data: labels.map((ym) => hrvMap.get(ym) ?? null),
        borderColor: "#a371f7",
        backgroundColor: "rgba(163,113,247,0.1)",
        pointRadius: 3,
        pointBackgroundColor: "#a371f7",
        tension: 0.3,
        yAxisID: "y",
        spanGaps: true,
      },
      {
        label: "Resting HR (bpm)",
        data: labels.map((ym) => rhrMap.get(ym) ?? null),
        borderColor: "#1aab7f",
        backgroundColor: "rgba(26,171,127,0.1)",
        pointRadius: 3,
        pointBackgroundColor: "#1aab7f",
        tension: 0.3,
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
      tooltip: { backgroundColor: "#161b22" },
    },
    scales: {
      x: {
        ticks: {
          color: "#7d8590",
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 10,
        },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
      y: {
        position: "left" as const,
        title: { display: true, text: "HRV (ms)", color: "#a371f7" },
        grid: { color: "rgba(255,255,255,0.04)" },
        ticks: { color: "#a371f7" },
      },
      y1: {
        position: "right" as const,
        title: { display: true, text: "Resting HR (bpm)", color: "#1aab7f" },
        grid: { drawOnChartArea: false },
        ticks: { color: "#1aab7f" },
        reverse: true,
      },
    },
  };

  return (
    <div style={{ height: 240 }}>
      <Line data={data} options={options} />
    </div>
  );
}

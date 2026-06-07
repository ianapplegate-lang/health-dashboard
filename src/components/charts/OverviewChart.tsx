"use client";
import { Chart } from "react-chartjs-2";
import { registerChartJS } from "./setup";

registerChartJS();

export type OverviewRow = {
  year: number;
  run: number;
  ride: number;
  workout: number;
  soccer: number;
  other: number;
  total: number;
};

export function OverviewChart({
  rows,
  weightByYear,
}: {
  rows: OverviewRow[];
  weightByYear: { year: number; lb: number }[];
}) {
  const labels = rows.map((r) => String(r.year));
  const weightMap = new Map(weightByYear.map((w) => [w.year, w.lb]));
  const weightSeries = rows.map((r) => weightMap.get(r.year) ?? null);

  const data = {
    labels,
    datasets: [
      {
        type: "bar" as const,
        label: "Run",
        data: rows.map((r) => r.run),
        backgroundColor: "#f47067",
        stack: "s",
        yAxisID: "y",
      },
      {
        type: "bar" as const,
        label: "Ride",
        data: rows.map((r) => r.ride),
        backgroundColor: "#4a9eff",
        stack: "s",
        yAxisID: "y",
      },
      {
        type: "bar" as const,
        label: "Workout",
        data: rows.map((r) => r.workout),
        backgroundColor: "#a371f7",
        stack: "s",
        yAxisID: "y",
      },
      {
        type: "bar" as const,
        label: "Soccer + other",
        data: rows.map((r) => r.soccer + r.other),
        backgroundColor: "#e3b341",
        stack: "s",
        yAxisID: "y",
      },
      {
        type: "line" as const,
        label: "Weight (lb)",
        data: weightSeries,
        borderColor: "#f778ba",
        backgroundColor: "#f778ba",
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: "#f778ba",
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
      tooltip: {
        backgroundColor: "#161b22",
        borderColor: "rgba(255,255,255,0.09)",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { color: "rgba(255,255,255,0.04)" },
        ticks: { color: "#7d8590" },
      },
      y: {
        stacked: true,
        position: "left" as const,
        title: { display: true, text: "Sessions", color: "#7d8590" },
        grid: { color: "rgba(255,255,255,0.04)" },
        ticks: { color: "#7d8590" },
      },
      y1: {
        position: "right" as const,
        title: { display: true, text: "Weight (lb)", color: "#f778ba" },
        grid: { drawOnChartArea: false },
        ticks: { color: "#f778ba" },
        suggestedMin: 150,
        suggestedMax: 185,
      },
    },
  };

  return (
    <div style={{ height: 270 }}>
      <Chart type="bar" data={data} options={options} />
    </div>
  );
}

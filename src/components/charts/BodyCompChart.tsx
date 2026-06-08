"use client";
import { Chart, Line } from "react-chartjs-2";
import { registerChartJS } from "./setup";

registerChartJS();

export type CompPoint = {
  date: string;
  weightLb: number;
  bodyFatPct: number | null;
  muscleLb: number | null;
};

export function BodyFatChart({ data }: { data: CompPoint[] }) {
  const valid = data.filter((p) => p.bodyFatPct != null);
  const chart = {
    labels: valid.map((p) => p.date),
    datasets: [
      {
        label: "Body fat %",
        data: valid.map((p) => p.bodyFatPct),
        borderColor: "#1aab7f",
        backgroundColor: "rgba(26,171,127,0.15)",
        pointRadius: 2,
        pointBackgroundColor: "#1aab7f",
        tension: 0.3,
        fill: true,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: "#161b22" } },
    scales: {
      x: {
        ticks: { color: "#7d8590", maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
      y: {
        ticks: { color: "#7d8590" },
        grid: { color: "rgba(255,255,255,0.04)" },
        suggestedMin: 10,
        suggestedMax: 25,
        title: { display: true, text: "%", color: "#7d8590" },
      },
    },
  };
  return (
    <div style={{ height: 200 }}>
      <Line data={chart} options={options} />
    </div>
  );
}

export function MuscleChart({ data }: { data: CompPoint[] }) {
  const valid = data.filter((p) => p.muscleLb != null);
  const chart = {
    labels: valid.map((p) => p.date),
    datasets: [
      {
        label: "Muscle (lb)",
        data: valid.map((p) => p.muscleLb),
        borderColor: "#4a9eff",
        backgroundColor: "rgba(74,158,255,0.15)",
        pointRadius: 2,
        pointBackgroundColor: "#4a9eff",
        tension: 0.3,
        fill: true,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: "#161b22" } },
    scales: {
      x: {
        ticks: { color: "#7d8590", maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
      y: {
        ticks: { color: "#7d8590" },
        grid: { color: "rgba(255,255,255,0.04)" },
        suggestedMin: 120,
        suggestedMax: 145,
        title: { display: true, text: "lb", color: "#7d8590" },
      },
    },
  };
  return (
    <div style={{ height: 200 }}>
      <Line data={chart} options={options} />
    </div>
  );
}

export function RecompScatter({ data }: { data: CompPoint[] }) {
  const valid = data.filter((p) => p.bodyFatPct != null);
  const byYear = new Map<number, { x: number; y: number }[]>();
  for (const p of valid) {
    const year = new Date(p.date).getFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push({ x: +p.weightLb.toFixed(1), y: +(p.bodyFatPct as number).toFixed(1) });
  }
  const yearColors: Record<number, string> = {
    2022: "rgba(74,158,255,0.8)",
    2023: "rgba(167,140,108,0.8)",
    2024: "rgba(163,113,247,0.8)",
    2025: "rgba(26,171,127,0.8)",
    2026: "rgba(244,112,103,0.8)",
  };
  const chart = {
    datasets: Array.from(byYear.entries()).map(([year, points]) => ({
      label: String(year),
      data: points,
      backgroundColor: yearColors[year] ?? "rgba(255,255,255,0.5)",
      pointRadius: 4,
    })),
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#161b22",
        callbacks: {
          label: (ctx: { dataset: { label?: string }; raw: unknown }) => {
            const r = ctx.raw as { x: number; y: number };
            return `${ctx.dataset.label}: ${r.x} lb · ${r.y}%`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "linear" as const,
        ticks: { color: "#7d8590" },
        grid: { color: "rgba(255,255,255,0.04)" },
        title: { display: true, text: "Weight (lb)", color: "#7d8590" },
      },
      y: {
        ticks: { color: "#7d8590" },
        grid: { color: "rgba(255,255,255,0.04)" },
        title: { display: true, text: "Body fat %", color: "#7d8590" },
      },
    },
  };
  return (
    <div style={{ height: 240 }}>
      <Chart type="scatter" data={chart} options={options} />
    </div>
  );
}

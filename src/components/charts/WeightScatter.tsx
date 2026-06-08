"use client";
import { Chart } from "react-chartjs-2";
import { registerChartJS } from "./setup";

registerChartJS();

export type ReadingPoint = { date: string; weightLb: number };
export type MonthlyAvg = { ym: string; lb: number };

function yearColor(year: number): string {
  if (year <= 2021) return "rgba(136,135,128,0.6)";
  if (year === 2022) return "rgba(74,158,255,0.8)";
  if (year === 2023) return "rgba(167,140,108,0.8)";
  if (year === 2024) return "rgba(163,113,247,0.8)";
  if (year === 2025) return "rgba(26,171,127,0.8)";
  if (year === 2026) return "rgba(244,112,103,0.8)";
  return "rgba(255,255,255,0.5)";
}

export function WeightScatter({
  readings,
  monthlyAvg,
}: {
  readings: ReadingPoint[];
  monthlyAvg: MonthlyAvg[];
}) {
  // Convert dates to timestamps for x-axis to keep proper chronological spacing.
  const scatterData = readings.map((r) => ({
    x: new Date(r.date).getTime(),
    y: +r.weightLb.toFixed(1),
    year: new Date(r.date).getFullYear(),
  }));

  const monthly = monthlyAvg.map((m) => ({
    x: new Date(m.ym + "-15").getTime(),
    y: +m.lb.toFixed(1),
  }));

  const data = {
    datasets: [
      {
        type: "scatter" as const,
        label: "Weight",
        data: scatterData,
        backgroundColor: scatterData.map((p) => yearColor(p.year)),
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        type: "line" as const,
        label: "Monthly avg",
        data: monthly,
        borderColor: "#f778ba",
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
      },
    ],
  };

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
          title: (items: Array<{ raw: unknown }>) => {
            const r = items[0]?.raw as { x?: number } | undefined;
            return r?.x ? new Date(r.x).toISOString().slice(0, 10) : "";
          },
          label: (ctx: { dataset: { label?: string }; raw: unknown }) => {
            const r = ctx.raw as { y?: number };
            return `${ctx.dataset.label}: ${r.y ?? "—"} lb`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "linear" as const,
        position: "bottom" as const,
        ticks: {
          color: "#7d8590",
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 10,
          callback: function (val: unknown) {
            return new Date(val as number).toLocaleDateString("en-US", {
              month: "short",
              year: "2-digit",
            });
          },
        },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
      y: {
        ticks: { color: "#7d8590" },
        grid: { color: "rgba(255,255,255,0.04)" },
        suggestedMin: 150,
        suggestedMax: 185,
        title: { display: true, text: "Weight (lb)", color: "#7d8590" },
      },
    },
  };

  return (
    <div style={{ height: 270 }}>
      <Chart type="scatter" data={data} options={options} />
    </div>
  );
}

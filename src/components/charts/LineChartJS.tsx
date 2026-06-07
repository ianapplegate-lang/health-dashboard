"use client";
import { Line } from "react-chartjs-2";
import { registerChartJS } from "./setup";

registerChartJS();

export type SeriesPoint = { date: string; value: number | null };

export function LineChartJS({
  series,
  unit,
  color = "#34d399",
  yMin,
  yMax,
  height = 220,
}: {
  series: SeriesPoint[];
  unit: string;
  color?: string;
  yMin?: number;
  yMax?: number;
  height?: number;
}) {
  if (series.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-zinc-500"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  const data = {
    labels: series.map((s) => s.date),
    datasets: [
      {
        label: unit,
        data: series.map((s) => s.value),
        borderColor: color,
        backgroundColor: color + "22",
        pointRadius: 0,
        tension: 0.3,
        fill: true,
        spanGaps: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#18181b",
        borderColor: "#27272a",
        borderWidth: 1,
        callbacks: {
          label: (ctx: { parsed: { y: number | null } }) =>
            ctx.parsed.y == null ? "" : `${ctx.parsed.y} ${unit}`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
          callback: function (this: unknown, _val: unknown, index: number) {
            const lbl = series[index]?.date ?? "";
            return lbl.slice(5);
          },
        },
        grid: { color: "#27272a" },
      },
      y: {
        min: yMin,
        max: yMax,
        grid: { color: "#27272a" },
      },
    },
  };

  return (
    <div style={{ height }}>
      <Line data={data} options={options} />
    </div>
  );
}

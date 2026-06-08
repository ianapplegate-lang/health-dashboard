"use client";
import { Bar } from "react-chartjs-2";
import { registerChartJS } from "./setup";

registerChartJS();

export type SleepBar = {
  date: string;
  hours: number;
  qualityPct: number | null;
};

function qualityColor(q: number | null): string {
  if (q == null) return "rgba(74,158,255,0.3)";
  if (q < 0.25) return "rgba(244,112,103,0.6)";
  if (q < 0.35) return "rgba(227,179,65,0.6)";
  if (q < 0.45) return "rgba(74,158,255,0.7)";
  return "rgba(26,171,127,0.85)";
}

export function SleepDurationChart({ data }: { data: SleepBar[] }) {
  const chart = {
    labels: data.map((d) => d.date),
    datasets: [
      {
        label: "Hours",
        data: data.map((d) => +d.hours.toFixed(2)),
        backgroundColor: data.map((d) => qualityColor(d.qualityPct)),
        borderRadius: 3,
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
        callbacks: {
          afterLabel: (ctx: { dataIndex: number }) => {
            const q = data[ctx.dataIndex]?.qualityPct;
            return q != null ? `Quality ${Math.round(q * 100)}%` : "";
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#7d8590",
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 12,
        },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
      y: {
        ticks: { color: "#7d8590" },
        grid: { color: "rgba(255,255,255,0.04)" },
        suggestedMin: 0,
        suggestedMax: 10,
        title: { display: true, text: "Hours", color: "#7d8590" },
      },
    },
  };
  return (
    <div style={{ height: 235 }}>
      <Bar data={chart} options={options} />
    </div>
  );
}

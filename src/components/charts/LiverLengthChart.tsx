"use client";
import { Line } from "react-chartjs-2";
import { registerChartJS } from "./setup";

registerChartJS();

export type LiverPoint = { date: string; cm: number; notes: string | null };

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

  const data = {
    labels: points.map((p) => p.date),
    datasets: [
      {
        label: "Liver length",
        data: points.map((p) => +p.cm.toFixed(1)),
        borderColor: "#4a9eff",
        backgroundColor: "rgba(74,158,255,0.15)",
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: "#4a9eff",
        tension: 0.25,
        fill: false,
      },
      // Shading the 14–18 cm normal-adult-male reference band by stacking two
      // invisible-line filled datasets behind the real measurement.
      {
        label: "Upper normal (18 cm)",
        data: points.map(() => 18),
        borderColor: "transparent",
        backgroundColor: "rgba(26,171,127,0.08)",
        pointRadius: 0,
        fill: "+1",
      },
      {
        label: "Lower normal (14 cm)",
        data: points.map(() => 14),
        borderColor: "transparent",
        backgroundColor: "transparent",
        pointRadius: 0,
        fill: false,
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
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => {
            if (ctx.dataset.label !== "Liver length") return "";
            return `${ctx.parsed.y} cm`;
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
    <div style={{ height: 220 }}>
      <Line data={data} options={options} />
    </div>
  );
}

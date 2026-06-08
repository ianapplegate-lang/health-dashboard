"use client";
import { Doughnut } from "react-chartjs-2";
import { registerChartJS } from "./setup";

registerChartJS();

export function SleepStagesDonut({
  deepPct,
  remPct,
  lightPct,
  awakePct,
}: {
  deepPct: number | null;
  remPct: number | null;
  lightPct: number | null;
  awakePct: number | null;
}) {
  if (deepPct == null && remPct == null && lightPct == null) {
    return (
      <div
        style={{ height: 200 }}
        className="flex items-center justify-center text-xs text-[color:var(--mu)]"
      >
        No stage data yet
      </div>
    );
  }
  const data = {
    labels: ["Deep", "REM", "Light", "Awake"],
    datasets: [
      {
        data: [
          deepPct ? +(deepPct * 100).toFixed(1) : 0,
          remPct ? +(remPct * 100).toFixed(1) : 0,
          lightPct ? +(lightPct * 100).toFixed(1) : 0,
          awakePct ? +(awakePct * 100).toFixed(1) : 0,
        ],
        backgroundColor: ["#1aab7f", "#4a9eff", "#a371f7", "#f47067"],
        borderColor: "#161b22",
        borderWidth: 2,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "60%",
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          color: "#7d8590",
          font: { size: 11 },
          padding: 10,
          boxWidth: 12,
        },
      },
      tooltip: {
        backgroundColor: "#161b22",
        callbacks: {
          label: (ctx: { label?: string; parsed: number }) =>
            `${ctx.label}: ${ctx.parsed}%`,
        },
      },
    },
  };
  return (
    <div style={{ height: 200 }}>
      <Doughnut data={data} options={options} />
    </div>
  );
}

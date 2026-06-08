"use client";
import { Bar } from "react-chartjs-2";
import { registerChartJS } from "./setup";

registerChartJS();

export type DeepBar = { date: string; deepPct: number | null };

export function DeepSleepBars({ data }: { data: DeepBar[] }) {
  const valid = data.filter((d) => d.deepPct != null);
  const chart = {
    labels: valid.map((d) => d.date),
    datasets: [
      {
        label: "Deep %",
        data: valid.map((d) => +((d.deepPct as number) * 100).toFixed(1)),
        backgroundColor: valid.map((d) => {
          const p = (d.deepPct as number) * 100;
          return p >= 25 ? "#1aab7f" : "rgba(74,158,255,0.6)";
        }),
        borderRadius: 3,
      },
    ],
  };
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
          maxTicksLimit: 10,
        },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
      y: {
        ticks: { color: "#7d8590" },
        grid: { color: "rgba(255,255,255,0.04)" },
        title: { display: true, text: "%", color: "#7d8590" },
        suggestedMax: 35,
      },
    },
  };
  return (
    <div style={{ height: 200 }}>
      <Bar data={chart} options={options} />
    </div>
  );
}

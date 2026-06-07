"use client";
import { Bar } from "react-chartjs-2";
import { registerChartJS } from "./setup";

registerChartJS();

export function StepsMonthlyChart({
  data,
}: {
  data: { ym: string; steps: number }[];
}) {
  if (data.length === 0) {
    return (
      <div style={{ height: 195 }} className="flex items-center justify-center text-xs text-[color:var(--mu)]">
        No step data yet
      </div>
    );
  }
  const chartData = {
    labels: data.map((d) => d.ym),
    datasets: [
      {
        label: "Avg daily steps",
        data: data.map((d) => d.steps),
        backgroundColor: "#1aab7f",
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
      x: { ticks: { color: "#7d8590", maxRotation: 0, autoSkip: true, maxTicksLimit: 12 }, grid: { color: "rgba(255,255,255,0.04)" } },
      y: { ticks: { color: "#7d8590" }, grid: { color: "rgba(255,255,255,0.04)" }, beginAtZero: true },
    },
  };
  return (
    <div style={{ height: 195 }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}

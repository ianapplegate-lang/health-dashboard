"use client";
import { Line } from "react-chartjs-2";
import { registerChartJS } from "./setup";

registerChartJS();

export function RunRideChart({
  data,
}: {
  data: { year: number; runKm: number; rideKm: number }[];
}) {
  const chart = {
    labels: data.map((r) => String(r.year)),
    datasets: [
      {
        label: "Running (km)",
        data: data.map((r) => Math.round(r.runKm)),
        borderColor: "#f47067",
        backgroundColor: "rgba(244,112,103,0.15)",
        pointRadius: 3,
        pointBackgroundColor: "#f47067",
        tension: 0.3,
        fill: true,
      },
      {
        label: "Cycling (km)",
        data: data.map((r) => Math.round(r.rideKm)),
        borderColor: "#4a9eff",
        backgroundColor: "rgba(74,158,255,0.15)",
        pointRadius: 3,
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
      x: { ticks: { color: "#7d8590" }, grid: { color: "rgba(255,255,255,0.04)" } },
      y: {
        ticks: { color: "#7d8590" },
        grid: { color: "rgba(255,255,255,0.04)" },
        title: { display: true, text: "km", color: "#7d8590" },
        beginAtZero: true,
      },
    },
  };
  return (
    <div style={{ height: 250 }}>
      <Line data={chart} options={options} />
    </div>
  );
}

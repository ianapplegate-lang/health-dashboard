"use client";
import { Line } from "react-chartjs-2";
import { registerChartJS } from "./setup";

registerChartJS();

function rolling(arr: (number | null)[], window: number): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 0; i < arr.length; i++) {
    const slice = arr.slice(Math.max(0, i - window + 1), i + 1).filter(
      (v): v is number => v != null,
    );
    out.push(slice.length > 0 ? slice.reduce((a, b) => a + b, 0) / slice.length : null);
  }
  return out;
}

export function ExerciseHrChart({
  points,
}: {
  points: { ym: string; avgHr: number }[];
}) {
  const labels = points.map((p) => p.ym);
  const values = points.map((p) => +p.avgHr.toFixed(1));
  const avg6 = rolling(values, 6);

  const data = {
    labels,
    datasets: [
      {
        label: "Monthly avg exercise HR",
        data: values,
        borderColor: "rgba(244,112,103,0.7)",
        backgroundColor: "rgba(244,112,103,0.1)",
        pointRadius: 2,
        pointBackgroundColor: "#f47067",
        tension: 0.3,
      },
      {
        label: "6-month rolling avg",
        data: avg6,
        borderColor: "rgba(74,158,255,0.7)",
        borderDash: [4, 3],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: "#161b22" } },
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
        title: { display: true, text: "bpm", color: "#7d8590" },
      },
    },
  };
  return (
    <div style={{ height: 230 }}>
      <Line data={data} options={options} />
    </div>
  );
}

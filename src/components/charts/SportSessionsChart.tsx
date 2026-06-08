"use client";
import { useState } from "react";
import { Line } from "react-chartjs-2";
import { registerChartJS } from "./setup";

registerChartJS();

export type YearSessions = {
  year: number;
  run: number;
  ride: number;
  workout: number;
  soccer: number;
  hike: number;
  walk: number;
};

type Series = "run" | "ride" | "workout" | "soccer" | "hike" | "walk";

const COLORS: Record<Series, string> = {
  run: "#f47067",
  ride: "#4a9eff",
  workout: "#a371f7",
  soccer: "#e3b341",
  hike: "#1aab7f",
  walk: "#f778ba",
};

const LABELS: Record<Series, string> = {
  run: "Run",
  ride: "Ride",
  workout: "Workout",
  soccer: "Soccer",
  hike: "Hike",
  walk: "Walk",
};

export function SportSessionsChart({ data }: { data: YearSessions[] }) {
  const [enabled, setEnabled] = useState<Record<Series, boolean>>({
    run: true,
    ride: true,
    workout: true,
    soccer: true,
    hike: true,
    walk: true,
  });

  const chart = {
    labels: data.map((r) => String(r.year)),
    datasets: (Object.keys(COLORS) as Series[])
      .filter((k) => enabled[k])
      .map((k) => ({
        label: LABELS[k],
        data: data.map((r) => r[k]),
        borderColor: COLORS[k],
        backgroundColor: COLORS[k] + "22",
        pointRadius: 2,
        pointBackgroundColor: COLORS[k],
        tension: 0.3,
      })),
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
        title: { display: true, text: "Sessions", color: "#7d8590" },
        beginAtZero: true,
      },
    },
  };

  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {(Object.keys(COLORS) as Series[]).map((k) => {
          const on = enabled[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => setEnabled((e) => ({ ...e, [k]: !e[k] }))}
              style={{
                padding: "4px 11px",
                borderRadius: 100,
                border: `1px solid ${on ? COLORS[k] + "55" : "rgba(255,255,255,0.09)"}`,
                background: on ? COLORS[k] + "22" : "transparent",
                color: on ? COLORS[k] : "var(--mu)",
                fontFamily: "var(--fm)",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {LABELS[k]}
            </button>
          );
        })}
      </div>
      <div style={{ height: 250 }}>
        <Line data={chart} options={options} />
      </div>
    </>
  );
}

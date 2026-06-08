"use client";
import { useState } from "react";
import { Bar } from "react-chartjs-2";
import { registerChartJS } from "./setup";

registerChartJS();

export type MonthlyRow = {
  ym: string;
  run: number;
  ride: number;
  workout: number;
  soccer: number;
  other: number;
};

type Series = "run" | "ride" | "workout" | "soccer";

const COLORS: Record<Series, { fg: string; bg: string }> = {
  run: { fg: "#f47067", bg: "rgba(244,112,103,0.8)" },
  ride: { fg: "#4a9eff", bg: "rgba(74,158,255,0.8)" },
  workout: { fg: "#a371f7", bg: "rgba(163,113,247,0.8)" },
  soccer: { fg: "#e3b341", bg: "rgba(227,179,65,0.8)" },
};

const LABELS: Record<Series, string> = {
  run: "Run",
  ride: "Ride",
  workout: "Workout",
  soccer: "Soccer",
};

export function MonthlySessionsChart({ data }: { data: MonthlyRow[] }) {
  const [enabled, setEnabled] = useState<Record<Series, boolean>>({
    run: true,
    ride: true,
    workout: true,
    soccer: true,
  });

  const chart = {
    labels: data.map((r) => r.ym),
    datasets: (Object.keys(COLORS) as Series[])
      .filter((k) => enabled[k])
      .map((k) => ({
        label: LABELS[k],
        data: data.map((r) => r[k]),
        backgroundColor: COLORS[k].bg,
        stack: "s",
        borderRadius: 3,
      })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: "#161b22" } },
    scales: {
      x: {
        stacked: true,
        ticks: {
          color: "#7d8590",
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 12,
        },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
      y: {
        stacked: true,
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
                border: `1px solid ${on ? COLORS[k].fg + "55" : "rgba(255,255,255,0.09)"}`,
                background: on ? COLORS[k].fg + "22" : "transparent",
                color: on ? COLORS[k].fg : "var(--mu)",
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
      <div style={{ height: 240 }}>
        <Bar data={chart} options={options} />
      </div>
    </>
  );
}

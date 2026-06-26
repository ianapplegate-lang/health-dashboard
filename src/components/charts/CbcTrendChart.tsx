"use client";
import { Line } from "react-chartjs-2";
import { registerChartJS } from "./setup";

registerChartJS();

export type CbcPoint = {
  date: string;
  value: number;
  refLow: number | null;
  refHigh: number | null;
  abnormal: string | null;
};

export function CbcTrendChart({
  title,
  points,
  unit,
  color = "#4a9eff",
  yMin,
  yMax,
}: {
  title: string;
  points: CbcPoint[];
  unit: string;
  color?: string;
  yMin?: number;
  yMax?: number;
}) {
  if (points.length === 0) {
    return (
      <div className="cs">
        <div className="ct">{title}</div>
        <div
          style={{ height: 130 }}
          className="flex items-center justify-center text-xs text-[color:var(--mu)]"
        >
          No data
        </div>
      </div>
    );
  }

  const latest = points[points.length - 1];
  const refLow = points[0]?.refLow ?? null;
  const refHigh = points[0]?.refHigh ?? null;

  const data = {
    labels: points.map((p) => p.date),
    datasets: [
      {
        label: title,
        data: points.map((p) => p.value),
        borderColor: color,
        backgroundColor: color + "22",
        pointRadius: 4,
        pointBackgroundColor: points.map((p) =>
          p.abnormal === "low" || p.abnormal === "high" ? "#f47067" : color,
        ),
        pointBorderColor: points.map((p) =>
          p.abnormal === "low" || p.abnormal === "high" ? "#f47067" : color,
        ),
        tension: 0.25,
        fill: false,
      },
      // Reference range shading via stacked datasets
      ...(refHigh != null
        ? [
            {
              label: "upper",
              data: points.map(() => refHigh),
              borderColor: "transparent",
              backgroundColor: "rgba(26,171,127,0.08)",
              pointRadius: 0,
              fill: "+1" as const,
            },
            {
              label: "lower",
              data: points.map(() => refLow ?? refHigh * 0.2),
              borderColor: "transparent",
              backgroundColor: "transparent",
              pointRadius: 0,
              fill: false as const,
            },
          ]
        : []),
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
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => {
            if (ctx.dataset.label !== title) return "";
            return `${ctx.parsed.y} ${unit}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#7d8590", autoSkip: true, maxTicksLimit: 5 },
        grid: { color: "rgba(255,255,255,0.04)" },
      },
      y: {
        ticks: { color: "#7d8590" },
        grid: { color: "rgba(255,255,255,0.04)" },
        suggestedMin: yMin ?? (refLow != null ? refLow - (refHigh ?? refLow) * 0.1 : undefined),
        suggestedMax: yMax ?? (refHigh != null ? refHigh + refHigh * 0.05 : undefined),
      },
    },
  };

  return (
    <div className="cs">
      <div className="ct">
        {title}
        <span
          style={{
            fontSize: 11,
            fontFamily: "var(--fm)",
            color: latest.abnormal ? "var(--red)" : "var(--mu)",
            marginLeft: 8,
            fontWeight: 400,
          }}
        >
          latest {latest.value} {unit}
          {latest.abnormal ? ` (${latest.abnormal})` : ""}
        </span>
      </div>
      <div className="csub">
        {refLow != null && refHigh != null
          ? `Normal range: ${refLow}–${refHigh} ${unit}`
          : unit}
      </div>
      <div style={{ height: 130 }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}

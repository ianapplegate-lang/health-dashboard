"use client";
import { useState } from "react";

export type HeatmapDay = {
  date: string;
  n: number;
  intensity: number;
  avgHr: number | null;
};

function intensityColor(intensity: number, max: number): string {
  if (intensity === 0) return "rgba(255,255,255,0.04)";
  const t = Math.min(1, intensity / Math.max(1, max));
  // Blue ramp matching the source's hmgrid
  if (t < 0.25) return "rgba(74,158,255,0.1)";
  if (t < 0.5) return "rgba(74,158,255,0.3)";
  if (t < 0.75) return "rgba(74,158,255,0.6)";
  return "#4a9eff";
}

export function TrainingHeatmap({ days }: { days: HeatmapDay[] }) {
  const max = days.reduce((m, d) => Math.max(m, d.intensity), 0);
  const [hover, setHover] = useState<HeatmapDay | null>(null);

  return (
    <>
      <div className="hmgrid" role="img" aria-label="Training load heatmap">
        {days.map((d) => (
          <div
            key={d.date}
            className="hmcell"
            style={{ background: intensityColor(d.intensity, max) }}
            onMouseEnter={() => setHover(d)}
            onMouseLeave={() => setHover(null)}
            title={`${d.date} · ${d.n} sessions${d.avgHr ? ` · avg HR ${Math.round(d.avgHr)}` : ""}`}
          />
        ))}
      </div>
      <div className="hmtt">
        {hover
          ? `${hover.date} · ${hover.n} session${hover.n === 1 ? "" : "s"}${
              hover.avgHr ? ` · avg HR ${Math.round(hover.avgHr)}` : ""
            }`
          : "Hover a cell for detail"}
      </div>
    </>
  );
}

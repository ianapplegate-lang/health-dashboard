"use client";
import { useState } from "react";

export type SleepHeatmapDay = {
  date: string;
  qualityPct: number | null;
  hours: number;
};

function qualityColor(q: number | null): string {
  if (q == null) return "rgba(255,255,255,0.04)";
  if (q < 0.2) return "rgba(244,112,103,0.5)";
  if (q < 0.3) return "rgba(74,158,255,0.5)";
  if (q < 0.4) return "rgba(26,171,127,0.4)";
  if (q < 0.5) return "rgba(26,171,127,0.75)";
  return "#1aab7f";
}

export function SleepHeatmap({ days }: { days: SleepHeatmapDay[] }) {
  const [hover, setHover] = useState<SleepHeatmapDay | null>(null);
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(20px, 1fr))", gap: 3, margin: "9px 0 5px" }}>
        {days.map((d) => (
          <div
            key={d.date}
            style={{
              height: 20,
              borderRadius: 3,
              background: qualityColor(d.qualityPct),
              cursor: "default",
              transition: "transform 0.1s",
            }}
            onMouseEnter={() => setHover(d)}
            onMouseLeave={() => setHover(null)}
            title={`${d.date} · ${d.hours.toFixed(1)} h${d.qualityPct != null ? ` · ${Math.round(d.qualityPct * 100)}%` : ""}`}
          />
        ))}
      </div>
      <div className="hmtt">
        {hover
          ? `${hover.date} · ${hover.hours.toFixed(1)} h${hover.qualityPct != null ? ` · quality ${Math.round(hover.qualityPct * 100)}%` : ""}`
          : "Hover a night for detail"}
      </div>
    </>
  );
}

"use client";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TrendPoint = { date: string; value: number | null };

export function LineTrend({
  data,
  unit,
  color = "#34d399",
  yDomain,
}: {
  data: TrendPoint[];
  unit: string;
  color?: string;
  yDomain?: [number | "auto", number | "auto"];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
        No data yet
      </div>
    );
  }
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => d.slice(5)}
            stroke="#71717a"
            fontSize={11}
            tickMargin={6}
            minTickGap={20}
          />
          <YAxis
            stroke="#71717a"
            fontSize={11}
            width={40}
            domain={yDomain ?? ["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "#18181b",
              border: "1px solid #27272a",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "#a1a1aa" }}
            formatter={(v) => [`${v} ${unit}`, ""]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

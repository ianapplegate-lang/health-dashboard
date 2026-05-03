"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type SportRow = { sport: string; count: number; minutes: number };

export function SportBreakdown({
  data,
  metric = "count",
}: {
  data: SportRow[];
  metric?: "count" | "minutes";
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
        No workouts
      </div>
    );
  }
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 16 }}
        >
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" stroke="#71717a" fontSize={11} />
          <YAxis
            type="category"
            dataKey="sport"
            stroke="#71717a"
            fontSize={12}
            width={100}
          />
          <Tooltip
            contentStyle={{
              background: "#18181b",
              border: "1px solid #27272a",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey={metric} fill="#34d399" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

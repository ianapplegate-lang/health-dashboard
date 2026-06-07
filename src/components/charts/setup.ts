"use client";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  BarElement,
} from "chart.js";

let registered = false;

export function registerChartJS() {
  if (registered) return;
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Tooltip,
    Legend,
    Filler,
  );
  ChartJS.defaults.color = "#a1a1aa";
  ChartJS.defaults.borderColor = "#27272a";
  ChartJS.defaults.font.family =
    "var(--font-geist-sans), system-ui, -apple-system, sans-serif";
  registered = true;
}

"use client";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
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
    ArcElement,
    Tooltip,
    Legend,
    Filler,
  );
  ChartJS.defaults.color = "#a1a1aa";
  ChartJS.defaults.borderColor = "#27272a";
  ChartJS.defaults.font.family =
    "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif";
  registered = true;
}

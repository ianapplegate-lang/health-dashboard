"use client";
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  ScatterController,
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
    LineController,
    BarController,
    DoughnutController,
    ScatterController,
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

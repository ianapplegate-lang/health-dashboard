import JSZip from "jszip";
import { db } from "@/db/client";
import { dailyMetrics, sleepSessions } from "@/db/schema";
import { sql } from "drizzle-orm";

export type ImportSummary = {
  source: "fitbit" | "google-fit";
  dailyMetricsUpserted: number;
  sleepUpserted: number;
  filesScanned: number;
  warnings: string[];
};

export async function importFitbitTakeout(
  zip: JSZip,
  userId: string,
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    source: "fitbit",
    dailyMetricsUpserted: 0,
    sleepUpserted: 0,
    filesScanned: 0,
    warnings: [],
  };

  for (const path in zip.files) {
    const file = zip.files[path];
    if (file.dir) continue;
    if (!path.includes("Fitbit/")) continue;

    const filename = path.split("/").pop() ?? "";

    try {
      if (
        /^steps-\d{4}-\d{2}-\d{2}\.json$/i.test(filename) ||
        /^Activity Goals\.json$/i.test(filename)
      ) {
        // skip — covered by daily aggregates below
        continue;
      }

      if (/^Activities-\d{4}-\d{2}-\d{2}\.json$/i.test(filename)) {
        const text = await file.async("string");
        const arr = safeJson<unknown[]>(text);
        if (Array.isArray(arr)) {
          summary.filesScanned++;
          // per-activity events; skipped (Strava is source of truth)
        }
        continue;
      }

      if (/^sleep-\d{4}-\d{2}-\d{2}\.json$/i.test(filename)) {
        const text = await file.async("string");
        const arr = safeJson<FitbitSleepEntry[]>(text);
        if (!Array.isArray(arr)) continue;
        summary.filesScanned++;
        for (const s of arr) {
          if (!s.mainSleep && s.isMainSleep !== true) continue;
          await db
            .insert(sleepSessions)
            .values({
              userId,
              date: s.dateOfSleep,
              startedAt: new Date(s.startTime),
              endedAt: new Date(s.endTime),
              durationSec: Math.round((s.duration ?? 0) / 1000),
              efficiency: s.efficiency != null ? s.efficiency / 100 : null,
              deepSec: s.levels?.summary?.deep?.minutes
                ? s.levels.summary.deep.minutes * 60
                : null,
              remSec: s.levels?.summary?.rem?.minutes
                ? s.levels.summary.rem.minutes * 60
                : null,
              lightSec: s.levels?.summary?.light?.minutes
                ? s.levels.summary.light.minutes * 60
                : null,
              awakeSec: s.levels?.summary?.wake?.minutes
                ? s.levels.summary.wake.minutes * 60
                : null,
              raw: s,
            })
            .onConflictDoUpdate({
              target: [sleepSessions.userId, sleepSessions.date],
              set: {
                startedAt: new Date(s.startTime),
                endedAt: new Date(s.endTime),
                durationSec: Math.round((s.duration ?? 0) / 1000),
                efficiency: s.efficiency != null ? s.efficiency / 100 : null,
                raw: s,
              },
            });
          summary.sleepUpserted++;
        }
        continue;
      }

      if (
        /^lifetime_aggregations\.json$/i.test(filename) ||
        /^daily_aggregations\.json$/i.test(filename)
      ) {
        const text = await file.async("string");
        const arr = safeJson<FitbitDailyEntry[]>(text);
        if (!Array.isArray(arr)) continue;
        summary.filesScanned++;
        for (const d of arr) {
          if (!d.dateTime) continue;
          await upsertDaily(userId, {
            date: d.dateTime.slice(0, 10),
            steps: numOrNull(d.steps),
            activeMinutes:
              numOrNull(d.minutesFairlyActive) != null ||
              numOrNull(d.minutesVeryActive) != null
                ? (d.minutesFairlyActive ?? 0) + (d.minutesVeryActive ?? 0)
                : null,
            restingHr: numOrNull(d.restingHeartRate),
            caloriesOut: numOrNull(d.caloriesOut ?? d.calories),
            raw: d,
          });
          summary.dailyMetricsUpserted++;
        }
        continue;
      }
    } catch (err) {
      summary.warnings.push(`${filename}: ${err instanceof Error ? err.message : err}`);
    }
  }

  return summary;
}

export async function importGoogleFitTakeout(
  zip: JSZip,
  userId: string,
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    source: "google-fit",
    dailyMetricsUpserted: 0,
    sleepUpserted: 0,
    filesScanned: 0,
    warnings: [],
  };

  for (const path in zip.files) {
    const file = zip.files[path];
    if (file.dir) continue;
    if (!path.includes("Fit/Daily")) continue;
    if (!path.endsWith(".csv")) continue;

    const filename = path.split("/").pop() ?? "";
    const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
    if (!dateMatch) continue;
    const date = dateMatch[1];

    try {
      const text = await file.async("string");
      const summed = sumFitDailyCsv(text);
      summary.filesScanned++;
      await upsertDaily(userId, {
        date,
        steps: summed.steps,
        activeMinutes: summed.heartMinutes,
        restingHr: null,
        caloriesOut: summed.calories,
        raw: { csvHeaders: summed.headers },
      });
      summary.dailyMetricsUpserted++;
    } catch (err) {
      summary.warnings.push(`${filename}: ${err instanceof Error ? err.message : err}`);
    }
  }

  return summary;
}

async function upsertDaily(
  userId: string,
  d: {
    date: string;
    steps: number | null;
    activeMinutes: number | null;
    restingHr: number | null;
    caloriesOut: number | null;
    raw: unknown;
  },
) {
  await db
    .insert(dailyMetrics)
    .values({
      userId,
      date: d.date,
      steps: d.steps,
      activeMinutes: d.activeMinutes,
      restingHr: d.restingHr,
      caloriesOut: d.caloriesOut,
      raw: d.raw as object,
    })
    .onConflictDoUpdate({
      target: [dailyMetrics.userId, dailyMetrics.date],
      set: {
        // coalesce so we don't overwrite existing values with null
        steps: sql`coalesce(${dailyMetrics.steps}, excluded.steps)`,
        activeMinutes: sql`coalesce(${dailyMetrics.activeMinutes}, excluded.active_minutes)`,
        restingHr: sql`coalesce(${dailyMetrics.restingHr}, excluded.resting_hr)`,
        caloriesOut: sql`coalesce(${dailyMetrics.caloriesOut}, excluded.calories_out)`,
      },
    });
}

function sumFitDailyCsv(csv: string): {
  headers: string[];
  steps: number | null;
  calories: number | null;
  heartMinutes: number | null;
} {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { headers: [], steps: null, calories: null, heartMinutes: null };
  }
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine);

  const colIndex = (name: RegExp) => headers.findIndex((h) => name.test(h));
  const stepsIdx = colIndex(/step\s*count/i);
  const calIdx = colIndex(/calories/i);
  const hmIdx = colIndex(/heart\s*minutes/i);

  let steps = 0;
  let cal = 0;
  let hm = 0;
  let sawSteps = false;
  let sawCal = false;
  let sawHm = false;

  for (const r of rows) {
    if (stepsIdx >= 0 && r[stepsIdx]) {
      const v = parseFloat(r[stepsIdx]);
      if (!isNaN(v)) {
        steps += v;
        sawSteps = true;
      }
    }
    if (calIdx >= 0 && r[calIdx]) {
      const v = parseFloat(r[calIdx]);
      if (!isNaN(v)) {
        cal += v;
        sawCal = true;
      }
    }
    if (hmIdx >= 0 && r[hmIdx]) {
      const v = parseFloat(r[hmIdx]);
      if (!isNaN(v)) {
        hm += v;
        sawHm = true;
      }
    }
  }

  return {
    headers,
    steps: sawSteps ? Math.round(steps) : null,
    calories: sawCal ? Math.round(cal) : null,
    heartMinutes: sawHm ? Math.round(hm) : null,
  };
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function safeJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return isNaN(n) ? null : n;
}

type FitbitSleepEntry = {
  dateOfSleep: string;
  startTime: string;
  endTime: string;
  duration: number;
  efficiency?: number;
  mainSleep?: boolean;
  isMainSleep?: boolean;
  levels?: {
    summary?: {
      deep?: { minutes: number };
      rem?: { minutes: number };
      light?: { minutes: number };
      wake?: { minutes: number };
    };
  };
};

type FitbitDailyEntry = {
  dateTime: string;
  steps?: number | string;
  caloriesOut?: number | string;
  calories?: number | string;
  restingHeartRate?: number | string;
  minutesFairlyActive?: number;
  minutesVeryActive?: number;
};

import { db } from "@/db/client";
import {
  clinicalRecords,
  dailyMetrics,
  sleepSessions,
  weightSamples,
  workouts,
} from "@/db/schema";
import { and, desc, eq, gte, lt, sql, isNotNull } from "drizzle-orm";

function notAnomalous() {
  return sql`coalesce((${weightSamples.raw}->>'sensorAnomaly')::boolean, false) = false`;
}

function sportCategory(s: string): "run" | "ride" | "workout" | "soccer" | "other" {
  const t = s.toLowerCase();
  if (t === "run" || t === "trailrun" || t === "virtualrun") return "run";
  if (t === "ride" || t === "virtualride" || t === "ebikeride") return "ride";
  if (t === "soccer" || t.includes("football")) return "soccer";
  if (t === "workout" || t === "yoga" || t === "weighttraining" || t === "strength")
    return "workout";
  return "other";
}

export async function overviewMetrics(userId: string) {
  const [
    activityCount,
    activityRange,
    weightMaxRow,
    weightMinRow,
    latestWeightRow,
    earliestBfRow,
    latestBfRow,
    latestRhrRow,
    hrvAvgRow,
    sleepAggRow,
  ] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(workouts).where(eq(workouts.userId, userId)),
    db
      .select({
        min: sql<string | null>`min(${workouts.startedAt})`,
        max: sql<string | null>`max(${workouts.startedAt})`,
      })
      .from(workouts)
      .where(eq(workouts.userId, userId)),
    db
      .select({ kg: sql<number>`max(${weightSamples.weightKg})` })
      .from(weightSamples)
      .where(and(eq(weightSamples.userId, userId), notAnomalous())),
    db
      .select({ kg: sql<number>`min(${weightSamples.weightKg})` })
      .from(weightSamples)
      .where(and(eq(weightSamples.userId, userId), notAnomalous())),
    db
      .select({
        kg: weightSamples.weightKg,
        measuredAt: weightSamples.measuredAt,
      })
      .from(weightSamples)
      .where(and(eq(weightSamples.userId, userId), notAnomalous()))
      .orderBy(desc(weightSamples.measuredAt))
      .limit(1),
    db
      .select({ bf: weightSamples.bodyFatPct, measuredAt: weightSamples.measuredAt })
      .from(weightSamples)
      .where(and(eq(weightSamples.userId, userId), notAnomalous(), isNotNull(weightSamples.bodyFatPct)))
      .orderBy(weightSamples.measuredAt)
      .limit(1),
    db
      .select({ bf: weightSamples.bodyFatPct, measuredAt: weightSamples.measuredAt })
      .from(weightSamples)
      .where(and(eq(weightSamples.userId, userId), notAnomalous(), isNotNull(weightSamples.bodyFatPct)))
      .orderBy(desc(weightSamples.measuredAt))
      .limit(1),
    db
      .select({ rhr: dailyMetrics.restingHr, date: dailyMetrics.date })
      .from(dailyMetrics)
      .where(and(eq(dailyMetrics.userId, userId), isNotNull(dailyMetrics.restingHr)))
      .orderBy(desc(dailyMetrics.date))
      .limit(1),
    db
      .select({
        avg: sql<number | null>`avg(${clinicalRecords.valueNumeric})`,
        n: sql<number>`count(*)::int`,
      })
      .from(clinicalRecords)
      .where(
        and(
          eq(clinicalRecords.userId, userId),
          eq(clinicalRecords.kind, "HRV_RMSSD"),
        ),
      ),
    db
      .select({
        avgDur: sql<number | null>`avg(${sleepSessions.durationSec})`,
        avgDeep: sql<number | null>`avg(${sleepSessions.deepSec})`,
        avgRem: sql<number | null>`avg(${sleepSessions.remSec})`,
      })
      .from(sleepSessions)
      .where(eq(sleepSessions.userId, userId)),
  ]);

  const LB_PER_KG = 2.2046226218487757;
  const kgToLb = (kg: number) => kg * LB_PER_KG;

  const peakLb = weightMaxRow[0]?.kg ? kgToLb(weightMaxRow[0].kg) : null;
  const lowLb = weightMinRow[0]?.kg ? kgToLb(weightMinRow[0].kg) : null;
  const latestLb = latestWeightRow[0]?.kg ? kgToLb(latestWeightRow[0].kg) : null;
  const weightDropLb = peakLb != null && latestLb != null ? peakLb - latestLb : null;

  const earliestBf = earliestBfRow[0]?.bf ?? null;
  const latestBf = latestBfRow[0]?.bf ?? null;
  const bfDelta = earliestBf != null && latestBf != null ? latestBf - earliestBf : null;

  const avgSleepHours = sleepAggRow[0]?.avgDur ? sleepAggRow[0].avgDur / 3600 : null;
  const deepPct =
    sleepAggRow[0]?.avgDeep && sleepAggRow[0]?.avgDur
      ? sleepAggRow[0].avgDeep / sleepAggRow[0].avgDur
      : null;
  const remPct =
    sleepAggRow[0]?.avgRem && sleepAggRow[0]?.avgDur
      ? sleepAggRow[0].avgRem / sleepAggRow[0].avgDur
      : null;

  return {
    activityCount: activityCount[0]?.n ?? 0,
    activityMin: activityRange[0]?.min ? new Date(activityRange[0].min) : null,
    activityMax: activityRange[0]?.max ? new Date(activityRange[0].max) : null,
    weightDropLb,
    peakLb,
    latestLb,
    earliestBf,
    latestBf,
    bfDelta,
    latestRhr: latestRhrRow[0]?.rhr ?? null,
    latestRhrDate: latestRhrRow[0]?.date ?? null,
    hrvAvg: hrvAvgRow[0]?.avg ?? null,
    hrvN: hrvAvgRow[0]?.n ?? 0,
    avgSleepHours,
    deepPct,
    remPct,
  };
}

export async function yearActivityVolume(userId: string) {
  const rows = await db
    .select({
      year: sql<number>`extract(year from ${workouts.startedAt})::int`,
      sport: workouts.sport,
      n: sql<number>`count(*)::int`,
    })
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .groupBy(sql`extract(year from ${workouts.startedAt})`, workouts.sport)
    .orderBy(sql`extract(year from ${workouts.startedAt})`);

  type YearRow = { year: number; run: number; ride: number; workout: number; soccer: number; other: number; total: number };
  const map = new Map<number, YearRow>();
  for (const r of rows) {
    const cat = sportCategory(r.sport);
    let acc = map.get(r.year);
    if (!acc) {
      acc = { year: r.year, run: 0, ride: 0, workout: 0, soccer: 0, other: 0, total: 0 };
      map.set(r.year, acc);
    }
    acc[cat] += r.n;
    acc.total += r.n;
  }
  return Array.from(map.values()).sort((a, b) => a.year - b.year);
}

export async function yearAvgWeightLb(userId: string) {
  const rows = await db
    .select({
      year: sql<number>`extract(year from ${weightSamples.measuredAt})::int`,
      avgKg: sql<number>`avg(${weightSamples.weightKg})`,
    })
    .from(weightSamples)
    .where(and(eq(weightSamples.userId, userId), notAnomalous()))
    .groupBy(sql`extract(year from ${weightSamples.measuredAt})`)
    .orderBy(sql`extract(year from ${weightSamples.measuredAt})`);
  return rows.map((r) => ({ year: r.year, lb: r.avgKg * 2.2046226218487757 }));
}

export async function monthlySteps(userId: string, sinceYear = 2022) {
  const rows = await db
    .select({
      ym: sql<string>`to_char(${dailyMetrics.date}::date, 'YY-MM')`,
      avgSteps: sql<number>`avg(${dailyMetrics.steps})`,
    })
    .from(dailyMetrics)
    .where(
      and(
        eq(dailyMetrics.userId, userId),
        gte(dailyMetrics.date, `${sinceYear}-01-01`),
        isNotNull(dailyMetrics.steps),
      ),
    )
    .groupBy(sql`to_char(${dailyMetrics.date}::date, 'YY-MM')`)
    .orderBy(sql`to_char(${dailyMetrics.date}::date, 'YY-MM')`);
  return rows.map((r) => ({ ym: r.ym, steps: Math.round(r.avgSteps) }));
}

export async function trainingHeatmapData(userId: string, monthsBack = 30) {
  const since = new Date();
  since.setMonth(since.getMonth() - monthsBack);
  const rows = await db
    .select({
      day: sql<string>`to_char(${workouts.startedAt}::date, 'YYYY-MM-DD')`,
      n: sql<number>`count(*)::int`,
      avgHr: sql<number | null>`avg(${workouts.avgHr})`,
    })
    .from(workouts)
    .where(and(eq(workouts.userId, userId), gte(workouts.startedAt, since)))
    .groupBy(sql`to_char(${workouts.startedAt}::date, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${workouts.startedAt}::date, 'YYYY-MM-DD')`);

  const map = new Map(rows.map((r) => [r.day, r]));
  const out: { date: string; n: number; intensity: number; avgHr: number | null }[] = [];
  const cur = new Date(since);
  cur.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  while (cur <= today) {
    const key = cur.toISOString().slice(0, 10);
    const r = map.get(key);
    const n = r?.n ?? 0;
    const hr = r?.avgHr ?? null;
    const intensity = n * (hr ? hr / 130 : 1);
    out.push({ date: key, n, intensity, avgHr: hr });
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

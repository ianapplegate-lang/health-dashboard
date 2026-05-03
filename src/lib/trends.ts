import { db } from "@/db/client";
import { dailyMetrics, sleepSessions, weightSamples, workouts } from "@/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";

const dayStr = (d: Date) => d.toISOString().slice(0, 10);

function sinceDate(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return dayStr(d);
}

export async function stepsSeries(userId: string, days = 90) {
  const rows = await db
    .select({ date: dailyMetrics.date, steps: dailyMetrics.steps })
    .from(dailyMetrics)
    .where(and(eq(dailyMetrics.userId, userId), gte(dailyMetrics.date, sinceDate(days))))
    .orderBy(dailyMetrics.date);
  return rows.map((r) => ({ date: r.date, value: r.steps ?? null }));
}

export async function sleepSeries(userId: string, days = 90) {
  const rows = await db
    .select({ date: sleepSessions.date, durationSec: sleepSessions.durationSec })
    .from(sleepSessions)
    .where(and(eq(sleepSessions.userId, userId), gte(sleepSessions.date, sinceDate(days))))
    .orderBy(sleepSessions.date);
  return rows.map((r) => ({
    date: r.date,
    value: r.durationSec != null ? +(r.durationSec / 3600).toFixed(2) : null,
  }));
}

export async function restingHrSeries(userId: string, days = 90) {
  const rows = await db
    .select({ date: dailyMetrics.date, rhr: dailyMetrics.restingHr })
    .from(dailyMetrics)
    .where(and(eq(dailyMetrics.userId, userId), gte(dailyMetrics.date, sinceDate(days))))
    .orderBy(dailyMetrics.date);
  return rows.map((r) => ({ date: r.date, value: r.rhr ?? null }));
}

export async function weightSeries(userId: string, days = 365) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const rows = await db
    .select({ measuredAt: weightSamples.measuredAt, weightKg: weightSamples.weightKg })
    .from(weightSamples)
    .where(and(eq(weightSamples.userId, userId), gte(weightSamples.measuredAt, since)))
    .orderBy(weightSamples.measuredAt);
  return rows.map((r) => ({
    date: dayStr(new Date(r.measuredAt)),
    value: +r.weightKg.toFixed(2),
  }));
}

export async function sportBreakdown(userId: string, days = 30) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const rows = await db
    .select({
      sport: workouts.sport,
      count: sql<number>`count(*)::int`,
      durationSec: sql<number>`coalesce(sum(${workouts.durationSec}), 0)::int`,
    })
    .from(workouts)
    .where(and(eq(workouts.userId, userId), gte(workouts.startedAt, since)))
    .groupBy(workouts.sport)
    .orderBy(sql`count(*) desc`);
  return rows.map((r) => ({
    sport: normalizeSport(r.sport),
    count: r.count,
    minutes: Math.round(r.durationSec / 60),
  }));
}

function normalizeSport(s: string): string {
  const m = s.toLowerCase();
  if (m === "ride" || m === "virtualride" || m === "ebikeride") return "Cycling";
  if (m === "run" || m === "trailrun" || m === "virtualrun") return "Running";
  if (m === "soccer") return "Soccer";
  if (m === "yoga" || m === "workout") return "Yoga / Workout";
  if (m === "hike") return "Hike";
  if (m === "snowboard") return "Snowboard";
  if (m === "walk") return "Walk";
  if (m === "weighttraining" || m === "strength") return "Strength";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

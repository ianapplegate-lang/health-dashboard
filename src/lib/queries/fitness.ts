import { db } from "@/db/client";
import { workouts } from "@/db/schema";
import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";

function runCategory(s: string): boolean {
  const t = s.toLowerCase();
  return t === "run" || t === "trailrun" || t === "virtualrun";
}
function rideCategory(s: string): boolean {
  const t = s.toLowerCase();
  return t === "ride" || t === "virtualride" || t === "ebikeride";
}
function workoutCategory(s: string): boolean {
  const t = s.toLowerCase();
  return t === "workout" || t === "yoga" || t === "weighttraining" || t === "strength";
}
function soccerCategory(s: string): boolean {
  const t = s.toLowerCase();
  return t === "soccer" || t.includes("football");
}

export async function fitnessOverview(userId: string) {
  const [longestRun, ranges] = await Promise.all([
    db
      .select({
        id: workouts.id,
        name: workouts.name,
        sport: workouts.sport,
        startedAt: workouts.startedAt,
        distanceM: workouts.distanceM,
        durationSec: workouts.durationSec,
      })
      .from(workouts)
      .where(
        and(
          eq(workouts.userId, userId),
          sql`lower(${workouts.sport}) in ('run','trailrun','virtualrun')`,
          isNotNull(workouts.distanceM),
        ),
      )
      .orderBy(desc(workouts.distanceM))
      .limit(1),
    db
      .select({
        year: sql<number>`extract(year from ${workouts.startedAt})::int`,
        sport: workouts.sport,
        n: sql<number>`count(*)::int`,
        totalM: sql<number>`coalesce(sum(${workouts.distanceM}), 0)`,
      })
      .from(workouts)
      .where(eq(workouts.userId, userId))
      .groupBy(sql`extract(year from ${workouts.startedAt})`, workouts.sport),
  ]);

  type YearAgg = { year: number; sessions: number; runKm: number; rideKm: number };
  const yearMap = new Map<number, YearAgg>();
  for (const r of ranges) {
    let agg = yearMap.get(r.year);
    if (!agg) {
      agg = { year: r.year, sessions: 0, runKm: 0, rideKm: 0 };
      yearMap.set(r.year, agg);
    }
    agg.sessions += r.n;
    if (runCategory(r.sport)) agg.runKm += Number(r.totalM) / 1000;
    if (rideCategory(r.sport)) agg.rideKm += Number(r.totalM) / 1000;
  }

  let peakRun = { year: 0, km: 0 };
  let peakRide = { year: 0, km: 0 };
  let peakSessions = { year: 0, n: 0 };
  for (const v of yearMap.values()) {
    if (v.runKm > peakRun.km) peakRun = { year: v.year, km: v.runKm };
    if (v.rideKm > peakRide.km) peakRide = { year: v.year, km: v.rideKm };
    if (v.sessions > peakSessions.n)
      peakSessions = { year: v.year, n: v.sessions };
  }

  return {
    longestRun: longestRun[0] ?? null,
    peakRun,
    peakRide,
    peakSessions,
  };
}

export async function runRideByYear(userId: string) {
  const rows = await db
    .select({
      year: sql<number>`extract(year from ${workouts.startedAt})::int`,
      sport: workouts.sport,
      totalM: sql<number>`coalesce(sum(${workouts.distanceM}), 0)`,
    })
    .from(workouts)
    .where(and(eq(workouts.userId, userId), isNotNull(workouts.distanceM)))
    .groupBy(sql`extract(year from ${workouts.startedAt})`, workouts.sport)
    .orderBy(sql`extract(year from ${workouts.startedAt})`);

  type R = { year: number; runKm: number; rideKm: number };
  const m = new Map<number, R>();
  for (const r of rows) {
    let v = m.get(r.year);
    if (!v) {
      v = { year: r.year, runKm: 0, rideKm: 0 };
      m.set(r.year, v);
    }
    if (runCategory(r.sport)) v.runKm += Number(r.totalM) / 1000;
    if (rideCategory(r.sport)) v.rideKm += Number(r.totalM) / 1000;
  }
  return Array.from(m.values()).sort((a, b) => a.year - b.year);
}

export type MonthlyRow = {
  ym: string;
  run: number;
  ride: number;
  workout: number;
  soccer: number;
  other: number;
};

export async function monthlySessionsByType(userId: string, sinceYear = 2024): Promise<MonthlyRow[]> {
  const since = new Date(`${sinceYear}-01-01`);
  const rows = await db
    .select({
      ym: sql<string>`to_char(${workouts.startedAt}::date, 'YYYY-MM')`,
      sport: workouts.sport,
      n: sql<number>`count(*)::int`,
    })
    .from(workouts)
    .where(and(eq(workouts.userId, userId), gte(workouts.startedAt, since)))
    .groupBy(sql`to_char(${workouts.startedAt}::date, 'YYYY-MM')`, workouts.sport)
    .orderBy(sql`to_char(${workouts.startedAt}::date, 'YYYY-MM')`);

  const m = new Map<string, MonthlyRow>();
  for (const r of rows) {
    let v = m.get(r.ym);
    if (!v) {
      v = { ym: r.ym, run: 0, ride: 0, workout: 0, soccer: 0, other: 0 };
      m.set(r.ym, v);
    }
    if (runCategory(r.sport)) v.run += r.n;
    else if (rideCategory(r.sport)) v.ride += r.n;
    else if (workoutCategory(r.sport)) v.workout += r.n;
    else if (soccerCategory(r.sport)) v.soccer += r.n;
    else v.other += r.n;
  }
  return Array.from(m.values()).sort((a, b) => a.ym.localeCompare(b.ym));
}

export async function topRunsByDistance(userId: string, limit = 10) {
  const rows = await db
    .select({
      id: workouts.id,
      name: workouts.name,
      startedAt: workouts.startedAt,
      distanceM: workouts.distanceM,
      durationSec: workouts.durationSec,
      avgHr: workouts.avgHr,
      calories: workouts.calories,
    })
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, userId),
        sql`lower(${workouts.sport}) in ('run','trailrun','virtualrun')`,
        isNotNull(workouts.distanceM),
      ),
    )
    .orderBy(desc(workouts.distanceM))
    .limit(limit);
  return rows;
}

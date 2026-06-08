import { db } from "@/db/client";
import { sleepSessions, clinicalRecords, dailyMetrics, weightSamples, workouts } from "@/db/schema";
import { and, asc, desc, eq, gte, isNotNull, sql, lt } from "drizzle-orm";

const LB_PER_KG = 2.2046226218487757;

// ── Body insights ──────────────────────────────────────────────────────────

export async function bodyInsights(userId: string) {
  const rows = await db
    .select({
      measuredAt: weightSamples.measuredAt,
      weightKg: weightSamples.weightKg,
    })
    .from(weightSamples)
    .where(eq(weightSamples.userId, userId))
    .orderBy(asc(weightSamples.measuredAt));

  if (rows.length === 0) {
    return { weeksAtCurrent: null, peakLossLbPerWeek: null, daysSincePeak: null };
  }

  const lbs = rows.map((r) => ({
    date: new Date(r.measuredAt),
    lb: r.weightKg * LB_PER_KG,
  }));

  const latestLb = lbs[lbs.length - 1].lb;
  const latestDate = lbs[lbs.length - 1].date;

  // Weeks at current range: how far back is the last reading within ±2 lb of latest?
  let weeksAtCurrent: number | null = null;
  for (let i = lbs.length - 1; i >= 0; i--) {
    if (Math.abs(lbs[i].lb - latestLb) <= 2) {
      weeksAtCurrent = Math.round(
        (latestDate.getTime() - lbs[i].date.getTime()) / (1000 * 60 * 60 * 24 * 7),
      );
    } else {
      break;
    }
  }

  // Peak 4-week loss rate (lb/week)
  let peakLossLbPerWeek = 0;
  for (let i = 0; i < lbs.length; i++) {
    for (let j = i + 1; j < lbs.length; j++) {
      const days = (lbs[j].date.getTime() - lbs[i].date.getTime()) / (1000 * 60 * 60 * 24);
      if (days < 21 || days > 35) continue;
      const drop = lbs[i].lb - lbs[j].lb;
      const perWeek = (drop / days) * 7;
      if (perWeek > peakLossLbPerWeek) peakLossLbPerWeek = perWeek;
    }
  }

  // Days since peak weight
  const peakIdx = lbs.reduce((maxI, p, i) => (p.lb > lbs[maxI].lb ? i : maxI), 0);
  const daysSincePeak = Math.round(
    (latestDate.getTime() - lbs[peakIdx].date.getTime()) / (1000 * 60 * 60 * 24),
  );

  return {
    weeksAtCurrent,
    peakLossLbPerWeek: peakLossLbPerWeek > 0 ? peakLossLbPerWeek : null,
    daysSincePeak,
  };
}

// ── Sleep insights ──────────────────────────────────────────────────────────

export async function sleepInsights(userId: string) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 30);
  const sinceStr = since.toISOString().slice(0, 10);

  const allNights = await db
    .select({
      date: sleepSessions.date,
      durationSec: sleepSessions.durationSec,
      deepSec: sleepSessions.deepSec,
      remSec: sleepSessions.remSec,
    })
    .from(sleepSessions)
    .where(eq(sleepSessions.userId, userId))
    .orderBy(asc(sleepSessions.date));

  if (allNights.length === 0) {
    return {
      bestNight: null,
      worstNight: null,
      avg7d: null,
      avg30d: null,
      shortNightsLast30: null,
      byDow: [],
      satAfterFridayFootball: null,
    };
  }

  type Night = {
    date: string;
    hours: number;
    quality: number | null;
  };
  const nights: Night[] = allNights.map((n) => ({
    date: n.date,
    hours: (n.durationSec ?? 0) / 3600,
    quality:
      (n.deepSec ?? 0) + (n.remSec ?? 0) > 0 && n.durationSec
        ? ((n.deepSec ?? 0) + (n.remSec ?? 0)) / n.durationSec
        : null,
  }));

  const last30 = nights.filter((n) => n.date >= sinceStr);

  // Best night last 30 days (highest hours × quality)
  const bestNight = last30.length
    ? last30.reduce((best, n) => {
        const score = n.hours * (n.quality ?? 0.5);
        const bestScore = best.hours * (best.quality ?? 0.5);
        return score > bestScore ? n : best;
      })
    : null;

  // Worst night last 30 days (lowest hours)
  const worstNight = last30.length
    ? last30.reduce((w, n) => (n.hours < w.hours ? n : w))
    : null;

  // Recent 7-day vs 30-day avg
  const last7 = nights.slice(-7);
  const avg7d = last7.length
    ? last7.reduce((a, n) => a + n.hours, 0) / last7.length
    : null;
  const avg30d = last30.length
    ? last30.reduce((a, n) => a + n.hours, 0) / last30.length
    : null;

  const shortNightsLast30 = last30.filter((n) => n.hours < 6).length;

  // By day of week
  const dowSums = Array.from({ length: 7 }, () => ({ total: 0, count: 0 }));
  for (const n of nights) {
    // Sleep "date" represents wake-up date. Use that day's day-of-week.
    const d = new Date(n.date + "T12:00:00Z");
    const dow = d.getUTCDay();
    dowSums[dow].total += n.hours;
    dowSums[dow].count += 1;
  }
  const dowLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const byDow = dowSums.map((s, i) => ({
    day: dowLabels[i],
    avgHours: s.count > 0 ? s.total / s.count : null,
    count: s.count,
  }));

  // Saturday sleep after Friday football: compare to overall Sat avg
  const fridayFootballDates = await db
    .select({ startedAt: workouts.startedAt })
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, userId),
        sql`lower(${workouts.sport}) in ('soccer','football')`,
        sql`extract(dow from ${workouts.startedAt}) = 5`, // Friday
      ),
    );

  const fridayFootballSet = new Set(
    fridayFootballDates.map((r) => {
      const d = new Date(r.startedAt);
      d.setUTCDate(d.getUTCDate() + 1); // next day = Saturday
      return d.toISOString().slice(0, 10);
    }),
  );

  const satAvg =
    byDow[6].avgHours ?? null;
  const satAfterFootball = nights.filter((n) => fridayFootballSet.has(n.date));
  const satAfterFootballAvg =
    satAfterFootball.length > 0
      ? satAfterFootball.reduce((a, n) => a + n.hours, 0) / satAfterFootball.length
      : null;

  return {
    bestNight,
    worstNight,
    avg7d,
    avg30d,
    shortNightsLast30,
    byDow,
    satAfterFridayFootball:
      satAvg != null && satAfterFootballAvg != null
        ? { satAvg, satAfterFootballAvg, n: satAfterFootball.length }
        : null,
  };
}

// ── HRV insights ───────────────────────────────────────────────────────────

export async function hrvInsights(userId: string) {
  const rows = await db
    .select({
      date: sql<string>`to_char(${clinicalRecords.recordedAt}::date, 'YYYY-MM-DD')`,
      rmssd: clinicalRecords.valueNumeric,
    })
    .from(clinicalRecords)
    .where(
      and(
        eq(clinicalRecords.userId, userId),
        eq(clinicalRecords.kind, "HRV_RMSSD"),
        isNotNull(clinicalRecords.valueNumeric),
      ),
    )
    .orderBy(asc(clinicalRecords.recordedAt));

  if (rows.length === 0) {
    return { avg7d: null, avg30d: null, baseline: null, hrvBySleepBucket: null };
  }

  const values = rows.map((r) => ({ date: r.date, v: Number(r.rmssd) }));
  const last7 = values.slice(-7);
  const last30 = values.slice(-30);
  const baseline = values.slice(0, Math.min(30, values.length)); // earliest 30 readings

  const mean = (arr: { v: number }[]) =>
    arr.length ? arr.reduce((a, b) => a + b.v, 0) / arr.length : null;

  // Correlate HRV with same-night sleep duration
  const sleepRows = await db
    .select({
      date: sleepSessions.date,
      durationSec: sleepSessions.durationSec,
    })
    .from(sleepSessions)
    .where(eq(sleepSessions.userId, userId));
  const sleepByDate = new Map(sleepRows.map((s) => [s.date, (s.durationSec ?? 0) / 3600]));

  const buckets: Record<"good" | "ok" | "short", number[]> = {
    good: [],
    ok: [],
    short: [],
  };
  for (const { date, v } of values) {
    const hours = sleepByDate.get(date);
    if (hours == null) continue;
    if (hours >= 7) buckets.good.push(v);
    else if (hours >= 6) buckets.ok.push(v);
    else buckets.short.push(v);
  }
  const bucketAvg = (a: number[]) =>
    a.length > 0 ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const hrvBySleepBucket = {
    good: { avg: bucketAvg(buckets.good), n: buckets.good.length },
    ok: { avg: bucketAvg(buckets.ok), n: buckets.ok.length },
    short: { avg: bucketAvg(buckets.short), n: buckets.short.length },
  };

  return {
    avg7d: mean(last7),
    avg30d: mean(last30),
    baseline: mean(baseline),
    hrvBySleepBucket,
  };
}

// ── Clinical insights ──────────────────────────────────────────────────────

export async function clinicalInsights(userId: string) {
  const altRows = await db
    .select()
    .from(clinicalRecords)
    .where(and(eq(clinicalRecords.userId, userId), eq(clinicalRecords.kind, "ALT")))
    .orderBy(desc(clinicalRecords.recordedAt))
    .limit(5);

  if (altRows.length === 0) {
    return { daysSinceLastAlt: null, latestAlt: null, ulnPct: null, trajectory: null };
  }

  const latest = altRows[0];
  const daysSinceLastAlt = Math.round(
    (new Date().getTime() - new Date(latest.recordedAt).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const uln = latest.referenceHigh ?? 50;
  const ulnPct = latest.valueNumeric ? (latest.valueNumeric / uln) * 100 : null;

  // Trajectory: slope of last 3 readings (positive = rising, negative = falling)
  let trajectory: "rising" | "falling" | "stable" | null = null;
  if (altRows.length >= 3) {
    const last3 = altRows.slice(0, 3).reverse(); // oldest first
    const v0 = last3[0].valueNumeric;
    const v2 = last3[2].valueNumeric;
    if (v0 != null && v2 != null) {
      const delta = v2 - v0;
      if (Math.abs(delta) < 5) trajectory = "stable";
      else if (delta > 0) trajectory = "rising";
      else trajectory = "falling";
    }
  }

  return {
    daysSinceLastAlt,
    latestAlt: latest.valueNumeric,
    ulnPct,
    trajectory,
  };
}

// ── Overview insights ──────────────────────────────────────────────────────

export async function overviewInsights(userId: string) {
  // Workout streak (consecutive days with any workout)
  const recent = await db
    .select({
      day: sql<string>`to_char(${workouts.startedAt}::date, 'YYYY-MM-DD')`,
    })
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .groupBy(sql`to_char(${workouts.startedAt}::date, 'YYYY-MM-DD')`)
    .orderBy(desc(sql`to_char(${workouts.startedAt}::date, 'YYYY-MM-DD')`))
    .limit(60);

  const daysWithWorkout = new Set(recent.map((r) => r.day));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (daysWithWorkout.has(key)) streak++;
    else if (i === 0) {
      // skip today if no workout today
      continue;
    } else {
      break;
    }
  }

  // This week vs last week — workout count + total active minutes
  const startOfWeek = (ref: Date) => {
    const r = new Date(ref);
    r.setUTCHours(0, 0, 0, 0);
    const d = r.getUTCDay();
    const diff = d === 0 ? -6 : 1 - d;
    r.setUTCDate(r.getUTCDate() + diff);
    return r;
  };
  const thisStart = startOfWeek(today);
  const lastStart = new Date(thisStart);
  lastStart.setUTCDate(lastStart.getUTCDate() - 7);
  const thisEnd = new Date(thisStart);
  thisEnd.setUTCDate(thisEnd.getUTCDate() + 7);

  const [thisWeek, lastWeek] = await Promise.all([
    db
      .select({
        n: sql<number>`count(*)::int`,
        durationSec: sql<number>`coalesce(sum(${workouts.durationSec}), 0)::int`,
      })
      .from(workouts)
      .where(
        and(
          eq(workouts.userId, userId),
          gte(workouts.startedAt, thisStart),
          lt(workouts.startedAt, thisEnd),
        ),
      ),
    db
      .select({
        n: sql<number>`count(*)::int`,
        durationSec: sql<number>`coalesce(sum(${workouts.durationSec}), 0)::int`,
      })
      .from(workouts)
      .where(
        and(
          eq(workouts.userId, userId),
          gte(workouts.startedAt, lastStart),
          lt(workouts.startedAt, thisStart),
        ),
      ),
  ]);

  return {
    workoutStreak: streak,
    thisWeekWorkouts: thisWeek[0]?.n ?? 0,
    lastWeekWorkouts: lastWeek[0]?.n ?? 0,
    thisWeekMinutes: Math.round((thisWeek[0]?.durationSec ?? 0) / 60),
    lastWeekMinutes: Math.round((lastWeek[0]?.durationSec ?? 0) / 60),
  };
}

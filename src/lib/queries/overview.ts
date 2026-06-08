import { db } from "@/db/client";
import {
  workouts,
  dailyMetrics,
  sleepSessions,
  weightSamples,
  clinicalRecords,
  trainingSessions,
  oauthTokens,
} from "@/db/schema";
import { and, desc, eq, gte, lt, sql, isNotNull } from "drizzle-orm";
import { fetchWeekCalendarEvents, isHealthRelevant, eventEmoji } from "@/lib/queries/calendar";

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function startOfWeek(d: Date): Date {
  const r = startOfDay(d);
  const dow = r.getDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow; // make Monday start
  r.setDate(r.getDate() + diff);
  return r;
}

function endOfWeek(d: Date): Date {
  const r = startOfWeek(d);
  r.setDate(r.getDate() + 7);
  return r;
}

export async function latestWeight(userId: string) {
  const rows = await db
    .select()
    .from(weightSamples)
    .where(
      and(
        eq(weightSamples.userId, userId),
        sql`coalesce((${weightSamples.raw}->>'sensorAnomaly')::boolean, false) = false`,
      ),
    )
    .orderBy(desc(weightSamples.measuredAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function latestSleep(userId: string) {
  const rows = await db
    .select()
    .from(sleepSessions)
    .where(eq(sleepSessions.userId, userId))
    .orderBy(desc(sleepSessions.startedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function recentStepsAvg(userId: string, days = 14) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);
  const rows = await db
    .select({ steps: dailyMetrics.steps })
    .from(dailyMetrics)
    .where(
      and(
        eq(dailyMetrics.userId, userId),
        gte(dailyMetrics.date, sinceStr),
        isNotNull(dailyMetrics.steps),
      ),
    );
  if (rows.length === 0) return null;
  const sum = rows.reduce((a, r) => a + (r.steps ?? 0), 0);
  return Math.round(sum / rows.length);
}

export async function latestRhr(userId: string) {
  const rows = await db
    .select({ date: dailyMetrics.date, rhr: dailyMetrics.restingHr })
    .from(dailyMetrics)
    .where(and(eq(dailyMetrics.userId, userId), isNotNull(dailyMetrics.restingHr)))
    .orderBy(desc(dailyMetrics.date))
    .limit(1);
  return rows[0] ?? null;
}

export async function abnormalLabsCount(userId: string) {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(clinicalRecords)
    .where(
      and(
        eq(clinicalRecords.userId, userId),
        isNotNull(clinicalRecords.abnormalFlag),
      ),
    );
  return rows[0]?.count ?? 0;
}

export async function latestAbnormalLab(userId: string) {
  const rows = await db
    .select()
    .from(clinicalRecords)
    .where(
      and(
        eq(clinicalRecords.userId, userId),
        isNotNull(clinicalRecords.abnormalFlag),
      ),
    )
    .orderBy(desc(clinicalRecords.recordedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function weightSeriesNoAnomalies(userId: string, days = 90) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const rows = await db
    .select({
      measuredAt: weightSamples.measuredAt,
      weightKg: weightSamples.weightKg,
    })
    .from(weightSamples)
    .where(
      and(
        eq(weightSamples.userId, userId),
        gte(weightSamples.measuredAt, since),
        sql`coalesce((${weightSamples.raw}->>'sensorAnomaly')::boolean, false) = false`,
      ),
    )
    .orderBy(weightSamples.measuredAt);
  return rows.map((r) => ({
    date: new Date(r.measuredAt).toISOString().slice(0, 10),
    value: +r.weightKg.toFixed(2),
  }));
}

export async function recentWorkoutsLite(userId: string, limit = 8) {
  return db
    .select({
      id: workouts.id,
      sport: workouts.sport,
      startedAt: workouts.startedAt,
      durationSec: workouts.durationSec,
      distanceM: workouts.distanceM,
      avgHr: workouts.avgHr,
      name: workouts.name,
      provider: workouts.provider,
    })
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.startedAt))
    .limit(limit);
}

export async function nextTrainingSession(userId: string) {
  const rows = await db
    .select()
    .from(trainingSessions)
    .where(
      and(
        eq(trainingSessions.userId, userId),
        gte(trainingSessions.plannedFor, new Date()),
      ),
    )
    .orderBy(trainingSessions.plannedFor)
    .limit(1);
  return rows[0] ?? null;
}

export async function latestSleepDetail(userId: string) {
  const rows = await db
    .select()
    .from(sleepSessions)
    .where(eq(sleepSessions.userId, userId))
    .orderBy(desc(sleepSessions.startedAt))
    .limit(1);
  return rows[0] ?? null;
}

export type WeekItem = {
  source: "workout" | "training-planned" | "training-completed" | "calendar";
  startedAt: Date;
  label: string;
  detail?: string;
  emoji: string;
  sport?: string;
};

export async function weekActivity(userId: string, ref = new Date()): Promise<{
  weekStart: Date;
  weekEnd: Date;
  items: WeekItem[];
  calendarConnected: boolean;
}> {
  const weekStart = startOfWeek(ref);
  const weekEnd = endOfWeek(ref);

  const [ws, ts, cal, calToken] = await Promise.all([
    db
      .select()
      .from(workouts)
      .where(
        and(
          eq(workouts.userId, userId),
          gte(workouts.startedAt, weekStart),
          lt(workouts.startedAt, weekEnd),
        ),
      )
      .orderBy(workouts.startedAt),
    db
      .select()
      .from(trainingSessions)
      .where(
        and(
          eq(trainingSessions.userId, userId),
          gte(trainingSessions.plannedFor, weekStart),
          lt(trainingSessions.plannedFor, weekEnd),
        ),
      )
      .orderBy(trainingSessions.plannedFor),
    fetchWeekCalendarEvents(userId, weekStart, weekEnd),
    db
      .select({ id: oauthTokens.id })
      .from(oauthTokens)
      .where(and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, "google-calendar")))
      .limit(1),
  ]);

  const items: WeekItem[] = [];

  for (const w of ws) {
    items.push({
      source: "workout",
      startedAt: w.startedAt,
      label: w.name ?? sportLabel(w.sport),
      detail: workoutDetail(w.durationSec, w.distanceM),
      emoji: sportEmoji(w.sport),
      sport: w.sport,
    });
  }

  for (const t of ts) {
    const completed = t.completedAt != null;
    items.push({
      source: completed ? "training-completed" : "training-planned",
      startedAt: t.plannedFor,
      label: t.title ?? `Home training ${t.sessionType}`,
      detail: `${(t.movements ?? []).length} movements`,
      emoji: "💪",
    });
  }

  for (const e of cal) {
    if (!isHealthRelevant(e)) continue;
    items.push({
      source: "calendar",
      startedAt: e.start,
      label: e.summary,
      detail: e.location,
      emoji: eventEmoji(e.summary),
    });
  }

  items.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  return { weekStart, weekEnd, items, calendarConnected: calToken.length > 0 };
}

function sportEmoji(sport: string): string {
  const s = sport.toLowerCase();
  if (s === "soccer" || s.includes("football")) return "⚽";
  if (s === "ride" || s === "virtualride" || s === "ebikeride") return "🚴";
  if (s === "run" || s === "trailrun") return "🏃";
  if (s === "hike") return "🥾";
  if (s === "yoga" || s === "workout") return "🧘";
  if (s === "snowboard") return "🏂";
  if (s === "walk") return "🚶";
  if (s === "weighttraining" || s === "strength") return "💪";
  return "🏅";
}

function sportLabel(sport: string): string {
  if (sport.toLowerCase() === "ride") return "Ride";
  if (sport.toLowerCase() === "soccer") return "Football";
  return sport;
}

function workoutDetail(durationSec: number | null, distanceM: number | null): string {
  const parts: string[] = [];
  if (durationSec) {
    const h = Math.floor(durationSec / 3600);
    const m = Math.floor((durationSec % 3600) / 60);
    parts.push(h ? `${h}h ${m}m` : `${m}m`);
  }
  if (distanceM && distanceM > 0) {
    parts.push(`${(distanceM / 1000).toFixed(1)} km`);
  }
  return parts.join(" · ");
}

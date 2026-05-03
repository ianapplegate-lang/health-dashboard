import { db } from "@/db/client";
import {
  workouts,
  dailyMetrics,
  sleepSessions,
  weightSamples,
  oauthTokens,
  type Provider,
} from "@/db/schema";
import { and, desc, eq, gte } from "drizzle-orm";

export async function recentWorkouts(userId: string, limit = 10) {
  return db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.startedAt))
    .limit(limit);
}

export async function dailyMetricsLast(userId: string, days = 14) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);
  return db
    .select()
    .from(dailyMetrics)
    .where(and(eq(dailyMetrics.userId, userId), gte(dailyMetrics.date, sinceStr)))
    .orderBy(desc(dailyMetrics.date));
}

export async function recentSleep(userId: string, days = 14) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);
  return db
    .select()
    .from(sleepSessions)
    .where(and(eq(sleepSessions.userId, userId), gte(sleepSessions.date, sinceStr)))
    .orderBy(desc(sleepSessions.date));
}

export async function recentWeights(userId: string, limit = 30) {
  return db
    .select()
    .from(weightSamples)
    .where(eq(weightSamples.userId, userId))
    .orderBy(desc(weightSamples.measuredAt))
    .limit(limit);
}

export async function connectedProviders(userId: string): Promise<Provider[]> {
  const rows = await db
    .select({ provider: oauthTokens.provider })
    .from(oauthTokens)
    .where(eq(oauthTokens.userId, userId));
  return rows.map((r) => r.provider);
}

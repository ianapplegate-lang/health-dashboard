import { db } from "@/db/client";
import { trainingSessions, type TrainingMovement } from "@/db/schema";
import { and, asc, desc, eq, gte, isNotNull, sql } from "drizzle-orm";

export async function allTrainingSessions(userId: string) {
  return db
    .select()
    .from(trainingSessions)
    .where(eq(trainingSessions.userId, userId))
    .orderBy(asc(trainingSessions.plannedFor));
}

export async function upcomingTrainingSessions(userId: string, limit = 20) {
  return db
    .select()
    .from(trainingSessions)
    .where(
      and(
        eq(trainingSessions.userId, userId),
        gte(trainingSessions.plannedFor, new Date()),
      ),
    )
    .orderBy(asc(trainingSessions.plannedFor))
    .limit(limit);
}

export async function recentCompletedTraining(userId: string, limit = 5) {
  return db
    .select()
    .from(trainingSessions)
    .where(
      and(
        eq(trainingSessions.userId, userId),
        isNotNull(trainingSessions.completedAt),
      ),
    )
    .orderBy(desc(trainingSessions.completedAt))
    .limit(limit);
}

export type SessionTemplate = {
  sessionType: string;
  title: string;
  exampleMovements: TrainingMovement[];
  dates: Date[];
};

export async function sessionTemplates(userId: string): Promise<SessionTemplate[]> {
  const rows = await db
    .select()
    .from(trainingSessions)
    .where(eq(trainingSessions.userId, userId))
    .orderBy(asc(trainingSessions.plannedFor));

  const m = new Map<string, SessionTemplate>();
  for (const r of rows) {
    let t = m.get(r.sessionType);
    if (!t) {
      t = {
        sessionType: r.sessionType,
        title: r.title ?? `Session ${r.sessionType}`,
        exampleMovements: (r.movements ?? []) as TrainingMovement[],
        dates: [],
      };
      m.set(r.sessionType, t);
    }
    t.dates.push(r.plannedFor);
  }
  return Array.from(m.values());
}

export async function trainingOverview(userId: string) {
  const [counts, range, completed] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(trainingSessions)
      .where(eq(trainingSessions.userId, userId)),
    db
      .select({
        min: sql<string | null>`min(${trainingSessions.plannedFor})`,
        max: sql<string | null>`max(${trainingSessions.plannedFor})`,
      })
      .from(trainingSessions)
      .where(eq(trainingSessions.userId, userId)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(trainingSessions)
      .where(
        and(
          eq(trainingSessions.userId, userId),
          isNotNull(trainingSessions.completedAt),
        ),
      ),
  ]);
  return {
    total: counts[0]?.n ?? 0,
    completed: completed[0]?.n ?? 0,
    earliest: range[0]?.min ? new Date(range[0].min) : null,
    latest: range[0]?.max ? new Date(range[0].max) : null,
  };
}

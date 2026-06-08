import { db } from "@/db/client";
import { sleepSessions } from "@/db/schema";
import { and, asc, eq, gte, sql, isNotNull } from "drizzle-orm";

export async function sleepOverview(userId: string) {
  const [counts, avgs] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(sleepSessions)
      .where(eq(sleepSessions.userId, userId)),
    db
      .select({
        avgDur: sql<number | null>`avg(${sleepSessions.durationSec})`,
        avgDeep: sql<number | null>`avg(${sleepSessions.deepSec})`,
        avgRem: sql<number | null>`avg(${sleepSessions.remSec})`,
        avgLight: sql<number | null>`avg(${sleepSessions.lightSec})`,
        avgAwake: sql<number | null>`avg(${sleepSessions.awakeSec})`,
        avgEff: sql<number | null>`avg(${sleepSessions.efficiency})`,
      })
      .from(sleepSessions)
      .where(eq(sleepSessions.userId, userId)),
  ]);

  const tot = avgs[0];
  const totalSec = tot?.avgDur ?? null;
  return {
    nights: counts[0]?.n ?? 0,
    avgDurationHours: totalSec != null ? totalSec / 3600 : null,
    deepPct: tot?.avgDeep && totalSec ? tot.avgDeep / totalSec : null,
    remPct: tot?.avgRem && totalSec ? tot.avgRem / totalSec : null,
    lightPct: tot?.avgLight && totalSec ? tot.avgLight / totalSec : null,
    awakePct: tot?.avgAwake && totalSec ? tot.avgAwake / totalSec : null,
    avgEfficiency: tot?.avgEff ?? null,
  };
}

export type SleepNight = {
  date: string;
  hours: number;
  deepSec: number | null;
  remSec: number | null;
  lightSec: number | null;
  awakeSec: number | null;
  qualityPct: number | null; // deep+REM as fraction of total
};

export async function nightlySleepSeries(userId: string): Promise<SleepNight[]> {
  const rows = await db
    .select({
      date: sleepSessions.date,
      durationSec: sleepSessions.durationSec,
      deepSec: sleepSessions.deepSec,
      remSec: sleepSessions.remSec,
      lightSec: sleepSessions.lightSec,
      awakeSec: sleepSessions.awakeSec,
    })
    .from(sleepSessions)
    .where(eq(sleepSessions.userId, userId))
    .orderBy(asc(sleepSessions.date));
  return rows.map((r) => {
    const dr = r.durationSec ?? 0;
    const qp =
      dr > 0 && (r.deepSec != null || r.remSec != null)
        ? ((r.deepSec ?? 0) + (r.remSec ?? 0)) / dr
        : null;
    return {
      date: r.date,
      hours: dr / 3600,
      deepSec: r.deepSec,
      remSec: r.remSec,
      lightSec: r.lightSec,
      awakeSec: r.awakeSec,
      qualityPct: qp,
    };
  });
}

import { db } from "@/db/client";
import { clinicalRecords, dailyMetrics, sleepSessions, workouts } from "@/db/schema";
import { and, asc, desc, eq, isNotNull, sql, gte } from "drizzle-orm";

export type NightlyHrv = { date: string; rmssd: number };
export type MonthlyPoint = { ym: string; v: number };
export type HrTrendPoint = { ym: string; avgHr: number };

export async function nightlyHrv(userId: string): Promise<NightlyHrv[]> {
  const rows = await db
    .select({
      date: sql<string>`to_char(${clinicalRecords.recordedAt}::date, 'YYYY-MM-DD')`,
      v: clinicalRecords.valueNumeric,
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
  return rows
    .filter((r) => r.v != null)
    .map((r) => ({ date: r.date, rmssd: r.v as number }));
}

export async function hrvMonthly(userId: string): Promise<MonthlyPoint[]> {
  const rows = await db
    .select({
      ym: sql<string>`to_char(${clinicalRecords.recordedAt}::date, 'YYYY-MM')`,
      avg: sql<number>`avg(${clinicalRecords.valueNumeric})`,
    })
    .from(clinicalRecords)
    .where(
      and(
        eq(clinicalRecords.userId, userId),
        eq(clinicalRecords.kind, "HRV_RMSSD"),
        isNotNull(clinicalRecords.valueNumeric),
      ),
    )
    .groupBy(sql`to_char(${clinicalRecords.recordedAt}::date, 'YYYY-MM')`)
    .orderBy(sql`to_char(${clinicalRecords.recordedAt}::date, 'YYYY-MM')`);
  return rows.map((r) => ({ ym: r.ym, v: r.avg }));
}

export async function rhrMonthly(userId: string): Promise<MonthlyPoint[]> {
  const rows = await db
    .select({
      ym: sql<string>`to_char(${dailyMetrics.date}::date, 'YYYY-MM')`,
      avg: sql<number>`avg(${dailyMetrics.restingHr})`,
    })
    .from(dailyMetrics)
    .where(
      and(eq(dailyMetrics.userId, userId), isNotNull(dailyMetrics.restingHr)),
    )
    .groupBy(sql`to_char(${dailyMetrics.date}::date, 'YYYY-MM')`)
    .orderBy(sql`to_char(${dailyMetrics.date}::date, 'YYYY-MM')`);
  return rows.map((r) => ({ ym: r.ym, v: r.avg }));
}

export async function exerciseHrMonthly(userId: string, sinceYear = 2022): Promise<HrTrendPoint[]> {
  const since = new Date(`${sinceYear}-01-01`);
  const rows = await db
    .select({
      ym: sql<string>`to_char(${workouts.startedAt}::date, 'YYYY-MM')`,
      avg: sql<number>`avg(${workouts.avgHr})`,
    })
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, userId),
        gte(workouts.startedAt, since),
        isNotNull(workouts.avgHr),
      ),
    )
    .groupBy(sql`to_char(${workouts.startedAt}::date, 'YYYY-MM')`)
    .orderBy(sql`to_char(${workouts.startedAt}::date, 'YYYY-MM')`);
  return rows.map((r) => ({ ym: r.ym, avgHr: r.avg }));
}

export async function hrvHrStats(userId: string) {
  const [hrvAgg, hrvLatest, rhrLatestSleep, rhrLatestDaily, maxHr] = await Promise.all([
    db
      .select({
        avg: sql<number | null>`avg(${clinicalRecords.valueNumeric})`,
        n: sql<number>`count(*)::int`,
      })
      .from(clinicalRecords)
      .where(
        and(eq(clinicalRecords.userId, userId), eq(clinicalRecords.kind, "HRV_RMSSD")),
      ),
    db
      .select({
        ym: sql<string>`to_char(${clinicalRecords.recordedAt}::date, 'YYYY-MM')`,
        avg: sql<number>`avg(${clinicalRecords.valueNumeric})`,
      })
      .from(clinicalRecords)
      .where(
        and(eq(clinicalRecords.userId, userId), eq(clinicalRecords.kind, "HRV_RMSSD")),
      )
      .groupBy(sql`to_char(${clinicalRecords.recordedAt}::date, 'YYYY-MM')`)
      .orderBy(desc(sql`to_char(${clinicalRecords.recordedAt}::date, 'YYYY-MM')`))
      .limit(1),
    // Latest clinical resting HR (e.g. pre-biopsy)
    db
      .select()
      .from(clinicalRecords)
      .where(
        and(
          eq(clinicalRecords.userId, userId),
          eq(clinicalRecords.kind, "RestingHR_clinic"),
        ),
      )
      .orderBy(desc(clinicalRecords.recordedAt))
      .limit(1),
    db
      .select({ rhr: dailyMetrics.restingHr })
      .from(dailyMetrics)
      .where(and(eq(dailyMetrics.userId, userId), isNotNull(dailyMetrics.restingHr)))
      .orderBy(desc(dailyMetrics.date))
      .limit(1),
    db
      .select({ max: sql<number | null>`max(${workouts.maxHr})` })
      .from(workouts)
      .where(eq(workouts.userId, userId)),
  ]);

  return {
    hrvAvg: hrvAgg[0]?.avg ?? null,
    hrvNights: hrvAgg[0]?.n ?? 0,
    hrvLatestMonth: hrvLatest[0]?.ym ?? null,
    hrvLatestMonthAvg: hrvLatest[0]?.avg ?? null,
    rhrClinic: rhrLatestSleep[0]?.valueNumeric ?? null,
    rhrClinicDate: rhrLatestSleep[0]?.recordedAt ?? null,
    rhrDaily: rhrLatestDaily[0]?.rhr ?? null,
    maxHrEver: maxHr[0]?.max ?? null,
  };
}

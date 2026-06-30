import { db } from "@/db/client";
import { weightSamples } from "@/db/schema";
import { and, asc, desc, eq, sql, isNotNull } from "drizzle-orm";

const LB_PER_KG = 2.2046226218487757;

function notAnomalous() {
  return sql`coalesce((${weightSamples.raw}->>'sensorAnomaly')::boolean, false) = false`;
}

export async function allWeightReadings(userId: string) {
  // Weight itself is generally trustworthy even on rows where body fat / muscle got
  // flagged as a sensor anomaly. Include every row here.
  const rows = await db
    .select({
      measuredAt: weightSamples.measuredAt,
      weightKg: weightSamples.weightKg,
      bodyFatPct: weightSamples.bodyFatPct,
      muscleMassKg: weightSamples.muscleMassKg,
      raw: weightSamples.raw,
    })
    .from(weightSamples)
    .where(eq(weightSamples.userId, userId))
    .orderBy(asc(weightSamples.measuredAt));
  return rows.map((r) => ({
    date: new Date(r.measuredAt).toISOString().slice(0, 10),
    weightLb: r.weightKg * LB_PER_KG,
    bodyFatPct: r.bodyFatPct,
    muscleLb: r.muscleMassKg ? r.muscleMassKg * LB_PER_KG : null,
  }));
}

export async function monthlyAvgWeight(userId: string) {
  const rows = await db
    .select({
      ym: sql<string>`to_char(${weightSamples.measuredAt}::date, 'YYYY-MM')`,
      avgKg: sql<number>`avg(${weightSamples.weightKg})`,
    })
    .from(weightSamples)
    .where(eq(weightSamples.userId, userId))
    .groupBy(sql`to_char(${weightSamples.measuredAt}::date, 'YYYY-MM')`)
    .orderBy(sql`to_char(${weightSamples.measuredAt}::date, 'YYYY-MM')`);
  return rows.map((r) => ({ ym: r.ym, lb: r.avgKg * LB_PER_KG }));
}

export async function bodyComposition(userId: string) {
  // For body fat / muscle, only show readings NOT flagged as sensor anomalies.
  const rows = await db
    .select({
      measuredAt: weightSamples.measuredAt,
      weightKg: weightSamples.weightKg,
      bodyFatPct: weightSamples.bodyFatPct,
      muscleMassKg: weightSamples.muscleMassKg,
    })
    .from(weightSamples)
    .where(
      and(
        eq(weightSamples.userId, userId),
        notAnomalous(),
        isNotNull(weightSamples.bodyFatPct),
      ),
    )
    .orderBy(asc(weightSamples.measuredAt));
  return rows.map((r) => ({
    date: new Date(r.measuredAt).toISOString().slice(0, 10),
    weightLb: r.weightKg * LB_PER_KG,
    bodyFatPct: r.bodyFatPct,
    muscleLb: r.muscleMassKg ? r.muscleMassKg * LB_PER_KG : null,
  }));
}

export async function bodyMetrics(userId: string) {
  const [peak, latest, earliestBf, latestBf, earliestMuscle, latestMuscle] = await Promise.all([
    db
      .select({ kg: sql<number>`max(${weightSamples.weightKg})` })
      .from(weightSamples)
      .where(eq(weightSamples.userId, userId)),
    db
      .select({ kg: weightSamples.weightKg, measuredAt: weightSamples.measuredAt })
      .from(weightSamples)
      .where(eq(weightSamples.userId, userId))
      .orderBy(desc(weightSamples.measuredAt))
      .limit(1),
    db
      .select({ bf: weightSamples.bodyFatPct })
      .from(weightSamples)
      .where(
        and(
          eq(weightSamples.userId, userId),
          notAnomalous(),
          isNotNull(weightSamples.bodyFatPct),
        ),
      )
      .orderBy(asc(weightSamples.measuredAt))
      .limit(1),
    db
      .select({ bf: weightSamples.bodyFatPct })
      .from(weightSamples)
      .where(
        and(
          eq(weightSamples.userId, userId),
          notAnomalous(),
          isNotNull(weightSamples.bodyFatPct),
        ),
      )
      .orderBy(desc(weightSamples.measuredAt))
      .limit(1),
    db
      .select({ kg: weightSamples.muscleMassKg })
      .from(weightSamples)
      .where(
        and(
          eq(weightSamples.userId, userId),
          notAnomalous(),
          isNotNull(weightSamples.muscleMassKg),
        ),
      )
      .orderBy(asc(weightSamples.measuredAt))
      .limit(1),
    db
      .select({ kg: weightSamples.muscleMassKg })
      .from(weightSamples)
      .where(
        and(
          eq(weightSamples.userId, userId),
          notAnomalous(),
          isNotNull(weightSamples.muscleMassKg),
        ),
      )
      .orderBy(desc(weightSamples.measuredAt))
      .limit(1),
  ]);

  const peakLb = peak[0]?.kg ? peak[0].kg * LB_PER_KG : null;
  const latestLb = latest[0]?.kg ? latest[0].kg * LB_PER_KG : null;
  const latestWeightDate = latest[0]?.measuredAt ?? null;
  const earliestBfPct = earliestBf[0]?.bf ?? null;
  const latestBfPct = latestBf[0]?.bf ?? null;
  const earliestMuscleLb = earliestMuscle[0]?.kg ? earliestMuscle[0].kg * LB_PER_KG : null;
  const latestMuscleLb = latestMuscle[0]?.kg ? latestMuscle[0].kg * LB_PER_KG : null;

  return {
    peakLb,
    latestLb,
    weightDropLb: peakLb != null && latestLb != null ? peakLb - latestLb : null,
    earliestBfPct,
    latestBfPct,
    bfDelta: earliestBfPct != null && latestBfPct != null ? latestBfPct - earliestBfPct : null,
    earliestMuscleLb,
    latestMuscleLb,
    latestWeightDate,
  };
}

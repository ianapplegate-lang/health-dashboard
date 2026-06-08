import { db } from "@/db/client";
import {
  clinicalRecords,
  sleepSessions,
  trainingSessions,
  weightSamples,
  workouts,
} from "@/db/schema";
import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";

export type TimelineEvent = {
  date: Date;
  category: "workout" | "body" | "clinical" | "training" | "sleep" | "hrv";
  title: string;
  subtitle?: string;
};

const LB_PER_KG = 2.2046226218487757;

export async function timeline(userId: string): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [];

  // ── Workout milestones ─────────────────────────────────────────────────────
  const [firstWorkout, longestRun, peakRunYear, peakRideYear] = await Promise.all([
    db
      .select({ startedAt: workouts.startedAt, sport: workouts.sport })
      .from(workouts)
      .where(eq(workouts.userId, userId))
      .orderBy(asc(workouts.startedAt))
      .limit(1),
    db
      .select({
        startedAt: workouts.startedAt,
        distanceM: workouts.distanceM,
        name: workouts.name,
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
        totalM: sql<number>`coalesce(sum(${workouts.distanceM}), 0)`,
      })
      .from(workouts)
      .where(
        and(
          eq(workouts.userId, userId),
          sql`lower(${workouts.sport}) in ('run','trailrun','virtualrun')`,
        ),
      )
      .groupBy(sql`extract(year from ${workouts.startedAt})`)
      .orderBy(desc(sql`coalesce(sum(${workouts.distanceM}), 0)`))
      .limit(1),
    db
      .select({
        year: sql<number>`extract(year from ${workouts.startedAt})::int`,
        totalM: sql<number>`coalesce(sum(${workouts.distanceM}), 0)`,
      })
      .from(workouts)
      .where(
        and(
          eq(workouts.userId, userId),
          sql`lower(${workouts.sport}) in ('ride','virtualride','ebikeride')`,
        ),
      )
      .groupBy(sql`extract(year from ${workouts.startedAt})`)
      .orderBy(desc(sql`coalesce(sum(${workouts.distanceM}), 0)`))
      .limit(1),
  ]);

  if (firstWorkout[0]) {
    events.push({
      date: firstWorkout[0].startedAt,
      category: "workout",
      title: "Strava tracking begins",
      subtitle: `First recorded session: ${firstWorkout[0].sport}`,
    });
  }

  if (longestRun[0]?.distanceM) {
    events.push({
      date: longestRun[0].startedAt,
      category: "workout",
      title: `Longest run — ${(longestRun[0].distanceM / 1000).toFixed(1)} km`,
      subtitle: longestRun[0].name ?? undefined,
    });
  }

  if (peakRunYear[0] && Number(peakRunYear[0].totalM) > 0) {
    events.push({
      date: new Date(`${peakRunYear[0].year}-06-15T12:00:00Z`),
      category: "workout",
      title: `Peak running year: ${(Number(peakRunYear[0].totalM) / 1000).toFixed(0)} km`,
      subtitle: `${peakRunYear[0].year}`,
    });
  }

  if (peakRideYear[0] && Number(peakRideYear[0].totalM) > 0) {
    events.push({
      date: new Date(`${peakRideYear[0].year}-06-15T12:00:00Z`),
      category: "workout",
      title: `Peak cycling year: ${(Number(peakRideYear[0].totalM) / 1000).toFixed(0)} km`,
      subtitle: `${peakRideYear[0].year}`,
    });
  }

  // ── Body composition milestones ────────────────────────────────────────────
  const [firstWeight, peakWeight, latestWeight] = await Promise.all([
    db
      .select({
        measuredAt: weightSamples.measuredAt,
        weightKg: weightSamples.weightKg,
      })
      .from(weightSamples)
      .where(eq(weightSamples.userId, userId))
      .orderBy(asc(weightSamples.measuredAt))
      .limit(1),
    db
      .select({
        measuredAt: weightSamples.measuredAt,
        weightKg: weightSamples.weightKg,
      })
      .from(weightSamples)
      .where(eq(weightSamples.userId, userId))
      .orderBy(desc(weightSamples.weightKg))
      .limit(1),
    db
      .select({
        measuredAt: weightSamples.measuredAt,
        weightKg: weightSamples.weightKg,
      })
      .from(weightSamples)
      .where(eq(weightSamples.userId, userId))
      .orderBy(desc(weightSamples.measuredAt))
      .limit(1),
  ]);

  if (firstWeight[0]) {
    events.push({
      date: firstWeight[0].measuredAt,
      category: "body",
      title: "Withings scale tracking begins",
      subtitle: `Body composition baseline (${(firstWeight[0].weightKg * LB_PER_KG).toFixed(0)} lb)`,
    });
  }

  if (peakWeight[0]) {
    events.push({
      date: peakWeight[0].measuredAt,
      category: "body",
      title: `Peak weight: ${(peakWeight[0].weightKg * LB_PER_KG).toFixed(0)} lb`,
      subtitle: "Highest recorded reading",
    });
  }

  if (latestWeight[0] && peakWeight[0]) {
    const dropLb = (peakWeight[0].weightKg - latestWeight[0].weightKg) * LB_PER_KG;
    if (dropLb > 5) {
      events.push({
        date: latestWeight[0].measuredAt,
        category: "body",
        title: `Latest weight: ${(latestWeight[0].weightKg * LB_PER_KG).toFixed(0)} lb`,
        subtitle: `${dropLb >= 0 ? "−" : "+"}${Math.abs(dropLb).toFixed(0)} lb from peak`,
      });
    }
  }

  // ── Sleep tracking start ───────────────────────────────────────────────────
  const firstSleep = await db
    .select({ startedAt: sleepSessions.startedAt })
    .from(sleepSessions)
    .where(eq(sleepSessions.userId, userId))
    .orderBy(asc(sleepSessions.startedAt))
    .limit(1);
  if (firstSleep[0]) {
    events.push({
      date: firstSleep[0].startedAt,
      category: "sleep",
      title: "Sleep tracking begins",
      subtitle: "First Withings sleep session recorded",
    });
  }

  // ── HRV start (first clinical_records HRV_RMSSD) ──────────────────────────
  const firstHrv = await db
    .select({ recordedAt: clinicalRecords.recordedAt })
    .from(clinicalRecords)
    .where(
      and(
        eq(clinicalRecords.userId, userId),
        eq(clinicalRecords.kind, "HRV_RMSSD"),
      ),
    )
    .orderBy(asc(clinicalRecords.recordedAt))
    .limit(1);
  if (firstHrv[0]) {
    events.push({
      date: firstHrv[0].recordedAt,
      category: "hrv",
      title: "HRV nightly tracking begins",
      subtitle: "Withings RMSSD",
    });
  }

  // ── Clinical events: each ALT, AST, biopsy, ultrasound ────────────────────
  const clin = await db
    .select()
    .from(clinicalRecords)
    .where(eq(clinicalRecords.userId, userId))
    .orderBy(asc(clinicalRecords.recordedAt));

  // Find peak ALT and add a single milestone event
  const altRows = clin.filter((r) => r.kind === "ALT" && r.valueNumeric != null);
  if (altRows.length > 0) {
    const peak = altRows.reduce((a, b) =>
      (a.valueNumeric ?? 0) > (b.valueNumeric ?? 0) ? a : b,
    );
    events.push({
      date: peak.recordedAt,
      category: "clinical",
      title: `Peak ALT: ${peak.valueNumeric} ${peak.unit ?? "U/L"}`,
      subtitle: `${peak.source} · trigger for investigation pathway`,
    });
  }

  // Ultrasounds → one event each
  for (const r of clin) {
    if (r.kind === "LiverUltrasound") {
      events.push({
        date: r.recordedAt,
        category: "clinical",
        title: `Liver ultrasound${r.valueNumeric ? ` — ${r.valueNumeric} cm` : ""}`,
        subtitle: r.valueText ?? r.source,
      });
    }
  }

  // Biopsy
  for (const r of clin) {
    if (r.kind === "LiverBiopsy") {
      events.push({
        date: r.recordedAt,
        category: "clinical",
        title: "Liver biopsy",
        subtitle: r.valueText
          ? r.valueText.length > 120
            ? r.valueText.slice(0, 120) + "…"
            : r.valueText
          : r.source,
      });
    }
  }

  // Pre-biopsy vitals: collapse the BP / RHR / SpO2 from 26 Mar 2026 into one row
  const preBiopsy = clin.filter((r) =>
    /pre-biopsy/i.test(r.source),
  );
  if (preBiopsy.length > 0) {
    const bp = preBiopsy.find((r) => r.kind === "BloodPressure");
    const hr = preBiopsy.find((r) => r.kind === "RestingHR_clinic");
    const spo2 = preBiopsy.find((r) => r.kind === "SpO2");
    const parts: string[] = [];
    if (bp?.valueText) parts.push(`BP ${bp.valueText}`);
    if (hr?.valueNumeric) parts.push(`HR ${hr.valueNumeric}`);
    if (spo2?.valueNumeric) parts.push(`SpO₂ ${spo2.valueNumeric}%`);
    events.push({
      date: preBiopsy[0].recordedAt,
      category: "clinical",
      title: "Pre-biopsy vitals",
      subtitle: parts.join(" · "),
    });
  }

  // ── Training plan start ────────────────────────────────────────────────────
  const firstTraining = await db
    .select()
    .from(trainingSessions)
    .where(eq(trainingSessions.userId, userId))
    .orderBy(asc(trainingSessions.plannedFor))
    .limit(1);
  if (firstTraining[0]) {
    events.push({
      date: firstTraining[0].plannedFor,
      category: "training",
      title: "Block 1 home training plan begins",
      subtitle: "Two sessions/week — A (Thursday) + B (Saturday)",
    });
  }

  // Sort chronologically
  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events;
}

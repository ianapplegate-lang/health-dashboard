import { db } from "@/db/client";
import {
  clinicalRecords,
  dailyMetrics,
  sleepSessions,
  workouts,
} from "@/db/schema";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { UserButton } from "@clerk/nextjs";

export async function DashboardHeader({ userId }: { userId: string }) {
  const [latestSleep, latestHrv, latestRhr, workoutDays] = await Promise.all([
    db
      .select()
      .from(sleepSessions)
      .where(eq(sleepSessions.userId, userId))
      .orderBy(desc(sleepSessions.startedAt))
      .limit(1),
    db
      .select()
      .from(clinicalRecords)
      .where(
        and(
          eq(clinicalRecords.userId, userId),
          eq(clinicalRecords.kind, "HRV_RMSSD"),
          isNotNull(clinicalRecords.valueNumeric),
        ),
      )
      .orderBy(desc(clinicalRecords.recordedAt))
      .limit(1),
    db
      .select()
      .from(dailyMetrics)
      .where(
        and(eq(dailyMetrics.userId, userId), isNotNull(dailyMetrics.restingHr)),
      )
      .orderBy(desc(dailyMetrics.date))
      .limit(1),
    db
      .select({
        day: sql<string>`to_char(${workouts.startedAt}::date, 'YYYY-MM-DD')`,
      })
      .from(workouts)
      .where(eq(workouts.userId, userId))
      .groupBy(sql`to_char(${workouts.startedAt}::date, 'YYYY-MM-DD')`)
      .orderBy(desc(sql`to_char(${workouts.startedAt}::date, 'YYYY-MM-DD')`))
      .limit(60),
  ]);

  // Sleep
  const sleepHours = latestSleep[0]?.durationSec
    ? +(latestSleep[0].durationSec / 3600).toFixed(1)
    : null;
  const sleepTone =
    sleepHours == null
      ? "default"
      : sleepHours >= 7
      ? "good"
      : sleepHours >= 6
      ? "warn"
      : "bad";

  // HRV — compare last night to 30-day avg
  const hrvValue = latestHrv[0]?.valueNumeric ?? null;
  const hrvAvgRow = await db
    .select({ avg: sql<number | null>`avg(${clinicalRecords.valueNumeric})` })
    .from(clinicalRecords)
    .where(
      and(
        eq(clinicalRecords.userId, userId),
        eq(clinicalRecords.kind, "HRV_RMSSD"),
      ),
    );
  const hrvAvg = hrvAvgRow[0]?.avg != null ? Number(hrvAvgRow[0].avg) : null;
  const hrvTone =
    hrvValue == null || hrvAvg == null
      ? "default"
      : hrvValue >= hrvAvg
      ? "good"
      : hrvValue < hrvAvg * 0.85
      ? "warn"
      : "default";

  // RHR
  const rhrValue = latestRhr[0]?.restingHr ?? null;

  // Workout streak
  const daysWithWorkout = new Set(workoutDays.map((r) => r.day));
  let streak = 0;
  const today = new Date();
  let countingFromToday = true;
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (daysWithWorkout.has(key)) {
      streak++;
      countingFromToday = false;
    } else if (i === 0 && countingFromToday) {
      continue; // give today a pass
    } else {
      break;
    }
  }
  const streakTone =
    streak >= 5 ? "good" : streak >= 2 ? "default" : streak === 0 ? "warn" : "default";

  const badgeClass = (tone: "good" | "warn" | "bad" | "default") => {
    if (tone === "good") return "bdg bt";
    if (tone === "warn") return "bdg ba";
    if (tone === "bad") return "bdg br";
    return "bdg bb";
  };

  return (
    <div className="hdr">
      <div>
        <div className="htitle">Health Dashboard</div>
        <div className="hsub">
          Ian R. Applegate · Strava · Withings · Health Connect · Kaiser
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="hbdg">
          {sleepHours != null ? (
            <span className={badgeClass(sleepTone)}>
              😴 {sleepHours} h
            </span>
          ) : null}
          {hrvValue != null ? (
            <span className={badgeClass(hrvTone)}>
              ❤️ HRV {Math.round(hrvValue)} ms
            </span>
          ) : null}
          {rhrValue != null ? (
            <span className={badgeClass("good")}>
              💗 RHR {rhrValue} bpm
            </span>
          ) : null}
          <span className={badgeClass(streakTone)}>
            🔥 {streak}d streak
          </span>
        </div>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </div>
  );
}

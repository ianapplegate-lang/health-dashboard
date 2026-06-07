import { db } from "@/db/client";
import { clinicalRecords, workouts } from "@/db/schema";
import { and, eq, sql, isNotNull, desc } from "drizzle-orm";
import { UserButton } from "@clerk/nextjs";

export async function DashboardHeader({ userId }: { userId: string }) {
  // Header badges are derived from clinical + workout state with fall-through narrative strings.
  const [activityRange, hrvAvg, latestFibrosis, latestAfib] = await Promise.all([
    db
      .select({
        n: sql<number>`count(*)::int`,
        min: sql<Date | null>`min(${workouts.startedAt})`,
        max: sql<Date | null>`max(${workouts.startedAt})`,
      })
      .from(workouts)
      .where(eq(workouts.userId, userId)),
    db
      .select({ avg: sql<number | null>`avg(${clinicalRecords.valueNumeric})` })
      .from(clinicalRecords)
      .where(
        and(
          eq(clinicalRecords.userId, userId),
          eq(clinicalRecords.kind, "HRV_RMSSD"),
        ),
      ),
    db
      .select()
      .from(clinicalRecords)
      .where(
        and(
          eq(clinicalRecords.userId, userId),
          eq(clinicalRecords.kind, "LiverBiopsy"),
        ),
      )
      .orderBy(desc(clinicalRecords.recordedAt))
      .limit(1),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(clinicalRecords)
      .where(
        and(
          eq(clinicalRecords.userId, userId),
          eq(clinicalRecords.kind, "AFib_episode"),
          isNotNull(clinicalRecords.valueNumeric),
        ),
      ),
  ]);

  const hrv = hrvAvg[0]?.avg;
  const fibrosisText = latestFibrosis[0]?.valueText ?? null;
  const fibrosisBadge = fibrosisText
    ? /stage 0|stage 1|stage 0-1|stage 0–1/i.test(fibrosisText)
      ? "Fibrosis 0–1"
      : "Biopsy on file"
    : null;
  const afibBadge = (latestAfib[0]?.n ?? 0) === 0 ? "No AFib detected" : `${latestAfib[0]?.n} AFib`;

  return (
    <div className="hdr">
      <div>
        <div className="htitle">Health Dashboard</div>
        <div className="hsub">
          Ian R. Applegate · Strava · Withings · Health Connect · Clinical records
          {activityRange[0]?.n
            ? ` · ${activityRange[0].n.toLocaleString()} activities`
            : ""}
        </div>
      </div>
      <div className="hbdg" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="hbdg">
          {fibrosisBadge ? <span className="bdg bt">{fibrosisBadge}</span> : null}
          <span className="bdg bb">Antiviral active</span>
          <span className="bdg bt">{afibBadge}</span>
          {hrv != null ? (
            <span className="bdg bp">HRV {Math.round(hrv)} ms avg</span>
          ) : null}
        </div>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </div>
  );
}

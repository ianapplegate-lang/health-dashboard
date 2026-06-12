import { db } from "@/db/client";
import { clinicalRecords } from "@/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";

export type LabSeriesRow = {
  date: string;
  value: number;
  refLow: number | null;
  refHigh: number | null;
};

export type LabLatest = {
  kind: string;
  valueNumeric: number | null;
  valueText: string | null;
  unit: string | null;
  recordedAt: Date;
  abnormalFlag: string | null;
  refLow: number | null;
  refHigh: number | null;
};

export async function labSeries(userId: string, kind: string): Promise<LabSeriesRow[]> {
  const rows = await db
    .select({
      recordedAt: clinicalRecords.recordedAt,
      v: clinicalRecords.valueNumeric,
      lo: clinicalRecords.referenceLow,
      hi: clinicalRecords.referenceHigh,
    })
    .from(clinicalRecords)
    .where(and(eq(clinicalRecords.userId, userId), eq(clinicalRecords.kind, kind)))
    .orderBy(asc(clinicalRecords.recordedAt));
  return rows
    .filter((r) => r.v != null)
    .map((r) => ({
      date: new Date(r.recordedAt).toISOString().slice(0, 10),
      value: r.v as number,
      refLow: r.lo,
      refHigh: r.hi,
    }));
}

export async function labLatest(userId: string, kind: string): Promise<LabLatest | null> {
  const rows = await db
    .select()
    .from(clinicalRecords)
    .where(and(eq(clinicalRecords.userId, userId), eq(clinicalRecords.kind, kind)))
    .orderBy(desc(clinicalRecords.recordedAt))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return {
    kind: r.kind,
    valueNumeric: r.valueNumeric,
    valueText: r.valueText,
    unit: r.unit,
    recordedAt: r.recordedAt,
    abnormalFlag: r.abnormalFlag,
    refLow: r.referenceLow,
    refHigh: r.referenceHigh,
  };
}

export async function labPeak(userId: string, kind: string): Promise<LabLatest | null> {
  const rows = await db
    .select()
    .from(clinicalRecords)
    .where(and(eq(clinicalRecords.userId, userId), eq(clinicalRecords.kind, kind)))
    .orderBy(desc(clinicalRecords.valueNumeric))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return {
    kind: r.kind,
    valueNumeric: r.valueNumeric,
    valueText: r.valueText,
    unit: r.unit,
    recordedAt: r.recordedAt,
    abnormalFlag: r.abnormalFlag,
    refLow: r.referenceLow,
    refHigh: r.referenceHigh,
  };
}

export async function imagingRecords(userId: string) {
  return db
    .select()
    .from(clinicalRecords)
    .where(
      and(eq(clinicalRecords.userId, userId), eq(clinicalRecords.category, "imaging")),
    )
    .orderBy(asc(clinicalRecords.recordedAt));
}

export async function liverLengthSeries(userId: string) {
  const rows = await db
    .select({
      recordedAt: clinicalRecords.recordedAt,
      cm: clinicalRecords.valueNumeric,
      notes: clinicalRecords.valueText,
    })
    .from(clinicalRecords)
    .where(
      and(
        eq(clinicalRecords.userId, userId),
        eq(clinicalRecords.kind, "LiverUltrasound"),
      ),
    )
    .orderBy(asc(clinicalRecords.recordedAt));
  return rows
    .filter((r) => r.cm != null)
    .map((r) => ({
      date: new Date(r.recordedAt).toISOString().slice(0, 10),
      cm: r.cm as number,
      notes: r.notes ?? null,
    }));
}

export async function biopsyRecord(userId: string) {
  const rows = await db
    .select()
    .from(clinicalRecords)
    .where(
      and(
        eq(clinicalRecords.userId, userId),
        eq(clinicalRecords.kind, "LiverBiopsy"),
      ),
    )
    .orderBy(desc(clinicalRecords.recordedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function preProcedureVitals(userId: string) {
  return db
    .select()
    .from(clinicalRecords)
    .where(
      and(
        eq(clinicalRecords.userId, userId),
        sql`${clinicalRecords.source} ILIKE '%pre-biopsy%'`,
      ),
    )
    .orderBy(asc(clinicalRecords.recordedAt));
}

export type FibrosisStage = 0 | 1 | 2 | 3 | 4;

export function parseFibrosisStage(text: string | null): FibrosisStage | null {
  if (!text) return null;
  const m = text.match(/stage\s+([0-4])(?:[-–]([0-4]))?/i);
  if (!m) return null;
  // If "Stage 0-1", show the lower bound for visual placement; we'll render the range too.
  return parseInt(m[1], 10) as FibrosisStage;
}

export function fibrosisRange(text: string | null): [FibrosisStage, FibrosisStage] | null {
  if (!text) return null;
  const m = text.match(/stage\s+([0-4])(?:[-–]([0-4]))?/i);
  if (!m) return null;
  const lo = parseInt(m[1], 10) as FibrosisStage;
  const hi = (m[2] ? parseInt(m[2], 10) : lo) as FibrosisStage;
  return [lo, hi];
}

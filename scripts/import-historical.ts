import { loadEnvConfig } from "@next/env";
import fs from "node:fs/promises";
import path from "node:path";

loadEnvConfig(process.cwd());

const LB_PER_KG = 2.2046226218487757;

type ClinicalIn = {
  date: string;
  category: string;
  kind: string;
  valueNumeric?: number | null;
  valueText?: string | null;
  unit?: string | null;
  refRangeLow?: number | null;
  refRangeHigh?: number | null;
  source: string;
  notes?: string | null;
};

type WeightIn = {
  date: string;
  weightLb: number;
  fatPct?: number | null;
  muscleLb?: number | null;
  sensorAnomaly?: boolean;
};

type TrainingMovementIn = {
  name: string;
  sets: number;
  repsTarget?: number | null;
  repsActual?: number | null;
  weightLb?: number | null;
  rir?: number | null;
  notesText?: string;
};

type TrainingIn = {
  date: string;
  sessionType: string;
  plannedStart: string; // "HH:MM"
  calendarEventId?: string | null;
  completed?: boolean;
  completedAt?: string | null;
  title?: string | null;
  notes?: string | null;
  movements: TrainingMovementIn[];
};

type Bundle = {
  clinical?: ClinicalIn[];
  weight?: WeightIn[];
  training?: TrainingIn[];
};

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: npm run import:historical -- <path-to-bundle.json>");
    process.exit(1);
  }

  const [{ db }, schema, { getAllowedUserByEmail }, drizzleOrm] = await Promise.all([
    import("../src/db/client"),
    import("../src/db/schema"),
    import("../src/lib/session"),
    import("drizzle-orm"),
  ]);
  const { eq } = drizzleOrm;

  const abs = path.resolve(arg);
  console.log(`Loading ${abs}...`);
  const bundle = JSON.parse(await fs.readFile(abs, "utf8")) as Bundle;

  const user = await getAllowedUserByEmail();
  console.log(`User: ${user.email} (${user.id})`);

  const counts: Record<string, number> = {};
  if (bundle.clinical?.length) {
    counts.clinical = await importClinical(db, schema, user.id, bundle.clinical);
  }
  if (bundle.weight?.length) {
    counts.weight = await importWeight(db, schema, user.id, bundle.weight);
  }
  if (bundle.training?.length) {
    counts.training = await importTraining(db, schema, eq, user.id, bundle.training);
  }

  console.log(JSON.stringify(counts, null, 2));
  process.exit(0);
}

async function importClinical(
  db: any,
  schema: any,
  userId: string,
  rows: ClinicalIn[],
): Promise<number> {
  let n = 0;
  for (const r of rows) {
    await db
      .insert(schema.clinicalRecords)
      .values({
        userId,
        recordedAt: new Date(`${r.date}T12:00:00Z`),
        category: r.category,
        kind: r.kind,
        valueNumeric: r.valueNumeric ?? null,
        valueText: r.valueText ?? null,
        unit: r.unit ?? null,
        referenceLow: r.refRangeLow ?? null,
        referenceHigh: r.refRangeHigh ?? null,
        abnormalFlag: computeAbnormalFlag(r.valueNumeric, r.refRangeLow, r.refRangeHigh),
        source: r.source,
        notes: r.notes ?? null,
        raw: r,
      })
      .onConflictDoNothing();
    n++;
  }
  return n;
}

async function importWeight(
  db: any,
  schema: any,
  userId: string,
  rows: WeightIn[],
): Promise<number> {
  let n = 0;
  for (const r of rows) {
    await db.insert(schema.weightSamples).values({
      userId,
      measuredAt: new Date(`${r.date}T12:00:00Z`),
      weightKg: r.weightLb / LB_PER_KG,
      bodyFatPct: r.fatPct ?? null,
      muscleMassKg: r.muscleLb != null ? r.muscleLb / LB_PER_KG : null,
      boneMassKg: null,
      waterPct: null,
      raw: { ...r, source: "historical-import" },
    });
    n++;
  }
  return n;
}

async function importTraining(
  db: any,
  schema: any,
  eq: any,
  userId: string,
  rows: TrainingIn[],
): Promise<number> {
  let n = 0;
  for (const r of rows) {
    const plannedFor = parsePacific(r.date, r.plannedStart);
    const completedAt = r.completedAt
      ? new Date(r.completedAt)
      : r.completed
      ? plannedFor
      : null;
    const movements = (r.movements ?? []).map((m) => ({
      name: m.name,
      sets: m.sets,
      repsTarget: m.repsTarget ?? null,
      repsActual: m.repsActual ?? null,
      weightKg: m.weightLb != null ? m.weightLb / LB_PER_KG : null,
      rir: m.rir ?? null,
      notesText: m.notesText ?? undefined,
    }));

    if (r.calendarEventId) {
      const existing = await db
        .select()
        .from(schema.trainingSessions)
        .where(eq(schema.trainingSessions.calendarEventId, r.calendarEventId))
        .limit(1);
      if (existing[0]) {
        await db
          .update(schema.trainingSessions)
          .set({
            plannedFor,
            completedAt,
            sessionType: r.sessionType,
            title: r.title ?? null,
            notes: r.notes ?? null,
            movements,
          })
          .where(eq(schema.trainingSessions.id, existing[0].id));
        n++;
        continue;
      }
    }

    await db.insert(schema.trainingSessions).values({
      userId,
      plannedFor,
      completedAt,
      sessionType: r.sessionType,
      title: r.title ?? null,
      movements,
      notes: r.notes ?? null,
      calendarEventId: r.calendarEventId ?? null,
    });
    n++;
  }
  return n;
}

function computeAbnormalFlag(
  value: number | null | undefined,
  lo: number | null | undefined,
  hi: number | null | undefined,
): "low" | "high" | null {
  if (value == null) return null;
  if (lo != null && value < lo) return "low";
  if (hi != null && value > hi) return "high";
  return null;
}

function parsePacific(date: string, time: string): Date {
  const month = parseInt(date.slice(5, 7), 10);
  const offset = month >= 3 && month <= 10 ? "-07:00" : "-08:00";
  return new Date(`${date}T${time}:00${offset}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

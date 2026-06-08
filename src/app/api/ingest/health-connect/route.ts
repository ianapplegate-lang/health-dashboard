import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { dailyMetrics, sleepSessions, workouts } from "@/db/schema";
import { getAllowedUserByEmail } from "@/lib/session";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  daily: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        steps: z.number().int().nullable().optional(),
        activeMinutes: z.number().int().nullable().optional(),
        restingHr: z.number().int().nullable().optional(),
        caloriesOut: z.number().int().nullable().optional(),
      }),
    )
    .default([]),
  sleep: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        startedAt: z.string(),
        endedAt: z.string(),
        durationSec: z.number().int(),
        deepSec: z.number().int().nullable().optional(),
        remSec: z.number().int().nullable().optional(),
        lightSec: z.number().int().nullable().optional(),
        awakeSec: z.number().int().nullable().optional(),
      }),
    )
    .default([]),
  workouts: z
    .array(
      z.object({
        externalId: z.string(),
        sport: z.string(),
        startedAt: z.string(),
        durationSec: z.number().int().nullable().optional(),
        distanceM: z.number().nullable().optional(),
        avgHr: z.number().int().nullable().optional(),
        maxHr: z.number().int().nullable().optional(),
        calories: z.number().int().nullable().optional(),
        name: z.string().nullable().optional(),
      }),
    )
    .default([]),
});

export async function POST(req: NextRequest) {
  const expected = process.env.HEALTH_CONNECT_INGEST_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "HEALTH_CONNECT_INGEST_TOKEN not configured on server" },
      { status: 500 },
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "bad payload", detail: err instanceof Error ? err.message : err },
      { status: 400 },
    );
  }

  const user = await getAllowedUserByEmail();
  let dailyUpserts = 0;
  let sleepUpserts = 0;
  let workoutUpserts = 0;

  // Batch each table into a single multi-row INSERT to avoid sequential round trips
  // (15 s before -> ~1 s after for typical 30-day / 14-sleep / 33-workout payload).

  if (body.daily.length > 0) {
    // Dedupe by date (last one wins).
    const byDate = new Map<string, (typeof body.daily)[number]>();
    for (const d of body.daily) byDate.set(d.date, d);
    const rows = Array.from(byDate.values()).map((d) => ({
      userId: user.id,
      date: d.date,
      steps: d.steps ?? null,
      activeMinutes: d.activeMinutes ?? null,
      restingHr: d.restingHr ?? null,
      caloriesOut: d.caloriesOut ?? null,
      raw: d,
    }));
    await db
      .insert(dailyMetrics)
      .values(rows)
      .onConflictDoUpdate({
        target: [dailyMetrics.userId, dailyMetrics.date],
        set: {
          steps: sql`coalesce(excluded.steps, ${dailyMetrics.steps})`,
          activeMinutes: sql`coalesce(excluded.active_minutes, ${dailyMetrics.activeMinutes})`,
          restingHr: sql`coalesce(excluded.resting_hr, ${dailyMetrics.restingHr})`,
          caloriesOut: sql`coalesce(excluded.calories_out, ${dailyMetrics.caloriesOut})`,
        },
      });
    dailyUpserts = rows.length;
  }

  if (body.sleep.length > 0) {
    // Health Connect can return multiple sessions per date (main sleep + nap + brief wake).
    // Postgres ON CONFLICT can only act on a row once per INSERT, so dedupe to one
    // session per date by keeping the longest (the main nighttime sleep).
    const byDate = new Map<string, (typeof body.sleep)[number]>();
    for (const s of body.sleep) {
      const existing = byDate.get(s.date);
      if (!existing || s.durationSec > existing.durationSec) {
        byDate.set(s.date, s);
      }
    }
    const rows = Array.from(byDate.values()).map((s) => ({
      userId: user.id,
      date: s.date,
      startedAt: new Date(s.startedAt),
      endedAt: new Date(s.endedAt),
      durationSec: s.durationSec,
      deepSec: s.deepSec ?? null,
      remSec: s.remSec ?? null,
      lightSec: s.lightSec ?? null,
      awakeSec: s.awakeSec ?? null,
      raw: s,
    }));
    await db
      .insert(sleepSessions)
      .values(rows)
      .onConflictDoUpdate({
        target: [sleepSessions.userId, sleepSessions.date],
        set: {
          startedAt: sql`excluded.started_at`,
          endedAt: sql`excluded.ended_at`,
          durationSec: sql`excluded.duration_sec`,
          deepSec: sql`excluded.deep_sec`,
          remSec: sql`excluded.rem_sec`,
          lightSec: sql`excluded.light_sec`,
          awakeSec: sql`excluded.awake_sec`,
          raw: sql`excluded.raw`,
        },
      });
    sleepUpserts = rows.length;
  }

  if (body.workouts.length > 0) {
    // Dedupe by externalId in case the source emits the same session twice.
    const byId = new Map<string, (typeof body.workouts)[number]>();
    for (const w of body.workouts) byId.set(w.externalId, w);
    const rows = Array.from(byId.values()).map((w) => ({
      userId: user.id,
      provider: "health-connect" as const,
      externalId: w.externalId,
      sport: w.sport,
      startedAt: new Date(w.startedAt),
      durationSec: w.durationSec ?? null,
      distanceM: w.distanceM ?? null,
      avgHr: w.avgHr ?? null,
      maxHr: w.maxHr ?? null,
      calories: w.calories ?? null,
      name: w.name ?? null,
      raw: w,
    }));
    await db.insert(workouts).values(rows).onConflictDoNothing();
    workoutUpserts = rows.length;
  }

  return NextResponse.json({
    ok: true,
    dailyUpserts,
    sleepUpserts,
    workoutUpserts,
  });
}

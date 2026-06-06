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

  for (const d of body.daily) {
    await db
      .insert(dailyMetrics)
      .values({
        userId: user.id,
        date: d.date,
        steps: d.steps ?? null,
        activeMinutes: d.activeMinutes ?? null,
        restingHr: d.restingHr ?? null,
        caloriesOut: d.caloriesOut ?? null,
        raw: d,
      })
      .onConflictDoUpdate({
        target: [dailyMetrics.userId, dailyMetrics.date],
        set: {
          steps: sql`coalesce(excluded.steps, ${dailyMetrics.steps})`,
          activeMinutes: sql`coalesce(excluded.active_minutes, ${dailyMetrics.activeMinutes})`,
          restingHr: sql`coalesce(excluded.resting_hr, ${dailyMetrics.restingHr})`,
          caloriesOut: sql`coalesce(excluded.calories_out, ${dailyMetrics.caloriesOut})`,
        },
      });
    dailyUpserts++;
  }

  for (const s of body.sleep) {
    await db
      .insert(sleepSessions)
      .values({
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
      })
      .onConflictDoUpdate({
        target: [sleepSessions.userId, sleepSessions.date],
        set: {
          startedAt: new Date(s.startedAt),
          endedAt: new Date(s.endedAt),
          durationSec: s.durationSec,
          deepSec: s.deepSec ?? null,
          remSec: s.remSec ?? null,
          lightSec: s.lightSec ?? null,
          awakeSec: s.awakeSec ?? null,
          raw: s,
        },
      });
    sleepUpserts++;
  }

  for (const w of body.workouts) {
    await db
      .insert(workouts)
      .values({
        userId: user.id,
        provider: "health-connect",
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
      })
      .onConflictDoNothing();
    workoutUpserts++;
  }

  return NextResponse.json({
    ok: true,
    dailyUpserts,
    sleepUpserts,
    workoutUpserts,
  });
}

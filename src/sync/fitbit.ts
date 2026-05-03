import { db } from "@/db/client";
import { dailyMetrics, sleepSessions } from "@/db/schema";
import { getValidAccessToken } from "./tokens";

const API = "https://api.fitbit.com/1";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function syncFitbit(userId: string, days = 30): Promise<number> {
  const token = await getValidAccessToken(userId, "fitbit");
  const today = new Date();
  let upserts = 0;

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const date = ymd(d);

    const summary = await fetchJson(`${API}/user/-/activities/date/${date}.json`, token);
    const sleep = await fetchJson(`${API}/1.2/user/-/sleep/date/${date}.json`, token).catch(
      () => null,
    );

    if (summary?.summary) {
      await db
        .insert(dailyMetrics)
        .values({
          userId,
          date,
          steps: summary.summary.steps ?? null,
          activeMinutes:
            (summary.summary.fairlyActiveMinutes ?? 0) +
            (summary.summary.veryActiveMinutes ?? 0),
          restingHr: summary.summary.restingHeartRate ?? null,
          caloriesOut: summary.summary.caloriesOut ?? null,
          raw: summary,
        })
        .onConflictDoUpdate({
          target: [dailyMetrics.userId, dailyMetrics.date],
          set: {
            steps: summary.summary.steps ?? null,
            activeMinutes:
              (summary.summary.fairlyActiveMinutes ?? 0) +
              (summary.summary.veryActiveMinutes ?? 0),
            restingHr: summary.summary.restingHeartRate ?? null,
            caloriesOut: summary.summary.caloriesOut ?? null,
            raw: summary,
          },
        });
      upserts++;
    }

    const main = sleep?.sleep?.find((s: { isMainSleep: boolean }) => s.isMainSleep);
    if (main) {
      const stages = main.levels?.summary ?? {};
      await db
        .insert(sleepSessions)
        .values({
          userId,
          date,
          startedAt: new Date(main.startTime),
          endedAt: new Date(main.endTime),
          durationSec: Math.round(main.duration / 1000),
          efficiency: main.efficiency ? main.efficiency / 100 : null,
          deepSec: stages.deep?.minutes ? stages.deep.minutes * 60 : null,
          remSec: stages.rem?.minutes ? stages.rem.minutes * 60 : null,
          lightSec: stages.light?.minutes ? stages.light.minutes * 60 : null,
          awakeSec: stages.wake?.minutes ? stages.wake.minutes * 60 : null,
          raw: main,
        })
        .onConflictDoUpdate({
          target: [sleepSessions.userId, sleepSessions.date],
          set: {
            startedAt: new Date(main.startTime),
            endedAt: new Date(main.endTime),
            durationSec: Math.round(main.duration / 1000),
            efficiency: main.efficiency ? main.efficiency / 100 : null,
            raw: main,
          },
        });
      upserts++;
    }
  }
  return upserts;
}

async function fetchJson(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`fitbit fetch failed: ${res.status} ${url}`);
  }
  return res.json();
}

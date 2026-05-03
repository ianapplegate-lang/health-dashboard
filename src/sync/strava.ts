import { db } from "@/db/client";
import { workouts } from "@/db/schema";
import { getValidAccessToken } from "./tokens";

type StravaActivity = {
  id: number;
  name: string;
  sport_type: string;
  start_date: string;
  elapsed_time: number;
  distance: number;
  total_elevation_gain: number;
  average_heartrate?: number;
  max_heartrate?: number;
  calories?: number;
};

export async function syncStrava(userId: string, sinceEpoch?: number): Promise<number> {
  const token = await getValidAccessToken(userId, "strava");
  let page = 1;
  let upserts = 0;
  while (true) {
    const params = new URLSearchParams({ per_page: "100", page: String(page) });
    if (sinceEpoch) params.set("after", String(sinceEpoch));
    const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`strava list failed: ${res.status}`);
    const items = (await res.json()) as StravaActivity[];
    if (items.length === 0) break;

    for (const a of items) {
      await db
        .insert(workouts)
        .values({
          userId,
          provider: "strava",
          externalId: String(a.id),
          sport: a.sport_type,
          startedAt: new Date(a.start_date),
          durationSec: a.elapsed_time,
          distanceM: a.distance,
          elevationGainM: a.total_elevation_gain,
          avgHr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
          maxHr: a.max_heartrate ? Math.round(a.max_heartrate) : null,
          calories: a.calories ? Math.round(a.calories) : null,
          name: a.name,
          raw: a,
        })
        .onConflictDoNothing();
      upserts++;
    }
    if (items.length < 100) break;
    page++;
  }
  return upserts;
}

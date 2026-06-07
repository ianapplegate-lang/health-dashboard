import { db } from "@/db/client";
import { syncRuns, type Provider } from "@/db/schema";
import { eq } from "drizzle-orm";
import { syncStrava } from "./strava";
import { syncWithings } from "./withings";

export async function runSync(userId: string, provider: Provider): Promise<number> {
  const [run] = await db
    .insert(syncRuns)
    .values({ userId, provider, status: "running" })
    .returning();
  try {
    let upserts = 0;
    if (provider === "strava") upserts = await syncStrava(userId);
    else if (provider === "withings") upserts = await syncWithings(userId);
    else throw new Error(`no sync handler for provider: ${provider}`);
    await db
      .update(syncRuns)
      .set({ status: "ok", finishedAt: new Date(), itemsUpserted: upserts })
      .where(eq(syncRuns.id, run.id));
    return upserts;
  } catch (err) {
    await db
      .update(syncRuns)
      .set({
        status: "error",
        finishedAt: new Date(),
        error: err instanceof Error ? err.message : String(err),
      })
      .where(eq(syncRuns.id, run.id));
    throw err;
  }
}

import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const DEV_EMAIL = process.env.DEV_USER_EMAIL ?? "me@example.com";

export async function getOrCreateDevUser() {
  const existing = await db.select().from(users).where(eq(users.email, DEV_EMAIL)).limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db
    .insert(users)
    .values({ email: DEV_EMAIL, displayName: "Me" })
    .returning();
  return created;
}

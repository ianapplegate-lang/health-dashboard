import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL ?? "applegateian@gmail.com";

/**
 * Used by web routes (server components + API routes inside Clerk middleware).
 * Resolves the Clerk session to a DB users row, enforcing the email allowlist.
 *
 * Looks up the users row by email. Tolerant of the existing single-user dev row
 * (email may currently be "me@example.com" until the pre-sign-in UPDATE is run).
 * Once you UPDATE users SET email='applegateian@gmail.com', this resolves to your
 * historical data; otherwise it creates a fresh row.
 */
export async function getCurrentDbUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("unauthenticated");

  const primaryEmail = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId,
  )?.emailAddress;

  if (!primaryEmail || primaryEmail !== ALLOWED_EMAIL) {
    throw new Error(`forbidden: ${primaryEmail ?? "no-email"} not in allowlist`);
  }

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, primaryEmail))
    .limit(1);
  if (existing[0]) return existing[0];

  const [created] = await db
    .insert(users)
    .values({
      email: primaryEmail,
      displayName: clerkUser.firstName ?? "Me",
    })
    .returning();
  return created;
}

/**
 * Used by the bearer-token ingest endpoint (Android Health Connect companion)
 * and by CLI scripts (import-takeout, import-historical) — contexts where there
 * is no Clerk session. Looks up the single allowed user by email.
 * Requires the user to have signed in via web at least once.
 */
export async function getAllowedUserByEmail() {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, ALLOWED_EMAIL))
    .limit(1);
  if (!user) {
    throw new Error(
      `allowed user (${ALLOWED_EMAIL}) not provisioned yet — sign in via the web app first`,
    );
  }
  return user;
}

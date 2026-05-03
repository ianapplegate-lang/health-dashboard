import { db } from "@/db/client";
import { oauthTokens, type Provider } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getProvider } from "@/providers";

export async function getValidAccessToken(userId: string, provider: Provider): Promise<string> {
  const [row] = await db
    .select()
    .from(oauthTokens)
    .where(and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, provider)))
    .limit(1);
  if (!row) throw new Error(`no ${provider} token for user ${userId}`);

  const exp = row.expiresAt?.getTime() ?? 0;
  if (exp - Date.now() > 60_000) return row.accessToken;
  if (!row.refreshToken) throw new Error(`${provider} token expired and no refresh token`);

  const refreshed = await getProvider(provider).refresh(row.refreshToken);
  await db
    .update(oauthTokens)
    .set({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? row.refreshToken,
      expiresAt: refreshed.expiresAt,
      scope: refreshed.scope ?? row.scope,
      updatedAt: sql`now()`,
    })
    .where(eq(oauthTokens.id, row.id));
  return refreshed.accessToken;
}

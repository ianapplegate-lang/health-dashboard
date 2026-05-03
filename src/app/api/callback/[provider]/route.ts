import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/providers";
import { stateCookieName } from "@/lib/oauth-state";
import { db } from "@/db/client";
import { oauthTokens, type Provider } from "@/db/schema";
import { getOrCreateDevUser } from "@/lib/session";
import { sql } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: name } = await params;
  const provider = getProvider(name);

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (!code || !state) {
    return NextResponse.json({ error: "missing code/state" }, { status: 400 });
  }

  const cookieState = req.cookies.get(stateCookieName(name))?.value;
  if (!cookieState || cookieState !== state) {
    return NextResponse.json({ error: "state mismatch" }, { status: 400 });
  }

  const tokens = await provider.exchangeCode(code);
  const user = await getOrCreateDevUser();

  await db
    .insert(oauthTokens)
    .values({
      userId: user.id,
      provider: name as Provider,
      providerUserId: tokens.providerUserId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
      raw: tokens.raw as object,
    })
    .onConflictDoUpdate({
      target: [oauthTokens.userId, oauthTokens.provider],
      set: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        scope: tokens.scope,
        providerUserId: tokens.providerUserId,
        raw: tokens.raw as object,
        updatedAt: sql`now()`,
      },
    });

  const res = NextResponse.redirect(new URL("/?connected=" + name, req.url));
  res.cookies.delete(stateCookieName(name));
  return res;
}

import { NextRequest, NextResponse } from "next/server";
import { getProvider } from "@/providers";
import { makeState, stateCookieName } from "@/lib/oauth-state";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: name } = await params;
  const provider = getProvider(name);
  const state = makeState();
  const url = provider.authUrl(state);
  const res = NextResponse.redirect(url);
  res.cookies.set(stateCookieName(name), state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return res;
}

import { NextRequest, NextResponse } from "next/server";
import { runSync } from "@/sync";
import { getCurrentDbUser } from "@/lib/session";
import type { Provider } from "@/db/schema";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!["strava", "withings"].includes(provider)) {
    return NextResponse.json({ error: "unknown provider" }, { status: 400 });
  }
  const user = await getCurrentDbUser();
  try {
    const count = await runSync(user.id, provider as Provider);
    return NextResponse.json({ ok: true, upserts: count });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

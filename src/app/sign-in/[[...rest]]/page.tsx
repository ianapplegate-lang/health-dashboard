import { redirect } from "next/navigation";
import { headers } from "next/headers";

function clerkAccountPortalUrl(): string {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  try {
    const b64 = pk.replace(/^pk_(test|live)_/, "").replace(/\$+$/, "");
    const decoded = Buffer.from(b64, "base64").toString("utf-8").replace(/\$+$/, "");
    if (!decoded) throw new Error("empty");
    const host = decoded.replace(/^clerk\./, "");
    return `https://${host}`;
  } catch {
    return "";
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const portal = clerkAccountPortalUrl();
  const { redirect_url } = await searchParams;
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const selfBase = `${proto}://${host}`;
  const ret = redirect_url ?? selfBase;

  if (portal) {
    redirect(`${portal}/sign-in?redirect_url=${encodeURIComponent(ret)}`);
  }

  return (
    <main style={{ padding: 40, fontFamily: "var(--fm)", color: "var(--mu)" }}>
      <p>Clerk publishable key not configured — cannot redirect to Account Portal.</p>
      <p>Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in .env.local and restart.</p>
    </main>
  );
}

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that bypass Clerk auth entirely.
// /api/ingest/health-connect uses its own bearer-token auth (the Android app).
const isPublic = createRouteMatcher([
  "/sign-in(.*)",
  "/api/ingest/health-connect",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublic(req)) return;
  await auth.protect();
  // Email allowlist enforcement happens in getCurrentDbUser() — see src/lib/session.ts.
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

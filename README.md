# Health Dashboard

Personal health and fitness dashboard. Pulls workouts, daily activity, sleep, and weight from Strava, Fitbit (Google), and Withings into one Postgres-backed view. Built as a Next.js app + PWA so it works on phone and desktop from one codebase.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Drizzle ORM + Postgres
- PWA (manifest + service worker)
- OAuth provider clients per service

## Quick start

```bash
cp .env.example .env.local
# fill in DATABASE_URL and any provider client IDs/secrets you have

npm install
npm run db:push     # creates tables from src/db/schema.ts
npm run dev
```

Open http://localhost:3000.

## Connecting a service

1. Register an OAuth app with the provider (links in `.env.example`).
2. Set the redirect URI to `http://localhost:3000/api/callback/<provider>`.
3. Fill in the client ID/secret in `.env.local`.
4. Click "Connect" on the dashboard to start the OAuth flow.
5. Click "Sync" once connected to backfill data.

## Project layout

```
src/
  app/              # Next.js routes
    api/connect/[provider]   # OAuth start
    api/callback/[provider]  # OAuth callback
    api/sync/[provider]      # Manual sync trigger
  components/       # UI components
  db/               # Drizzle schema + client
  providers/        # OAuth provider clients (auth/refresh)
  sync/             # Per-provider data ingestion
  lib/              # Queries, helpers
public/
  manifest.webmanifest
  sw.js             # Minimal service worker
```

## Data model

- `users` — single dev user for now (see `lib/session.ts`)
- `oauth_tokens` — one row per (user, provider)
- `workouts` — Strava activities (cycling, hiking, snowboarding, soccer, etc.)
- `daily_metrics` — Fitbit daily summary (steps, resting HR, calories)
- `sleep_sessions` — Fitbit main sleep per night
- `weight_samples` — Withings smart scale readings
- `sync_runs` — log of sync attempts

## Roadmap

- [ ] Replace `getOrCreateDevUser` with real auth (NextAuth/Clerk/Lucia)
- [ ] Background sync via cron route or webhook subscriptions
- [ ] Trends page (rolling averages, training load, weight curve)
- [ ] Cross-source correlation views (e.g. sleep vs. next-day workout HR)
- [ ] Yoga Sculpt / Strava sport-type breakdown
- [ ] Kaiser Health import (later)
- [ ] App icons (`public/icon-192.png`, `public/icon-512.png`)

## Notes

- The service worker only registers in production (`npm run build && npm start`). Dev caching gets in the way.
- "Pixel Watch / Pixel 8 Pro" data flows through the Fitbit Web API as long as Fitbit-on-Pixel is configured. If Google migrates you off Fitbit and onto Health Connect, we'll need an Android companion app — keep an eye on the API.
- Withings tokens expire frequently; the token helper auto-refreshes 60s before expiry.

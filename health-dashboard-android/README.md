# Health Sync (Android)

Companion app for the Health Dashboard. Reads health data from Health Connect on your Pixel 8 Pro (which Pixel Watch 2 + Fitbit + Google Fit all write into) and POSTs it to your dashboard. Runs daily in the background.

## What it reads from Health Connect

- Steps (StepsRecord)
- Total calories burned
- Resting heart rate
- Sleep sessions (with stages: deep, REM, light, awake)
- Exercise sessions (workouts)

Withings weight is already covered by the server's Withings OAuth, so this app skips weight on purpose.

## Setup

### 1. Server side

Add this to your dashboard's `.env.local` (run `openssl rand -hex 32` for a token):

```
HEALTH_CONNECT_INGEST_TOKEN=<long random hex string>
```

Restart the dashboard. The endpoint at `POST /api/ingest/health-connect` will then accept authenticated payloads.

### 2. Android side

You need **Android Studio** (free from Google). Once installed:

1. `File → Open` → select the `health-dashboard-android/` directory.
2. Wait for Gradle sync. Accept any SDK install prompts.
3. Plug your Pixel 8 Pro in via USB. Enable USB debugging in Developer Options.
4. Press the green **Run** button. The app installs and launches.

In the app:

1. Paste your dashboard URL (e.g. `http://192.168.x.x:3000` for local dev, or your Vercel URL once deployed).
2. Paste the same `HEALTH_CONNECT_INGEST_TOKEN` value.
3. Tap **Save settings**.
4. Tap **Grant Health Connect permissions** — Android will show a system dialog with each requested data type. Allow them all.
5. Tap **Sync now**. The status line shows upsert counts.
6. Tap **Enable background sync** to run every ~6 hours automatically.

## Notes

- Local dev: phone and computer must be on the same Wi-Fi, and your dashboard must be reachable on that LAN. Easy way: bind dev to all interfaces with `next dev -H 0.0.0.0`. Use the local IP (`ipconfig getifaddr en0` on macOS) for the server URL.
- Ongoing: deploy the dashboard to Vercel so the phone can hit it from any network. The same token works.
- Battery: WorkManager respects Doze. Background syncs happen opportunistically, every 6h or longer if the phone's idle.
- Permissions: Health Connect data type permissions are revocable from Settings → Apps → Health Connect → App permissions.

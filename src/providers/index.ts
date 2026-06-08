import type { ProviderClient } from "./types";
import { strava } from "./strava";
import { withings } from "./withings";
import { googleCalendar } from "./google-calendar";

export type OAuthProvider = "strava" | "withings" | "google-calendar";

export const providers: Record<OAuthProvider, ProviderClient> = {
  strava,
  withings,
  "google-calendar": googleCalendar,
};

export function getProvider(name: string): ProviderClient {
  if (!(name in providers)) throw new Error(`unknown provider: ${name}`);
  return providers[name as OAuthProvider];
}

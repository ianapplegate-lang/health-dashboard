import type { ProviderClient } from "./types";
import { strava } from "./strava";
import { withings } from "./withings";

export type OAuthProvider = "strava" | "withings";

export const providers: Record<OAuthProvider, ProviderClient> = {
  strava,
  withings,
};

export function getProvider(name: string): ProviderClient {
  if (!(name in providers)) throw new Error(`unknown provider: ${name}`);
  return providers[name as OAuthProvider];
}

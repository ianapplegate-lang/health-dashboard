import type { ProviderClient } from "./types";
import { strava } from "./strava";
import { fitbit } from "./fitbit";
import { withings } from "./withings";

export type OAuthProvider = "strava" | "fitbit" | "withings";

export const providers: Record<OAuthProvider, ProviderClient> = {
  strava,
  fitbit,
  withings,
};

export function getProvider(name: string): ProviderClient {
  if (!(name in providers)) throw new Error(`unknown provider: ${name}`);
  return providers[name as OAuthProvider];
}

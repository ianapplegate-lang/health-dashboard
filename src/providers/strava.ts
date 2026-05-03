import { ProviderClient, OAuthTokens, requireEnv } from "./types";

const AUTH = "https://www.strava.com/oauth/authorize";
const TOKEN = "https://www.strava.com/oauth/token";
const SCOPES = "read,activity:read_all,profile:read_all";

export const strava: ProviderClient = {
  name: "strava",

  authUrl(state) {
    const env = requireEnv("strava", ["STRAVA_CLIENT_ID", "STRAVA_REDIRECT_URI"]);
    const params = new URLSearchParams({
      client_id: env.STRAVA_CLIENT_ID,
      redirect_uri: env.STRAVA_REDIRECT_URI,
      response_type: "code",
      approval_prompt: "auto",
      scope: SCOPES,
      state,
    });
    return `${AUTH}?${params.toString()}`;
  },

  async exchangeCode(code) {
    const env = requireEnv("strava", ["STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET"]);
    const res = await fetch(TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: env.STRAVA_CLIENT_ID,
        client_secret: env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) throw new Error(`strava exchange failed: ${res.status}`);
    const json = await res.json();
    return toTokens(json);
  },

  async refresh(refreshToken) {
    const env = requireEnv("strava", ["STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET"]);
    const res = await fetch(TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: env.STRAVA_CLIENT_ID,
        client_secret: env.STRAVA_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) throw new Error(`strava refresh failed: ${res.status}`);
    const json = await res.json();
    return toTokens(json);
  },
};

function toTokens(json: {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  scope?: string;
  athlete?: { id: number };
}): OAuthTokens {
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: json.expires_at ? new Date(json.expires_at * 1000) : undefined,
    scope: json.scope,
    providerUserId: json.athlete?.id ? String(json.athlete.id) : undefined,
    raw: json,
  };
}

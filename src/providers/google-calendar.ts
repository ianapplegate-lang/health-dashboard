import { ProviderClient, OAuthTokens, requireEnv } from "./types";

const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const SCOPES = "https://www.googleapis.com/auth/calendar.readonly";

export const googleCalendar: ProviderClient = {
  name: "google-calendar",

  authUrl(state) {
    const env = requireEnv("google-calendar", [
      "GOOGLE_CALENDAR_CLIENT_ID",
      "GOOGLE_CALENDAR_REDIRECT_URI",
    ]);
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CALENDAR_CLIENT_ID,
      redirect_uri: env.GOOGLE_CALENDAR_REDIRECT_URI,
      response_type: "code",
      scope: SCOPES,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });
    return `${AUTH}?${params.toString()}`;
  },

  async exchangeCode(code) {
    const env = requireEnv("google-calendar", [
      "GOOGLE_CALENDAR_CLIENT_ID",
      "GOOGLE_CALENDAR_CLIENT_SECRET",
      "GOOGLE_CALENDAR_REDIRECT_URI",
    ]);
    const body = new URLSearchParams({
      code,
      client_id: env.GOOGLE_CALENDAR_CLIENT_ID,
      client_secret: env.GOOGLE_CALENDAR_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_CALENDAR_REDIRECT_URI,
      grant_type: "authorization_code",
    });
    const res = await fetch(TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      throw new Error(`google-calendar exchange failed: ${res.status} ${await res.text()}`);
    }
    return toTokens(await res.json());
  },

  async refresh(refreshToken) {
    const env = requireEnv("google-calendar", [
      "GOOGLE_CALENDAR_CLIENT_ID",
      "GOOGLE_CALENDAR_CLIENT_SECRET",
    ]);
    const body = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.GOOGLE_CALENDAR_CLIENT_ID,
      client_secret: env.GOOGLE_CALENDAR_CLIENT_SECRET,
      grant_type: "refresh_token",
    });
    const res = await fetch(TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw new Error(`google-calendar refresh failed: ${res.status}`);
    const json = await res.json();
    return {
      accessToken: json.access_token as string,
      refreshToken: refreshToken,
      expiresAt: new Date(Date.now() + (json.expires_in as number) * 1000),
      scope: json.scope as string | undefined,
      raw: json,
    };
  },
};

function toTokens(json: {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}): OAuthTokens {
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: new Date(Date.now() + json.expires_in * 1000),
    scope: json.scope,
    raw: json,
  };
}

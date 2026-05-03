import { ProviderClient, OAuthTokens, requireEnv } from "./types";

const AUTH = "https://www.fitbit.com/oauth2/authorize";
const TOKEN = "https://api.fitbit.com/oauth2/token";
const SCOPES = [
  "activity",
  "heartrate",
  "location",
  "nutrition",
  "profile",
  "settings",
  "sleep",
  "weight",
].join(" ");

export const fitbit: ProviderClient = {
  name: "fitbit",

  authUrl(state) {
    const env = requireEnv("fitbit", ["FITBIT_CLIENT_ID", "FITBIT_REDIRECT_URI"]);
    const params = new URLSearchParams({
      client_id: env.FITBIT_CLIENT_ID,
      redirect_uri: env.FITBIT_REDIRECT_URI,
      response_type: "code",
      scope: SCOPES,
      state,
    });
    return `${AUTH}?${params.toString()}`;
  },

  async exchangeCode(code) {
    const env = requireEnv("fitbit", [
      "FITBIT_CLIENT_ID",
      "FITBIT_CLIENT_SECRET",
      "FITBIT_REDIRECT_URI",
    ]);
    const body = new URLSearchParams({
      client_id: env.FITBIT_CLIENT_ID,
      grant_type: "authorization_code",
      redirect_uri: env.FITBIT_REDIRECT_URI,
      code,
    });
    const res = await fetch(TOKEN, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: basicAuth(env.FITBIT_CLIENT_ID, env.FITBIT_CLIENT_SECRET),
      },
      body,
    });
    if (!res.ok) throw new Error(`fitbit exchange failed: ${res.status}`);
    return toTokens(await res.json());
  },

  async refresh(refreshToken) {
    const env = requireEnv("fitbit", ["FITBIT_CLIENT_ID", "FITBIT_CLIENT_SECRET"]);
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    const res = await fetch(TOKEN, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: basicAuth(env.FITBIT_CLIENT_ID, env.FITBIT_CLIENT_SECRET),
      },
      body,
    });
    if (!res.ok) throw new Error(`fitbit refresh failed: ${res.status}`);
    return toTokens(await res.json());
  },
};

function basicAuth(id: string, secret: string) {
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

function toTokens(json: {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  user_id?: string;
}): OAuthTokens {
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : undefined,
    scope: json.scope,
    providerUserId: json.user_id,
    raw: json,
  };
}

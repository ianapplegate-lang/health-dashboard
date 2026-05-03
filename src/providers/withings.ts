import { ProviderClient, OAuthTokens, requireEnv } from "./types";

const AUTH = "https://account.withings.com/oauth2_user/authorize2";
const TOKEN = "https://wbsapi.withings.net/v2/oauth2";
const SCOPES = "user.metrics,user.activity,user.sleepevents";

export const withings: ProviderClient = {
  name: "withings",

  authUrl(state) {
    const env = requireEnv("withings", [
      "WITHINGS_CLIENT_ID",
      "WITHINGS_REDIRECT_URI",
    ]);
    const params = new URLSearchParams({
      client_id: env.WITHINGS_CLIENT_ID,
      redirect_uri: env.WITHINGS_REDIRECT_URI,
      response_type: "code",
      scope: SCOPES,
      state,
    });
    return `${AUTH}?${params.toString()}`;
  },

  async exchangeCode(code) {
    const env = requireEnv("withings", [
      "WITHINGS_CLIENT_ID",
      "WITHINGS_CLIENT_SECRET",
      "WITHINGS_REDIRECT_URI",
    ]);
    return postToken({
      action: "requesttoken",
      grant_type: "authorization_code",
      client_id: env.WITHINGS_CLIENT_ID,
      client_secret: env.WITHINGS_CLIENT_SECRET,
      code,
      redirect_uri: env.WITHINGS_REDIRECT_URI,
    });
  },

  async refresh(refreshToken) {
    const env = requireEnv("withings", ["WITHINGS_CLIENT_ID", "WITHINGS_CLIENT_SECRET"]);
    return postToken({
      action: "requesttoken",
      grant_type: "refresh_token",
      client_id: env.WITHINGS_CLIENT_ID,
      client_secret: env.WITHINGS_CLIENT_SECRET,
      refresh_token: refreshToken,
    });
  },
};

async function postToken(fields: Record<string, string>): Promise<OAuthTokens> {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
  });
  if (!res.ok) throw new Error(`withings token failed: ${res.status}`);
  const json = await res.json();
  if (json.status !== 0) {
    throw new Error(`withings token error: status=${json.status} ${json.error ?? ""}`);
  }
  const body = json.body as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    userid: number;
  };
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: new Date(Date.now() + body.expires_in * 1000),
    scope: body.scope,
    providerUserId: String(body.userid),
    raw: json,
  };
}

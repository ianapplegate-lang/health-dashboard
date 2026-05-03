import crypto from "node:crypto";

const STATE_COOKIE_PREFIX = "oauth_state_";

export function makeState() {
  return crypto.randomBytes(16).toString("hex");
}

export function stateCookieName(provider: string) {
  return `${STATE_COOKIE_PREFIX}${provider}`;
}

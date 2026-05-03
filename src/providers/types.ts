import type { Provider } from "@/db/schema";

export type OAuthTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
  providerUserId?: string;
  raw?: unknown;
};

export interface ProviderClient {
  readonly name: Provider;
  authUrl(state: string): string;
  exchangeCode(code: string): Promise<OAuthTokens>;
  refresh(refreshToken: string): Promise<OAuthTokens>;
}

export class ProviderConfigError extends Error {
  constructor(provider: Provider, missing: string[]) {
    super(`${provider} provider missing env vars: ${missing.join(", ")}`);
    this.name = "ProviderConfigError";
  }
}

export function requireEnv(provider: Provider, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  const missing: string[] = [];
  for (const k of keys) {
    const v = process.env[k];
    if (!v) missing.push(k);
    else out[k] = v;
  }
  if (missing.length) throw new ProviderConfigError(provider, missing);
  return out;
}

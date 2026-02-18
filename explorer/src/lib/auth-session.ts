import { createHmac } from "crypto";

const COOKIE_NAME = "admin_session";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ??
    process.env.ENRICHMENT_ADMIN_SECRET ??
    "dev-session-secret-change-in-production"
  );
}

export function getSessionCookieName(): string {
  return COOKIE_NAME;
}

export interface SessionPayload {
  u: string;
  exp: number;
}

/**
 * Create a signed session token (use in API route / Node).
 * Cookie value = base64url(payload) + "." + base64url(hmac).
 */
export function createSessionToken(username: string): string {
  const secret = getSecret();
  const payload: SessionPayload = {
    u: username,
    exp: Date.now() + TTL_MS,
  };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr, "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(payloadStr).digest("base64url");
  return `${payloadB64}.${sig}`;
}

/**
 * Cookie options for setting the session (use in API route).
 */
export function getSessionCookieOptions(request: Request): {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    name: COOKIE_NAME,
    value: "", // caller sets after createSessionToken
    httpOnly: true,
    secure: request.url.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24h in seconds
  };
}

import crypto from "crypto";

/**
 * Server-signed attendant session tokens.
 *
 * Attendant logins used to hand out an UNSIGNED base64 JSON blob — anyone who
 * knew an attendant id could mint one. Tokens are now HMAC-SHA256 signed with
 * SESSION_SECRET and expiry-bound, so the proxy can verify them locally
 * (fail-closed) even while the upstream API is unreachable.
 *
 * Format: `base64url(payloadJson).hexHmacSignature` — two dot-separated
 * parts, deliberately distinct from both the legacy blob (no dot) and a real
 * JWT (three parts).
 */

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days — tills stay logged in

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    // Fail loudly in dev rather than silently minting forgeable tokens.
    throw new Error("SESSION_SECRET is required to mint/verify attendant tokens");
  }
  return s;
}

function sign(payloadB64: string): string {
  return crypto.createHmac("sha256", secret()).update(payloadB64).digest("hex");
}

export interface AttendantTokenPayload {
  attendantId: string;
  shopId?: unknown;
  adminId?: unknown;
  permissions?: unknown[];
  loginTime?: string;
  exp?: number; // ms since epoch
  [key: string]: unknown;
}

export function mintAttendantToken(payload: AttendantTokenPayload): string {
  const body = { ...payload, exp: Date.now() + TOKEN_TTL_MS };
  const payloadB64 = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

/** Returns the payload when the token is authentic and unexpired, else null. */
export function verifyAttendantToken(token: string): AttendantTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  let expected: string;
  try {
    expected = sign(payloadB64);
  } catch {
    return null; // no secret configured — nothing can verify
  }
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    if (!payload || typeof payload !== "object" || !payload.attendantId) return null;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

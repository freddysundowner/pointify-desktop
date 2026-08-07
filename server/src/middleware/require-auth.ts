import type { Request, Response, NextFunction } from "express";
import { makeOnlinePointifyRequest, makeLocalPointifyRequest } from "../config.js";
import { verifyAttendantToken } from "../lib/attendant-token.js";

/**
 * Proxy-level auth gate — FAIL CLOSED.
 *
 * Historically several data route families (suppliers, purchases, cashflow,
 * cashflow categories, settings, email receipt) were pure pass-throughs
 * reachable with no credentials at all. This middleware requires a token the
 * proxy can actually verify:
 *
 *  1. Attendant tokens (password and PIN login) are now HMAC-signed with
 *     SESSION_SECRET and expiry-bound (lib/attendant-token.ts). They are
 *     verified locally and cryptographically — works offline, unforgeable.
 *  2. Admin tokens are upstream Pointify JWTs whose secret we don't hold, so
 *     they are validated by upstream introspection: GET /auth/admin/<subject>
 *     with the token must positively return that admin. Successful
 *     validations are cached (short TTL for freshness, plus a longer
 *     "last known good" window so an already-verified admin session survives
 *     an upstream outage). Anything else — forged, expired, unknown subject,
 *     indeterminate upstream result for a never-verified token — is rejected.
 *
 * Legacy unsigned attendant blobs are rejected; those sessions must log in
 * again once to obtain a signed token.
 */

const CACHE_OK_MS = 5 * 60 * 1000; // positive introspection considered fresh
const CACHE_LAST_GOOD_MS = 24 * 60 * 60 * 1000; // outage-bridging trust window
const CACHE_BAD_MS = 60 * 1000; // re-check a rejected token after 1 min
const CACHE_MAX = 500;

interface CacheEntry {
  ok: boolean;
  freshUntil: number;
  trustUntil: number; // only meaningful when ok
}
const verifyCache = new Map<string, CacheEntry>();

function cacheSet(token: string, ok: boolean) {
  if (verifyCache.size >= CACHE_MAX) {
    const oldest = verifyCache.keys().next().value;
    if (oldest !== undefined) verifyCache.delete(oldest);
  }
  const now = Date.now();
  verifyCache.set(token, {
    ok,
    freshUntil: now + (ok ? CACHE_OK_MS : CACHE_BAD_MS),
    trustUntil: ok ? now + CACHE_LAST_GOOD_MS : 0,
  });
}

function tryParseJwtPayload(token: string): any | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

/**
 * Upstream introspection call. Returns the raw response object, or
 * `undefined` when neither the online nor the local upstream could be
 * reached (transport failure).
 * Deliberately NOT makePointifyRequest: its graceful-fallback chain masks a
 * definitive upstream 401 as null/[], which would validate forged tokens.
 */
export type Introspect = (
  endpoint: string,
  headers?: Record<string, string>,
) => Promise<any | undefined>;

const defaultIntrospect: Introspect = async (endpoint, headers) => {
  try {
    return await makeOnlinePointifyRequest(endpoint, { method: "GET", headers });
  } catch {
    try {
      return await makeLocalPointifyRequest(endpoint, { method: "GET", headers });
    } catch {
      return undefined;
    }
  }
};

export type VerifyResult = "valid" | "invalid" | "indeterminate";

/**
 * Core verification, exported with an injectable introspection function so
 * tests can exercise every upstream outcome hermetically.
 * FAIL-CLOSED: "valid" only for a locally verified signed attendant token or
 * a positively introspected admin JWT. "indeterminate" is returned only when
 * a structurally plausible admin JWT could not be introspected because the
 * upstream was unreachable — the caller treats it as invalid unless the same
 * token was positively verified recently.
 */
export async function verifyBearerToken(
  token: string,
  introspect: Introspect = defaultIntrospect,
): Promise<VerifyResult> {
  // 1) Signed attendant token — full local cryptographic verification.
  if (verifyAttendantToken(token)) return "valid";

  // 2) Admin JWT — validate via upstream introspection.
  const payload = tryParseJwtPayload(token);
  if (!payload) return "invalid"; // legacy blobs, garbage, tampered signed tokens
  if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
    return "invalid";
  }
  const subjectId = payload.id || payload._id || payload.sub || payload.userId;
  if (!subjectId || typeof subjectId !== "string") return "invalid"; // no subject → unverifiable

  const data = await introspect(`/auth/admin/${subjectId}`, {
    Authorization: `Bearer ${token}`,
  });
  if (data === undefined) return "indeterminate"; // upstream unreachable
  // Only a positive identification of the token's own subject counts.
  return data && typeof data === "object" && (data as any)._id === subjectId
    ? "valid"
    : "invalid";
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  const now = Date.now();
  const cached = verifyCache.get(token);
  if (cached) {
    if (cached.ok && cached.freshUntil > now) return next();
    if (!cached.ok && cached.freshUntil > now) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  }

  try {
    const result = await verifyBearerToken(token);
    if (result === "indeterminate") {
      // Upstream unreachable. Do NOT overwrite the cache — a token that was
      // positively verified within the trust window keeps its session alive
      // through the outage; a never-verified token is rejected (fail closed).
      if (cached?.ok && cached.trustUntil > now) return next();
      return res.status(401).json({ error: "Could not verify token" });
    }
    const ok = result === "valid";
    cacheSet(token, ok);
    if (!ok) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    next();
  } catch (error) {
    console.error("Auth verification error:", error);
    return res.status(401).json({ error: "Could not verify token" });
  }
}

import type { Request, Response, NextFunction } from "express";
import { verifyAttendantToken } from "../lib/attendant-token.js";
import { requestAuth } from "../lib/request-context.js";

/**
 * Attendant sessions are tokens minted by THIS server (lib/attendant-token.ts), so the Pointify API
 * cannot verify them. The API now enforces its own tokens on every route, so before any route runs we
 * swap the session token for the API token it carries (`ut`, issued by the API at attendant login) and
 * keep the original on `req.sessionToken` for the checks that need it (requireAuth, /attendant/verify).
 *
 * Admin sessions already hold a real API token and pass through unchanged. A session minted before `ut`
 * existed has nothing to swap in: it is forwarded as is, the API answers 401 and the client logs in again.
 */
export function translateAttendantAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    const payload = verifyAttendantToken(token);
    if (payload) {
      (req as any).sessionToken = token;
      (req as any).attendant = payload;
      if (typeof payload.ut === "string" && payload.ut) {
        req.headers.authorization = `Bearer ${payload.ut}`;
      }
    }
  }
  // make the (translated) credentials available to every upstream call made while handling this request
  requestAuth.run({ authorization: req.headers.authorization }, next);
}

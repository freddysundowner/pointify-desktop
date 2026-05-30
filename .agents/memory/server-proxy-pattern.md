---
name: Server proxy to Pointify backend
description: How client /api/* calls reach the real Pointify backend in this POS repo
---

# Server is a thin proxy, not the real backend

The Express server (server/, port 3000) does NOT own data. The real POS backend
is a separate deployed Pointify proxy (e.g. https://sandbox.pointifypos.com).

- Client calls relative `/api/*` (via `apiCall` in client/src/lib/api-config.ts).
- Vite proxies `/api` -> local Express :3000.
- Each route module in `server/src/routes/*.ts` forwards to the upstream using
  `makePointifyRequest("/path", { method, headers, body })` from `server/src/config.ts`.
  Note: drop the `/api` prefix when forwarding — `/api/sms/topup` -> `makePointifyRequest("/sms/topup")`.
- Forward the incoming `Authorization` header through.
- Register new modules in `server/src/routes/index.ts` (import + call in registerAllRoutes).

**Why:** Any NEW client `/api/*` endpoint will 404 on the `/api/*` catch-all in
server/src/index.ts unless a matching forwarding route exists here. Adding a client
endpoint is a TWO-repo change conceptually: client call + server forward route + the
upstream Pointify proxy must actually implement it.

**How to apply:** When adding a feature that calls a new `/api/...` path, mirror an
existing route module (sms.ts is the simplest template) and forward via makePointifyRequest.

# makePointifyRequest masks upstream HTTP status (graceful fallback)

`makePointifyRequest` does NOT propagate upstream error status reliably. On a non-OK
online response it returns `{ success:false, httpStatus, ... }` (no throw), and the
online/hybrid branches treat `success===false` as a trigger to retry the LOCAL API and
then fall through to `gracefulFallback()`. Net effect: a meaningful upstream status like
**409 Conflict gets swallowed** before the client ever sees it.

**Why:** This makes it impossible to implement client-enforced semantics that depend on
distinguishing conflict (409) vs not-implemented (404) vs success — e.g. atomic
"allocate/consume this M-Pesa ref, reject if already used" double-spend prevention.

**How to apply:** Any logic that must act on a specific upstream status (conflict,
payment already allocated, idempotency rejection) has to be enforced UPSTREAM (the
Pointify/SunPay proxy at commit time), not in the client or this thin proxy layer.
Don't build client allocate-then-check flows through makePointifyRequest — they become
security theater.

# Writes must surface upstream failure (not fake-success [])

The original masking (above) caused a real bug: a rejected sale (`POST /sales` upstream
4xx) was turned into `200 []`, so the cashier saw success while nothing saved. Fix in
config.ts: a `isWriteMethod()` helper; in BOTH the `online` and `hybrid` cases, when
`response.success===false && isWriteMethod && response.httpStatus`, return the error
object instead of retrying local / gracefulFallback. `makeOnlinePointifyRequest` logs the
upstream status+body (`🛑 Upstream ...`). Routes must then check `data?.success===false`
and `res.status(data.httpStatus||502)` — only `POST /api/sales` does this so far.

**Why:** GET masking is fine (empty list degrades gracefully); WRITE masking is dangerous
(silent data loss, double-charge confusion). Reads still fall back to [].

**How to apply:** Any write route that does `res.json(data)` after makePointifyRequest can
now return `200 {success:false,...}` — sweep them to forward `data.httpStatus` as the
HTTP status if you need true non-2xx everywhere. To see why a write actually failed, grep
the Server log for `🛑 Upstream` after reproducing.

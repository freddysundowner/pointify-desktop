---
name: Canonical frontend API transport
description: All client /api calls route through rawApiFetch in api-config.ts; dual token precedence is intentional; migration pitfalls.
---

All frontend `/api/*` calls go through `rawApiFetch` (client/src/lib/api-config.ts). It attaches the bearer token per `auth: 'admin-first' | 'attendant-first' | 'none'` (explicit Authorization header always wins), supports `timeoutMs`, returns the raw Response, and never throws on non-2xx — callers own error semantics.

**Why:** Two token precedences coexist by design: `apiCall` = admin-first (authToken||attendantToken), React Query layer (`apiRequest`/`getQueryFn`) = attendant-first. Both are load-bearing on shared tills — do NOT unify them.

**How to apply:**
- New code: never `fetch('/api/...')` directly. Use `apiCall`, `apiRequest`, or `rawApiFetch` with the correct `auth`.
- Sites that historically sent no token must pass `auth: 'none'` — the default is admin-first and would silently change request identity.
- `apiCall` deliberately strips any caller `signal` and enforces its own 20s timeout (legacy behavior). `rawApiFetch` skips its timeout when a caller signal is supplied.
- Offline-login gating relies on native fetch rejections; rawApiFetch preserves them (no wrapper errors on transport failure).
- Exceptions that stay raw fetch: print agent localhost:9105 and non-/api URLs (e.g. debtors excel export).
- Never `controller.abort("some string")` for timeouts: standards fetch rejects with the raw reason (no `.name`), which breaks AbortError mapping and offline detection. Abort with a DOMException('...', 'AbortError'), and keep isNetworkError/apiCall tolerant of non-Error rejections. Tests must reject with the signal's real `.reason`, not fabricated error objects.


## Proxy auth gate policy
- The proxy fails CLOSED on data routes: attendant tokens are server-signed (HMAC w/ SESSION_SECRET) and verified locally so offline tills keep working; admin JWTs (upstream-signed, no shared secret) are validated by upstream introspection, with a cached "last known good" window to bridge outages.
- **Why:** unsigned/presence-only checks were rejected in review — any base64 blob or forged JWT unlocked shop data. Never verify tokens through the graceful-fallback request path: it masks upstream 401s as empty successes.
- `auth: 'none'` on the client is reserved for genuinely pre-login endpoints (login, pings, public config, local printer routes, payment polling during expired subscription). Data calls use admin-first or attendant-first; each falls back to the other token.

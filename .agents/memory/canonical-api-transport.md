---
name: Canonical frontend API transport
description: All client /api calls route through rawApiFetch in api-config.ts; dual token precedence is intentional; migration pitfalls.
---

All frontend `/api/*` calls go through `rawApiFetch` (client/src/lib/api-config.ts). It attaches the bearer token per `auth: 'admin-first' | 'attendant-first' | 'none'` (explicit Authorization header always wins), supports `timeoutMs`, returns the raw Response, and never throws on non-2xx — callers own error semantics.

**Why:** Task consolidated ~70 raw fetch sites; behavior preservation required per-site auth mapping because two token precedences coexist: `apiCall` = admin-first (authToken||attendantToken), React Query layer (`apiRequest`/`getQueryFn`) = attendant-first. Both are load-bearing on shared tills — do NOT unify them.

**How to apply:**
- New code: never `fetch('/api/...')` directly. Use `apiCall`, `apiRequest`, or `rawApiFetch` with the correct `auth`.
- Sites that historically sent no token must pass `auth: 'none'` — the default is admin-first and would silently change request identity.
- `apiCall` deliberately strips any caller `signal` and enforces its own 20s timeout (legacy behavior). `rawApiFetch` skips its timeout when a caller signal is supplied.
- Offline-login gating relies on native fetch rejections; rawApiFetch preserves them (no wrapper errors on transport failure).
- Exceptions that stay raw fetch: print agent localhost:9105 and non-/api URLs (e.g. debtors excel export).

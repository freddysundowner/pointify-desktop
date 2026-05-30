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

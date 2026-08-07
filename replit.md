# Pointify POS

A full-featured point-of-sale web application for small businesses in Kenya. It acts as a proxy/offline-capable frontend for the Pointify backend API (`api.pointifypos.com`).

## Stack

- **Client**: React + Vite (port 5000), Tailwind CSS v3, Redux Toolkit, React Query, Wouter routing
- **Server**: Express + TypeScript (port 3000), proxy to upstream Pointify API, supports offline/hybrid modes

## How to run

Two workflows must both be running:

1. **Server** — `cd server && PORT=3000 npm run dev`
2. **Start application** — `cd client && npm run dev`

The Vite dev server (port 5000) proxies `/api` and `/uploads` to the Express server (port 3000).

## Key environment variables (server)

- `POINTIFY_API_URL` — online Pointify API base URL (default: `https://api.pointifypos.com`)
- `POINTIFY_OFFLINE_API_URL` — local/offline Pointify API base URL
- `SESSION_SECRET` — session secret (set in Replit Secrets)

## Notes

- `@tailwindcss/vite` (Tailwind v4 plugin) was removed from client devDependencies — the project uses Tailwind v3 via PostCSS, and the v4 plugin pulled in a blocked transitive dependency (`tar`).
- Client install requires `--legacy-peer-deps` due to `jspdf-autotable` peer conflict.
- The server serves uploaded product images at `/uploads` (outside the `/api` prefix).

## Frontend API convention
All client calls to `/api/*` go through the canonical transport in `client/src/lib/api-config.ts`:
- `rawApiFetch(endpoint, opts)` — the single low-level transport. Attaches auth per `auth: 'admin-first' | 'attendant-first' | 'none'` (an explicit `Authorization` header always wins), optional `timeoutMs`. Returns the raw `Response` and never throws on HTTP error statuses — callers own error semantics.
- `apiCall(endpoint, opts)` — high-level wrapper (admin-first token, 20s timeout, no-cache headers, 401 redirect/logout handling). Returns a raw `Response`; callers must `.json()`.
- `apiRequest(method, url, data)` / `getQueryFn` in `client/src/lib/queryClient.ts` — React Query layer (attendant-first token), delegates to `rawApiFetch`.

Never call `fetch('/api/...')` directly in new code — use one of the above. The two token precedences (admin-first vs attendant-first) are intentional and must not be unified. Exceptions that stay raw `fetch`: the local print agent (`localhost:9105` in `lib/print-agent.ts`) and non-`/api` external URLs.
- Offline mode stores data in IndexedDB (`idb`) and syncs when connectivity is restored.
- PWA service worker only active in production builds.

## User preferences

<!-- Add user preferences here as they are expressed -->

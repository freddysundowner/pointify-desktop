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
- Offline mode stores data in IndexedDB (`idb`) and syncs when connectivity is restored.
- PWA service worker only active in production builds.

## User preferences

<!-- Add user preferences here as they are expressed -->

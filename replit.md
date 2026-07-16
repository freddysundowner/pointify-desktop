# Pointify Desktop - POS Application

## Overview
A full-featured Point of Sale (POS) web application built with React + Vite (frontend) and Express (backend). Runs as a web app in Replit. (All Electron desktop-app code has been removed; offline support for the web app is provided by the browser's IndexedDB, not a local desktop database.)

## Architecture

### Frontend (client/)
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite (port 5000 in dev)
- **State Management**: Redux Toolkit
- **UI**: Tailwind CSS + Radix UI (shadcn/ui style)
- **Routing**: Wouter
- **Data Fetching**: TanStack React Query

### Backend (server/)
- **Runtime**: Node.js + TypeScript
- **Framework**: Express (port 1999)
- **Build Tool**: esbuild (outputs to server/dist/index.cjs)
- **API Mode**: Supports online/offline/hybrid modes with fallback logic

## Running in Development

The app uses a single `start.sh` script that starts both services:
- Express backend: `cd server && npm run dev` → port 1999
- Vite frontend: `cd client && npm run dev` → port 5000

On Replit, these are wired up as two workflows: `Server` (`cd server && PORT=3000 npm run dev`) and `Start application` (`cd client && npm run dev`, port 5000, the one shown in the preview).

Client dependency install currently requires `npm install --legacy-peer-deps` in `client/` due to a `jspdf`/`jspdf-autotable` peer conflict (tracked as a follow-up task). `server/` installs normally with `npm install`.

### Product Images
- Uploaded from the Add/Edit Product form; stored in Firebase Storage (bucket in `FIREBASE_STORAGE_BUCKET` secret) via `server/src/firebase.ts` (Firebase Admin SDK, credentials from `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` secrets).
- Upload endpoint: `POST /api/product/:id/image` (multipart, field name `image`) — uploads to Storage, makes the file public, then saves the resulting URL to the product's `images` field via the existing Pointify proxy (`PUT /product/:id`).
- Displayed in the POS "Restaurant Style" grid (`client/src/features/pos/product-grid.tsx`) via `product.images?.[0] || product.image`.

Frontend proxies `/api` requests to `http://localhost:1999`.

## Key Configuration

### PWA (Progressive Web App)
- Service worker: a hand-written `client/public/sw.js` (NOT `vite-plugin-pwa`,
  which has been removed). It precaches the app shell (`/`, `/index.html`),
  serves hashed `/assets/*` and icons/fonts cache-first, and uses network-first
  with a cached-shell fallback for HTML navigation. It never intercepts `/api/*`.
- Registration: `client/src/main.tsx` registers `/sw.js` **only in a production
  build** (`import.meta.env.PROD`). In the dev server it actively *unregisters*
  any SW and clears caches so Vite's HMR is never shadowed by stale bundles.
- **Offline therefore only works in the published/production app, not the dev
  (`*.replit.dev`) preview.** Installing the PWA from the dev URL and opening it
  offline shows Chrome's native "You're offline" page because there is no SW
  there by design. Install/test offline from the published `*.replit.app` URL.
- Icons: `client/public/icon-192.png`, `client/public/icon-512.png`, `client/public/icon.svg`
- Manifest: static file at `client/public/manifest.webmanifest`
- Supports install-to-home-screen on Android/iOS/Desktop Chrome

### Vite Config (client/vite.config.ts)
- `host: '0.0.0.0'` — required for Replit proxy
- `allowedHosts: true` — required for Replit iframe preview
- `port: 5000` — required for webview workflow
- Proxy: `/api` → `http://localhost:1999`

### Server (server/src/index.ts)
- Runs on port 1999
- Serves static client files from `client/dist` in production
- Has network monitoring for online/offline detection

## Deployment Configuration
- **Target**: Autoscale
- **Build**: `cd client && npm install && npm run build && cd ../server && npm install && npm run build`
- **Run**: `node server/dist/index.cjs`
- The production server serves the built React app as static files

## Environment Variables (.env)
- `POINTIFY_API_URL` — Online API base URL
- `POINTIFY_API_KEY` — API authentication key
- `POINTIFY_OFFLINE_API_URL` — Local/offline API URL
- `EXPORT_METHOD` — Data export method (mongodb/api)
- `POINTIFY_MONGO_URL` — MongoDB connection string

## Features
- Point of Sale (POS) terminal
- Inventory management
- Sales tracking and receipts
- Purchase orders
- Customer management
- Supplier management
- Expense tracking
- Cash flow management
- Staff/attendant management with permissions
- Reports and analytics
- Online/offline synchronization

## Offline Sync & Duplicate-Sale Safety

Sales made while offline are stored on the device and automatically sent to the
server when the connection comes back. To stop the same sale from being counted
twice during this catch-up, every sale carries a stable idempotency key
(`clientRef`):

- It is generated **once** when the sale is rung up and never changes, even if
  the sale has to be retried several times.
- The device's sync queue refuses to queue the same `clientRef` twice.
- The `clientRef` is sent to the main Pointify server with the sale.

### Known residual risk (action needed on the main server)

This repository contains only the **POS app** (the React client) and a **thin
proxy** (`server/`) that forwards requests to the separate main Pointify backend
at `api.pointifypos.com` (set via `POINTIFY_API_URL` in `server/.env`). That main backend's source code is **not** part of
this project and cannot be changed from here.

Full protection against duplicate sales requires the main server's create-sale
endpoint to **remember the `clientRef` and reject (or return the original of) a
repeat**. Until it does, one rare edge case can still double-count a sale:

> A queued offline sale is replayed on reconnect. It reaches the server and the
> sale + stock movement are saved, but the server's reply is lost on the way
> back. The device thinks it failed, so it sends the same sale again — and the
> server, not recognising the `clientRef`, saves it a second time.

**What this means for shop owners:** in this specific "lost reply" situation a
sale and its stock reduction may appear twice. It is uncommon (needs a network
drop at the exact moment the server is replying), but it is possible. Watch for
two identical receipts created seconds apart after a device reconnects, and
reconcile stock if you see one.

**To fully close this gap,** the main Pointify backend team must make the
create-sale endpoint store and check `clientRef` (treat it as a unique key) and,
on a repeat, return the original sale instead of creating a new one. The POS app
already sends everything needed for this. Once that change is live, an
offline-then-reconnect test should confirm exactly one sale and one stock
movement per `clientRef`.

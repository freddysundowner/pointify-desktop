# Pointify Desktop - POS Application

## Overview
A full-featured Point of Sale (POS) web application built with React + Vite (frontend) and Express (backend). Originally designed as an Electron desktop app, configured here to run as a web app in Replit.

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

Frontend proxies `/api` requests to `http://localhost:1999`.

## Key Configuration

### PWA (Progressive Web App)
- Plugin: `vite-plugin-pwa` with Workbox `generateSW` strategy
- Icons: `client/public/icon-192.png`, `client/public/icon-512.png`, `client/public/icon.svg`
- Manifest: auto-generated as `/manifest.webmanifest`
- Service worker: NetworkFirst for `/api/*`, precaches static assets
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

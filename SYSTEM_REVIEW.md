# Pointify POS — Full System Review

**Date:** August 7, 2026
**Scope:** Entire codebase — client (React PWA), server (Express proxy), local print agent — with focus on offline capability end-to-end and readiness for large-institution use.

---

## 1. Executive Summary

Pointify POS is a well-architected offline-first point-of-sale web app. It **is a PWA** and can genuinely operate through internet outages for its core selling flow: cached product catalog, offline cash sales with a sync queue, offline admin login, and receipt printing via USB. The engineering quality of the offline core is above average.

However, it is **not yet ready for a large institution** without remediation. The main blockers are:

1. **Duplicate-sale risks in the sync queue** (being fixed — Task #4)
2. **Offline data is shared across all users on a device** — a serious problem for multi-attendant tills (being fixed — Task #5)
3. **Attendants can be locked out during outages** (being fixed — Tasks #6/#7)
4. **Silent "empty data" fallback** — when the backend is unreachable, most reports and lists return an empty result identical to "no records," hiding outages from staff
5. **Security hardening gaps** — TLS verification disabled server-wide, sensitive data in logs, no rate limiting/CORS policy, unencrypted PII in browser storage
6. **Offline coverage is only partial** — sales/products/customers work offline; reports, expenses, purchases, inventory pages, and bookings do **not**

Verdict: **suitable today for single-shop / single-till deployments; needs the fixes in sections 4–8 before institutional rollout.**

---

## 2. Architecture Overview

```
Browser (React PWA, port 5000 in dev)
 ├─ Service worker  → caches app shell (production builds only)
 ├─ IndexedDB       → offline products, customers, sales queue, auth vault
 └─ /api, /uploads  → proxied to Express
        │
Express server (port 3000, server/src)
 ├─ Online/offline/hybrid routing with 4s/15s timeouts + 30s circuit breaker
 ├─ POINTIFY_API_URL          → cloud backend (api.pointifypos.com)
 └─ POINTIFY_OFFLINE_API_URL  → optional on-prem/LAN backend
        │
Upstream Pointify backend (MongoDB) — the actual database
```

Key fact: **the Express server has no database of its own.** Its "offline mode" means routing to a *local* backend if one is configured (`server/src/config.ts:12-14`). Without an on-prem backend, all offline resilience lives in the browser's IndexedDB. Server-side sync is a leftover from an Electron build and is a no-op on web (`server/src/network-status-handler.ts`).

A local print agent (`agent/pointify-print-agent.js`, port 9105) bridges the browser to shop-LAN thermal printers, since a cloud server cannot reach them.

---

## 3. Offline, End to End — How It Actually Works

### 3.1 PWA / service worker
- `client/public/sw.js` caches the app shell (HTML/JS/CSS/assets). Cache-first for static assets, network-first with `index.html` fallback for navigation. It **never caches `/api` data** — by design; data offline is IndexedDB's job.
- Registered **only in production builds** (`client/src/main.tsx:13-33`). In dev the SW is unregistered and caches purged. **Offline behavior can only be tested on the published app.**
- Cache version is stamped per build (`client/vite.config.ts`), so deploys self-bust stale caches. A dev fallback recovers browsers stuck with a stale production SW.
- Manifest (`client/public/manifest.webmanifest`): installable, standalone, portrait, proper icons. ✔

### 3.2 Offline data (IndexedDB, `client/src/lib/offline-storage.ts`)
- DB `pos-offline-db`, stores: products (name/barcode/category indexes), customers, transactions, settings, sync_queue, auth vault.
- Products and customers are cached after each successful fetch and served from cache on network failure (POS grid, barcode search).
- An "initial sync" component pre-warms the cache after login.

### 3.3 Offline sales lifecycle
1. Sale attempted; on `navigator.onLine === false` or transport failure it is saved locally with an `offline_` ID and queued. A stable `clientRef` (UUID) travels with the sale for idempotency.
2. Customers/products created offline get `temp_` IDs and are queued too.
3. On reconnect (1.5s after `online` event, then every 30s): queue replays sequentially — creates customers/products first, captures real IDs into a persisted ID map, remaps sales, then posts them.
4. Failures retry up to 5×, then park as **failed** in a review panel (`sync-review-panel.tsx`) where staff can Retry or Discard.

### 3.4 Offline login
- **Admin:** after an online login, a salted PBKDF2 *verifier* (never the plaintext password) is stored (`client/src/lib/offline-auth.ts`). Offline login works for 30 days, and only fires on genuine transport failure — a server "wrong password" is final, so an old password can't sneak in. ✔
- **Attendant:** cached session restores offline, but the **lock-screen unlock always requires the server** (`AttendantAuthContext.tsx:123-143`) — attendants get locked out mid-shift during outages. ✖ (Tasks #6/#7)

### 3.5 What works offline vs. what doesn't

| Area | Offline? | Notes |
|---|---|---|
| POS selling (cash/credit) | ✔ | Cached products/customers, queued sales |
| Barcode scanning | ✔ | IndexedDB barcode index |
| Creating customers/products at POS | ✔ | temp_ IDs, remapped on sync |
| Admin login | ✔ | 30-day verifier |
| Attendant unlock | ✖ | Server-only (fix in progress) |
| M-Pesa payments | ✖ by design | UI blocks selection offline; online-only |
| Receipt: USB (WebUSB ESC/POS) | ✔ | Direct browser→printer |
| Receipt: browser/PDF | ✔ | Uses already-loaded data |
| Receipt: LAN print agent | ✖ partly | Receipt text is formatted by the **cloud server** (`/api/printer/format`), so agent receipts fail offline; kitchen tickets format client-side and do work |
| Reports (income, profit, due sales, discounts, returns, stock…) | ✖ | API-only, no cache fallback |
| Expenses / Purchases | ✖ | API-only, create/edit fail offline |
| Inventory management pages | ✖ | API-only (POS grid is the exception) |
| Bookings / rooms | ✖ | Upstream-only |
| Sales history page | ✖ | `features/shop/history.tsx` is a non-functional placeholder — never reads the local transaction store |

---

## 4. Sync Reliability Findings (duplicate/lost sale risks)

*(Addressed by Tasks #4 and #8 in the task list.)*

- **Dedup status mismatch:** duplicate detection excludes queue items with status `completed`, but the real terminal status is `synced` (`offline-storage.ts:260-284`). Already-synced sales can be re-enqueued and posted again.
- **No in-flight claim:** `syncNow` posts without first marking the item as syncing (`useOfflineSync.ts`). A crash/reload mid-POST replays the request on next sync. This is safe **only if** the upstream backend enforces `clientRef` deduplication — which is not confirmed.
- **Unrecognized response shape → duplicate creation:** if a customer/product create succeeds but the response ID isn't parsed (`useOfflineSync.ts:114-139`), the item is marked failed and retried — creating a second server record.
- **M-Pesa "already paid" flow:** matching an unallocated payment to a sale is purely visual (cashier eyeballs name/amount/time). No atomic server-side allocation is confirmed → race/double-allocation risk on busy tills.
- **STK polling gap:** payment status polls every 3s until timeout; if the network drops mid-poll, a *successful* payment can leave the sale unfinalized with only manual recovery.
- No exponential backoff, no cross-tab lock (two open tabs can both sync), no Background Sync API — sync only runs while the app tab is open.
- **Discard is unaudited:** the review panel can permanently delete a failed sale — a financial record — with no audit trail.

---

## 5. Multi-User / Shared-Device Findings

*(Addressed by Task #5.)*

- IndexedDB (products, customers, transactions, queue, ID map, auth vault) is **browser-global** — not keyed by shop/admin/attendant. On a shared till:
  - Switching users exposes the previous user's cached customers, products, and sales.
  - Queued sales sync under whichever token is active at flush time, not necessarily the creator's.
- LocalStorage auth is single-slot; cached bearer tokens are restored without expiry/revocation checks.
- Offline PII (customer names, phones, transactions) is stored **unencrypted** with no retention policy or logout cleanup.

---

## 6. Silent-Failure Findings (the "empty data" problem)

This is the most under-appreciated institutional risk:

- When both cloud and local upstreams fail, the server's `gracefulFallback` returns **HTTP 200 with `[]`** for nearly every endpoint (`server/src/config.ts:316-320`). The UI cannot distinguish "server down" from "no records":
  - A stock page showing zero inventory during an outage could trigger wrong purchasing decisions.
  - A sales report showing zero revenue for a period looks like a real (terrifying) result.
  - Even **write** failures caused by network errors can fall through to `[]`, letting a client treat a failed mutation as success. (Definitive upstream HTTP errors *are* correctly surfaced — that protection exists but only covers part of the failure space.)
- Client-side, React Query is configured with `retry: false` and no persistence — offline page loads simply fail with no cached read path outside POS.

**Recommendation:** graceful fallback should return an explicit error/offline marker (e.g. `{ offline: true, data: [] }` or a 503) and UIs should render an "offline / data unavailable" state instead of an empty list.

---

## 7. Scale Findings (thousands of products/sales)

- **Good:** the main product list (`/api/v2/products/list`) and stock report use real server-side pagination. ✔
- **Bad:** many heavy screens fetch **everything** and paginate in the browser:
  - Analysis report and due-sales use `paginated=false` (full sales + expenses download).
  - Expenses, purchases, discount reports, sales-returns, stock-count history: full fetch, then client-side 10-per-page slicing.
- Sync replays sequentially with a full queue scan per item (O(n²) behavior on big backlogs after a long outage).
- Queue rows and the ID map are never cleaned up; no IndexedDB quota/eviction strategy.
- Server accepts 50MB JSON bodies globally and buffers uploads in memory (multer memoryStorage) — DoS/memory pressure at scale.
- API logging middleware serializes full response bodies on every request — latency + log-volume cost.

---

## 8. Security Findings (what an institution's IT team will flag)

| Severity | Finding |
|---|---|
| **HIGH** | `NODE_TLS_REJECT_UNAUTHORIZED=0` in `server/src/config.ts:2-6` disables TLS certificate verification **process-wide** — every upstream call is open to man-in-the-middle. Added to work around a bad cert on `api.pointifypos.com`; the correct fix is fixing the upstream cert, or pinning that single host. |
| **HIGH** | Sensitive data in logs: response bodies (`index.ts:27-63`), bearer headers (`config.ts:192`), and login payloads (`routes/auth.ts`, `attendant-auth.ts`) are logged — passwords, tokens, and customer PII can end up in log files. |
| **HIGH** | Product images uploaded to Firebase are made **public** with predictable client-supplied filenames (`server/src/firebase.ts:58-75`). |
| **MEDIUM** | No Helmet/CSP/HSTS, no CORS allowlist, no rate limiting, no CSRF strategy on Express. |
| **MEDIUM** | No centralized input validation — most routes forward `req.body`/query straight upstream. |
| **MEDIUM** | Error responses forward raw upstream bodies / `err.message` (internal disclosure). |
| **MEDIUM** | Receipt/statement HTML is built by string interpolation without escaping (stored-XSS via customer/product names into print windows). |
| **MEDIUM** | Print agent accepts arbitrary ESC/POS bytes and allows localhost/link-local targets — could be used to probe local services. (It does have SSRF-style private-range restrictions and a 1MB cap — good.) |
| **LOW-MED** | Offline PII unencrypted and unpartitioned in IndexedDB (see §5). |
| ✔ | No hardcoded secrets found; Firebase credentials correctly read from environment; offline passwords stored as salted PBKDF2 verifiers, not plaintext. |

---

## 9. Deployment Models for an Institution

**Model A — Cloud-hosted PWA (current default).**
Browser IndexedDB is the only offline layer. Selling continues through outages; back-office (reports, inventory, expenses) does not. Simplest to operate; fine for shops whose outages are short.

**Model B — On-premise shop server (supported by the code, needs setup).**
Express serves the built app locally (`client/dist`) and proxies to a LAN Pointify backend via `POINTIFY_OFFLINE_API_URL`. With WAN down, the whole app — including reports — keeps working against the local backend; the circuit breaker skips doomed cloud calls. This is the right model for large sites, **but** requires deploying and syncing an on-prem MongoDB backend, which is outside this repo.

---

## 10. Prioritized Recommendations

**P0 — before institutional rollout** *(first three already tasked)*
1. Fix sync-queue duplicate risks (Task #4) and confirm upstream `clientRef` enforcement (Task #8).
2. Partition offline data per shop/user; clear on logout (Task #5).
3. Offline attendant unlock (Tasks #6/#7).
4. Replace silent `[]` fallback with explicit offline/error signaling in server + UI.
5. Remove global TLS-verification bypass; redact logs (tokens, passwords, response bodies).

**P1 — reliability & scale**
6. Server-side pagination for expenses, purchases, analysis, due-sales, discount/returns reports.
7. In-flight claim + exponential backoff + cross-tab lock in sync; audit log for Discard.
8. Offline read fallback (or clear offline banners) for reports/back-office pages; wire up the placeholder sales-history page to the local transaction store.
9. Format receipts client-side for the LAN print agent so agent printing works offline (kitchen tickets already do this).

**P2 — hardening**
10. Helmet/CORS/rate limiting; input validation schemas; normalized error responses.
11. Private Firebase objects + signed URLs; sanitize upload filenames.
12. Escape HTML in receipt/statement generation; tighten print-agent input validation.
13. Encrypt or minimize offline PII; add retention/quota policy for IndexedDB.

---

## 11. Bottom Line

- **Offline as a PWA: yes, genuinely** — for the core selling flow, on the *published* app. Cashiers can sell, print (USB), and everything syncs back cleanly in the common case.
- **Big institution: not yet.** The blockers are multi-user data isolation on shared tills, the duplicate-sale edge cases, silent empty-data fallbacks that mask outages, and security hardening. The P0 list above is the gate; three of its five items are already in your task queue.

---
name: PWA offline only works in production build
description: Why the offline POS shows Chrome's "You're offline" page on the dev preview
---

# Offline works in the published app, NOT the *.replit.dev dev preview

The service worker (client/public/sw.js, a hand-written shell-cacher — NOT
vite-plugin-pwa, which was removed) is registered by client/src/main.tsx ONLY when
`import.meta.env.PROD`. In the Vite dev server main.tsx does the opposite: it
unregisters any SW and clears caches so HMR is never shadowed by stale bundles.

So an installed PWA opened offline on the dev URL has no SW-cached shell and shows
Chrome's NATIVE PWA offline page (renders the manifest icon + app name +
"You're offline"). That text is not in our code — don't go hunting for it.

**Why:** Vite dev serves unbundled modules; caching the shell alone can't make the
app load offline, and a dev SW would fight HMR. Offline is a production-only feature.

**How to apply:** If a user reports offline failing, confirm they installed from the
published *.replit.app URL, not *.replit.dev. After a republish they must load the
app online once (to register the new sw.js and warm the /assets cache) before
offline will serve the cached shell. The custom sw.js skipWaiting+claim+deletes all
old caches on activate, so it evicts any stale Workbox SW from the old plugin.

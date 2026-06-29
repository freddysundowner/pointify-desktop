---
name: Service worker clone-before-return
description: Why the custom sw.js must clone responses synchronously before returning them
---

The custom service worker at `client/public/sw.js` (hand-written, NOT vite-plugin-pwa, despite replit.md mentioning the plugin) caches responses while passing them to the page.

Rule: when caching a fetched Response in a service worker, call `response.clone()` **synchronously** in the same tick, BEFORE `return response`. Then put the *clone* into the cache.

**Why:** `return response` hands the body to the browser, which begins reading it immediately. If `.clone()` is deferred into an async callback (e.g. inside `caches.open(...).then(...)`), the original body is often already consumed by the time the callback runs, throwing `Failed to execute 'clone' on 'Response': Response body is already used`. In production this floods the console and serves a half-cached app, which then surfaces as a React `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` crash from mismatched/partial chunks.

**How to apply:** any cache-write branch in sw.js → `const copy = response.clone(); caches.open(CACHE).then(c => c.put(request, copy)); return response;`. When changing SW caching behavior, bump the `CACHE` name (vN→vN+1) so the activate handler purges stale/corrupted caches on the next load.

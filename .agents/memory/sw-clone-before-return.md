---
name: Service worker clone-before-return
description: Why the custom sw.js must clone responses synchronously before returning them
---

The custom service worker at `client/public/sw.js` (hand-written, NOT vite-plugin-pwa, despite replit.md mentioning the plugin) caches responses while passing them to the page.

Rule: when caching a fetched Response in a service worker, call `response.clone()` **synchronously** in the same tick, BEFORE `return response`. Then put the *clone* into the cache.

**Why:** `return response` hands the body to the browser, which begins reading it immediately. If `.clone()` is deferred into an async callback (e.g. inside `caches.open(...).then(...)`), the original body is often already consumed by the time the callback runs, throwing `Failed to execute 'clone' on 'Response': Response body is already used`. In production this floods the console and serves a half-cached app, which then surfaces as a React `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` crash from mismatched/partial chunks.

**How to apply:** any cache-write branch in sw.js → `const copy = response.clone(); caches.open(CACHE).then(c => c.put(request, copy)); return response;`. When changing SW caching behavior, bump the `CACHE` name (vN→vN+1) so the activate handler purges stale/corrupted caches on the next load.

## Getting a fixed worker to actually take over

After deploying a fixed worker, users can still see the OLD worker's errors because `clients.claim()` takes control but does NOT reload already-open tabs — they keep running the previous stale/crashed session. Proof a tab is on the old worker: the console error points at an `sw.js:<line>` that is a no-op in the current source. To self-heal, the activate handler must, after purge + claim, force a reload: `const cs = await self.clients.matchAll({type:'window'}); for (const c of cs) if ('navigate' in c) c.navigate(c.url);`. Belt-and-suspenders on the page side: register with `{ updateViaCache: 'none' }`, call `reg.update()` on load, and reload once on `controllerchange`. `/sw.js` must be served with `max-age=0` (this host already does) so the update check sees changes.

## React __SECRET_INTERNALS crash from chunk splitting

`vite.config.ts` manualChunks must keep `react` core in the SAME chunk as `react-dom` and `scheduler` (match `/react/` || `/react-dom/` || `/scheduler/` → 'react-vendor'). Splitting react core into a different chunk than react-dom lets a stale cache pair mismatched chunks, so react-dom reads `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED` off an undefined React and the whole app white-screens. `/react/` as a substring does NOT match `/react-dom/`, `/react-redux/`, `/react-icons/` etc. (those have `-` after `react`), so it safely targets only the core package.

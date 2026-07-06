---
name: Shared React Query key contract
description: Why multiple components sharing a ['shop', id]-style query key must share an identical fetch contract, and the apiCall .json() gotcha.
---

When two or more components use the **same** React Query `queryKey`, they share one
cache entry. React Query dedupes by key and only one queryFn actually populates the
entry — effectively non-deterministic which one wins across mounts / client-side
navigation. Therefore every caller of a shared key MUST return the same payload
contract (same endpoint, same parsed shape).

**Why:** A shop Settings page loaded blank ("Shop not loaded" on save, worked only
after a hard refresh) because three consumers shared `['shop', id]` but one of them
fetched the wrong path and never parsed the body — so it cached a raw `Response`
(no `_id`), and whichever consumer won the fetch on navigation poisoned the others.

**How to apply:**
- `apiCall` (client/src/lib/api-config.ts) returns a **raw fetch `Response`** — you
  MUST `await response.json()`. Returning the Response directly caches a useless object.
- Client fetches must hit the `/api/...` proxied path. Vite only proxies `/api`;
  a bare `/shop/:id` is NOT proxied and returns the SPA's index.html.
- If several components need the same resource, point them at the same endpoint via
  `API_ENDPOINTS` and ideally one shared hook, so endpoint/parse can't drift.

---
name: Offline read/write fallback pattern
description: How pages fall back to IndexedDB reads and queue writes during an outage, and how HTTP vs transport errors are distinguished.
---

**Rule:** Any offline fallback (cached read or queued write) may fire ONLY on a transport failure. `apiRequest`/`throwIfResNotOk` stamps `(err as any).status` whenever the server actually responded — fallbacks must check `err.status === undefined && isNetworkError(err)`. Never trust `navigator.onLine` alone: it can be false while an HTTP response still arrived.

**Why:** A 401/500 misread as "offline" silently serves stale data or double-queues a write the server may have committed.

**How to apply:**
- Reads: queryFn try/catch → on transport failure return cached data tagged `__offline: true`; UI shows an amber banner. Scope cached customers to the active shop (shopId may be an object). Give such queries `staleTime: 0` + `refetchOnReconnect: 'always'` so offline data is never treated as fresh after reconnect.
- Writes: queue types are `transaction | customer | customer_update | product | product_update | expense` (union declared in BOTH offline-storage's IDB schema and addToSyncQueue). `customer_update` replays as PUT /api/customers/:id with temp-id remap/defer; others POST.
- Known accepted gaps: no server-side idempotency for customer/expense creates (ambiguous transport failures can duplicate); PIN offline login stores a bearer token in the vault behind a 5-digit PBKDF2 verifier (same trust level as online PIN login, `extra.pinAuth` credentials, matched by scanning since PIN carries no identifier).

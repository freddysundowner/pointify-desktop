---
name: Offline sync idempotency
description: Why offline sale replay needs a clientRef key and how duplicate prevention is split between client and the separate upstream backend.
---

# Offline sale sync idempotency

Offline sales are queued in IndexedDB (`sync_queue`) and replayed to `/api/sales`
on reconnect by `useOfflineSync.ts`. Each sale payload carries a stable
`clientRef` (UUID) generated once at sale time in `product-grid.tsx`; the local
queue dedupes by it (`addToSyncQueue` in `offline-storage.ts`).

**Why:** the at-least-once replay problem — a sale can reach the server and
commit, but the response is lost, so the client treats it as a network failure,
queues it, and replays it. Without an idempotency key honoured end-to-end this
double-counts the sale and its stock movement.

**How to apply:** the client side is only half the fix. True duplicate
prevention requires the SEPARATE upstream Pointify backend
(sandbox.pointifypos.com) to persist and check `clientRef` and return the
original sale on a repeat. If you touch sale-commit or sync code, keep
`clientRef` stable across retries and do NOT regenerate it on replay.

**Confirmed (do not re-investigate):** the upstream is NOT in this repo and
cannot be changed from here — `server/` is only a thin proxy that forwards the
sale body (incl. `clientRef`) verbatim. The whole client side is verified
correct end-to-end: `clientRef` generated once in `product-grid.tsx`
`transactionData`, preserved on the network-error→queue path (`...variables`),
deduped in `addToSyncQueue`, replayed unchanged by `useOfflineSync`. The
remaining residual-risk gap (upstream enforcing `clientRef`) is documented for
shop owners in `replit.md` ("Offline Sync & Duplicate-Sale Safety"). Closing it
needs the upstream Pointify backend team + a live offline-reconnect test (no
creds available here to run it). Don't add a proxy-level in-memory dedupe —
autoscale is multi-instance + restarts, so it'd be unreliable security theater.

# Sync queue retry semantics

`markSyncFailed` keeps an item `status:'pending'` (retryable) until `retries >= 5`,
then parks it as `'failed'`. `getSyncQueue` only returns `'pending'`, so failed
items stop being retried. The periodic 30s flush only runs `syncNow` when there
are pending items; if `syncNow` ever logs "Sync queue flush failed", it means
`getSyncQueue()` itself threw (almost always the IndexedDB wasn't initialised
yet), not a per-item POST failure — those are caught per item.

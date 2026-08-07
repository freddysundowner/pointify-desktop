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

**Upstream `createSale` shape (separate repo, paste-in only):** the user's
backend is Express+Mongoose, NOT in this repo, deployed on their own server — we
can only hand them paste-in code, never deploy/test it. Idempotency there hinges
on a `clientRef` unique+sparse index, an early `findOne({clientRef})` guard that
short-circuits BEFORE any stock/wallet mutation, and an E11000 catch on
`Sale.create` for the race. **Two ordering hazards in that controller to respect
in any future paste-in:** (1) wallet/credit mutations run BEFORE `Sale.create`, so
a simultaneous duplicate replay can double-charge the wallet (one sale, double
ledger); (2) stock is checked against an early `.lean()` snapshot but decremented
later with a blind `$inc`, so concurrent multi-seller sales oversell silently —
the fix is an atomic conditional decrement (`quantity:{$gte:qty}`) run BEFORE the
sale with rollback on shortfall. Both are fully closed only by moving those
mutations after a successful create or wrapping the lot in a Mongo transaction
(replica-set only).

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

# Sync queue duplicate-prevention decisions

**Why:** an offline sale replayed twice double-charges; an ambiguous in-flight
request (crash/reload mid-POST) may or may not have landed server-side.

**How to apply:** keep these invariants when touching sync code:
- Claiming an item before POST must be an atomic compare-and-set inside ONE
  IndexedDB readwrite transaction (separate get+put lets two tabs both win).
- In-flight claims carry an owner session id + lease timestamp; only EXPIRED
  or own-session leftovers may be quarantined — a fresh foreign claim is a
  live request in another tab, never park it.
- Ambiguous in-flight items go to manual review ('failed'), never auto-replay.
- A create that succeeded but whose response id can't be parsed must be parked,
  not retried — a retry duplicates the server record.
- Concurrency behavior is covered by tests in
  `client/src/lib/__tests__/offline-sync-claim.test.ts` (vitest + fake-indexeddb).

# Sync queue retry semantics

`markSyncFailed` keeps an item `status:'pending'` (retryable) until `retries >= 5`,
then parks it as `'failed'`. `getSyncQueue` only returns `'pending'`, so failed
items stop being retried. The periodic 30s flush only runs `syncNow` when there
are pending items; if `syncNow` ever logs "Sync queue flush failed", it means
`getSyncQueue()` itself threw (almost always the IndexedDB wasn't initialised
yet), not a per-item POST failure — those are caught per item.

A manual "retry" of a parked item (review panel) re-arms it by setting
`status:'pending'` AND `retries:0`, so it re-enters the normal 5-attempt
auto-retry cycle rather than failing again on the next tick.

**Queued-sale payload has NO single total field.** To display a sale's amount
you must reconstruct it from the payment breakdown: `split` payments =
`amountPaid + mpesaTotal + bankTotal` (amountPaid is only the cash slice);
everything else (cash/mpesa/bank/credit/hold) = `amountPaid + outstandingBalance`.
Do NOT add mpesaTotal/bankTotal for non-split — for a single-method sale
`amountPaid` already equals the grand total and those fields would double-count.

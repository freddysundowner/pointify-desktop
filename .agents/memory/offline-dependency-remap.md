---
name: Offline-created dependency remap
description: How offline-created customers/custom-items get a temp id and are resolved to real server ids before any sale that references them syncs.
---

# Offline dependency remap (temp ids)

When a customer or custom/ad-hoc product is created while offline, it is saved to
IndexedDB with a placeholder id of the form `temp_cust_*` / `temp_prod_*`
(must start with `temp_`), shown in pickers/cart, and queued in `sync_queue`
(types `customer` / `product`). A sale that references it stores the temp id in
`customerId` and `products[].product` / `products[].inventory`.

**Why:** a sale can depend on entities that don't exist on the server yet. POSTing
a sale with a `temp_` id would 404/400 upstream.

**How to apply (the contract `useOfflineSync` relies on):**
- The queue is replayed in ascending key order and keys are timestamp-based, so a
  dependency queued before its sale is processed first. Do not break that ordering.
- On a successful customer/product POST, capture the server's real id and persist
  it in the `idMap` (settings key `idMap`), then delete the temp cache doc. If the
  response exposes no id, treat it as a sync FAILURE (retry) — never mark complete,
  or dependent sales defer forever.
- Before POSTing a sale, remap every temp id via `idMap`. If any temp id is still
  unresolved, DEFER the sale (mark failed → retried next pass), never POST it.
- Offline fallback for these create flows must gate on a TRUE transport failure
  (`isNetworkError` / `navigator.onLine === false`), not a generic message match,
  or a real validation rejection gets silently queued as if offline.
- M-Pesa is intentionally online-only — do NOT add an offline path for it.

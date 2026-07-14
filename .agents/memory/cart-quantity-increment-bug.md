---
name: Cart quantity increment bug
description: Why clicking an already-in-cart item repeatedly silently failed to bump its quantity in the POS cart.
---

`addToCart` in `client/src/hooks/useCart.ts` located the existing cart entry with
`item.id === product._id || item.id === product.id`, but then updated it with
`prev.map(item => item.id === product.id ? {...} : item)` — using only `product.id`.

Products from the Pointify API only ever carry `_id`, never `id`, so `product.id`
was `undefined` and the update predicate never matched. The result: clicking a
product/service tile a second time found the existing item (so it skipped adding
a duplicate row) but the `.map` silently returned the array unchanged — quantity
never increased, no error surfaced anywhere.

This affected any item added by clicking its tile a second time, not just
services — it was more visible for services because the stock-limit block that
used to short-circuit services first happened to get fixed at the same time,
which is what surfaced this second, independent bug.

**Why:** whenever a "find" and a "later update" both need to identify the same
entity, they must use the exact same key/fallback-chain — a partial mirror of
the lookup logic is a silent no-op waiting to happen, especially with optional
fields like `id` vs `_id`.

**How to apply:** when touching cart/list update logic keyed by `id || _id` (or
similar dual-key patterns), grep for every place the same object is matched and
verify the predicate is identical, not just "close enough".

---
name: POS active shop resolution
description: How to pick the current shop id (and auth-gate its query) anywhere in the POS UI.
---

Resolve the active shop in this precedence: `selectedShopId` (Redux `state.shop`)
→ attendant's assigned `shopId` (may be string OR `{_id}`) → admin fields
(`shopId`/`shop`) → admin `primaryShop` (may be string OR `{_id}`) as last resort.

**Why:** `admin.primaryShop` can point to a *different* branch than the one the
user selected. Reading shop settings (e.g. `sunpay_merchant_ref` for the M-Pesa
STK gate) off `primaryShop` silently uses the wrong shop — a linked shop looks
unlinked and features vanish. `pos.tsx` already uses the selectedShopId-first
pattern; new components must match it or they drift.

**How to apply:** When a component needs the current shop, mirror the pos.tsx
resolution. If it fetches shop data with react-query, gate `enabled` on
`!!shopId && !!(adminToken || attendantToken)` — the admin token is null in
attendant sessions, so gating on admin token alone leaves attendants unable to
load shop settings. `apiCall` already forwards whichever token is in localStorage.

POS stock policy must prefer current shop-query data over login snapshots, with
only a matching-shop snapshot allowed as an offline fallback.
**Why:** Login/Redux settings can remain stale after Negative Selling is changed,
so correct quantity guards can still block sales using the wrong policy.
**How to apply:** Keep product selection, cart editing, and the sale payload on
the same reactive settings source; do not independently read auth snapshots.

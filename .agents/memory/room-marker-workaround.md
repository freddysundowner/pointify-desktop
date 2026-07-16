---
name: isRoom persistence contract
description: Upstream Mongoose drops unknown fields (isRoom); user rejected a measure:"room" workaround — the backend schema field is the required fix.
---

The main Pointify backend's Mongoose product schema silently drops fields it
doesn't know (e.g. `isRoom`). Rooms created through the app look saved but come
back without the flag, so the bookings page shows "No rooms yet".

A workaround (double-marking rooms via the persisted `measure: "room"` field,
plus a repair pass) was implemented and then REMOVED at the user's explicit
request — they want `isRoom` to be the real contract, fixed on the backend.

**Why:** the user owns the backend team relationship and prefers the schema
fix (documented in pointify-backend-additions/README) over client-side hacks.

**How to apply:** do not reintroduce field-piggybacking for isRoom. Until the
backend adds `isRoom` to the product schema, the bookings page will simply not
list rooms — that is expected. Verify persistence of any new upstream field by
reading the entity back, not by the write's 200 response. Upstream
`PUT /product/:id` expects a FULL product payload; partial updates risk
clearing fields.

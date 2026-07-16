---
name: Room marker workaround
description: Upstream Mongoose drops unknown fields (isRoom); rooms are marked via measure:"room" until the backend schema adds isRoom.
---

The main Pointify backend's Mongoose product schema silently drops fields it
doesn't know (e.g. `isRoom`). Until the backend team adds the field, rooms are
double-marked with `measure: "room"` — a field the upstream always persists —
and room detection accepts `isRoom === true || measure === "room"`.

**Why:** rooms created through the app looked saved but came back without the
flag, so the bookings page showed "No rooms yet" even though the services
existed.

**How to apply:** any new client-side flag stored on upstream entities must
either be added to the upstream schema first or piggyback on an
already-persisted field. Verify persistence by reading the entity back, not by
the write's 200 response. Also: upstream `PUT /product/:id` expects a FULL
product payload — partial updates risk clearing fields.

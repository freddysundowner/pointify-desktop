---
name: Room bookings upstream contract
description: Bookings live on the main Pointify backend, not locally; proxy must never mask failures
---
- Bookings for Guest House shops are stored on the separate main Pointify backend (Node + MongoDB), NOT in a local database. **Why:** user explicitly rejected local Postgres — all data belongs in their existing Mongo backend. The endpoint contract the backend team must implement is in `BOOKINGS_API_SPEC.md` at the project root.
- The booking proxy routes bypass the shared graceful-fallback request helper and call the online upstream directly. **Why:** the fallback masks upstream failures as an empty 200, which would make a failed booking save look successful. **How to apply:** any future money- or reservation-critical proxy route must surface upstream errors, never fall back to fake-success.
- Guest House Mode is a shop field (`isGuestHouse`) sent through the normal shop update; the upstream Mongoose schema must add it or it is silently dropped. Client gates nav AND the /bookings page itself on it.

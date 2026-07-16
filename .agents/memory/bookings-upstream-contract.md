---
name: Guest house module upstream contract
description: Standalone rooms+bookings module on the main Pointify backend; payments live on bookings, never POS sales; proxy must never mask failures
---
- The guest-house module is FULLY standalone (rebuilt July 2026 at the user's explicit request): rooms are their own upstream collection (`/room`, proxied as `/api/rooms`), NOT products/services — the old `isRoom` product flag and product-form switch were removed. **Why:** user wants rooms/bookings/guests decoupled from products and sales "so we can scale and not mix things up."
- Check-out payment is recorded ON the booking via one atomic `POST /booking/:id/checkout` (paymentMethod/amountPaid/mpesaCode) and must be idempotent upstream; it never creates a POS sale, and bookings revenue is reported separately from sales. **Why:** user chose full separation of booking money from POS sales reports.
- All data lives on the separate main Pointify backend (Node + MongoDB), NOT locally — user explicitly rejected local Postgres. Contract for the backend team: `BOOKINGS_API_SPEC.md` at project root; until implemented the pages show "not available yet" banners.
- The proxy routes bypass the shared graceful-fallback helper and call the online upstream directly. **Why:** the fallback masks failures as an empty 200 — a failed booking save must never look successful. **How to apply:** any money- or reservation-critical proxy route must surface upstream errors.
- Guest House Mode is a shop field (`isGuestHouse`) sent through the normal shop update; the upstream Mongoose schema must add it or it is silently dropped.

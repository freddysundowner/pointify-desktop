# Room Bookings — API spec for the main Pointify backend

The POS app now has a Room Bookings screen for shops in Guest House Mode.
Rooms are the shop's **services** (products with `virtual: true`) that are
explicitly marked as rooms (`isRoom: true`); the service's selling price is
the nightly rate. The POS proxies these endpoints
to the main Pointify backend, which must implement them (Node + MongoDB).

## 1. Shop flag

The shop update endpoint (`PUT /shop/:id`) must accept and persist a new
boolean field on the shop document:

```
isGuestHouse: Boolean (default false)
```

The POS already sends it from Shop Settings and shows the Room Bookings menu
when it is true.

## 1b. Product flag

The product create/update endpoints must accept and persist a new boolean
field on the product document:

```
isRoom: Boolean (default false)
```

The POS sets it from the Add/Edit Service form ("This service is a room",
shown only for guest-house shops) and the Room Bookings page lists only
services where `virtual === true && isRoom === true`.

## 2. Booking model (MongoDB)

```js
{
  shop:          ObjectId (ref Shop, required, indexed),
  roomProductId: ObjectId (ref Product, required, indexed),
  roomName:      String (required),          // denormalised for receipts/lists
  guestName:     String (required),
  guestPhone:    String (default ""),
  guestIdNumber: String (default ""),
  guestsCount:   Number (default 1),
  checkIn:       String "YYYY-MM-DD" (required),
  checkOut:      String "YYYY-MM-DD" (required),  // exclusive: nights are [checkIn, checkOut)
  nightlyRate:   Number (default 0),
  totalAmount:   Number (default 0),
  status:        String enum: "booked" | "checked_in" | "checked_out" | "cancelled" (default "booked"),
  notes:         String (default ""),
  createdAt:     Date (default now)
}
```

## 3. Endpoints

All requests carry the normal `Authorization: Bearer <token>` header.

### GET /booking?shop=<shopId>
Return an array of the shop's bookings (most recent first, cap ~500).

### POST /booking
Body: the model fields above (without `_id`). Server must:
- validate required fields and `checkOut > checkIn`;
- reject overlaps: another booking for the same `roomProductId` with status
  `booked` or `checked_in` where `checkIn < body.checkOut && checkOut > body.checkIn`
  → respond `409 { error: "Room is already booked for those dates" }`;
- respond `201` with the created document.

### PUT /booking/:id
Partial update (the POS mainly sends `{ status }` for check-in/check-out/cancel,
but may send other fields when editing). Re-run the overlap check if dates/room
change and status stays active. Respond with the updated document.

### DELETE /booking/:id
Delete the booking. Respond `{ success: true }`.

## Notes

- Back-to-back bookings are allowed (one guest's check-out day can be the next
  guest's check-in day) because `checkOut` is exclusive.
- The POS treats a booking as occupying a room on night `d` when
  `checkIn <= d < checkOut`.
- Until these endpoints exist the POS shows "booking service not available yet"
  on the Bookings screen; nothing else breaks.
- **Check-out billing:** when a guest is checked out, the POS records the stay
  as a normal sale (`POST /sales`) with a deterministic idempotency key
  `clientRef = "booking-checkout-<bookingId>"`. If the create-sale endpoint
  stores and dedupes `clientRef` (see the offline-sync note in the POS repo's
  replit.md), the same stay can never be billed twice even across retries.

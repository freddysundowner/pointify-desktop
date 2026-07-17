# Guest House Module — API spec for the main Pointify backend

The POS app has a standalone Guest House module (rooms + bookings) for shops in
Guest House Mode. It is **fully independent of products and sales**: rooms are
their own collection (NOT products/services) and check-out payments are
recorded on the booking itself (NEVER as a POS sale). The POS proxies these
endpoints to the main Pointify backend, which must implement them (Node +
MongoDB). All requests carry the normal `Authorization: Bearer <token>` header.

## 1. Shop flag

The shop update endpoint (`PUT /shop/:id`) must accept and persist:

```
isGuestHouse: Boolean (default false)
```

The POS already sends it from Shop Settings and shows the Room Bookings menu
when it is true.

## 2. Room model (new collection)

```js
{
  shop:        ObjectId (ref Shop, required, indexed),
  name:        String (required),   // e.g. "Room 12"
  nightlyRate: Number (required, >= 0),
  amenities:   [String] (default []),   // e.g. ["Wi-Fi", "TV", "Hot shower"]
  createdAt:   Date (default now)
}
```

### Room endpoints

- `GET /room?shop=<shopId>` — array of the shop's rooms, sorted by name.
- `POST /room` — body `{ shop, name, nightlyRate, amenities? }`; respond `201`
  with the created document. Reject a duplicate name within the same shop
  (case-insensitive) with `409`.
- `POST /room/bulk` — body `{ shop, rooms: [{ name, nightlyRate, amenities? }, ...] }`.
  Create all rooms; silently skip names that already exist in the shop.
  Respond `{ success: true, created: <n>, skipped: <n>, rooms: [...] }`.
- `PUT /room/:id` — partial update (`name`, `nightlyRate`, `amenities`).
  Respond with the updated document.
- `DELETE /room/:id` — respond `{ success: true }`. Reject (`409`) if the room
  has active bookings (status `booked` or `checked_in`).

## 3. Booking model

```js
{
  shop:          ObjectId (ref Shop, required, indexed),
  roomId:        ObjectId (ref Room, required, indexed),
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
  // Payment — recorded at check-out, on the booking itself (no POS sale):
  paymentMethod: String enum: "cash" | "mpesa" | "none" (default "none"),
  amountPaid:    Number (default 0),
  mpesaCode:     String (default ""),
  paidAt:        Date (null until paid),
  createdAt:     Date (default now)
}
```

### Booking endpoints

#### GET /booking?shop=<shopId>
Array of the shop's bookings (most recent first, cap ~500).

Optional filter params (the POS app already sends these; the proxy currently
applies them itself, but the backend should filter at the database level):
- `status` — exact match on booking status (`booked` / `checked_in` / `checked_out` / `cancelled`)
- `from`, `to` — `YYYY-MM-DD`; return bookings whose stay overlaps the window
  (`checkOut >= from` and `checkIn <= to`)
- `q` — case-insensitive substring match against `guestName`, `guestIdNumber`,
  `guestPhone`, and `roomName`

#### GET /booking/stats?shop=<shopId>&from=<YYYY-MM-DD>&to=<YYYY-MM-DD>
Report summary for the period `[from, to)` (`to` is EXCLUSIVE). The POS proxy
currently computes this itself from `/booking` + `/room`; the backend should
implement it natively (aggregation pipeline) with this exact response shape:

```json
{
  "from": "2026-07-01",
  "to": "2026-08-01",
  "revenue": { "total": 0, "cash": 0, "mpesa": 0, "unpaid": 0 },
  "nightsSold": 0,
  "availableNights": 0,
  "roomCount": 0,
  "occupancy": 0,
  "bookingsCount": 0,
  "perRoom": [{ "roomId": "", "name": "", "bookings": 0, "nights": 0, "revenue": 0 }],
  "bookings": []
}
```

Rules the numbers must follow:
- `bookings` / `bookingsCount` / `nightsSold` / `perRoom.bookings|nights`:
  non-cancelled bookings whose stay overlaps the window
  (`checkIn < to && checkOut > from`); nights are clamped to the window.
- Revenue (`total`/`cash`/`mpesa` and `perRoom.revenue`): checked-out bookings
  counted ONCE by payment date (`paidAt` date part, falling back to `checkOut`)
  inside `[from, to)`; `amountPaid` falling back to `totalAmount`.
  `unpaid` sums `totalAmount` of check-outs with `paymentMethod` `"none"`/missing.
- `roomCount` = current rooms + booked-but-deleted rooms seen in the window;
  `availableNights = roomCount × nights in window`; `occupancy` is capped at 100.

#### POST /booking
Body: the model fields above (without `_id` / payment fields). Server must:
- validate required fields and `checkOut > checkIn`;
- reject overlaps: another booking for the same `roomId` with status
  `booked` or `checked_in` where `checkIn < body.checkOut && checkOut > body.checkIn`
  → respond `409 { error: "Room is already booked for those dates" }`;
- respond `201` with the created document.

#### POST /booking/:id/checkout  ← ATOMIC check-out + payment
Body: `{ paymentMethod: "cash" | "mpesa" | "none", amountPaid: Number, mpesaCode: String }`.
In ONE atomic operation:
- set `status = "checked_out"`;
- set `paymentMethod`, `amountPaid`, `mpesaCode`, and `paidAt = now`
  (when `paymentMethod === "none"`, store `amountPaid: 0` and leave `paidAt` null);
- if the booking is already `checked_out`, do NOT overwrite the stored
  payment — return the existing document (idempotent; a client retry can
  never double-charge);
- respond with the updated document.

#### PUT /booking/:id
Partial update (the POS sends `{ status }` for check-in/cancel, and may send
other fields when editing). Re-run the overlap check if dates/room change and
status stays active. Respond with the updated document.

#### DELETE /booking/:id
Delete the booking. Respond `{ success: true }`.

## Notes

- Back-to-back bookings are allowed (one guest's check-out day can be the next
  guest's check-in day) because `checkOut` is exclusive.
- The POS treats a booking as occupying a room on night `d` when
  `checkIn <= d < checkOut`.
- Booking revenue reporting is computed from checked-out bookings'
  `amountPaid` — it never touches the sales collection.
- Until these endpoints exist the POS shows "service not available yet"
  banners on the Bookings screens; nothing else breaks.

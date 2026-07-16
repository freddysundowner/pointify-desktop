# Guest House module — additions for the main Pointify Node.js server

Standalone rooms + bookings module. It is **fully independent of products and
sales**: rooms are their own collection (NOT products/services) and check-out
payments are stored on the booking itself (NEVER as a sale).

Copy these files into your backend `src/` folder (they follow the same
model / controller / route pattern as the rest of the codebase):

- `models/room.js`         -> src/models/room.js
- `models/booking.js`      -> src/models/booking.js
- `controllers/room.js`    -> src/controllers/room.js
- `controllers/booking.js` -> src/controllers/booking.js
- `routes/room.js`         -> src/routes/room.js
- `routes/booking.js`      -> src/routes/booking.js

Note: both models use `require("../shared/markUnsynced.plugin")` like the
other models in the codebase. If your project does not have that plugin,
delete those two lines (and the `sync` field) from each model.

Then make these small edits by hand:

## 1. Register the routes in `src/routes/index.js`

Add with the other requires:

```js
const room = require("./room");
const booking = require("./booking");
```

Add with the other `app.use(...)` lines (auth required, same as /shop):

```js
app.use("/room", verifyToken, room);
app.use("/booking", verifyToken, booking);
```

## 2. Add the Guest House flag to `src/models/shop.js`

Add this field inside `shopSchema` (next to the other Boolean toggles like
`allowBackup` / `warehouse`):

```js
isGuestHouse: { type: Boolean, default: false },
```

Without this, Mongoose silently drops `isGuestHouse` when the POS saves shop
settings, and the Guest House toggle won't stick. (The existing
`PUT /shop/:id` passes the whole body to `findByIdAndUpdate`, so once the
field is in the schema it saves with no controller change.)

## 3. If you previously added `isRoom` to the product schema — no longer needed

The old design marked services as rooms with an `isRoom` product flag. The POS
no longer uses it; rooms now live in their own `Room` collection. You can
leave or remove the product-field — the POS ignores it either way.

## Endpoints provided

### Rooms
- `GET    /room?shop=<shopId>` — the shop's rooms, sorted by name
- `POST   /room` — `{ shop, name, nightlyRate }`; 409 on duplicate name (case-insensitive, per shop)
- `POST   /room/bulk` — `{ shop, rooms: [{ name, nightlyRate }, ...] }` (max 500);
  skips existing names; responds `{ success, created, skipped, rooms }`
- `PUT    /room/:id` — update `name` / `nightlyRate`
- `DELETE /room/:id` — 409 if the room has active bookings

### Bookings
- `GET    /booking?shop=<shopId>[&from=YYYY-MM-DD&to=YYYY-MM-DD]` — list (max 500, newest first)
- `POST   /booking` — create; validates required fields, `checkOut > checkIn`,
  rejects overlapping active bookings for the same room with **409**;
  payment fields in the body are ignored
- `POST   /booking/:id/checkout` — **atomic check-out + payment**:
  `{ paymentMethod: "cash"|"mpesa"|"none", amountPaid, mpesaCode }`.
  Sets status to `checked_out` and stores the payment in one conditional
  update. **Idempotent**: repeating the call on an already-checked-out booking
  returns the existing document without touching the stored payment, so a
  client retry can never double-charge.
- `PUT    /booking/:id` — partial update (check-in / cancel, or edits);
  re-runs the overlap check; payment fields are stripped (checkout-only)
- `DELETE /booking/:id` — delete

Overlap rule: `checkOut` is exclusive — a booking occupies nights
`[checkIn, checkOut)`, so back-to-back bookings are allowed.

## Notes for hardening (recommended)

- **Double-booking under concurrency:** the create endpoint checks for
  overlaps before saving AND re-checks after saving (deleting its own doc and
  returning 409 if a slightly-earlier booking won the race). If you later run
  MongoDB as a replica set, you can replace this with a transaction.
- **Ownership:** like the other controllers in this codebase, the handlers
  trust the `shop` id sent by the client. If/when `verifyToken` populates
  `req.user`, consider verifying the shop belongs to the authenticated admin
  before reading/writing rooms and bookings.

After you deploy, the POS Room Bookings pages start working immediately — the
POS proxy already forwards `/api/rooms*` -> `/room*` and `/api/booking*` ->
`/booking*` with the Bearer token. No POS changes needed.

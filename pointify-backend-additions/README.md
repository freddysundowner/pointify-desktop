# Room Bookings — additions for the main Pointify Node.js server

Copy these files into your backend `src/` folder (they follow the same
model / controller / route pattern as the rest of the codebase):

- `models/booking.js`     -> src/models/booking.js
- `controllers/booking.js` -> src/controllers/booking.js
- `routes/booking.js`     -> src/routes/booking.js

Then make these small edits by hand:

## 1. Register the route in `src/routes/index.js`

Add with the other requires:

```js
const booking = require("./booking");
```

Add with the other `app.use(...)` lines (auth required, same as /shop):

```js
app.use("/booking", verifyToken, booking);
```

## 2. Add the Guest House flag to `src/models/shop.js`

Add this field inside `shopSchema` (next to the other Boolean toggles like
`allowBackup` / `warehouse`):

```js
isRestaurant: { type: Boolean, default: false },   // if not already there
isGuestHouse: { type: Boolean, default: false },
```

Without this, Mongoose silently drops `isGuestHouse` when the POS saves
shop settings, and the Guest House toggle won't stick.

## 3. Add the room flag to `src/models/product.js`

The POS lets a guest-house shop mark a service as a room ("This service is
a room"), and the Room Bookings page only lists services with this flag.
Add this field inside the product schema (next to `virtual`):

```js
isRoom: { type: Boolean, default: false },
```

Without it, Mongoose drops `isRoom` on save and no rooms will ever show
in the bookings page.

## Bulk room creation

The POS "Add Rooms" tool creates rooms via the existing v2 endpoint
`POST /api/v2/products/bulk/add` with
`{ shopId, adminId, attendantId, products: [...] }` (each product carries
`virtual: true`, `isRoom: true`, `productType: "service"`). If that endpoint
is not reachable it falls back to one `POST /product` per room. No new
backend code is needed for this beyond the `isRoom` schema field above.

## That's it

- The existing `PUT /shop/:id` (updateShopById) already passes the whole
  body to `findByIdAndUpdate`, so once the field is in the schema the
  toggle saves with no controller change.
- The POS proxy already forwards `/api/booking` -> `/booking` with the
  Bearer token. After you deploy, the Room Bookings page starts working
  immediately — no POS changes needed.

## Endpoints provided

- `GET    /booking?shop=<shopId>[&from=YYYY-MM-DD&to=YYYY-MM-DD]` — list (max 500, newest first)
- `POST   /booking` — create; validates required fields, `checkOut > checkIn`,
  and rejects overlapping active bookings for the same room with **409**
- `PUT    /booking/:id` — partial update (status changes for check-in /
  check-out / cancel, or edits); re-runs the overlap check
- `DELETE /booking/:id` — delete

Overlap rule: `checkOut` is exclusive — a booking occupies nights
`[checkIn, checkOut)`, so back-to-back bookings are allowed.

## Notes for hardening (recommended)

- **Double-booking under concurrency:** the create endpoint checks for
  overlaps before saving AND re-checks after saving (deleting its own doc
  and returning 409 if a slightly-earlier booking won the race), so two
  simultaneous requests cannot both keep the same room. If you later run
  MongoDB as a replica set, you can replace this with a transaction.
- **Ownership:** like the other controllers in this codebase, the handlers
  trust the `shop` id sent by the client. If/when `verifyToken` is
  re-enabled to populate `req.user`, consider verifying the shop belongs
  to the authenticated admin before reading/writing bookings.

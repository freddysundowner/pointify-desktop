---
name: Product image upload
description: How product images are uploaded, stored, and displayed in the Pointify POS app.
---

Products had no image support at all (no field in the form schema, no upload UI, no display). Implemented:

- Upstream contract: legacy mobile app (lib/services/product_service.dart) proved the Pointify backend persists an `images: string[]` field via a normal product update — reused the existing `PUT /product/:id` proxy with `{ images: [url] }` rather than inventing a new upstream contract.
- Server: added `multer` disk storage under `server/uploads/products` (gitignored — ephemeral on autoscale, known limitation), route `POST /api/product/:id/image`, and a static mount `app.use('/uploads', express.static(...))` placed OUTSIDE the `/api` prefix.
- **Why outside `/api`:** server/src/index.ts forces `Content-Type: application/json` on every response under the `/api` prefix (for the write-error-status-promotion logic). Serving images under `/api/uploads/*` would corrupt the image response with that header.
- Client dev proxy (vite.config.ts) needed a matching `/uploads` proxy rule alongside the existing `/api` one, or the dev preview can't reach uploaded images.
- Display field lookup client-side: `product.images?.[0] || product.image` (covers both the array contract and any singular-field variants).

**How to apply:** any future upload feature (shop logo, receipts, etc.) should follow the same non-`/api` static-mount pattern, and check `lib/` (legacy Dart app) first for the real upstream field/endpoint contract before inventing one.

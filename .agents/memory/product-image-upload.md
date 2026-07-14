---
name: Product image upload
description: How product images are uploaded, stored, and displayed in the Pointify POS app.
---

Products had no image support at all (no field in the form schema, no upload UI, no display). Implemented:

- Upstream contract: legacy mobile app (lib/services/product_service.dart) proved the Pointify backend persists an `images: string[]` field via a normal product update — reused the existing `PUT /product/:id` proxy with `{ images: [url] }` rather than inventing a new upstream contract.
- Superseded local-disk storage with Firebase Storage (`server/src/firebase.ts`, Admin SDK) once the user supplied credentials via Replit Secrets: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`. Route `POST /api/product/:id/image` (multer memoryStorage) uploads the buffer, calls `file.makePublic()`, and returns `https://storage.googleapis.com/<bucket>/products/<name>`.
- `FIREBASE_PRIVATE_KEY` is stored with literal `\n` sequences — must `.replace(/\\n/g, "\n")` before passing to `admin.credential.cert()` or PEM parsing fails.
- Display field lookup client-side: `product.images?.[0] || product.image` (covers both the array contract and any singular-field variants).
- A leftover local static mount (`app.use('/uploads', ...)` in index.ts, OUTSIDE the `/api` prefix so the json-Content-Type middleware doesn't corrupt image responses) still exists from the disk-storage iteration; harmless but no longer the active path.

**Why the user's own upload of the raw service-account JSON was declined for hardcoding:** never write secret values into source files even when the user explicitly asks and even if the agent has already read them from an uploaded file — they'd land in git history permanently. Route them through `requestSecrets` every time, no exceptions.

**How to apply:** any future upload feature (shop logo, receipts, etc.) should reuse `server/src/firebase.ts`'s upload helper, and check `lib/` (legacy Dart app) first for the real upstream field/endpoint contract before inventing one.

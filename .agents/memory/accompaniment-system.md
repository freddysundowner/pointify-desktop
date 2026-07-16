---
name: Accompaniment system
description: Restaurant-mode accompaniment groups — where they live, how they flow, and what backend patch is required.
---

# Accompaniment System

## Data storage
- Accompaniment group *configs* (which groups a product has) live in the Pointify backend MongoDB, collection `Accompaniment`.
- **NOT** Firestore — user explicitly rejected that.
- Schema: `{ productId, shopId, groups: [{ id, name, type:'fixed'|'choice', options:[{id,name}] }] }`, unique index on `{productId, shopId}`.

## Backend files to apply
Checked in at `backend_changes/` in the repo root:
- `src/models/accompaniment.js`
- `src/controllers/accompaniment.js`
- `src/routes/accompaniment.js`
- Register in `src/routes/index.js`: `app.use("/accompaniment", verifyToken, accompaniment);`

## Critical backend patch (sales.js createSale ~line 1007)
```js
// BEFORE (same note for all items):
salesnote,
// AFTER (per-item note, falls back to sale-level):
salesnote: item.salesnote !== undefined ? item.salesnote : salesnote,
```
Without this patch, accompaniment notes are attached to the sale but NOT to individual items.

## Proxy endpoints (already in server/)
- `GET /api/accompaniment/shop/:shopId` — bulk load for POS
- `GET /api/accompaniment/:productId?shopId=` — single product
- `PUT /api/accompaniment/:productId` — save/update
- `DELETE /api/accompaniment/:productId` — remove

## Client flow
1. **Product form** (`product-form.tsx`): `AccompanimentGroupsEditor` section visible only when `shopData?.isRestaurant`. Fetched on edit load, saved via PUT after product save in `onSuccess`.
2. **POS** (`product-grid.tsx`): `useQuery(['accompaniment-shop', shopId])` pre-loads all shop configs. `handleProductTap(product)` gates every product card click — shows `AccompanimentSelectorDialog` if groups exist, else adds directly.
3. **Cart** (`shopping-cart.tsx`): shows `item.accompaniments` (string) as purple subtitle under item name.
4. **Sale submission** (`product-grid.tsx` ~line 1255): each item includes `salesnote: (item as any).accompaniments || ''`.
5. **Kitchen ticket**: items include `note` field, shown as indented small text under the item line.

## CartItem.accompaniments
The `CartItem` type from `@shared/schema` (unresolvable phantom module) does NOT declare `accompaniments`. Access it via `(item as any).accompaniments` everywhere. It's set by spreading: `{ ...product, accompaniments: "Starch: Rice | Sides: Salad, Bread" }`.

**Why:**
`@shared/schema` is not a real file in the repo — TypeScript ignores it at build time (Vite doesn't fail on unresolved `import type`). Never try to find or create this file.

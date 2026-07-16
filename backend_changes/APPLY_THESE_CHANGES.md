# Backend Changes for Accompaniments

## 1. Copy new files into your backend src/

Copy these files into your Pointify backend at `/var/www/pointify/Pointify-New-Admin/src/`:

```
backend_changes/src/models/accompaniment.js   → src/models/accompaniment.js
backend_changes/src/controllers/accompaniment.js → src/controllers/accompaniment.js
backend_changes/src/routes/accompaniment.js   → src/routes/accompaniment.js
```

## 2. Register the route in src/routes/index.js

Add these two lines — one near the top with the other requires, one near the bottom with the app.use() calls:

```js
// Near the top (with other requires):
const accompaniment = require("./accompaniment");

// Near the bottom (with other app.use() lines, before module.exports):
app.use("/accompaniment", verifyToken, accompaniment);
```

## 3. Patch createSale in src/controllers/sales.js

Find the `saleItemDocs` mapping (around line 987–1011). Change the single line:

```js
// BEFORE:
salesnote,

// AFTER (supports per-item accompaniment notes):
salesnote: item.salesnote !== undefined ? item.salesnote : salesnote,
```

This lets each sale item carry its own note (accompaniment choices) while still
falling back to the sale-level note for items that have none.

## 4. Rebuild and restart

```bash
cd /var/www/pointify/Pointify-New-Admin
npm run build     # or however you build
pm2 restart pointify-api
```

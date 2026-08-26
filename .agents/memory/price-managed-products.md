---
name: Price-managed products
description: Contract for products sold by entered monetary amount instead of whole-unit quantity.
---

For `manageByPrice` products, keep the cashier-entered sale amount separate from the fractional inventory quantity. Cart totals use the entered amount, while inventory quantity is derived as amount divided by the product's base selling price.

**Why:** The upstream API stores the entered amount as `unitPrice` but replaces quantity with the derived fractional stock quantity. Treating the readback as ordinary `quantity × unitPrice` produces incorrect totals, especially when reopening held sales.

**How to apply:** Display and edit the sale amount in POS, derive fractional quantity for stock checks and held-sale verification, and restore held lines with cart quantity one so totals remain based on the entered amount. Never weaken normal held-sale quantity verification.
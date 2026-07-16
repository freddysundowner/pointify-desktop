---
name: Category multi-shop model
description: Upstream stores one shop per category record; multi-shop = duplicate records per shop
---
The upstream Pointify backend's product category model has a SINGLE `shop` field per record, and its PUT `/product/category/:id` ignores attempts to change `shop`. DELETE `/product/category/:id` works.

**Why:** probed via curl during the Categories-page build (July 2026); test PUTs with shop changes returned the unchanged doc.

**How to apply:** to make one category exist in several shops, create one record per shop with the same name (POST `/product/category` with shop+admin in both body and query). To remove from a shop, DELETE that shop's record. UI should group records by (trimmed, case-insensitive) name so users see one category with shop badges. Rename must PUT the new name on every record in the group.

---
name: POS search name+barcode AND semantics
description: Why POS product search must not send name and barcodeid together
---

The upstream `/api/v2/products/list` endpoint treats the `name` and `barcodeid`
query params as an **AND** filter, not OR. Sending the same text in both (e.g.
`name=TEA&barcodeid=TEA`) means a normal text search also requires the product's
barcode to match — so name-only matches return **zero results**. This is the
inventory-vs-POS discrepancy users hit: a product shows in the inventory list
(which sends only `name`) but the POS search finds nothing.

**Rule:** for POS server-side search, send the query as `barcodeid` ONLY when it
looks like a scanned code (digits, e.g. `/^\d{6,}$/`); otherwise send it as
`name` and leave the other empty. Mirror the inventory page, which sends `name`
only.

**Why:** verified empirically against the live data — `name=TEA` returned
TEA KUMI; `name=TEA&barcodeid=TEA` returned 0. The `warehouse` param was tested
and ruled out (true/false both returned the product), so it is NOT the cause of
missing-product-in-POS-search reports.

**How to apply:** any new product list/search call from the POS (or anywhere)
must not populate both `name` and `barcodeid` with the same user query.

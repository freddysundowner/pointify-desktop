---
name: Barcode scanning (USB scanner) in POS
description: How scan-to-cart works in the POS search box and what persistence depends on the separate upstream backend.
---

# Barcode scanning in the POS

A USB/Bluetooth retail scanner is a keyboard emulator: it "types" the barcode
digits into the focused input then sends Enter. No driver/integration exists or
is needed.

## Key constraints (non-obvious)

- **Handle Enter before any empty-results guard.** A scanner's Enter can arrive
  before the async product search returns, so the dropdown list may be empty at
  Enter time. Resolve the product by exact barcode against the loaded catalogue
  and the offline `by-barcode` index instead of relying on the live dropdown.
- **Read the live input value on Enter**, not propagated React state — fast
  scanner key streams can lag the state at Enter time.
- **Never auto-add a single non-matching result for barcode-like input** (e.g.
  `^\d{6,}$`). A missed exact match must show "no match", not silently add an
  unrelated item and corrupt a sale. The single-result fallback is for typed
  names only.

## Upstream persistence dependency

**Why:** `server/` is a thin proxy to the separate Pointify backend
(sandbox.pointifypos.com). The product create/update payload now includes a
`barcode` field, but observed product list responses return `manufacturer` and
NOT `barcode`. So saved barcodes only persist (and become scannable) once the
upstream backend stores and returns a `barcode` field on products.

**How to apply:** if scanning "finds nothing" for products that were given a
barcode, first confirm the upstream is persisting/returning `barcode` — it is
out of this repo's control, same pattern as other proxy-forwarded fields.

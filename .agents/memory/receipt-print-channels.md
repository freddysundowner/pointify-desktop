---
name: Receipt print channels
description: Every receipt setting must be applied to ALL four render paths or it silently misses one.
---

Receipts render through FOUR independent paths, each with its own formatting code:
1. Server plain-text formatter (`formatReceiptText`) — used by TCP/agent/system printing and `/api/printer/format`.
2. Browser-print HTML template strings (in receipt-modal and receipt-view).
3. On-screen JSX receipts (receipt-modal and receipt-view).
4. WebUSB ESC/POS builder (`usbPrinter.printReceipt` in `client/src/lib/usb-printer.ts`) — easy to forget; it duplicates payment/footer logic in raw bytes.

**Why:** A per-shop receipt setting (e.g. hide payment method, custom footer) applied to only three paths shipped with the WebUSB path still printing the old layout — caught only in review.

**How to apply:** Any new receipt field or per-shop receipt setting must be threaded through getPrintData in BOTH receipt-modal and receipt-view, plus all four render paths above. Shop toggles default ON via `!== false` so shops without the field upstream are unaffected; upstream Mongoose shop schema must accept new fields or they are silently dropped.

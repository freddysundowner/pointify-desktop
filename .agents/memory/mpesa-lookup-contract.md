---
name: M-Pesa Flow B lookup contract
description: What the upstream SunPay proxy must return for the already-paid (no-STK) Flow B — browse recent unallocated Till payments.
---

# Flow B lookup (customer paid the Till directly, no STK)

The cashier does NOT search by phone or code. C2B payments arrive with `phoneNumber` as a SHA-256 **hash** (e.g. `4f7f6cf3...`), never a real number, so phone matching is impossible. Real identifiers in the webhook payload: `mpesaRef` (M-Pesa code, e.g. `UEU8O690P3`), `payerName` (e.g. `FREDRICK`), `amount`, `paymentType:'c2b'`.

**The POS browses recent payments.** On opening the "already paid" dialog it calls `GET /api/mpesa/lookup?shopId=...&recent=1`. This repo's server forwards `recent` (and still `code` for an exact single lookup, kept for completeness) to upstream `GET /api/v2/mpesa/lookup`. The cashier filters the list **client-side** by name or code and taps the right one. There is no server search-by-name/phone.

**Upstream response is normalized client-side** and accepts any of: a single object, `{payments:[...]}`, `{results:[...]}`, or a bare array. Per-item fields read (with aliases): `mpesaRef|code|transID`, `payerName|name`, `amount`, `time|createdAt|transTime`, `allocated`. Client drops `allocated:true` items.

**Why:** with phone unusable for C2B, browsing recent unallocated Till payments and picking by name/amount/time is the only reliable cashier flow. The list must therefore carry enough to recognise the customer's payment at a glance.

**How to apply:** the separate SunPay proxy repo (NOT this repo) owns `/api/v2/mpesa/lookup` and must: accept `recent=1`, return the recent UNALLOCATED payments for that shop as a list, include `allocated` so used codes are excluded, and include `amount`/`payerName`/`time`/`mpesaRef`. Final allocation/consumption is still enforced upstream at sale creation, not at lookup.

## Showing the M-Pesa ref on receipts/sales — split-placeholder trap
The sale stores the M-Pesa code in `mpesaTransId`. When surfacing it (POS receipt modal, printed/PDF/thermal receipts, ReceiptView, sales list) ALWAYS gate on `paymentMethod === "mpesa"` (POS) / `paymentTag === "mpesa"` (sales). **Why:** for SPLIT sales the checkout writes a synthetic placeholder into `mpesaTransId` (`SPLIT_<ts>`, and `bankTransId` gets `BANK_<ts>`) — printing it unguarded shows a fake "M-Pesa code". The printer payload field is `mpesaRef`; client+server printer templates render it after the non-split Payment line.

## SunPay `MpesaPayment` schema → client field mapping
Upstream Mongo model fields → JSON the client expects: `mpesa_ref`→`mpesaRef`, `payer_name`→`payerName`, `paid_amount ?? amount`→`amount`, `paid_at`→`time`, `allocated`→`allocated`. Recent query = `{ shopId, status:"paid", allocated:{$ne:true} }` sorted `paid_at:-1`, limited. The existing `lookupCode` returns `400 "code is required"` when no code — add a `recent && !code` branch BEFORE that guard.

**CRITICAL C2B gap + the key:** C2B `payment.completed` payloads carry NO `shopId` and NO shortcode, so the webhook upserts them with `shopId:null` and a shopId-filtered `recent` query returns NOTHING. **The C2B→shop link is `externalRef`** — it is STABLE across different C2B payments to the same till (observed `8556676` repeated across separate payments, while `transactionId`/`mpesaRef` differ), i.e. it's the account/merchant reference the money settled to, not a per-txn id. Fix upstream: in the webhook, resolve the Shop by matching `data.externalRef` against the shop's `sunpay_merchant_ref` (or `paybill_till`) and stamp `shopId` on the C2B record. Confirm which Shop field `8556676` actually lives in by querying their DB. Until that's done, browse is empty for pure C2B.

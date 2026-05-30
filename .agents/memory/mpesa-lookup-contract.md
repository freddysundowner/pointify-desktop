---
name: M-Pesa Flow B lookup contract
description: What the upstream SunPay proxy must return for the already-paid (no-STK) payment lookup by code or phone.
---

# Flow B lookup (customer paid the Till directly, no STK)

The POS searches an already-made payment via `GET /api/mpesa/lookup?shopId=...&code=...` OR `...&phone=254...`. This repo's server forwards both params to upstream `GET /api/v2/mpesa/lookup`. Phone is normalized to `2547XXXXXXXX` client-side before sending.

**Upstream response is normalized client-side** to a candidate list and accepts any of these shapes: a single object, `{payments:[...]}`, `{results:[...]}`, or a bare array. Per-item fields read (with aliases): `mpesaRef|code|transID`, `payerName|name`, `amount`, `time|createdAt|transTime`, `allocated`.

**Why:** a phone query can match several recent unallocated payments, so the contract must allow a list; a code query is normally one. The client filters out `allocated:true`, auto-selects when exactly one usable result remains, otherwise renders a picker.

**How to apply:** the separate SunPay proxy repo (NOT this repo) owns `/api/v2/mpesa/lookup` and must: accept `phone`, return recent UNALLOCATED payments for that shop+phone (a list), include `allocated` so used codes are excluded, and ideally `amount`/`payerName`/`time` so the cashier can confirm the right one before saving. Final allocation/consumption is still enforced upstream at sale creation, not at lookup.

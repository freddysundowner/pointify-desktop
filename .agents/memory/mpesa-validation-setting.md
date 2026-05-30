---
name: M-Pesa per-shop validation setting
description: Shop-level "validate M-Pesa payments" toggle, its default direction, and why enforcement must live upstream
---

# Shop-level M-Pesa validation toggle

A boolean shop setting (`mpesa_require_validation`) controls whether linked-shop M-Pesa
codes must be validated (STK-confirmed or verified, with underpayment blocked) before a
sale can complete (Flow B), or are treated as **reference-only** (saved on the sale, not
checked against the SunPay payment pool, not consumed).

**Default direction:** treat missing/undefined as ON. Both the settings form and the POS
read it as `mpesa_require_validation !== false`. This preserves the existing strict Flow B
behaviour for shops that never set it; turning it off is an explicit opt-out.

**POS gating:** derive `mpesaValidationEnforced = mpesaLinked && mpesaRequireValidation`
and use that single predicate in BOTH the processTransaction guards and the disabled
Complete button (keeps Enter-key/auto-finalize parity). The sale payload always sends
`mpesaValidate: mpesaValidationEnforced` (false for unlinked shops — no pool to validate).

**Why enforcement cannot be trusted from here:**
**Why:** `mpesaValidate` is a client-derived flag and this repo's proxy masks upstream
status, so a tampered request could send `mpesaValidate:false` while shop policy is ON.
The real sale-commit (`createSale`) lives in the user's SEPARATE proxy repo.
**How to apply:** upstream `createSale` must re-derive the requirement from the persisted
shop record (fetch shop by shopId) and only call `allocatePayment` / enforce underpayment
when the shop policy says so — it must NOT trust the client `mpesaValidate` field. The shop
schema there must also include `mpesa_require_validation` or Mongoose strict mode drops it
on save.

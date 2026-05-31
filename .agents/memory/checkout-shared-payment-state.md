---
name: Checkout shared payment state
description: checkout-modal reuses one cashReceived state for both cash and split; switching methods must clear it.
---

# Shared cashReceived state in checkout-modal

The POS checkout modal uses a single `cashReceived` state field for BOTH the
cash payment method and the cash leg of a split (M-Pesa + cash) payment.

**Rule:** any payment-method switch must clear `cashReceived` (the method-switch
onClick does this), and split completion bounds must be enforced in `canComplete`
logic (`0 < splitMpesaNum <= total`), not only via the input `max` attribute.

**Why:** without clearing, a prior cash entry leaks into a later split flow and
can satisfy `splitCashReceived >= splitCashDue` without fresh cash being
collected — completing a sale with stale cash data. Input `max` is bypassable by
typing/paste, so over-total split amounts must be rejected in logic too.

**How to apply:** when adding new payment methods or sub-flows that share
`cashReceived` (or any cross-flow input state), reset that state on method change
and gate completion on validated, bounded derived values.

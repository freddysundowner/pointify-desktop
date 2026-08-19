---
name: Held-sale continuation
description: Safety rules for reopening and editing an on-hold sale in the POS.
---

A resumed held sale remains the same server record. Carry its identity and revision into the POS, restore its line/inventory metadata, and save or complete it with an update—not a new sale creation.

**Why:** Treating continuation as a fresh checkout can duplicate the sale, while clearing or offline-queuing after an ambiguous failed update can lose the cashier's edits or create a second transaction.

**How to apply:** Preserve the open cart until an authoritative updated sale is returned. Reject stale revisions, and never route a failed held-sale update through the offline new-sale queue.

Post-write confirmation must come from a fresh authoritative read whose revision changed and whose persisted sale content matches the requested update. An acknowledgement or sale-shaped PUT response is not sufficient proof.

**Why:** Some upstream writes acknowledge before returning the persisted record, and an old or echoed record can otherwise cause the POS to clear unsaved cashier edits.

**How to apply:** Serialize preflight, write, and verification per sale when possible. Treat an in-process lock only as a local race guard; cross-instance and direct-upstream writers still require atomic revision-and-status enforcement at the authoritative backend.
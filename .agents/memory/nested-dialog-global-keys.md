---
name: Nested dialogs vs global window key handlers
description: A window-level keydown handler that closes/acts on a parent dialog must check whether a nested dialog is open.
---

# Rule
When a component registers a `window` keydown listener that drives a parent surface (e.g. Escape closes the payment dialog, Enter completes the sale, letter keys pick a payment method), and a SECOND dialog can open on top of that surface, the global handler must early-return / no-op while the nested dialog is open.

**Why:** the window listener fires regardless of Radix's portal + topmost-dialog handling. Without a guard, Escape inside the nested dialog tears down the parent flow instead of just closing the nested dialog, and parent shortcuts (Enter, single-letter keys) still fire while the user is typing/searching in the nested dialog.

**How to apply:**
- Track the nested dialog's open flag in the same ref the keydown handler reads (these handlers read state via a `useRef` snapshot, not closures).
- For Escape: if nested-open, `return` and let Radix close the topmost dialog.
- For the parent's other shortcuts: gate the whole block on `parentOpen && !nestedOpen`. (The `inInput` check alone is not enough — Escape/non-input shortcuts bypass it.)

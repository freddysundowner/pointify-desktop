---
name: Cancellable async UI flows
description: Guarding polling loops and useMutation onSuccess so cancel/back/close cannot be resurrected by a late-arriving response.
---

# Rule
Any multi-step async UI flow (polling + mutations) where the user can cancel, switch path, switch parent state, or close the surface must use a flow-instance guard. A `useRef<number>` that increments on every reset; every async callback captures the value at start and bails if it changed before mutating state.

**Why:** clearing `setInterval` does NOT cancel an in-flight `fetch` already past the await. Its `.then` will still call `setState` and can flip the flow back to "success" after the user cancelled, leaving the UI in an unreachable state and enabling actions the user explicitly aborted (e.g. completing a payment for a cancelled transaction).

**How to apply:**
- Add `const flowIdRef = useRef(0);`
- In `resetX()`: bump `flowIdRef.current += 1` AND clear timers.
- Every mutation: capture `const flowId = flowIdRef.current;` at the top of `mutationFn`, return it alongside data, then in `onSuccess` early-return if `flowIdRef.current !== flowId`.
- Every poll tick: same guard at the top and after every `await`.
- Also reset when the parent state that owns the flow changes (e.g. switching payment method away from `mpesa` must call `resetMpesa()`).
- Always validate the success-response shape (e.g. `transactionId` present) before transitioning to "waiting" — otherwise you poll `/status/undefined` and silently degrade to timeout.

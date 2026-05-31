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
- Poll with a self-scheduling `setTimeout` loop (schedule the next tick only after the current `await` resolves), NOT `setInterval`. `setInterval` fires every N ms regardless of whether the previous status request finished, so slow responses stack up overlapping requests and can apply out-of-order status transitions.
- A one-shot lookup/search (not just polling) has the same hazard: ANY UI action that changes the search context — editing the query input, switching a search-by toggle, switching the parent tab, a "Change"/reset link — must bump the flow id, not merely clear local state. Otherwise a late response auto-selects a now-stale match and can silently flip gated actions (e.g. enable a Complete button) on a surface the user already navigated away from. Centralize this in one `cancelX()` helper and call it from every such handler.
- Use a SEPARATE race token per independent concurrent flow; do NOT share one flowId ref across flows that can run at the same time. Concretely: M-Pesa STK polling (Flow A) and the "browse recent payments" fetch (Flow B) coexist — if the browse fetch bumps the shared `mpesaFlowIdRef`, it cancels in-flight STK polling but leaves `mpesaStkStatus` stuck at "waiting", stranding Flow A with a disabled send button. Give the passive/read-only browse its own `mpesaListFlowIdRef` and its own loading/error state so it never mutates the other flow's verification/status state. **Why:** sharing one token couples two flows that must be independent; a passive list refresh should never tear down an active transaction.

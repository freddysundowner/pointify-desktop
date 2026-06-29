---
name: mutateAsync + onError double-toast trap
description: A try/catch around mutateAsync double-notifies because onError already toasted
---

# Don't toast in the caller's catch when the mutation's onError already toasts

A React Query mutation's `onError` runs AND `mutateAsync` still rejects. So
`try { await m.mutateAsync() } catch { toast(...) }` shows TWO toasts for one
failure. Worse here: the POS sale onError shows "Sale Saved Offline" on a transport
failure, but the caller's catch then showed a contradictory "Payment Failed".

**Why:** onError and the awaited rejection are two separate notification points for
the same failure.

**How to apply:** Pick ONE place to notify the user. Keep onError as the single
authority (it has the offline-vs-real-rejection logic) and let the caller's catch
only log/cleanup. Don't add a toast around mutateAsync for that flow.

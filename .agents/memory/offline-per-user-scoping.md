---
name: Offline per-user data scoping
description: How offline IndexedDB data is isolated per admin/attendant on shared tills
---

Offline IndexedDB data is isolated per identity: each admin/attendant gets its own database (`pos-offline-db::<role>:<id>`), with the scope recomputed from localStorage tokens on every storage call — so login/logout/user-switch automatically switches databases with no wiring in auth flows.

**Why:** shared tills; a browser-global cache leaked one user's customers/products to the next, and queued offline sales synced under whichever token was active at flush time.

**How to apply:**
- Scope precedence must mirror apiCall's Authorization precedence (authToken → attendantToken → anon), or queued items could replay under the wrong token.
- The offline credential vault is deliberately a separate GLOBAL db (`pos-offline-auth`) — it must be readable before login; it stores only salted verifiers.
- Sync-queue items are stamped with `owner` scope; the flush loop skips mismatched owners (defense-in-depth).
- The legacy shared `pos-offline-db` is never reopened for business data (only credentials were migrated out of it once); anything left there is intentionally orphaned.
- Attendant login/logout must `queryClient.clear()` (admin login already did) so in-memory React Query data doesn't leak across users.

---
name: Offline login fallback gating
description: How to gate offline credential fallback so a server password rejection is never bypassed by the cached verifier.
---

# Offline login fallback gating

The web POS supports offline login for admin (email+password) and attendant
(PIN+password) by verifying the entered password against a PBKDF2 verifier cached
in IndexedDB on the last successful ONLINE login.

**Rule:** offline credential fallback may run ONLY when the login request failed
at the transport level (no HTTP response — fetch threw / timeout / `navigator.onLine`
false). It must NEVER run after the server actually responded, even with a
non-2xx/rejection.

**Why:** the server is the source of truth for password changes, disabled
accounts, and revocation. If a server rejection (e.g. wrong/old password) falls
through to the cached verifier, a password that was changed server-side would
still log the user in offline. `isNetworkError()` alone is too loose for this gate
because it message-sniffs (matches the bare word "network") and trusts
`navigator.onLine`.

**How to apply:**
- Admin (`useAuth.login`, uses `apiCall` which throws on BOTH transport AND HTTP
  errors): track a `serverResponded` flag, set it true right after
  `await response.json()`, and gate fallback on `!serverResponded && isNetworkError(error)`.
- Attendant (`attendant-login.tsx`, raw `fetch`): structure as two stages — only
  the `fetch` call is inside the try that can trigger offline fallback; check
  `!response.ok` and parse the result AFTER that try, so a server rejection can
  never reach the fallback branch.
- Credentials carry a cached bearer token and expire 30 days after the last
  online login. Restoring an expired JWT is tolerated (offline selling still
  works); sync just fails until the next online re-auth — accepted tradeoff.

## Session RESTORE on launch (separate from login)

There is a second, mirror-image gate at app startup. `useAuth.fetchAdminData`
(called by `initializeAuth` when a stored `authToken` exists) fetches fresh admin
data; on an offline PWA launch that fetch throws a transport error.

**Rule:** that catch must NOT `logout()` — `logout()` clears
`authToken/adminData/attendantData/selectedShopId` AND redirects to `/`, so an
offline launch was bouncing every session (incl. attendant, since it shares the
`authToken` path) to the login page. Instead, restore the cached `adminData`
profile (`setAdmin` + return it) so `isAuthenticated` (`!!admin && !!token`)
stays true and the app proceeds offline.

**But gate it with `isNetworkError(error)`** — only restore on a real transport
failure. A 401/HTTP rejection must still rethrow so `refreshAuth` can force
logout and revocation is enforced (don't paper a revoked token over with cache).
`apiCall` already self-redirects on admin 401 and rethrows a non-network message,
so `isNetworkError` correctly excludes it. Attendant context restores
synchronously from localStorage (no network) so it needs no equivalent change.

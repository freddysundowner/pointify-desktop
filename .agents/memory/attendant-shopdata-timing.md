---
name: Attendant shopData timing gap
description: Why attendant.shopData is unreliable right after login and what to use instead.
---

`AttendantAuthContext.login(attendantData, token, shopData)` stores `shopData` separately in
Redux (`state.attendant.shopData`) and in `localStorage['shopData']` — it does NOT merge it into
the `attendant` object at login time. `attendant.shopData` only gets populated on the next page
load, because `initializeAttendantAuth()` manually merges `JSON.parse(storedShopData)` into the
rehydrated attendant object.

**Why:** Any gating logic (e.g. `isRestaurant`, subscription flags) that reads
`attendant?.shopData?.X` will silently be `undefined` for the whole session right after a fresh
login, only "fixing itself" after a refresh — a hard-to-reproduce bug if you test by refreshing.

**How to apply:** For attendant-side feature gating on shop flags, read `shopData` from
`useAttendantAuth()` (exposed directly from Redux `state.attendant.shopData`) rather than
`attendant.shopData`. Same applies anywhere else in the app that reads `attendant.shopData`.

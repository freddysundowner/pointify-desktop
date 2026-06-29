---
name: Kenyan display timezone
description: How/why all dates are forced to Africa/Nairobi for display
---

All date/time the app DISPLAYS is forced to Kenyan time (Africa/Nairobi, EAT
UTC+3), regardless of the viewer's device or host timezone. Backend timestamps
are UTC; without forcing a timezone, `toLocale*` renders in whatever timezone
the browser/host is in, so times showed up hours off.

**How:** `client/src/lib/timezone.ts` monkey-patches
`Date.prototype.toLocaleString / toLocaleDateString / toLocaleTimeString` to
default the `timeZone` option to `Africa/Nairobi` when the caller didn't pass
one. Installed once at the top of `client/src/main.tsx` (`installKenyanTimeZone()`)
before render, so it covers all ~100+ scattered call sites and any future ones.
Explicit `timeZone` options are respected; `Number.prototype.toLocaleString`
(currency/number formatting) is untouched; patch is guarded against
double-application under HMR.

**Why a global patch instead of editing call sites:** the codebase has 100+
raw `toLocale*` date calls across ~40 files; a single central patch is reliable
and self-maintaining vs. touching every site.

**How to apply / caveat:** this only fixes DISPLAY. Calendar math that uses
`new Date()` / local-midnight for "today" / start-end date range *filters* still
uses the runtime's local timezone — if a report's day boundaries ever look off
for non-EAT hosts, normalize those computations to Africa/Nairobi explicitly.

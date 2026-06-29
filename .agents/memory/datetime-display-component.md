---
name: DateTime display component
description: Reusable component to show a record's date with the time beneath it, in Kenya time.
---

`client/src/components/date-time.tsx` exports `<DateTime value={...} />` — renders a
record timestamp with the time directly below the date (or `inline` => "date · time").
Times are EAT because Date formatting is globally pinned to Africa/Nairobi
(`src/lib/timezone.ts`), so the component does NOT pass a timeZone itself.

**Convention (apply when "show time under the date" requests recur):**
- Convert only ON-SCREEN displays of real record timestamps (saleDate, createdAt,
  returnDate, payment.date, last_seen, etc.) in tables/cards/detail views.
- Do NOT convert: CSV/PDF/printed-HTML exports (`doc.text`, `csvContent +=`, escpos/print
  template literals), date-range filter labels/headers ("Period: X to Y", "Today (date)"),
  day-bucket/group headers, live clocks, or rows already showing date+time separately.
- Forward-looking/planned dates with no real time-of-day (e.g. purchase `expectedDate`)
  are left date-only on purpose — adding "12:00 AM" beneath them is misleading.

**Why:** user asked for time under the date "all over the system"; exports/headers/ranges
are not record timestamps and adding time there breaks layout or is nonsensical.

**Gotcha:** `Date.toLocaleDateString(locale, {hour,minute})` silently IGNORES time options —
several call sites "looked like" they showed time but didn't (e.g. purchase-view header).
Use `<DateTime>` (or pair toLocaleDateString + toLocaleTimeString) instead.

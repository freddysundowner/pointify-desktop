---
name: Sales report HTTP conditional caching
description: Why the sales-report query must fetch with no-store, not the default fetcher
---

The upstream Pointify report endpoint (`/api/analysis/sales/report`, proxied) supports
HTTP conditional caching and returns `304 Not Modified`. The default react-query fetcher
(`getQueryFn` in `lib/queryClient.ts`) uses the browser cache and a 5-minute `staleTime`.

**Symptom:** filtering the report by attendant A, switching to B, then back to A showed
stale numbers — the browser/react-query served a cached body instead of re-running the filter.

**Rule:** any query whose upstream returns 304 and whose result must reflect the *current*
filter selection should use a custom `queryFn` with `cache: "no-store"` plus `staleTime: 0`,
`gcTime: 0`, `refetchOnMount: "always"`. This mirrors the Attendants page pattern.

**Why:** the default fetcher cannot pass `cache: "no-store"`, so it cannot defeat the
upstream's conditional caching; only an explicit per-query fetch can.

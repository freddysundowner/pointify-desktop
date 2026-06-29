---
name: Proxy online-first slowness & circuit breaker
description: Why pages felt slow (per-read failed online round-trip) and the breaker/timeout that fixes it without breaking production.
---

# Online-first proxy: per-read latency tax

The thin proxy (`server/src/config.ts`, `makePointifyRequest`) runs in `online`
mode and tries the online Pointify upstream FIRST on every request, then falls
back to the local source. When the online host is unreachable, every READ paid a
full failed round-trip before the (working) local call — data-heavy pages fire
many reads, so the waits stacked up and the UI (which gates on those reads) felt
slow.

**Why the network monitor didn't help:** `network-monitor.ts` decides online/
offline via DNS `lookup()` of google/cloudflare/8.8.8.8/api.pointifypos.com.
DNS resolves fine even when the upstream HTTPS host can't actually be connected,
so it stays in `online` mode and never switches to skip online.

## The fix (and its guard)
- `fetchWithTimeout` (AbortController) caps online attempts (~4s) and local
  (~15s) so a slow/unreachable host can never hang a request/page.
- An in-memory circuit breaker: after an online failure, open the circuit for
  ~30s during which READS skip the online attempt and go straight to local; a
  successful online call resets it (self-heals). WRITES always still attempt
  online first (sale-correctness + upstream HTTP-error surfacing).

**Why:** without skipping, each read keeps paying the failed online attempt.

**Critical guard — `hasDistinctLocalSource`:** only skip online when the local
base (`POINTIFY_API_BASE`, from `POINTIFY_OFFLINE_API_URL`) DIFFERS from the
online base (`POINTIFY_API_URL`). Both default to `api.pointifypos.com`; if
they're the same host, "falling back to local" hits the same dead host and would
serve empty `[]` fallbacks during a transient blip. So when bases are equal the
breaker is disabled and behaviour is unchanged online-first (still timeout-
protected). In this dev env a distinct reachable `POINTIFY_OFFLINE_API_URL` is
set, so the breaker is active and reads drop from ~0.6s to ~0.16s.

**How to apply:** if tuning, keep WRITES on online-first; keep the distinct-
source guard; consider a half-open probe to recover faster than the 30s cooldown.

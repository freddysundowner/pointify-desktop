---
name: Pointify upstream API path prefixes
description: Which upstream paths are bare-rooted vs /api/v2 on the Pointify proxy
---
Most Pointify upstream endpoints called via `makePointifyRequest` are bare-rooted on the base host (e.g. `/shop/...`, `/product/...`, `/shopcategories`) and work against `POINTIFY_API_URL` (staging.pointifypos.com).

**M-Pesa / SunPay endpoints are the exception: they live under `/api/v2/mpesa/...`** (stk-push, expect, status/:id, lookup). Calling them without the `/api/v2` prefix 404s upstream.

**Why:** A 404 upstream is swallowed by `gracefulFallback` in `server/src/config.ts`, which returns `[]` with HTTP 200. So a wrong path looks like a "successful empty" response, not an error — payments silently never reach SunPay.

**How to apply:** When adding/forwarding any mpesa route, use the `/api/v2/mpesa/` prefix. Verify a path exists by hitting it directly: a 400 validation error means it exists; a 404 HTML page means wrong path.

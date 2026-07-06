---
name: Pointify base URL config
description: How the proxy's upstream base URL is chosen, and the dotenv-vs-Replit-env override gotcha.
---

# Pointify upstream base URL

`server/src/config.ts` resolves two bases at module load:
- `POINTIFY_ONLINE_API_BASE = process.env.POINTIFY_API_URL || '<default>'` (online-first traffic)
- `POINTIFY_API_BASE = process.env.POINTIFY_OFFLINE_API_URL || '<default>'` (local/offline fallback)

**Why:** In "online" mode, writes always try online first; reads fall back to the local base (and a circuit breaker sends reads straight to local after an online miss). If online and local bases differ, most reads end up on the *local* base — so both vars matter, not just `POINTIFY_API_URL`.

**dotenv gotcha:** `dotenv.config()` does NOT override variables already present in the Replit environment. `POINTIFY_API_URL` is set as a Replit **shared env var**, so editing `.env` has no effect on it — the startup log line `injecting env (1)` is the tell (only the vars NOT already in the environment get injected). To change the online base, update the env var via the environment-secrets tooling (`setEnvVars`), not `.env`. `.env` itself is not editable by the agent.

**How to apply:** To point all traffic at one host, set the `POINTIFY_API_URL` env var AND make sure `POINTIFY_OFFLINE_API_URL` resolves to the same host (it's usually unset, so it takes the hardcoded default in config.ts). Confirm at runtime by grepping the server log for `Attempting online request for https://<host>`.

# M-Pesa / SunPay link precondition

The POS M-Pesa collector (STK push / direct pay / lookup) only renders when the shop record has `sunpay_merchant_ref` set. That field is populated by the upstream Pointify backend linking the shop's Till/Paybill to SunPay — it is NOT the same as the manually-entered `paybill_till`. If the shop shows `sunpay_link_error` (e.g. `SunPay 401: Invalid API key`), linking failed upstream and `sunpay_merchant_ref` stays null, so the whole M-Pesa panel stays hidden. This is a backend/credential issue, not fixable in this repo.

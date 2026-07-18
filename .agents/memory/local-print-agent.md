---
name: Local print agent for network receipt printing
description: Why/how cloud-hosted POS prints to shop-LAN ESC/POS printers via a localhost agent
---

The cloud server can never reach a shop's private printer IP (e.g. 192.168.1.2:9100), and browsers can't open raw TCP. Solution: a standalone agent (`agent/pointify-print-agent.js`) runs on the till PC, listening on `http://localhost:9105`.

**How it works:** client detects TCP printer config → asks our server `POST /api/printer/format` for the plain-text receipt (server stays single source of receipt layout via `formatReceiptText`) → sends `{ip,port,text}` to the agent, which builds ESC/POS and TCP-sends. Client helper: `client/src/lib/print-agent.ts` (`tryAgentPrintReceipt`).

**Why localhost works from an HTTPS page:** localhost is exempt from mixed-content blocking; Chrome Private Network Access needs the agent to reply to preflight with `Access-Control-Allow-Private-Network: true`.

**Security decisions:** agent binds 127.0.0.1 only, refuses non-private target IPs, allows only ports 9100–9103, optional shared secret (`AGENT_TOKEN` env ↔ `localStorage.printAgentToken`). CORS `*` is acceptable only because of these target restrictions.

**Fallback rule:** both receipt print surfaces (POS modal and sales receipt view) must fall back to the browser print dialog when the agent is missing or errors — never dead-end the cashier.

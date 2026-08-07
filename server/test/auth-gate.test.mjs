// Integration tests for the proxy auth gate (middleware/require-auth.ts).
// Run against a locally running server: `node --test test/auth-gate.test.mjs`
// (set BASE_URL to override the default http://localhost:3000).
import test from "node:test";
import assert from "node:assert";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const b64url = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");

const GATED = [
  "/api/suppliers?shopId=test",
  "/api/purchases?shopId=test",
  "/api/cashflow?shop=test",
  "/api/cashflow-categories?shop=test",
  "/api/settings?adminId=test",
];

async function get(path, token) {
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.status;
}

test("no token -> 401 on every gated family", async () => {
  for (const path of GATED) {
    assert.strictEqual(await get(path), 401, `expected 401 for ${path}`);
  }
});

test("garbage token (neither known shape) -> 401", async () => {
  assert.strictEqual(await get(GATED[0], "fake"), 401);
});

test("base64-JSON token missing attendantId -> 401", async () => {
  const token = Buffer.from(JSON.stringify({ hello: "world" })).toString("base64");
  assert.strictEqual(await get(GATED[0], token), 401);
});

test("expired JWT -> 401 without contacting upstream", async () => {
  const token = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({
    id: "someadmin",
    exp: Math.floor(Date.now() / 1000) - 3600,
  })}.sig`;
  assert.strictEqual(await get(GATED[0], token), 401);
});

test("fabricated unexpired JWT with subject claim -> 401 (fail closed)", async () => {
  const token = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({
    id: "000000000000000000000000",
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.forged-signature`;
  assert.strictEqual(await get(GATED[0], token), 401);
});

test("legacy unsigned attendant blob -> 401 (must re-login for a signed token)", async () => {
  const token = Buffer.from(
    JSON.stringify({ attendantId: "507f1f77bcf86cd799439011", permissions: [] }),
  ).toString("base64");
  assert.strictEqual(await get(GATED[0], token), 401);
});

test("ungated public endpoints stay open", async () => {
  assert.strictEqual(await get("/api/config"), 200);
  assert.strictEqual(await get("/api/printer/status"), 200);
});

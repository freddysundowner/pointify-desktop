// Hermetic unit tests for the fail-closed proxy auth gate.
// Run: `npx tsx --test test/require-auth.unit.test.ts` (from server/)
// The upstream is fully mocked via the injectable introspect function.
import test from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";

process.env.SESSION_SECRET = process.env.SESSION_SECRET || "test-secret";

const { verifyBearerToken } = await import("../src/middleware/require-auth.js");
const { mintAttendantToken } = await import("../src/lib/attendant-token.js");

const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (payload: Record<string, unknown>) =>
  `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url(payload)}.forged-signature`;

// Introspect mocks
const unreachable = async () => undefined;
const rejects401 = async () => ({ success: false, httpStatus: 401, error: "no admin exists" });
const notFound404 = async () => ({ success: false, httpStatus: 404 });
const adminOk = (id: string) => async () => ({ _id: id, name: "Admin" });
const neverCalled = async () => {
  throw new Error("introspect must not be called for locally decidable tokens");
};

test("signed attendant token verifies locally (no upstream call)", async () => {
  const token = mintAttendantToken({ attendantId: "att-1", shopId: "s1" });
  assert.strictEqual(await verifyBearerToken(token, neverCalled), "valid");
});

test("tampered signed attendant token is invalid", async () => {
  const token = mintAttendantToken({ attendantId: "att-1" });
  const [payload] = token.split(".");
  const forged = mintAttendantToken({ attendantId: "att-2" }).split(".")[1];
  assert.strictEqual(await verifyBearerToken(`${payload}.${forged}`, unreachable), "invalid");
});

test("expired signed attendant token is invalid", async () => {
  const payloadB64 = b64url({ attendantId: "att-1", exp: Date.now() - 1000 });
  const sig = crypto
    .createHmac("sha256", process.env.SESSION_SECRET!)
    .update(payloadB64)
    .digest("hex");
  assert.strictEqual(await verifyBearerToken(`${payloadB64}.${sig}`, unreachable), "invalid");
});

test("legacy unsigned base64 attendant blob is rejected even with a real-looking id", async () => {
  const blob = Buffer.from(
    JSON.stringify({ attendantId: "507f1f77bcf86cd799439011", permissions: [] }),
  ).toString("base64");
  assert.strictEqual(await verifyBearerToken(blob, unreachable), "invalid");
});

test("garbage token is invalid", async () => {
  assert.strictEqual(await verifyBearerToken("fake", unreachable), "invalid");
});

test("expired admin JWT is invalid without upstream contact", async () => {
  const token = jwt({ id: "a1", exp: Math.floor(Date.now() / 1000) - 60 });
  assert.strictEqual(await verifyBearerToken(token, neverCalled), "invalid");
});

test("admin JWT without a subject claim is invalid", async () => {
  const token = jwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
  assert.strictEqual(await verifyBearerToken(token, neverCalled), "invalid");
});

test("forged future admin JWT: upstream 401 -> invalid", async () => {
  const token = jwt({ id: "a1", exp: Math.floor(Date.now() / 1000) + 3600 });
  assert.strictEqual(await verifyBearerToken(token, rejects401), "invalid");
});

test("admin JWT: upstream 404 -> invalid", async () => {
  const token = jwt({ id: "a1", exp: Math.floor(Date.now() / 1000) + 3600 });
  assert.strictEqual(await verifyBearerToken(token, notFound404), "invalid");
});

test("admin JWT: upstream returns a DIFFERENT admin -> invalid", async () => {
  const token = jwt({ id: "a1", exp: Math.floor(Date.now() / 1000) + 3600 });
  assert.strictEqual(await verifyBearerToken(token, adminOk("someone-else")), "invalid");
});

test("admin JWT: upstream positively identifies the subject -> valid", async () => {
  const token = jwt({ id: "a1", exp: Math.floor(Date.now() / 1000) + 3600 });
  assert.strictEqual(await verifyBearerToken(token, adminOk("a1")), "valid");
});

test("admin JWT: upstream unreachable -> indeterminate (gate fails closed unless recently verified)", async () => {
  const token = jwt({ id: "a1", exp: Math.floor(Date.now() / 1000) + 3600 });
  assert.strictEqual(await verifyBearerToken(token, unreachable), "indeterminate");
});

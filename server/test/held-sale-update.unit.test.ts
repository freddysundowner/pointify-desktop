import test from "node:test";
import assert from "node:assert";
import {
  addHeldSaleRevision,
  buildHeldSaleRevision,
  extractSaleRecord,
  verifyPersistedHeldSaleUpdate,
  withSaleUpdateLock,
} from "../src/lib/held-sale-update.js";

const expectedUpdatedAt = "2026-08-19T10:00:00.000Z";

const updateBody = {
  products: [
    {
      product: "product-1",
      inventory: "inventory-1",
      attendantId: "attendant-1",
      quantity: 2,
      unitPrice: 100,
      tax: 16,
      lineDiscount: 10,
      salesnote: "No onions",
    },
  ],
  shopId: "shop-1",
  attendantId: "attendant-1",
  saleType: "Retail",
  clientRef: "client-ref-1",
  createdAt: "2026-08-18T09:00:00.000Z",
  status: "cashed",
  totaltax: 32,
  orderId: "order-1",
  duedate: null,
  mpesaTransId: "",
  mpesaTotal: 0,
  bankTotal: 0,
  bankTransId: "BANK-123",
  amountPaid: 190,
  outstandingBalance: 0,
  paymentType: "cash",
  paymentTag: "cash",
  totalDiscount: 20,
  customerId: "customer-1",
  saleDiscount: 0,
  extraCharges: [{ name: "Delivery", amount: 10 }],
  extraChargesTotal: 10,
  salesnote: "Delivery",
};

const persistedSale = {
  _id: "sale-1",
  updatedAt: "2026-08-19T10:01:00.000Z",
  items: [
    {
      product: { _id: "product-1", name: "Burger" },
      inventory: { _id: "inventory-1" },
      attendantId: { _id: "attendant-1" },
      quantity: 2,
      unitPrice: 100,
      tax: 16,
      lineDiscount: 10,
      salesnote: "No onions",
    },
  ],
  shopId: { _id: "shop-1" },
  attendantId: { _id: "attendant-1" },
  saleType: "retail",
  clientRef: "client-ref-1",
  createdAt: "2026-08-18T09:00:00.000Z",
  status: "cashed",
  totaltax: 32,
  orderId: "order-1",
  duedate: "",
  mpesaTransId: "",
  mpesaNewTotal: 0,
  bankTotal: 0,
  bankTransId: "BANK-123",
  amountPaid: 190,
  outstandingBalance: 0,
  paymentType: "cash",
  paymentTag: "cash",
  totalDiscount: 20,
  customerId: { _id: "customer-1" },
  saleDiscount: 0,
  extraCharges: [{ name: "Delivery", amount: 10 }],
  extraChargesTotal: 10,
  salesnote: "Delivery",
};

test("extractSaleRecord unwraps supported upstream response shapes", () => {
  assert.strictEqual(extractSaleRecord({ sale: persistedSale }), persistedSale);
  assert.strictEqual(
    extractSaleRecord({ data: { sale: persistedSale } }),
    persistedSale,
  );
  assert.strictEqual(extractSaleRecord([]), null);
  assert.strictEqual(extractSaleRecord({ success: false }), null);
});

test("legacy revision enrichment preserves every supported response envelope", () => {
  const legacySale = { ...persistedSale, updatedAt: undefined };
  const envelopes = [
    { payload: { sale: legacySale, message: "ok" }, keyPath: ["sale"] },
    {
      payload: { updatedSale: legacySale, message: "ok" },
      keyPath: ["updatedSale"],
    },
    {
      payload: { data: { sale: legacySale }, message: "ok" },
      keyPath: ["data", "sale"],
    },
    { payload: { data: legacySale, message: "ok" }, keyPath: ["data"] },
    { payload: legacySale, keyPath: [] },
  ];

  for (const { payload, keyPath } of envelopes) {
    const enriched = addHeldSaleRevision(payload);
    const sale = keyPath.reduce((value, key) => value[key], enriched);

    assert.ok(sale.heldSaleRevision);
    assert.strictEqual(sale._id, legacySale._id);
    if (keyPath.length > 0) {
      assert.strictEqual(enriched.message, "ok");
    }
  }
});

test("accepts a fresh persisted sale that matches the requested update", () => {
  assert.deepStrictEqual(
    verifyPersistedHeldSaleUpdate({
      saleId: "sale-1",
      expectedUpdatedAt,
      updateBody,
      persistedSale,
    }),
    { ok: true },
  );
});

test("rejects an acknowledgement followed by the unchanged old revision", () => {
  const result = verifyPersistedHeldSaleUpdate({
    saleId: "sale-1",
    expectedUpdatedAt,
    updateBody,
    persistedSale: { ...persistedSale, updatedAt: expectedUpdatedAt },
  });

  assert.strictEqual(result.ok, false);
  if (!result.ok) assert.ok(result.mismatches.includes("revision"));
});

test("allows a legacy sale without updatedAt when its verified content matches", () => {
  const legacySale = { ...persistedSale, updatedAt: undefined };
  const result = verifyPersistedHeldSaleUpdate({
    saleId: "sale-1",
    expectedHeldSaleRevision: buildHeldSaleRevision(legacySale),
    updateBody,
    persistedSale: legacySale,
  });

  assert.deepStrictEqual(result, { ok: true });
});

test("legacy revision tokens change when the held sale changes before saving", () => {
  const legacySale = { ...persistedSale, updatedAt: undefined };
  const openedRevision = buildHeldSaleRevision(legacySale);
  const changedRevision = buildHeldSaleRevision({
    ...legacySale,
    items: [{ ...legacySale.items[0], quantity: 3 }],
  });

  assert.notStrictEqual(openedRevision, changedRevision);
});

test("treats omitted legacy zero values as equivalent to explicit zeroes", () => {
  const zeroUpdate = {
    ...updateBody,
    products: [{ ...updateBody.products[0], tax: 0 }],
    saleDiscount: 0,
    mpesaTotal: 0,
    bankTotal: 0,
    outstandingBalance: 0,
  };
  const legacySale = {
    ...persistedSale,
    updatedAt: undefined,
    items: [{ ...persistedSale.items[0], tax: undefined }],
    saleDiscount: undefined,
    mpesaNewTotal: undefined,
    bankTotal: undefined,
    outstandingBalance: undefined,
  };
  const result = verifyPersistedHeldSaleUpdate({
    saleId: "sale-1",
    expectedHeldSaleRevision: buildHeldSaleRevision(legacySale),
    updateBody: zeroUpdate,
    persistedSale: legacySale,
  });

  assert.deepStrictEqual(result, { ok: true });
});

test("uses the verified sale attendant when legacy line items omit attendantId", () => {
  const legacySale = {
    ...persistedSale,
    updatedAt: undefined,
    items: [{ ...persistedSale.items[0], attendantId: undefined }],
  };
  const result = verifyPersistedHeldSaleUpdate({
    saleId: "sale-1",
    expectedHeldSaleRevision: buildHeldSaleRevision(legacySale),
    updateBody,
    persistedSale: legacySale,
  });

  assert.deepStrictEqual(result, { ok: true });
});

test("preserves original inventory when a legacy update omits that unsupported PUT field", () => {
  const legacySale = {
    ...persistedSale,
    updatedAt: undefined,
  };
  const updateWithoutInventory = {
    ...updateBody,
    products: updateBody.products.map(({ inventory, ...item }) => item),
  };
  const result = verifyPersistedHeldSaleUpdate({
    saleId: "sale-1",
    expectedHeldSaleRevision: buildHeldSaleRevision(legacySale),
    expectedItemInventories: [
      { product: "product-1", inventory: "inventory-1" },
    ],
    updateBody: updateWithoutInventory,
    persistedSale: legacySale,
  });

  assert.deepStrictEqual(result, { ok: true });
});

test("rejects a legacy update when authoritative readback loses original inventory", () => {
  const legacySale = {
    ...persistedSale,
    updatedAt: undefined,
    items: [{ ...persistedSale.items[0], inventory: undefined }],
  };
  const updateWithoutInventory = {
    ...updateBody,
    products: updateBody.products.map(({ inventory, ...item }) => item),
  };
  const result = verifyPersistedHeldSaleUpdate({
    saleId: "sale-1",
    expectedHeldSaleRevision: buildHeldSaleRevision(legacySale),
    expectedItemInventories: [
      { product: "product-1", inventory: "inventory-1" },
    ],
    updateBody: updateWithoutInventory,
    persistedSale: legacySale,
  });

  assert.strictEqual(result.ok, false);
  if (!result.ok) assert.ok(result.mismatches.includes("items.inventory"));
});

test("rejects a changed revision when status or line content did not persist", () => {
  const result = verifyPersistedHeldSaleUpdate({
    saleId: "sale-1",
    expectedUpdatedAt,
    updateBody,
    persistedSale: {
      ...persistedSale,
      status: "hold",
      items: [{ ...persistedSale.items[0], quantity: 1 }],
    },
  });

  assert.strictEqual(result.ok, false);
  if (!result.ok) {
    assert.ok(result.mismatches.includes("status"));
    assert.ok(result.mismatches.includes("items.quantity"));
  }
});

test("rejects a changed revision when a payment reference did not persist", () => {
  const result = verifyPersistedHeldSaleUpdate({
    saleId: "sale-1",
    expectedUpdatedAt,
    updateBody,
    persistedSale: {
      ...persistedSale,
      bankTransId: "WRONG-REFERENCE",
    },
  });

  assert.strictEqual(result.ok, false);
  if (!result.ok) assert.ok(result.mismatches.includes("bankTransId"));
});

test("serializes same-sale operations but lets different sales proceed", async () => {
  const events: string[] = [];
  let releaseFirst!: () => void;
  const firstGate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });

  const first = withSaleUpdateLock("sale-1", async () => {
    events.push("first-start");
    await firstGate;
    events.push("first-end");
  });
  const second = withSaleUpdateLock("sale-1", async () => {
    events.push("second");
  });
  const otherSale = withSaleUpdateLock("sale-2", async () => {
    events.push("other");
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.deepStrictEqual(events, ["first-start", "other"]);

  releaseFirst();
  await Promise.all([first, second, otherSale]);
  assert.deepStrictEqual(events, [
    "first-start",
    "other",
    "first-end",
    "second",
  ]);
});
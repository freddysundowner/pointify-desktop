type SaleRecord = Record<string, any>;

export type HeldSaleVerification =
  | { ok: true }
  | { ok: false; mismatches: string[] };

const saleUpdateQueues = new Map<string, Promise<void>>();

/**
 * Serializes updates to one sale within this Node process. This closes the
 * check-then-write race for requests handled by the same server instance.
 * The authoritative Pointify API must still enforce the revision atomically
 * to protect callers that bypass this proxy or deployments with >1 instance.
 */
export async function withSaleUpdateLock<T>(
  saleId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const previous = saleUpdateQueues.get(saleId) || Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => current);
  saleUpdateQueues.set(saleId, tail);

  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (saleUpdateQueues.get(saleId) === tail) {
      saleUpdateQueues.delete(saleId);
    }
  }
}

export function extractSaleRecord(payload: any): SaleRecord | null {
  const candidate =
    payload?.sale ||
    payload?.updatedSale ||
    payload?.data?.sale ||
    payload?.data ||
    payload;

  if (
    !candidate ||
    Array.isArray(candidate) ||
    typeof candidate !== "object" ||
    candidate.success === false
  ) {
    return null;
  }

  return candidate;
}

export function getEntityId(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    return String(value._id || value.id || "");
  }
  return String(value);
}

const own = (value: any, key: string): boolean =>
  Boolean(value && Object.prototype.hasOwnProperty.call(value, key));

const normalizedText = (value: any): string =>
  value === null || value === undefined ? "" : String(value).trim();

const normalizedLowerText = (value: any): string =>
  normalizedText(value).toLowerCase();

const normalizedNumber = (value: any): string => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(6) : "NaN";
};

const normalizedDate = (value: any): string => {
  if (!value) return "";
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? String(time) : normalizedText(value);
};

const firstDefined = (record: SaleRecord, keys: string[]): any => {
  for (const key of keys) {
    if (record[key] !== undefined) return record[key];
  }
  return undefined;
};

const normalizedExtraCharges = (value: any): string => {
  if (!Array.isArray(value)) return "[]";
  return JSON.stringify(
    value
      .map((charge) => ({
        name: normalizedText(charge?.name),
        amount: normalizedNumber(charge?.amount),
      }))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  );
};

const normalizedItems = (value: any): Array<Record<string, string>> | null => {
  if (!Array.isArray(value)) return null;

  return value
    .map((item) => ({
      product: getEntityId(item?.product ?? item?.productId),
      inventory: getEntityId(item?.inventory ?? item?.inventoryId),
      attendantId: getEntityId(item?.attendantId ?? item?.attendant),
      quantity: normalizedNumber(item?.quantity),
      unitPrice: normalizedNumber(item?.unitPrice ?? item?.price),
      tax: normalizedNumber(item?.tax),
      lineDiscount: normalizedNumber(
        item?.lineDiscount ?? item?.discount ?? 0,
      ),
      salesnote: normalizedText(item?.salesnote),
    }))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
};

/**
 * Confirms that a fresh authoritative read reflects the requested held-sale
 * update. False negatives intentionally keep the cart open; false positives
 * could discard cashier edits, so all critical persisted fields are checked.
 */
export function verifyPersistedHeldSaleUpdate({
  saleId,
  expectedUpdatedAt,
  updateBody,
  persistedSale,
}: {
  saleId: string;
  expectedUpdatedAt: string;
  updateBody: SaleRecord;
  persistedSale: SaleRecord;
}): HeldSaleVerification {
  const mismatches: string[] = [];
  const persistedId = getEntityId(persistedSale?._id || persistedSale?.id);

  if (!persistedId || persistedId !== String(saleId)) {
    mismatches.push("sale id");
  }

  if (
    !persistedSale?.updatedAt ||
    String(persistedSale.updatedAt) === String(expectedUpdatedAt)
  ) {
    mismatches.push("revision");
  }

  const textFields: Array<{
    requestKey: string;
    persistedKeys?: string[];
    normalize?: (value: any) => string;
  }> = [
    { requestKey: "status", normalize: normalizedLowerText },
    { requestKey: "saleType", normalize: normalizedLowerText },
    { requestKey: "paymentType", normalize: normalizedLowerText },
    { requestKey: "paymentTag", normalize: normalizedLowerText },
    { requestKey: "clientRef" },
    { requestKey: "orderId" },
    { requestKey: "duedate" },
    { requestKey: "salesnote" },
    {
      requestKey: "mpesaTransId",
      persistedKeys: ["mpesaTransId", "mpesatransid"],
    },
    {
      requestKey: "bankTransId",
      persistedKeys: ["bankTransId", "banktransid"],
    },
    {
      requestKey: "shopId",
      persistedKeys: ["shopId", "shop"],
      normalize: getEntityId,
    },
    {
      requestKey: "attendantId",
      persistedKeys: ["attendantId", "attendant"],
      normalize: getEntityId,
    },
    {
      requestKey: "customerId",
      persistedKeys: ["customerId", "customer"],
      normalize: getEntityId,
    },
  ];

  for (const field of textFields) {
    if (!own(updateBody, field.requestKey)) continue;
    const normalize = field.normalize || normalizedText;
    const requested = normalize(updateBody[field.requestKey]);
    const persisted = normalize(
      firstDefined(
        persistedSale,
        field.persistedKeys || [field.requestKey],
      ),
    );
    if (requested !== persisted) mismatches.push(field.requestKey);
  }

  if (own(updateBody, "createdAt")) {
    if (
      normalizedDate(updateBody.createdAt) !==
      normalizedDate(persistedSale.createdAt)
    ) {
      mismatches.push("createdAt");
    }
  }

  const numericFields: Array<{
    requestKey: string;
    persistedKeys?: string[];
  }> = [
    { requestKey: "totaltax" },
    { requestKey: "totalDiscount" },
    { requestKey: "saleDiscount" },
    { requestKey: "extraChargesTotal" },
    { requestKey: "amountPaid" },
    { requestKey: "outstandingBalance" },
    {
      requestKey: "mpesaTotal",
      persistedKeys: ["mpesaTotal", "mpesaNewTotal", "mpesatotal"],
    },
    {
      requestKey: "bankTotal",
      persistedKeys: ["bankTotal", "banktotal"],
    },
  ];

  for (const field of numericFields) {
    if (!own(updateBody, field.requestKey)) continue;
    const requested = normalizedNumber(updateBody[field.requestKey]);
    const persisted = normalizedNumber(
      firstDefined(
        persistedSale,
        field.persistedKeys || [field.requestKey],
      ),
    );
    if (requested !== persisted) mismatches.push(field.requestKey);
  }

  if (
    own(updateBody, "extraCharges") &&
    normalizedExtraCharges(updateBody.extraCharges) !==
      normalizedExtraCharges(persistedSale.extraCharges)
  ) {
    mismatches.push("extraCharges");
  }

  const requestedItems = normalizedItems(
    updateBody.products ?? updateBody.items,
  );
  const persistedItems = normalizedItems(
    persistedSale.items ?? persistedSale.products,
  );
  if (
    requestedItems === null ||
    persistedItems === null ||
    JSON.stringify(requestedItems) !== JSON.stringify(persistedItems)
  ) {
    mismatches.push("items");
  }

  return mismatches.length > 0
    ? { ok: false, mismatches: [...new Set(mismatches)] }
    : { ok: true };
}
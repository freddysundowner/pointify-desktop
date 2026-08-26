import { createHash } from "node:crypto";

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
  if (value === null || value === undefined || value === "") {
    return (0).toFixed(6);
  }
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
    .map((item) => {
      const normalized: Record<string, string> = {
        product: getEntityId(item?.product ?? item?.productId),
        attendantId: getEntityId(item?.attendantId ?? item?.attendant),
        quantity: normalizedNumber(item?.quantity),
        unitPrice: normalizedNumber(item?.unitPrice ?? item?.price),
        tax: normalizedNumber(item?.tax),
        lineDiscount: normalizedNumber(
          item?.lineDiscount ?? item?.discount ?? 0,
        ),
        salesnote: normalizedText(item?.salesnote),
      };
      // Pointify's update endpoint does not accept inventory for legacy sales.
      // Preserve and compare it only for callers that explicitly send it.
      if (item?.inventory !== undefined || item?.inventoryId !== undefined) {
        normalized.inventory = getEntityId(item?.inventory ?? item?.inventoryId);
      }
      return normalized;
    })
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
};

const normalizedExpectedQuantitiesByProduct = (
  value: any,
): Map<string, string> => {
  const quantities = new Map<string, string>();
  if (!Array.isArray(value)) return quantities;
  for (const item of value) {
    const product = getEntityId(item?.product ?? item?.productId);
    if (product) quantities.set(product, normalizedNumber(item?.quantity));
  }
  return quantities;
};

const normalizedInventoriesByProduct = (
  value: any,
  requestedProductIds: Set<string>,
): Map<string, string[]> | null => {
  if (!Array.isArray(value)) return null;

  const inventories = new Map<string, string[]>();
  for (const item of value) {
    const product = getEntityId(item?.product ?? item?.productId);
    if (!product || !requestedProductIds.has(product)) continue;
    const inventory = getEntityId(item?.inventory ?? item?.inventoryId);
    const productInventories = inventories.get(product) || [];
    productInventories.push(inventory);
    inventories.set(product, productInventories);
  }
  for (const productInventories of inventories.values()) {
    productInventories.sort();
  }
  return inventories;
};

/**
 * Legacy Pointify sales can omit updatedAt entirely. For those records the
 * proxy issues a deterministic revision token based on every sale field that
 * the resumed POS flow can persist. It is a stale-write guard, not a substitute
 * for an atomic upstream compare-and-set.
 */
export function buildHeldSaleRevision(sale: SaleRecord): string {
  const revisionContent = {
    id: getEntityId(sale?._id || sale?.id),
    status: normalizedLowerText(sale?.status),
    shopId: getEntityId(firstDefined(sale, ["shopId", "shop"])),
    attendantId: getEntityId(firstDefined(sale, ["attendantId", "attendant"])),
    customerId: getEntityId(firstDefined(sale, ["customerId", "customer"])),
    saleType: normalizedLowerText(sale?.saleType),
    paymentType: normalizedLowerText(sale?.paymentType),
    paymentTag: normalizedLowerText(sale?.paymentTag),
    clientRef: normalizedText(sale?.clientRef),
    orderId: normalizedText(sale?.orderId),
    dueDate: normalizedText(sale?.duedate),
    salesnote: normalizedText(sale?.salesnote),
    mpesaTransId: normalizedText(
      firstDefined(sale, ["mpesaTransId", "mpesatransid"]),
    ),
    bankTransId: normalizedText(
      firstDefined(sale, ["bankTransId", "banktransid"]),
    ),
    createdAt: normalizedDate(sale?.createdAt),
    totaltax: normalizedNumber(sale?.totaltax),
    totalDiscount: normalizedNumber(sale?.totalDiscount),
    saleDiscount: normalizedNumber(sale?.saleDiscount),
    extraChargesTotal: normalizedNumber(sale?.extraChargesTotal),
    amountPaid: normalizedNumber(sale?.amountPaid),
    outstandingBalance: normalizedNumber(sale?.outstandingBalance),
    mpesaTotal: normalizedNumber(
      firstDefined(sale, ["mpesaTotal", "mpesaNewTotal", "mpesatotal"]),
    ),
    bankTotal: normalizedNumber(firstDefined(sale, ["bankTotal", "banktotal"])),
    extraCharges: normalizedExtraCharges(sale?.extraCharges),
    items: normalizedItems(sale?.items ?? sale?.products) || [],
  };

  return createHash("sha256")
    .update(JSON.stringify(revisionContent))
    .digest("base64url");
}

export function addHeldSaleRevision(payload: any): any {
  const sale = extractSaleRecord(payload);
  if (
    !sale ||
    !getEntityId(sale._id || sale.id) ||
    sale.updatedAt ||
    sale.heldSaleRevision
  ) {
    return payload;
  }

  const enrichedSale = {
    ...sale,
    heldSaleRevision: buildHeldSaleRevision(sale),
  };

  if (payload?.sale === sale) {
    return { ...payload, sale: enrichedSale };
  }
  if (payload?.updatedSale === sale) {
    return { ...payload, updatedSale: enrichedSale };
  }
  if (payload?.data?.sale === sale) {
    return { ...payload, data: { ...payload.data, sale: enrichedSale } };
  }
  if (payload?.data === sale) {
    return { ...payload, data: enrichedSale };
  }
  return enrichedSale;
}

/**
 * Confirms that a fresh authoritative read reflects the requested held-sale
 * update. False negatives intentionally keep the cart open; false positives
 * could discard cashier edits, so all critical persisted fields are checked.
 */
export function verifyPersistedHeldSaleUpdate({
  saleId,
  expectedUpdatedAt,
  expectedHeldSaleRevision,
  expectedItemInventories,
  expectedItemQuantities,
  updateBody,
  persistedSale,
}: {
  saleId: string;
  expectedUpdatedAt?: string | null;
  expectedHeldSaleRevision?: string | null;
  expectedItemInventories?: any[] | null;
  expectedItemQuantities?: any[] | null;
  updateBody: SaleRecord;
  persistedSale: SaleRecord;
}): HeldSaleVerification {
  const mismatches: string[] = [];
  const persistedId = getEntityId(persistedSale?._id || persistedSale?.id);

  if (!persistedId || persistedId !== String(saleId)) {
    mismatches.push("sale id");
  }

  if (expectedUpdatedAt) {
    if (
      !persistedSale?.updatedAt ||
      String(persistedSale.updatedAt) === String(expectedUpdatedAt)
    ) {
      mismatches.push("revision");
    }
  } else if (!expectedHeldSaleRevision) {
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
  const expectedQuantities = normalizedExpectedQuantitiesByProduct(
    expectedItemQuantities,
  );
  for (const item of requestedItems || []) {
    const expectedQuantity = expectedQuantities.get(item.product);
    if (expectedQuantity !== undefined) item.quantity = expectedQuantity;
  }
  if (requestedItems === null || persistedItems === null) {
    mismatches.push("items");
  } else if (requestedItems.length !== persistedItems.length) {
    mismatches.push("items.length");
  } else {
    const itemFields = [
      "product",
      "inventory",
      "quantity",
      "unitPrice",
      "tax",
      "lineDiscount",
      "salesnote",
    ];
    for (let index = 0; index < requestedItems.length; index += 1) {
      for (const field of itemFields) {
        if (!(field in requestedItems[index])) continue;
        if (requestedItems[index][field] !== persistedItems[index][field]) {
          mismatches.push(`items.${field}`);
        }
      }
    }
  }

  if (Array.isArray(expectedItemInventories)) {
    const requestedProductIds = new Set(
      (Array.isArray(updateBody.products ?? updateBody.items)
        ? updateBody.products ?? updateBody.items
        : []
      )
        .map((item: any) => getEntityId(item?.product ?? item?.productId))
        .filter(Boolean),
    );
    const expectedInventories = normalizedInventoriesByProduct(
      expectedItemInventories,
      requestedProductIds,
    );
    const persistedInventories = normalizedInventoriesByProduct(
      persistedSale.items ?? persistedSale.products,
      requestedProductIds,
    );
    for (const [product, inventories] of expectedInventories || []) {
      if (
        JSON.stringify(inventories) !==
        JSON.stringify(persistedInventories?.get(product) || [])
      ) {
        mismatches.push("items.inventory");
        break;
      }
    }
  }

  return mismatches.length > 0
    ? { ok: false, mismatches: [...new Set(mismatches)] }
    : { ok: true };
}
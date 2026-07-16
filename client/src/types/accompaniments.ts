export interface AccompanimentOption {
  id: string;
  name: string;
}

export interface AccompanimentGroup {
  id: string;
  name: string;
  /** fixed = always included (no choice shown); choice = customer picks one */
  type: "fixed" | "choice";
  options: AccompanimentOption[];
}

export interface ProductAccompaniments {
  productId: string;
  shopId: string;
  groups: AccompanimentGroup[];
}

/** Map of productId → accompaniment config, held in POS memory */
export type AccompanimentMap = Record<string, ProductAccompaniments>;

/** Selections made by the waiter for one cart item */
export interface AccompanimentSelection {
  groupId: string;
  groupName: string;
  type: "fixed" | "choice";
  /** For fixed groups this is all options; for choice it's the one picked */
  chosen: string[];
}

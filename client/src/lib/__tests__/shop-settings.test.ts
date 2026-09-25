import { describe, expect, it } from "vitest";
import { operationalToggleUpdate, isMpesaSettingsUpdate, mergeSavedShop } from "../shop-settings";

describe("shop setting saves", () => {
  it.each([
    "allownegativeselling", "trackbatches", "useWarehouse", "allowOnlineSelling",
    "showstockonline", "showpriceonline", "isRestaurant", "isGuestHouse",
  ])("only sends the changed %s switch, without M-Pesa details", key => {
    for (const checked of [true, false]) {
      const update = operationalToggleUpdate(key, checked);
      expect(update).toEqual({ [key]: checked });
      expect(isMpesaSettingsUpdate(update)).toBe(false);
    }
  });

  it("still identifies M-Pesa saves for linking warnings", () => {
    expect(isMpesaSettingsUpdate({ paybill_till: "123" })).toBe(true);
    expect(isMpesaSettingsUpdate({ mpesa_require_validation: false })).toBe(true);
  });

  it("preserves off values when the server returns the pre-update document", () => {
    expect(mergeSavedShop(
      { _id: "shop", name: "Shop", allowOnlineSelling: true },
      { _id: "shop", allowOnlineSelling: true, sunpay_link_error: "Existing error" },
      { allowOnlineSelling: false },
    )).toMatchObject({ name: "Shop", allowOnlineSelling: false });
  });

  it.each([[], null, { success: false }, { error: "Save failed" }, {}])(
    "does not claim success for an invalid response %j", response => {
      expect(() => mergeSavedShop({ _id: "shop" }, response, { trackbatches: true })).toThrow();
    },
  );
});
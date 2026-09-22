import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  allowNegative: true,
  items: [] as any[],
  toast: vi.fn(),
}));
vi.mock("react", () => ({ useState: () => [null, vi.fn()], useEffect: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: state.toast }) }));
vi.mock("@/contexts/AttendantAuthContext", () => ({
  useAttendantAuth: () => ({ attendant: null }),
}));
vi.mock("@/hooks/usePrimaryShop", () => ({
  usePrimaryShop: () => ({ shopData: { allownegativeselling: state.allowNegative } }),
}));
vi.mock("@/contexts/CartContext", () => ({
  useCartContext: () => ({
    cartItems: state.items,
    setCartItems: (update: any) => { state.items = update(state.items); },
    clearCart: vi.fn(),
    setOrderId: vi.fn(),
  }),
}));

import { useCart } from "@/hooks/useCart";

describe("cart stock controls", () => {
  beforeEach(() => {
    state.allowNegative = true;
    state.items = [{ id: "p", quantity: 2, price: 10, total: 20 }];
    state.toast.mockClear();
  });

  it.each([0, -5])("allows +, − and typed quantities with stock %s when enabled", stock => {
    const product = { _id: "p", productType: "product", quantity: stock } as any;
    for (const quantity of [3, 2, 25.5]) {
      useCart([product], 0, "Retail").updateQuantity("p", quantity, product);
      expect(state.items[0].quantity).toBe(quantity);
      expect(state.items[0].total).toBe(quantity * 10);
    }
    expect(state.toast).not.toHaveBeenCalled();
  });

  it("blocks stock-exceeding increases when disabled but permits reductions", () => {
    state.allowNegative = false;
    const product = { quantity: 0, productType: "product" } as any;
    useCart([], 0, "Retail").updateQuantity("p", 3, product);
    expect(state.items[0].quantity).toBe(2);
    useCart([], 0, "Retail").updateQuantity("p", 1, product);
    expect(state.items[0].quantity).toBe(1);
  });

  it("does not stock-limit services", () => {
    state.allowNegative = false;
    useCart([], 0, "Retail").updateQuantity("p", 10, { quantity: 0, productType: "service" } as any);
    expect(state.items[0].quantity).toBe(10);
  });

  it("keeps id-only products editable after adding", () => {
    state.items = [];
    const product = { id: "p", name: "Item", quantity: 0, price: 10, productType: "product" } as any;
    useCart([], 0, "Retail").addToCart(product);
    expect(state.items[0].id).toBe("p");
    useCart([], 0, "Retail").updateQuantity("p", 2, product);
    expect(state.items[0].quantity).toBe(2);
  });
});
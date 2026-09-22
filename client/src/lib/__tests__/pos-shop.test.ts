import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  selectedShopId: "branch",
  selectedShopData: null as any,
  snapshot: { shopId: "primary", shopData: { allownegativeselling: false } },
  fresh: undefined as any,
  query: null as any,
  token: "admin",
  attendantToken: "",
}));
vi.mock("react-redux", () => ({
  useSelector: (selector: any) => selector({ shop: state }),
}));
vi.mock("@/hooks/usePrimaryShop", () => ({ usePrimaryShop: () => state.snapshot }));
vi.mock("@/features/auth/useAuth", () => ({ useAuth: () => ({ token: state.token }) }));
vi.mock("@/contexts/AttendantAuthContext", () => ({
  useAttendantAuth: () => ({ token: state.attendantToken }),
}));
vi.mock("@/lib/api-config", () => ({ apiCall: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (query: any) => {
    state.query = query;
    return { data: state.fresh };
  },
}));
import { usePOSShop } from "@/hooks/usePOSShop";
import { apiCall } from "@/lib/api-config";

describe("POS shop settings", () => {
  beforeEach(() => {
    state.selectedShopId = "branch";
    state.selectedShopData = null;
    state.fresh = undefined;
    state.token = "admin";
    state.attendantToken = "";
  });
  it("uses fresh branch settings instead of the login snapshot", () => {
    state.fresh = { _id: "branch", allownegativeselling: true };
    expect(usePOSShop().allowNegativeStock).toBe(true);
    expect(state.query.queryKey).toEqual(["shop", "branch"]);
  });
  it("never falls back to another branch's settings", () => {
    expect(usePOSShop().shopData).toBeNull();
  });
  it("retains matching saved settings while offline", () => {
    state.selectedShopData = { _id: "branch", allownegativeselling: true };
    expect(usePOSShop().allowNegativeStock).toBe(true);
  });
  it("loads settings for attendant-only sessions", () => {
    state.token = "";
    state.attendantToken = "attendant";
    usePOSShop();
    expect(state.query.enabled).toBe(true);
  });
  it("uses the shared shop endpoint and parsed response contract", async () => {
    const shop = { _id: "branch", allownegativeselling: true };
    vi.mocked(apiCall).mockResolvedValue({ ok: true, json: async () => shop } as Response);
    usePOSShop();
    expect(await state.query.queryFn()).toEqual(shop);
    expect(apiCall).toHaveBeenCalledWith("/api/shop/branch", { method: "GET" });
  });
});
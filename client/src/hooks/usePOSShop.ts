import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { usePrimaryShop } from "./usePrimaryShop";
import { useAuth } from "@/features/auth/useAuth";
import { useAttendantAuth } from "@/contexts/AttendantAuthContext";
import { apiCall } from "@/lib/api-config";
import type { RootState } from "@/store";

// POS settings must follow the selected branch, not a login-time primary shop.
export function usePOSShop() {
  const snapshot = usePrimaryShop();
  const { token } = useAuth();
  const { token: attendantToken } = useAttendantAuth();
  const { selectedShopId, selectedShopData } = useSelector((state: RootState) => state.shop);
  const shopId = selectedShopId || snapshot.shopId;
  const savedShop = selectedShopData &&
    (selectedShopData._id === shopId || selectedShopData.id === shopId)
      ? selectedShopData
      : snapshot.shopId === shopId ? snapshot.shopData : null;
  const { data } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: async () => {
      const response = await apiCall(`/api/shop/${shopId}`, { method: "GET" });
      if (!response.ok) throw new Error(`Failed to load shop (${response.status})`);
      return response.json();
    },
    enabled: !!shopId && !!(token || attendantToken),
    staleTime: 0,
    refetchOnReconnect: true,
  });
  const shopData = data || savedShop;
  return { ...snapshot, shopId, shopData, allowNegativeStock: shopData?.allownegativeselling };
}
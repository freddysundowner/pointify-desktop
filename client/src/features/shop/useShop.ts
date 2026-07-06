import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/useAuth";
import { apiCall, API_ENDPOINTS } from "@/lib/api-config";

interface Shop {
  _id: string;
  name: string;
  currency: string;
  tax: number;
  address: string;
  allowOnlineSelling: boolean;
  useWarehouse: boolean;
  warehouse: boolean;
  // Add other shop properties as needed
}

export function useShop() {
  const { admin } = useAuth();
  
  // Helper function to extract shop ID
  const getShopId = () => {
    if (!admin?.primaryShop) return "";
    if (typeof admin.primaryShop === 'string') return admin.primaryShop;
    return (admin.primaryShop as any)?._id || (admin.primaryShop as any)?.id || "";
  };
  
  const shopId = getShopId();
  
  const { data: shop, isLoading, error } = useQuery({
    queryKey: ["shop", shopId],
    queryFn: async () => {
      if (!shopId) return null;

      // Must hit the proxied `/api/shop/:id` path (Vite only proxies `/api`)
      // and parse the JSON body. `apiCall` returns a raw fetch Response, so
      // returning it directly here previously poisoned the shared ["shop", id]
      // cache with a Response object (no _id), breaking shop-details/settings.
      const response = await apiCall(API_ENDPOINTS.shop.getShopById(shopId), {
        method: "GET",
      });
      const shopData = await response.json();
      return shopData as Shop;
    },
    enabled: !!shopId,
  });

  return {
    shop,
    isLoading,
    error,
    currency: shop?.currency || "KES", // Default fallback
  };
}
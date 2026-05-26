import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import { Store } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/features/auth/useAuth";
import { apiCall } from "@/lib/api-config";
import {
  setSelectedShop,
  setSelectedShopData,
} from "@/store/shopSlice";
import type { RootState } from "@/store";

interface Shop {
  _id: string;
  name: string;
  currency?: string;
}

interface ShopFilterProps {
  className?: string;
  size?: "sm" | "md";
}

export function ShopFilter({ className, size = "sm" }: ShopFilterProps) {
  const dispatch = useDispatch();
  const { admin } = useAuth();
  const { selectedShopId } = useSelector((s: RootState) => s.shop);

  const { data: shops = [] } = useQuery<Shop[]>({
    queryKey: ["shops", admin?._id],
    queryFn: async () => {
      if (!admin?._id) return [];
      const res = await apiCall(`/api/shop/admin/${admin._id}`, { method: "GET" });
      const data = await res.json();
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
    enabled: !!admin?._id,
    staleTime: 5 * 60_000,
  });

  // Seed Redux with primary shop if nothing is selected yet
  useEffect(() => {
    if (selectedShopId || shops.length === 0) return;
    const primary =
      (typeof admin?.primaryShop === "object" && (admin?.primaryShop as any)?._id) ||
      (typeof admin?.primaryShop === "string" ? (admin.primaryShop as string) : null) ||
      shops[0]._id;
    const found = shops.find((s) => s._id === primary) || shops[0];
    if (found) {
      dispatch(setSelectedShop(found._id));
      dispatch(setSelectedShopData(found));
    }
  }, [shops, selectedShopId, admin, dispatch]);

  // Hide the dropdown if there's only one shop (or none yet)
  if (shops.length <= 1) return null;

  const onChange = (id: string) => {
    const found = shops.find((s) => s._id === id);
    dispatch(setSelectedShop(id));
    if (found) dispatch(setSelectedShopData(found));
  };

  const h = size === "sm" ? "h-9" : "h-10";

  return (
    <Select value={selectedShopId ?? undefined} onValueChange={onChange}>
      <SelectTrigger
        className={`${h} w-[160px] text-sm ${className ?? ""}`}
        data-testid="select-shop-filter"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Store className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <SelectValue placeholder="Select shop" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {shops.map((shop) => (
          <SelectItem
            key={shop._id}
            value={shop._id}
            data-testid={`option-shop-${shop._id}`}
          >
            {shop.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default ShopFilter;

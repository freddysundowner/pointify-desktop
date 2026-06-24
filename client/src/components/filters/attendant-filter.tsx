import { useQuery } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiCall } from "@/lib/api-config";
import { usePrimaryShop } from "@/hooks/usePrimaryShop";

interface Attendant {
  _id: string;
  fullname?: string;
  name?: string;
  username?: string;
  email?: string;
}

const ALL = "all";

function attendantLabel(a: Attendant): string {
  return a.fullname || a.name || a.username || a.email || "Attendant";
}

interface AttendantFilterProps {
  /** Selected attendant id, or "" / undefined for all attendants. */
  value?: string;
  /** Called with the attendant id, or "" when "All attendants" is chosen. */
  onChange: (attendantId: string) => void;
  className?: string;
  size?: "sm" | "md";
}

export function AttendantFilter({ value, onChange, className, size = "sm" }: AttendantFilterProps) {
  const { shopId } = usePrimaryShop();

  // Only attendants belonging to the currently selected shop — mirrors the
  // Attendants page, which is shop-scoped (not admin-wide).
  const { data: attendants = [] } = useQuery<Attendant[]>({
    queryKey: ["/api/attendants/shop/filter", shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const res = await apiCall(
        `/api/attendants/shop/filter?shopId=${shopId}`,
        { method: "GET" },
      );
      const data = await res.json();
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
    enabled: !!shopId,
    staleTime: 5 * 60_000,
  });

  // Nothing to filter by if there are no attendants.
  if (attendants.length === 0) return null;

  const h = size === "sm" ? "h-9" : "h-10";

  return (
    <Select
      value={value ? value : ALL}
      onValueChange={(v) => onChange(v === ALL ? "" : v)}
    >
      <SelectTrigger
        className={`${h} w-auto min-w-[150px] max-w-[260px] text-sm gap-1.5 ${className ?? ""}`}
        data-testid="select-attendant-filter"
      >
        <UserRound className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <SelectValue placeholder="All attendants" className="truncate whitespace-nowrap" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL} data-testid="option-attendant-all">
          All attendants
        </SelectItem>
        {attendants.map((a) => (
          <SelectItem
            key={a._id}
            value={a._id}
            data-testid={`option-attendant-${a._id}`}
          >
            {attendantLabel(a)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default AttendantFilter;

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { usePrimaryShop } from '@/hooks/usePrimaryShop';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Receipt } from "lucide-react";

const fmt = (val: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val ?? 0);

function toYMD(d: Date) { return d.toISOString().split("T")[0]; }

interface SaleItem {
  product?: { name?: string };
  quantity?: number;
  sellingPrice?: number;
  price?: number;
}

interface DueSale {
  _id: string;
  receiptNo?: string | number;
  totalAmount?: number;
  totalWithDiscount?: number;
  amount?: number;
  createdAt?: string;
  dueDate?: string;
  customer?: { name?: string; phone?: string } | null;
  items?: SaleItem[];
  paymentType?: string;
}

function fmtDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DueSalesPage() {
  const currency = useSelector((state: RootState) => state.currency);
  const { selectedShopId, attendant, primaryShopId } = usePrimaryShop();
  const effectiveShopId = selectedShopId || (attendant ? (attendant as any).shopId?._id : primaryShopId);

  const now = new Date();
  const [dueDate, setDueDate] = useState(toYMD(now));

  const token = useSelector((state: RootState) => (state as any).auth?.token || localStorage.getItem("token") || "");

  const { data, isLoading, isError } = useQuery<DueSale[]>({
    queryKey: ["due-sales", effectiveShopId, dueDate],
    enabled: !!effectiveShopId,
    queryFn: async () => {
      const res = await fetch(
        `/api/sales/filter?shopId=${effectiveShopId}&paymentType=credit&dueDate=${dueDate}&fromDate=${dueDate}&toDate=${dueDate}&paginated=false`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed");
      const raw = await res.json();
      return Array.isArray(raw) ? raw : (raw?.data ?? []);
    },
  });

  const sales = data ?? [];
  const total = sales.reduce((s, sale) => s + (sale.totalWithDiscount ?? sale.totalAmount ?? sale.amount ?? 0), 0);

  function saleAmount(s: DueSale) {
    return s.totalWithDiscount ?? s.totalAmount ?? s.amount ?? 0;
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-5">
        <PageHeader title="Due Sales" subtitle="Credit sales which are due to be collected" />

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>
          <Button size="sm" variant="outline" onClick={() => setDueDate(toYMD(new Date()))}>Today</Button>
        </div>

        <Card>
          <CardContent className="p-5 flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{sales.length} Due {sales.length === 1 ? "Sale" : "Sales"}</p>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : (
                <p className="text-2xl font-bold text-amber-700">{currency} {fmt(total)}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {isError && (
          <Card><CardContent className="p-6 text-center text-red-500">Failed to load due sales.</CardContent></Card>
        )}
        {!isLoading && !isError && sales.length === 0 && (
          <Card><CardContent className="p-10 text-center text-muted-foreground">No due sales found for this date.</CardContent></Card>
        )}
        {!isLoading && !isError && sales.length > 0 && (
          <Card>
            <CardContent className="p-0 divide-y">
              {sales.map((s) => (
                <div key={s._id} className="flex items-start justify-between px-4 py-3 gap-3 hover:bg-muted/30 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Receipt className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">#{s.receiptNo ?? s._id.slice(-6)}</p>
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Credit</span>
                    </div>
                    {s.customer && (
                      <p className="text-xs text-muted-foreground truncate">
                        {(s.customer as any).name ?? "Customer"}
                        {(s.customer as any).phone ? ` · ${(s.customer as any).phone}` : ""}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">{fmtDate(s.createdAt)}</p>
                    {s.items && s.items.length > 0 && (
                      <p className="text-xs text-muted-foreground">{s.items.length} item{s.items.length > 1 ? "s" : ""}</p>
                    )}
                  </div>
                  <p className="font-bold text-amber-700 text-sm shrink-0">{currency} {fmt(saleAmount(s))}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

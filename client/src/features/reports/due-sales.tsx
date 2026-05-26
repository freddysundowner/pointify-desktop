import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { usePrimaryShop } from "@/hooks/usePrimaryShop";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Receipt } from "lucide-react";
import { useNavigationRoute } from "@/lib/navigation-utils";

const fmt = (val: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val ?? 0);

function toYMD(d: Date) { return d.toISOString().split("T")[0]; }

interface DueSale {
  _id: string;
  receiptNo?: string | number;
  totalAmount?: number; totalWithDiscount?: number; amount?: number;
  createdAt?: string; dueDate?: string;
  customer?: { name?: string; phone?: string } | null;
  items?: { product?: { name?: string }; quantity?: number }[];
  paymentType?: string;
}

function fmtDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}
function saleAmount(s: DueSale) { return s.totalWithDiscount ?? s.totalAmount ?? s.amount ?? 0; }
function customerName(s: DueSale) { return (s.customer as any)?.name ?? null; }
function customerPhone(s: DueSale) { return (s.customer as any)?.phone ?? null; }

export default function DueSalesPage() {
  const currency = useSelector((state: RootState) => state.currency);
  const { shopId: effectiveShopId } = usePrimaryShop();
  const reportsRoute = useNavigationRoute("reports");

  const [dueDate, setDueDate] = useState(toYMD(new Date()));
  const url = effectiveShopId && dueDate
    ? `/api/sales/filter?shopId=${effectiveShopId}&paymentType=credit&duedate=${dueDate}&start=${dueDate}&end=${dueDate}&paginated=false`
    : null;

  const { data: rawSales, isLoading, isError } = useQuery<any>({
    queryKey: [url],
    enabled: !!url,
    staleTime: 60_000,
  });

  const sales: DueSale[] = Array.isArray(rawSales) ? rawSales : (rawSales?.data ?? []);
  const total = sales.reduce((s, sale) => s + saleAmount(sale), 0);

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-24 lg:pb-8 w-full">
        <PageHeader title="Due Sales" subtitle="Credit sales due to be collected" backHref={reportsRoute} />

        {/* Filter row */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="h-8 text-sm border rounded px-3 bg-white" />
          </div>
          <Button size="sm" variant="outline" className="h-8" onClick={() => setDueDate(toYMD(new Date()))}>Today</Button>
          <Button size="sm" variant="outline" className="h-8" onClick={() => {
            const y = new Date(); y.setDate(y.getDate() - 1); setDueDate(toYMD(y));
          }}>Yesterday</Button>
        </div>

        {/* Hero banner */}
        <div className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 p-4 lg:p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-80 mb-1">{sales.length} Due {sales.length === 1 ? "Sale" : "Sales"}</p>
              {isLoading
                ? <div className="h-7 w-32 bg-white/20 animate-pulse rounded" />
                : <p className="text-2xl lg:text-3xl font-bold">{currency} {fmt(total)}</p>}
              <p className="text-xs opacity-70 mt-1">Due on {dueDate}</p>
            </div>
            <AlertCircle className="w-10 h-10 opacity-30" />
          </div>
        </div>

        {isLoading && <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>}
        {isError && <Card><CardContent className="p-6 text-center text-red-500">Failed to load due sales.</CardContent></Card>}
        {!isLoading && !isError && sales.length === 0 && (
          <Card><CardContent className="p-10 text-center text-muted-foreground">No due sales found for {dueDate}.</CardContent></Card>
        )}

        {!isLoading && !isError && sales.length > 0 && (
          <>
            {/* Mobile: card list */}
            <Card className="lg:hidden">
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
                      {customerName(s) && <p className="text-xs text-muted-foreground truncate">{customerName(s)}{customerPhone(s) ? ` · ${customerPhone(s)}` : ""}</p>}
                      <p className="text-xs text-muted-foreground">{fmtDate(s.createdAt)}</p>
                    </div>
                    <p className="font-bold text-amber-700 text-sm shrink-0">{currency} {fmt(saleAmount(s))}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Desktop: table */}
            <Card className="hidden lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground text-xs">#</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Receipt No.</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Customer</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Phone</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Items</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground text-xs">Amount Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sales.map((s, i) => (
                    <tr key={s._id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-4 py-3.5 font-semibold">#{s.receiptNo ?? s._id.slice(-6)}</td>
                      <td className="px-4 py-3.5">{customerName(s) ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">{customerPhone(s) ?? "—"}</td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs">{fmtDate(s.createdAt)}</td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs">{s.items?.length ?? 0} item{(s.items?.length ?? 0) !== 1 ? "s" : ""}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-amber-700">{currency} {fmt(saleAmount(s))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/20 font-bold">
                    <td className="px-5 py-3 text-xs text-muted-foreground" colSpan={6}>Total · {sales.length} sales</td>
                    <td className="px-5 py-3 text-right text-amber-700">{currency} {fmt(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

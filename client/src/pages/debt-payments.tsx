import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { useAuth } from "@/features/auth/useAuth";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, HandCoins, User, Calendar } from "lucide-react";
import { useNavigationRoute } from "@/lib/navigation-utils";
import { DateTime } from "@/components/date-time";

const fmt = (val: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val ?? 0);

function fmtDate(dateStr?: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DebtPaymentsPage() {
  const [location] = useLocation();
  const { admin } = useAuth();
  const { selectedShopId } = useSelector((state: RootState) => state.shop);
  const salesReportRoute = useNavigationRoute("salesReport");

  const primaryShop = admin?.primaryShop;
  const shopId = selectedShopId || (typeof primaryShop === "object" ? primaryShop?._id : primaryShop);
  const currency = (typeof primaryShop === "object" ? primaryShop?.currency : undefined) || "KES";

  const params = new URLSearchParams(location.split("?")[1] ?? "");
  const fromDate = params.get("fromDate") ?? "";
  const toDate   = params.get("toDate")   ?? "";

  const queryUrl = shopId
    ? `/api/payments?shopId=${shopId}&fromDate=${fromDate}&toDate=${toDate}`
    : null;

  const { data, isLoading, isError, error } = useQuery<any>({
    queryKey: [queryUrl],
    enabled: !!queryUrl,
    staleTime: 60_000,
    retry: 1,
  });

  const payments: any[] = Array.isArray(data)
    ? data
    : data?.payments || data?.data || [];

  const total = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  const dateLabel = fromDate === toDate
    ? fmtDate(fromDate)
    : `${fmtDate(fromDate)} – ${fmtDate(toDate)}`;

  return (
    <DashboardLayout>
      <div className="space-y-5 pb-24 lg:pb-8 w-full max-w-2xl mx-auto lg:max-w-none">
        <PageHeader title="Collected Debt Payments" backHref={salesReportRoute} />

        {/* Summary pill */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2.5 bg-primary text-white px-6 py-2.5 rounded-full">
            <HandCoins className="w-5 h-5" />
            {isLoading
              ? <div className="h-5 w-28 bg-white/30 animate-pulse rounded-full" />
              : <span className="text-base font-medium">{currency} {fmt(total)}</span>
            }
          </div>
        </div>

        {/* Date badge */}
        {(fromDate || toDate) && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground px-1">
            <Calendar className="w-4 h-4" />
            <span>{dateLabel}</span>
          </div>
        )}

        {isError && (
          <Card>
            <CardContent className="p-6 text-center text-red-500">
              Failed to load payments. Please try again.
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && !isError && payments.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground text-sm">
              No debt payments found for this period.
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && payments.length > 0 && (
          <>
            {/* Mobile list */}
            <Card className="lg:hidden shadow-md">
              <CardContent className="p-4 divide-y divide-border">
                {payments.map((p: any, i: number) => (
                  <div key={p._id ?? i} className="py-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {p.customerName || p.customer?.name || "Unknown Customer"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <DateTime value={p.date || p.createdAt} inline dateOptions={{ day: "2-digit", month: "short", year: "numeric" }} />
                          {p.receiptNo ? ` · #${p.receiptNo}` : ""}
                        </p>
                        {(p.note || p.description) && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.note || p.description}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-bold text-foreground shrink-0">
                      {currency} {fmt(parseFloat(p.amount) || 0)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Desktop table */}
            <Card className="hidden lg:block shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-6 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Customer</th>
                    <th className="text-left px-6 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Date</th>
                    <th className="text-left px-6 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Receipt / Note</th>
                    <th className="text-right px-6 py-3.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map((p: any, i: number) => (
                    <tr key={p._id ?? i} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">
                        {p.customerName || p.customer?.name || "Unknown"}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground"><DateTime value={p.date || p.createdAt} dateOptions={{ day: "2-digit", month: "short", year: "numeric" }} /></td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {p.receiptNo ? `#${p.receiptNo}` : (p.note || p.description || "—")}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-foreground">
                        {currency} {fmt(parseFloat(p.amount) || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/20 font-bold">
                    <td className="px-6 py-4 text-foreground" colSpan={3}>Total</td>
                    <td className="px-6 py-4 text-right text-base text-foreground">{currency} {fmt(total)}</td>
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

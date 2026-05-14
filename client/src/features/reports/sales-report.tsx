import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { usePrimaryShop } from "@/hooks/usePrimaryShop";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart, TrendingUp, CreditCard, RotateCcw, Wallet, Clock } from "lucide-react";
import { useNavigationRoute } from "@/lib/navigation-utils";

const fmt = (val: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val ?? 0);

type DateRange = { label: string; days: number };
const DATE_RANGES: DateRange[] = [
  { label: "Today", days: 0 },
  { label: "Yesterday", days: 1 },
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
];

function toYMD(d: Date) { return d.toISOString().split("T")[0]; }
function getRange(days: number): { from: string; to: string } {
  const now = new Date();
  if (days === 0) return { from: toYMD(now), to: toYMD(now) };
  if (days === 1) { const y = new Date(now); y.setDate(y.getDate() - 1); return { from: toYMD(y), to: toYMD(y) }; }
  const from = new Date(now); from.setDate(from.getDate() - days);
  return { from: toYMD(from), to: toYMD(now) };
}

interface SalesReportData {
  cash?: number; credit?: number; debtpaid?: number;
  returns?: number; wallet?: number; hold?: number;
  [key: string]: number | undefined;
}

const TILES = [
  { key: "cash",     label: "Cash Sales",     desc: "All sales made on cash",           icon: ShoppingCart, color: "text-green-700",  bg: "bg-green-50",  border: "border-green-200" },
  { key: "credit",   label: "Credit Sales",   desc: "Sales made on credit",             icon: CreditCard,   color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  { key: "debtpaid", label: "Collected Debt", desc: "Total credit paid by debtors",     icon: TrendingUp,   color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200" },
  { key: "returns",  label: "Returns",        desc: "Sales returned from customers",    icon: RotateCcw,    color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200" },
  { key: "wallet",   label: "Wallet Sales",   desc: "Sales through customer wallets",   icon: Wallet,       color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  { key: "hold",     label: "On Hold Sales",  desc: "Sales that have not been cashed",  icon: Clock,        color: "text-gray-700",   bg: "bg-gray-50",   border: "border-gray-200" },
];

export default function SalesReportPage() {
  const currency = useSelector((state: RootState) => state.currency);
  const { selectedShopId, attendant, primaryShopId } = usePrimaryShop();
  const effectiveShopId = selectedShopId || (attendant ? (attendant as any).shopId?._id : primaryShopId);
  const reportsRoute = useNavigationRoute("reports");

  const [rangeIdx, setRangeIdx] = useState(0);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const { from: autoFrom, to: autoTo } = getRange(DATE_RANGES[rangeIdx]?.days ?? 0);
  const fromDate = showCustom ? customFrom : autoFrom;
  const toDate   = showCustom ? customTo   : autoTo;

  const token = useSelector((state: RootState) => (state as any).auth?.token || localStorage.getItem("token") || "");

  const { data, isLoading, isError } = useQuery<SalesReportData>({
    queryKey: ["sales-report", effectiveShopId, fromDate, toDate],
    enabled: !!effectiveShopId,
    queryFn: async () => {
      const res = await fetch(
        `/api/analysis/sales/report?shopid=${effectiveShopId}&fromDate=${fromDate}&toDate=${toDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const tiles = TILES.filter((t) => data && data[t.key] != null && data[t.key] !== 0);
  const total = (data?.cash ?? 0) + (data?.credit ?? 0) + (data?.debtpaid ?? 0) + (data?.wallet ?? 0);

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-24 lg:pb-8 max-w-6xl mx-auto">
        <PageHeader title="Sales Report" subtitle="Summary of all sales by payment type" backHref={reportsRoute} />

        {/* Filters */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {DATE_RANGES.map((r, i) => (
            <Button key={r.label} size="sm"
              variant={!showCustom && rangeIdx === i ? "default" : "outline"}
              className="h-7 text-xs px-2.5"
              onClick={() => { setRangeIdx(i); setShowCustom(false); }}>
              {r.label}
            </Button>
          ))}
          <Button size="sm" variant={showCustom ? "default" : "outline"} className="h-7 text-xs px-2.5"
            onClick={() => setShowCustom(true)}>Custom</Button>
          {showCustom && (
            <div className="flex gap-2 items-center ml-1 flex-wrap">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-7 text-xs border rounded px-2 bg-white" />
              <span className="text-xs text-gray-500">to</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-7 text-xs border rounded px-2 bg-white" />
            </div>
          )}
        </div>

        {/* Hero total banner */}
        <div className="rounded-xl bg-gradient-to-r from-green-600 to-green-500 p-4 lg:p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-80 mb-1">Total Sales</p>
              {isLoading
                ? <div className="h-7 w-32 bg-white/20 animate-pulse rounded" />
                : <p className="text-2xl lg:text-3xl font-bold">{currency} {fmt(total)}</p>}
              <p className="text-xs opacity-70 mt-1">{fromDate === toDate ? fromDate : `${fromDate} – ${toDate}`}</p>
            </div>
            <ShoppingCart className="w-10 h-10 opacity-30" />
          </div>
        </div>

        {isLoading && <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>}
        {isError && <Card><CardContent className="p-6 text-center text-red-500">Failed to load sales report.</CardContent></Card>}
        {!isLoading && !isError && tiles.length === 0 && (
          <Card><CardContent className="p-10 text-center text-muted-foreground">No sales data for this period.</CardContent></Card>
        )}

        {!isLoading && !isError && tiles.length > 0 && (
          <>
            {/* ── Mobile: icon cards in 2-col grid ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 lg:hidden">
              {tiles.map((t) => {
                const Icon = t.icon;
                return (
                  <Card key={t.key} className={`border ${t.border}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-7 h-7 rounded-lg ${t.bg} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-3.5 h-3.5 ${t.color}`} />
                        </div>
                        <span className="text-[11px] text-muted-foreground leading-tight">{t.label}</span>
                      </div>
                      <p className={`text-base font-bold ${t.color}`}>{currency} {fmt(data?.[t.key] ?? 0)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* ── Desktop: full table ── */}
            <Card className="hidden lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground text-xs w-10" />
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Payment Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Description</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground text-xs">Amount</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tiles.map((t) => {
                    const Icon = t.icon;
                    const val = data?.[t.key] ?? 0;
                    const share = total > 0 ? ((val / total) * 100).toFixed(1) : "0";
                    return (
                      <tr key={t.key} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className={`w-8 h-8 rounded-lg ${t.bg} flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${t.color}`} />
                          </div>
                        </td>
                        <td className={`px-4 py-3.5 font-semibold ${t.color}`}>{t.label}</td>
                        <td className="px-4 py-3.5 text-muted-foreground">{t.desc}</td>
                        <td className={`px-5 py-3.5 text-right font-bold text-base ${t.color}`}>{currency} {fmt(val)}</td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${t.bg} ${t.color} font-medium`}>{share}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/20 font-bold">
                    <td className="px-5 py-3" colSpan={3}>Total</td>
                    <td className="px-5 py-3 text-right text-base">{currency} {fmt(total)}</td>
                    <td className="px-4 py-3 text-right"><span className="text-xs px-2 py-0.5 rounded-full bg-muted font-medium">100%</span></td>
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

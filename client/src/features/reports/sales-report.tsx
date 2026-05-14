import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { usePrimaryShop } from '@/hooks/usePrimaryShop';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart } from "lucide-react";

const fmt = (val: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val ?? 0);

type DateRange = { label: string; days: number | null };
const DATE_RANGES: DateRange[] = [
  { label: "Today", days: 0 },
  { label: "Yesterday", days: 1 },
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
];

function toYMD(d: Date) {
  return d.toISOString().split("T")[0];
}

function getRange(days: number | null): { from: string; to: string } {
  const now = new Date();
  if (days === 0) return { from: toYMD(now), to: toYMD(now) };
  if (days === 1) {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    return { from: toYMD(y), to: toYMD(y) };
  }
  const from = new Date(now); from.setDate(from.getDate() - (days ?? 7));
  return { from: toYMD(from), to: toYMD(now) };
}

interface SalesReportData {
  cash?: number;
  credit?: number;
  debtpaid?: number;
  returns?: number;
  wallet?: number;
  hold?: number;
  [key: string]: number | undefined;
}

const TILES = [
  { key: "cash",     label: "Cash Sales",     desc: "All sales made on cash",                  color: "text-green-700",  bg: "bg-green-50",  border: "border-green-200" },
  { key: "credit",   label: "Credit Sales",   desc: "Sales made on credit",                    color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  { key: "debtpaid", label: "Collected Debt", desc: "Total credit paid by debtors",            color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200" },
  { key: "returns",  label: "Returns",        desc: "Sales returned from customers",           color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200" },
  { key: "wallet",   label: "Wallet Sales",   desc: "Sales through customer wallets",          color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  { key: "hold",     label: "On Hold Sales",  desc: "Sales that have not been cashed in",      color: "text-gray-700",   bg: "bg-gray-50",   border: "border-gray-200" },
];

export default function SalesReportPage() {
  const currency = useSelector((state: RootState) => state.currency);
  const { selectedShopId, attendant, primaryShopId } = usePrimaryShop();
  const effectiveShopId = selectedShopId || (attendant ? (attendant as any).shopId?._id : primaryShopId);

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
      <div className="p-4 md:p-6 space-y-5">
        <PageHeader title="Sales Report" subtitle="Summary of all sales by payment type" />

        <div className="flex flex-wrap gap-2">
          {DATE_RANGES.map((r, i) => (
            <Button
              key={r.label}
              size="sm"
              variant={!showCustom && rangeIdx === i ? "default" : "outline"}
              onClick={() => { setRangeIdx(i); setShowCustom(false); }}
            >
              {r.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant={showCustom ? "default" : "outline"}
            onClick={() => setShowCustom(true)}
          >
            Custom
          </Button>
        </div>

        {showCustom && (
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">From</label>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="border rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">To</label>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="border rounded px-2 py-1 text-sm" />
            </div>
          </div>
        )}

        <Card>
          <CardContent className="p-5 flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Sales</p>
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <p className="text-2xl font-bold">{currency} {fmt(total)}</p>
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
          <Card><CardContent className="p-6 text-center text-red-500">Failed to load sales report.</CardContent></Card>
        )}

        {!isLoading && !isError && tiles.length === 0 && (
          <Card><CardContent className="p-10 text-center text-muted-foreground">No sales data for this period.</CardContent></Card>
        )}

        {!isLoading && !isError && tiles.length > 0 && (
          <Card>
            <CardContent className="p-4 divide-y">
              {tiles.map((t) => (
                <div key={t.key} className="flex items-start justify-between py-4 gap-3">
                  <div className={`w-10 h-10 rounded-full ${t.bg} ${t.border} border flex items-center justify-center shrink-0`}>
                    <ShoppingCart className={`w-4 h-4 ${t.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                  <p className={`font-bold text-base ${t.color} shrink-0`}>
                    {currency} {fmt(data?.[t.key] ?? 0)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

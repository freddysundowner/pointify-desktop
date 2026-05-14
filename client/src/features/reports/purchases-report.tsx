import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { usePrimaryShop } from "@/hooks/usePrimaryShop";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingBag, Search, X } from "lucide-react";
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

interface Purchase {
  _id: string;
  purchaseNo?: string | number; invoiceNo?: string | number;
  totalAmount?: number; amount?: number; total?: number;
  createdAt?: string; paymentType?: string;
  supplier?: { name?: string } | null;
  items?: { product?: { name?: string }; quantity?: number; buyingPrice?: number }[];
}

function fmtDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}
function purchaseAmount(p: Purchase) { return p.totalAmount ?? p.amount ?? p.total ?? 0; }
function supplierName(p: Purchase) { return (p.supplier as any)?.name ?? null; }

const PAYMENT_TYPES = ["all", "cash", "credit"];
const LIMIT = 20;

export default function PurchasesReportPage() {
  const currency = useSelector((state: RootState) => state.currency);
  const { selectedShopId, attendant, primaryShopId } = usePrimaryShop();
  const effectiveShopId = selectedShopId || (attendant ? (attendant as any).shopId?._id : primaryShopId);
  const reportsRoute = useNavigationRoute("reports");

  const [rangeIdx, setRangeIdx] = useState(2);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [paymentType, setPaymentType] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { from: autoFrom, to: autoTo } = getRange(DATE_RANGES[rangeIdx]?.days ?? 7);
  const fromDate = showCustom ? customFrom : autoFrom;
  const toDate   = showCustom ? customTo   : autoTo;

  const token = useSelector((state: RootState) => (state as any).auth?.token || localStorage.getItem("token") || "");

  const { data, isLoading, isError } = useQuery<{ purchases: Purchase[] }>({
    queryKey: ["purchases-report", effectiveShopId, fromDate, toDate, paymentType, page],
    enabled: !!effectiveShopId,
    queryFn: async () => {
      const params = new URLSearchParams({ shopId: effectiveShopId, start: fromDate, end: toDate, page: String(page), limit: String(LIMIT) });
      if (paymentType !== "all") params.set("paymentType", paymentType);
      const res = await fetch(`/api/purchases?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      const raw = await res.json();
      return Array.isArray(raw) ? { purchases: raw } : { purchases: raw?.purchases ?? raw?.data ?? [] };
    },
  });

  const all = data?.purchases ?? [];
  const filtered = search.trim()
    ? all.filter(p =>
        String(p.purchaseNo ?? p.invoiceNo ?? "").toLowerCase().includes(search.toLowerCase()) ||
        p.items?.some(it => it.product?.name?.toLowerCase().includes(search.toLowerCase())))
    : all;

  const cashTotal   = filtered.filter(p => p.paymentType === "cash").reduce((s, p) => s + purchaseAmount(p), 0);
  const creditTotal = filtered.filter(p => p.paymentType === "credit").reduce((s, p) => s + purchaseAmount(p), 0);
  const totalAmt    = filtered.reduce((s, p) => s + purchaseAmount(p), 0);

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-24 lg:pb-8 w-full">
        <PageHeader title="Purchases Report" subtitle="Purchase invoices and records" backHref={reportsRoute} />

        {/* Filters */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {DATE_RANGES.map((r, i) => (
            <Button key={r.label} size="sm"
              variant={!showCustom && rangeIdx === i ? "default" : "outline"}
              className="h-7 text-xs px-2.5"
              onClick={() => { setRangeIdx(i); setShowCustom(false); setPage(1); }}>
              {r.label}
            </Button>
          ))}
          <Button size="sm" variant={showCustom ? "default" : "outline"} className="h-7 text-xs px-2.5"
            onClick={() => setShowCustom(true)}>Custom</Button>
          {showCustom && (
            <div className="flex gap-2 items-center ml-1 flex-wrap">
              <input type="date" value={customFrom} onChange={e => { setCustomFrom(e.target.value); setPage(1); }} className="h-7 text-xs border rounded px-2 bg-white" />
              <span className="text-xs text-gray-500">to</span>
              <input type="date" value={customTo} onChange={e => { setCustomTo(e.target.value); setPage(1); }} className="h-7 text-xs border rounded px-2 bg-white" />
            </div>
          )}
        </div>

        {/* Desktop: 3 stat tiles */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Purchases</p>
              {isLoading ? <div className="h-6 w-24 bg-muted animate-pulse rounded" /> : <p className="text-xl font-bold">{currency} {fmt(totalAmt)}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} invoice{filtered.length !== 1 ? "s" : ""}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Cash Purchases</p>
              {isLoading ? <div className="h-6 w-24 bg-muted animate-pulse rounded" /> : <p className="text-xl font-bold text-green-700">{currency} {fmt(cashTotal)}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">{filtered.filter(p => p.paymentType === "cash").length} invoices</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Credit Purchases</p>
              {isLoading ? <div className="h-6 w-24 bg-muted animate-pulse rounded" /> : <p className="text-xl font-bold text-orange-600">{currency} {fmt(creditTotal)}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">{filtered.filter(p => p.paymentType === "credit").length} invoices</p>
            </CardContent>
          </Card>
        </div>

        {/* Search + payment type filter */}
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input type="text" placeholder="Search by invoice or product..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full h-8 border rounded-lg pl-8 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
          </div>
          <div className="flex gap-1">
            {PAYMENT_TYPES.map(pt => (
              <Button key={pt} size="sm" variant={paymentType === pt ? "default" : "outline"} className="h-8 text-xs capitalize"
                onClick={() => { setPaymentType(pt); setPage(1); }}>
                {pt === "all" ? "All" : pt.charAt(0).toUpperCase() + pt.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {isLoading && <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>}
        {isError && <Card><CardContent className="p-6 text-center text-red-500">Failed to load purchases.</CardContent></Card>}
        {!isLoading && !isError && filtered.length === 0 && (
          <Card><CardContent className="p-10 text-center text-muted-foreground">No purchases found for this period.</CardContent></Card>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <>
            {/* Mobile: card list */}
            <Card className="lg:hidden">
              <CardContent className="p-0 divide-y">
                {filtered.map((p) => (
                  <div key={p._id} className="flex items-start justify-between px-4 py-3 gap-3 hover:bg-muted/30">
                    <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 mt-0.5">
                      <ShoppingBag className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">#{p.purchaseNo ?? p.invoiceNo ?? p._id.slice(-6)}</p>
                        {p.paymentType && (
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${p.paymentType === "credit" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>{p.paymentType}</span>
                        )}
                      </div>
                      {supplierName(p) && <p className="text-xs text-muted-foreground">{supplierName(p)}</p>}
                      <p className="text-xs text-muted-foreground">{fmtDate(p.createdAt)}</p>
                    </div>
                    <p className="font-bold text-sm shrink-0">{currency} {fmt(purchaseAmount(p))}</p>
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
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Invoice</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Supplier</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Payment</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Items</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground text-xs">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((p, i) => (
                    <tr key={p._id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5 text-muted-foreground text-xs">{(page - 1) * LIMIT + i + 1}</td>
                      <td className="px-4 py-3.5 font-semibold">#{p.purchaseNo ?? p.invoiceNo ?? p._id.slice(-6)}</td>
                      <td className="px-4 py-3.5">{supplierName(p) ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-3.5">
                        {p.paymentType
                          ? <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${p.paymentType === "credit" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>{p.paymentType}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs">{fmtDate(p.createdAt)}</td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs">{p.items?.length ?? 0} item{(p.items?.length ?? 0) !== 1 ? "s" : ""}</td>
                      <td className="px-5 py-3.5 text-right font-bold">{currency} {fmt(purchaseAmount(p))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/20 font-bold">
                    <td className="px-5 py-3 text-xs text-muted-foreground" colSpan={6}>Total · {filtered.length} invoices</td>
                    <td className="px-5 py-3 text-right">{currency} {fmt(totalAmt)}</td>
                  </tr>
                </tfoot>
              </table>
            </Card>

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page}</span>
              <Button variant="outline" size="sm" disabled={filtered.length < LIMIT} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

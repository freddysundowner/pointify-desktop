import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { usePrimaryShop } from '@/hooks/usePrimaryShop';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingBag, Search, X } from "lucide-react";

const fmt = (val: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val ?? 0);

type DateRange = { label: string; days: number | null };
const DATE_RANGES: DateRange[] = [
  { label: "Today", days: 0 },
  { label: "Yesterday", days: 1 },
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
];

function toYMD(d: Date) { return d.toISOString().split("T")[0]; }
function getRange(days: number | null): { from: string; to: string } {
  const now = new Date();
  if (days === 0) return { from: toYMD(now), to: toYMD(now) };
  if (days === 1) { const y = new Date(now); y.setDate(y.getDate() - 1); return { from: toYMD(y), to: toYMD(y) }; }
  const from = new Date(now); from.setDate(from.getDate() - (days ?? 7));
  return { from: toYMD(from), to: toYMD(now) };
}

interface PurchaseItem {
  product?: { name?: string };
  quantity?: number;
  buyingPrice?: number;
}

interface Purchase {
  _id: string;
  purchaseNo?: string | number;
  invoiceNo?: string | number;
  totalAmount?: number;
  amount?: number;
  total?: number;
  createdAt?: string;
  paymentType?: string;
  supplier?: { name?: string; _id?: string } | null;
  items?: PurchaseItem[];
}

function fmtDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

const PAYMENT_TYPES = ["all", "cash", "credit"];

export default function PurchasesReportPage() {
  const currency = useSelector((state: RootState) => state.currency);
  const { selectedShopId, attendant, primaryShopId } = usePrimaryShop();
  const effectiveShopId = selectedShopId || (attendant ? (attendant as any).shopId?._id : primaryShopId);

  const [rangeIdx, setRangeIdx] = useState(2);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [paymentType, setPaymentType] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { from: autoFrom, to: autoTo } = getRange(DATE_RANGES[rangeIdx]?.days ?? 7);
  const fromDate = showCustom ? customFrom : autoFrom;
  const toDate   = showCustom ? customTo   : autoTo;

  const token = useSelector((state: RootState) => (state as any).auth?.token || localStorage.getItem("token") || "");

  const { data, isLoading, isError } = useQuery<{ purchases: Purchase[]; total?: number }>({
    queryKey: ["purchases-report", effectiveShopId, fromDate, toDate, paymentType, page],
    enabled: !!effectiveShopId,
    queryFn: async () => {
      const params = new URLSearchParams({
        shopId: effectiveShopId,
        start: fromDate,
        end: toDate,
        page: String(page),
        limit: String(limit),
      });
      if (paymentType !== "all") params.set("paymentType", paymentType);
      const res = await fetch(`/api/purchases?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      const raw = await res.json();
      if (Array.isArray(raw)) return { purchases: raw };
      return { purchases: raw?.purchases ?? raw?.data ?? [], total: raw?.total };
    },
  });

  const allPurchases = data?.purchases ?? [];
  const filtered = search.trim()
    ? allPurchases.filter(p =>
        String(p.purchaseNo ?? p.invoiceNo ?? "").toLowerCase().includes(search.toLowerCase()) ||
        p.items?.some(it => it.product?.name?.toLowerCase().includes(search.toLowerCase()))
      )
    : allPurchases;

  const totalAmount = filtered.reduce((s, p) => s + (p.totalAmount ?? p.amount ?? p.total ?? 0), 0);

  function purchaseAmount(p: Purchase) {
    return p.totalAmount ?? p.amount ?? p.total ?? 0;
  }

  function supplierName(p: Purchase) {
    if (!p.supplier) return null;
    return (p.supplier as any).name ?? null;
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-5">
        <PageHeader title="Purchases Report" subtitle="Purchase invoices and records" />

        <div className="flex flex-wrap gap-2">
          {DATE_RANGES.map((r, i) => (
            <Button key={r.label} size="sm"
              variant={!showCustom && rangeIdx === i ? "default" : "outline"}
              onClick={() => { setRangeIdx(i); setShowCustom(false); setPage(1); }}>
              {r.label}
            </Button>
          ))}
          <Button size="sm" variant={showCustom ? "default" : "outline"} onClick={() => setShowCustom(true)}>Custom</Button>
        </div>

        {showCustom && (
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">From</label>
              <input type="date" value={customFrom} onChange={e => { setCustomFrom(e.target.value); setPage(1); }} className="border rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">To</label>
              <input type="date" value={customTo} onChange={e => { setCustomTo(e.target.value); setPage(1); }} className="border rounded px-2 py-1 text-sm" />
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by invoice number or product..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border rounded-lg pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {PAYMENT_TYPES.map(pt => (
            <Button key={pt} size="sm"
              variant={paymentType === pt ? "default" : "outline"}
              onClick={() => { setPaymentType(pt); setPage(1); }}
              className="capitalize">
              {pt === "all" ? "All" : pt.charAt(0).toUpperCase() + pt.slice(1)}
            </Button>
          ))}
        </div>

        <Card>
          <CardContent className="p-5 flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "Invoice" : "Invoices"}</p>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : (
                <p className="text-2xl font-bold">{currency} {fmt(totalAmount)}</p>
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
          <Card><CardContent className="p-6 text-center text-red-500">Failed to load purchases.</CardContent></Card>
        )}
        {!isLoading && !isError && filtered.length === 0 && (
          <Card><CardContent className="p-10 text-center text-muted-foreground">No purchases found for this period.</CardContent></Card>
        )}
        {!isLoading && !isError && filtered.length > 0 && (
          <Card>
            <CardContent className="p-0 divide-y">
              {filtered.map((p) => (
                <div key={p._id} className="flex items-start justify-between px-4 py-3 gap-3 hover:bg-muted/30 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 mt-0.5">
                    <ShoppingBag className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">#{p.purchaseNo ?? p.invoiceNo ?? p._id.slice(-6)}</p>
                      {p.paymentType && (
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                          p.paymentType === "credit" ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                        }`}>{p.paymentType}</span>
                      )}
                    </div>
                    {supplierName(p) && <p className="text-xs text-muted-foreground">{supplierName(p)}</p>}
                    <p className="text-xs text-muted-foreground">{fmtDate(p.createdAt)}</p>
                    {p.items && <p className="text-xs text-muted-foreground">{p.items.length} item{p.items.length !== 1 ? "s" : ""}</p>}
                  </div>
                  <p className="font-bold text-sm shrink-0">{currency} {fmt(purchaseAmount(p))}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div className="flex items-center justify-between pt-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <Button variant="outline" size="sm" disabled={filtered.length < limit} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { usePrimaryShop } from '@/hooks/usePrimaryShop';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet } from "lucide-react";

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

interface Expense {
  _id: string;
  title?: string;
  name?: string;
  description?: string;
  amount: number;
  createdAt?: string;
  category?: { name?: string } | string;
}

export default function ExpenseReportPage() {
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

  const { data, isLoading, isError } = useQuery<Expense[]>({
    queryKey: ["expense-report", effectiveShopId, fromDate, toDate],
    enabled: !!effectiveShopId,
    queryFn: async () => {
      const res = await fetch(
        `/api/expenses?shop=${effectiveShopId}&start=${fromDate}&end=${toDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed");
      const raw = await res.json();
      return Array.isArray(raw) ? raw : (raw?.data ?? []);
    },
  });

  const expenses = data ?? [];
  const total = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);

  function expenseName(e: Expense) {
    return e.title || e.name || e.description || "Expense";
  }

  function categoryName(e: Expense) {
    if (!e.category) return null;
    if (typeof e.category === "string") return e.category;
    return (e.category as any).name ?? null;
  }

  function fmtDate(d?: string) {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-5">
        <PageHeader title="Expenses Report" subtitle="Track your expenditures over time" />

        <div className="flex flex-wrap gap-2">
          {DATE_RANGES.map((r, i) => (
            <Button key={r.label} size="sm"
              variant={!showCustom && rangeIdx === i ? "default" : "outline"}
              onClick={() => { setRangeIdx(i); setShowCustom(false); }}>
              {r.label}
            </Button>
          ))}
          <Button size="sm" variant={showCustom ? "default" : "outline"} onClick={() => setShowCustom(true)}>Custom</Button>
        </div>

        {showCustom && (
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">From</label>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="border rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">To</label>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="border rounded px-2 py-1 text-sm" />
            </div>
          </div>
        )}

        <Card>
          <CardContent className="p-5 flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{expenses.length} {expenses.length === 1 ? "Entry" : "Entries"} · Total Expenses</p>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : (
                <p className="text-2xl font-bold text-red-600">{currency} {fmt(total)}</p>
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
          <Card><CardContent className="p-6 text-center text-red-500">Failed to load expenses.</CardContent></Card>
        )}
        {!isLoading && !isError && expenses.length === 0 && (
          <Card><CardContent className="p-10 text-center text-muted-foreground">No expenses found for this period.</CardContent></Card>
        )}
        {!isLoading && !isError && expenses.length > 0 && (
          <Card>
            <CardContent className="p-0 divide-y">
              {expenses.map((e) => (
                <div key={e._id} className="flex items-center justify-between px-4 py-3 gap-3 hover:bg-muted/30 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                    <Wallet className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{expenseName(e)}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {categoryName(e) && (
                        <span className="text-xs px-2 py-0.5 bg-muted rounded-full">{categoryName(e)}</span>
                      )}
                      <span className="text-xs text-muted-foreground">{fmtDate(e.createdAt)}</span>
                    </div>
                  </div>
                  <p className="font-bold text-red-600 text-sm shrink-0">{currency} {fmt(e.amount)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

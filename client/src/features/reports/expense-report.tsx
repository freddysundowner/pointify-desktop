import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { usePrimaryShop } from "@/hooks/usePrimaryShop";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet } from "lucide-react";
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

interface Expense {
  _id: string;
  title?: string; name?: string; description?: string;
  amount: number;
  createdAt?: string;
  category?: { name?: string } | string;
}

function fmtDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}
function expenseName(e: Expense) { return e.title || e.name || e.description || "Expense"; }
function categoryName(e: Expense) {
  if (!e.category) return null;
  if (typeof e.category === "string") return e.category;
  return (e.category as any).name ?? null;
}

export default function ExpenseReportPage() {
  const currency = useSelector((state: RootState) => state.currency);
  const { shopId: effectiveShopId } = usePrimaryShop();
  const reportsRoute = useNavigationRoute("reports");

  const [rangeIdx, setRangeIdx] = useState(0);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const { from: autoFrom, to: autoTo } = getRange(DATE_RANGES[rangeIdx]?.days ?? 0);
  const fromDate = showCustom ? customFrom : autoFrom;
  const toDate   = showCustom ? customTo   : autoTo;

  const url = effectiveShopId
    ? `/api/expenses?shop=${effectiveShopId}&start=${fromDate}&end=${toDate}`
    : null;

  const { data: rawExpenses, isLoading, isError } = useQuery<any>({
    queryKey: [url],
    enabled: !!url,
    staleTime: 60_000,
  });

  const expenses: Expense[] = Array.isArray(rawExpenses) ? rawExpenses : (rawExpenses?.data ?? []);
  const total = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);

  // Group by category for desktop summary
  const byCategory: Record<string, number> = {};
  expenses.forEach(e => {
    const cat = categoryName(e) ?? "Uncategorised";
    byCategory[cat] = (byCategory[cat] ?? 0) + (e.amount ?? 0);
  });
  const cats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-24 lg:pb-8 w-full">
        <PageHeader title="Expenses Report" subtitle="Track your expenditures over time" backHref={reportsRoute} />

        {/* Filters row */}
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

        {/* Hero banner */}
        <div className="rounded-xl bg-gradient-to-r from-red-600 to-red-500 p-4 lg:p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-80 mb-1">{expenses.length} {expenses.length === 1 ? "Entry" : "Entries"} · Total Expenses</p>
              {isLoading
                ? <div className="h-7 w-32 bg-white/20 animate-pulse rounded" />
                : <p className="text-2xl lg:text-3xl font-bold">{currency} {fmt(total)}</p>}
              <p className="text-xs opacity-70 mt-1">{fromDate === toDate ? fromDate : `${fromDate} – ${toDate}`}</p>
            </div>
            <Wallet className="w-10 h-10 opacity-30" />
          </div>
        </div>

        {isLoading && <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>}
        {isError && <Card><CardContent className="p-6 text-center text-red-500">Failed to load expenses.</CardContent></Card>}
        {!isLoading && !isError && expenses.length === 0 && (
          <Card><CardContent className="p-10 text-center text-muted-foreground">No expenses found for this period.</CardContent></Card>
        )}

        {!isLoading && !isError && expenses.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* ── Desktop sidebar: category breakdown ── */}
            {cats.length > 0 && (
              <Card className="hidden lg:block lg:col-span-1 h-fit">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">By Category</p>
                  <div className="space-y-2">
                    {cats.map(([cat, amt]) => (
                      <div key={cat}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="truncate text-gray-600 max-w-[120px]">{cat}</span>
                          <span className="font-semibold text-red-600 shrink-0">{fmt(amt)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-red-100 overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${total > 0 ? (amt / total) * 100 : 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── List area ── */}
            <div className={cats.length > 0 ? "lg:col-span-3" : "lg:col-span-4"}>
              {/* Mobile: card list */}
              <Card className="lg:hidden">
                <CardContent className="p-0 divide-y">
                  {expenses.map((e) => (
                    <div key={e._id} className="flex items-center justify-between px-4 py-3 gap-3 hover:bg-muted/30 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                        <Wallet className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{expenseName(e)}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {categoryName(e) && <span className="text-xs px-2 py-0.5 bg-muted rounded-full">{categoryName(e)}</span>}
                          <span className="text-xs text-muted-foreground">{fmtDate(e.createdAt)}</span>
                        </div>
                      </div>
                      <p className="font-bold text-red-600 text-sm shrink-0">{currency} {fmt(e.amount)}</p>
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
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Expense</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Category</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Date</th>
                      <th className="text-right px-5 py-3 font-medium text-muted-foreground text-xs">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {expenses.map((e, i) => (
                      <tr key={e._id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-medium">{expenseName(e)}</td>
                        <td className="px-4 py-3">
                          {categoryName(e)
                            ? <span className="text-xs px-2 py-0.5 bg-muted rounded-full">{categoryName(e)}</span>
                            : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDate(e.createdAt)}</td>
                        <td className="px-5 py-3 text-right font-bold text-red-600">{currency} {fmt(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/20 font-bold">
                      <td className="px-5 py-3 text-xs text-muted-foreground" colSpan={4}>Total · {expenses.length} entries</td>
                      <td className="px-5 py-3 text-right text-red-600">{currency} {fmt(total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { usePrimaryShop } from "@/hooks/usePrimaryShop";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, ChevronDown } from "lucide-react";
import { useNavigationRoute } from "@/lib/navigation-utils";

const fmt = (val: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val ?? 0);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface MonthData { month: string; sales: number; profit: number; expenses: number; net: number; }

function toYMD(d: Date) { return d.toISOString().split("T")[0]; }
function getYears() {
  const y = new Date().getFullYear();
  const arr = [];
  for (let i = 2019; i <= y; i++) arr.push(i);
  return arr;
}

export default function AnalysisReportPage() {
  const currency = useSelector((state: RootState) => state.currency);
  const { selectedShopId, attendant, primaryShopId } = usePrimaryShop();
  const effectiveShopId = selectedShopId || (attendant ? (attendant as any).shopId?._id : primaryShopId);
  const reportsRoute = useNavigationRoute("reports");

  const [year, setYear] = useState(new Date().getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<"graph" | "list">("graph");
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const token = useSelector((state: RootState) => (state as any).auth?.token || localStorage.getItem("token") || "");

  async function fetchData(y: number) {
    if (!effectiveShopId) return;
    setLoading(true); setError(false);
    const fromDate = toYMD(new Date(y, 0, 1));
    const toDate   = toYMD(new Date(y, 11, 31));
    try {
      const [salesRes, expRes] = await Promise.all([
        fetch(`/api/sales/filter?shopId=${effectiveShopId}&fromDate=${fromDate}&toDate=${toDate}&paginated=false`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/expenses?shop=${effectiveShopId}&start=${fromDate}&end=${toDate}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const salesRaw = await salesRes.json();
      const sales = Array.isArray(salesRaw) ? salesRaw : (salesRaw?.data ?? []);
      const expRaw = await expRes.json();
      const exps = Array.isArray(expRaw) ? expRaw : (expRaw?.data ?? []);

      const map: Record<string, MonthData> = {};
      MONTHS.forEach(m => { map[m] = { month: m, sales: 0, profit: 0, expenses: 0, net: 0 }; });

      for (const s of sales) {
        const d = new Date(s.createdAt ?? s.date ?? "");
        if (isNaN(d.getTime())) continue;
        const mon = MONTHS[d.getMonth()];
        const amt = s.totalWithDiscount ?? s.totalAmount ?? s.amount ?? 0;
        map[mon].sales += amt;
        const buy = (s.items ?? []).reduce((a: number, it: any) => a + ((it.product?.buyingPrice ?? 0) * (it.quantity ?? 1)), 0);
        map[mon].profit += amt - buy;
      }
      for (const ex of exps) {
        const d = new Date(ex.createdAt ?? ex.date ?? "");
        if (isNaN(d.getTime())) continue;
        map[MONTHS[d.getMonth()]].expenses += ex.amount ?? 0;
      }
      for (const m of MONTHS) map[m].net = map[m].profit - map[m].expenses;
      setMonthlyData(MONTHS.map(m => map[m]));
    } catch { setError(true); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchData(year); }, [year, effectiveShopId]);

  const totalSales    = monthlyData.reduce((s, m) => s + m.sales, 0);
  const totalProfit   = monthlyData.reduce((s, m) => s + m.profit, 0);
  const totalExpenses = monthlyData.reduce((s, m) => s + m.expenses, 0);
  const totalNet      = monthlyData.reduce((s, m) => s + m.net, 0);
  const maxVal = Math.max(...monthlyData.map(m => Math.max(m.sales, m.profit, m.expenses)), 1);
  const barH = (v: number) => Math.max(2, (v / maxVal) * 160);

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-24 lg:pb-8 w-full">
        <PageHeader title="Graphical Analysis" subtitle="Monthly sales, profit and expenses" backHref={reportsRoute} />

        {/* Year filter + tab controls */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Year:</span>
            <div className="relative">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                onClick={() => setShowYearPicker(v => !v)}>
                {year} <ChevronDown className="w-3.5 h-3.5" />
              </Button>
              {showYearPicker && (
                <div className="absolute top-full mt-1 left-0 z-50 bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto min-w-[80px]">
                  {getYears().map(y => (
                    <button key={y} onClick={() => { setYear(y); setShowYearPicker(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors ${y === year ? "font-bold text-primary" : ""}`}>
                      {y}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant={activeTab === "graph" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setActiveTab("graph")}>Graph View</Button>
            <Button size="sm" variant={activeTab === "list"  ? "default" : "outline"} className="h-7 text-xs" onClick={() => setActiveTab("list")}>List View</Button>
          </div>
        </div>

        {/* Desktop: 4 stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Sales",    value: totalSales,    color: "text-blue-700",  bg: "bg-blue-50"   },
            { label: "Total Profit",   value: totalProfit,   color: totalProfit   >= 0 ? "text-green-700" : "text-red-600", bg: "bg-green-50" },
            { label: "Total Expenses", value: totalExpenses, color: "text-red-600",   bg: "bg-red-50"    },
            { label: "Net Profit",     value: totalNet,      color: totalNet      >= 0 ? "text-green-700" : "text-red-600", bg: "bg-purple-50" },
          ].map(c => (
            <Card key={c.label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{c.label} ({year})</p>
                {loading ? <div className="h-6 w-24 bg-muted animate-pulse rounded" />
                  : <p className={`text-xl font-bold ${c.color}`}>{currency} {fmt(c.value)}</p>}
                <div className={`mt-2 w-8 h-1 rounded-full ${c.bg}`} />
              </CardContent>
            </Card>
          ))}
        </div>

        {loading && <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>}
        {error  && <Card><CardContent className="p-6 text-center text-red-500">Failed to load analysis data.</CardContent></Card>}

        {!loading && !error && activeTab === "graph" && (
          <Card>
            <CardContent className="p-5">
              {/* Legend */}
              <div className="flex items-center gap-5 mb-4 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs font-medium"><span className="w-3 h-3 rounded bg-blue-400 inline-block" />Sales</span>
                <span className="flex items-center gap-1.5 text-xs font-medium"><span className="w-3 h-3 rounded bg-green-400 inline-block" />Profit</span>
                <span className="flex items-center gap-1.5 text-xs font-medium"><span className="w-3 h-3 rounded bg-red-400 inline-block" />Expenses</span>
              </div>
              {/* Bar chart — taller on desktop */}
              <div className="flex items-end gap-1 overflow-x-auto pb-2 lg:gap-2" style={{ minHeight: 200 }}>
                {monthlyData.map((m) => (
                  <div key={m.month} className="flex flex-col items-center flex-1 min-w-[32px] lg:min-w-[52px] group">
                    {/* Tooltip on hover (desktop) */}
                    <div className="hidden lg:block opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-center text-muted-foreground mb-1 whitespace-nowrap">
                      <span className="text-blue-600">{fmt(m.sales)}</span>
                    </div>
                    <div className="flex items-end gap-0.5 lg:gap-1 w-full justify-center">
                      <div title={`Sales: ${fmt(m.sales)}`}    style={{ height: barH(m.sales) }}    className="bg-blue-400 hover:bg-blue-500 rounded-t w-2 lg:w-4 cursor-pointer transition-all" />
                      <div title={`Profit: ${fmt(m.profit)}`}  style={{ height: barH(m.profit) }}  className="bg-green-400 hover:bg-green-500 rounded-t w-2 lg:w-4 cursor-pointer transition-all" />
                      <div title={`Exp: ${fmt(m.expenses)}`}   style={{ height: barH(m.expenses) }} className="bg-red-400 hover:bg-red-500 rounded-t w-2 lg:w-4 cursor-pointer transition-all" />
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1.5 font-medium">{m.month}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && activeTab === "list" && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground text-xs">Month</th>
                    <th className="text-right px-4 py-3 font-medium text-blue-700 text-xs">Sales</th>
                    <th className="text-right px-4 py-3 font-medium text-green-700 text-xs">Gross Profit</th>
                    <th className="text-right px-4 py-3 font-medium text-red-600 text-xs">Expenses</th>
                    <th className="text-right px-5 py-3 font-medium text-muted-foreground text-xs">Net Profit</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs hidden lg:table-cell">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {monthlyData.map((m) => {
                    const margin = m.sales > 0 ? ((m.profit / m.sales) * 100).toFixed(1) : "0";
                    return (
                      <tr key={m.month} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3 font-medium">{m.month}</td>
                        <td className="px-4 py-3 text-right text-blue-700">{fmt(m.sales)}</td>
                        <td className="px-4 py-3 text-right text-green-700">{fmt(m.profit)}</td>
                        <td className="px-4 py-3 text-right text-red-600">{fmt(m.expenses)}</td>
                        <td className={`px-5 py-3 text-right font-semibold ${m.net >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(m.net)}</td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${parseFloat(margin) >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{margin}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30 font-bold">
                    <td className="px-5 py-3">Totals</td>
                    <td className="px-4 py-3 text-right text-blue-700">{fmt(totalSales)}</td>
                    <td className="px-4 py-3 text-right text-green-700">{fmt(totalProfit)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{fmt(totalExpenses)}</td>
                    <td className={`px-5 py-3 text-right ${totalNet >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(totalNet)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${totalSales > 0 && totalProfit / totalSales >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                        {totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : 0}%
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

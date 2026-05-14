import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { usePrimaryShop } from '@/hooks/usePrimaryShop';
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, ChevronDown } from "lucide-react";

const fmt = (val: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val ?? 0);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface MonthData {
  month: string;
  sales: number;
  profit: number;
  expenses: number;
  net: number;
}

function toYMD(d: Date) { return d.toISOString().split("T")[0]; }

function getYears() {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = 2019; y <= current; y++) years.push(y);
  return years;
}

export default function AnalysisReportPage() {
  const currency = useSelector((state: RootState) => state.currency);
  const { selectedShopId, attendant, primaryShopId } = usePrimaryShop();
  const effectiveShopId = selectedShopId || (attendant ? (attendant as any).shopId?._id : primaryShopId);

  const [year, setYear] = useState(new Date().getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [activeTab, setActiveTab] = useState<"graph" | "list">("graph");
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const token = useSelector((state: RootState) => (state as any).auth?.token || localStorage.getItem("token") || "");

  async function fetchData(y: number) {
    if (!effectiveShopId) return;
    setLoading(true);
    setError(false);

    const fromDate = toYMD(new Date(y, 0, 1));
    const toDate   = toYMD(new Date(y, 11, 31));

    try {
      const [salesRes, expensesRes] = await Promise.all([
        fetch(`/api/sales/filter?shopId=${effectiveShopId}&fromDate=${fromDate}&toDate=${toDate}&paginated=false`,
          { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/expenses?shop=${effectiveShopId}&start=${fromDate}&end=${toDate}`,
          { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const salesRaw = await salesRes.json();
      const sales = Array.isArray(salesRaw) ? salesRaw : (salesRaw?.data ?? []);
      const expRaw = await expensesRes.json();
      const expenses = Array.isArray(expRaw) ? expRaw : (expRaw?.data ?? []);

      const map: Record<string, MonthData> = {};
      MONTHS.forEach(m => { map[m] = { month: m, sales: 0, profit: 0, expenses: 0, net: 0 }; });

      for (const s of sales) {
        const d = new Date(s.createdAt ?? s.date ?? "");
        if (isNaN(d.getTime())) continue;
        const mon = MONTHS[d.getMonth()];
        const saleAmt = s.totalWithDiscount ?? s.totalAmount ?? s.amount ?? 0;
        map[mon].sales += saleAmt;
        const buyCost = (s.items ?? []).reduce(
          (acc: number, it: any) => acc + ((it.product?.buyingPrice ?? 0) * (it.quantity ?? 1)),
          0
        );
        map[mon].profit += saleAmt - buyCost;
      }

      for (const ex of expenses) {
        const d = new Date(ex.createdAt ?? ex.date ?? "");
        if (isNaN(d.getTime())) continue;
        const mon = MONTHS[d.getMonth()];
        map[mon].expenses += ex.amount ?? 0;
      }

      for (const mon of MONTHS) {
        map[mon].net = map[mon].profit - map[mon].expenses;
      }

      setMonthlyData(MONTHS.map(m => map[m]));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(year);
  }, [year, effectiveShopId]);

  const totalSales   = monthlyData.reduce((s, m) => s + m.sales, 0);
  const totalProfit  = monthlyData.reduce((s, m) => s + m.profit, 0);
  const totalExpenses= monthlyData.reduce((s, m) => s + m.expenses, 0);
  const totalNet     = monthlyData.reduce((s, m) => s + m.net, 0);

  const maxVal = Math.max(...monthlyData.map(m => Math.max(m.sales, m.profit, m.expenses)), 1);

  function barHeight(val: number) {
    return Math.max(2, (val / maxVal) * 140);
  }

  const years = getYears();

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-5">
        <PageHeader title="Graphical Analysis" subtitle="Monthly sales, profit and expenses" />

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Filter by ~</span>
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowYearPicker(v => !v)}
              className="flex items-center gap-1">
              {year}
              <ChevronDown className="w-4 h-4" />
            </Button>
            {showYearPicker && (
              <div className="absolute top-full mt-1 left-0 z-50 bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto min-w-[80px]">
                {years.map(y => (
                  <button key={y} onClick={() => { setYear(y); setShowYearPicker(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors ${y === year ? "font-bold text-primary" : ""}`}>
                    {y}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="p-5 flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Net Profit ({year})</p>
              {loading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : (
                <p className={`text-2xl font-bold ${totalNet >= 0 ? "text-green-700" : "text-red-600"}`}>
                  {currency} {fmt(totalNet)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button size="sm" variant={activeTab === "graph" ? "default" : "outline"} onClick={() => setActiveTab("graph")}>Graph View</Button>
          <Button size="sm" variant={activeTab === "list"  ? "default" : "outline"} onClick={() => setActiveTab("list")}>List View</Button>
        </div>

        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <Card><CardContent className="p-6 text-center text-red-500">Failed to load analysis data.</CardContent></Card>
        )}

        {!loading && !error && activeTab === "graph" && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-end gap-0.5 md:gap-1 overflow-x-auto pb-2" style={{ minHeight: 180 }}>
                {monthlyData.map((m) => (
                  <div key={m.month} className="flex flex-col items-center flex-1 min-w-[28px]">
                    <div className="flex items-end gap-0.5 w-full justify-center">
                      <div title={`Sales: ${fmt(m.sales)}`}
                        style={{ height: barHeight(m.sales) }}
                        className="bg-blue-400 rounded-t w-2 md:w-3 cursor-pointer hover:opacity-80 transition-opacity" />
                      <div title={`Profit: ${fmt(m.profit)}`}
                        style={{ height: barHeight(m.profit) }}
                        className="bg-green-400 rounded-t w-2 md:w-3 cursor-pointer hover:opacity-80 transition-opacity" />
                      <div title={`Expenses: ${fmt(m.expenses)}`}
                        style={{ height: barHeight(m.expenses) }}
                        className="bg-red-400 rounded-t w-2 md:w-3 cursor-pointer hover:opacity-80 transition-opacity" />
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1">{m.month}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs"><span className="w-3 h-3 rounded bg-blue-400 inline-block" /> Sales</span>
                <span className="flex items-center gap-1.5 text-xs"><span className="w-3 h-3 rounded bg-green-400 inline-block" /> Profit</span>
                <span className="flex items-center gap-1.5 text-xs"><span className="w-3 h-3 rounded bg-red-400 inline-block" /> Expenses</span>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && activeTab === "list" && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-3 font-semibold">Month</th>
                      <th className="text-right px-4 py-3 font-semibold text-blue-700">Sales</th>
                      <th className="text-right px-4 py-3 font-semibold text-green-700">Profit</th>
                      <th className="text-right px-4 py-3 font-semibold text-red-600">Expenses</th>
                      <th className="text-right px-4 py-3 font-semibold">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {monthlyData.map((m) => (
                      <tr key={m.month} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{m.month}</td>
                        <td className="px-4 py-3 text-right text-blue-700">{fmt(m.sales)}</td>
                        <td className="px-4 py-3 text-right text-green-700">{fmt(m.profit)}</td>
                        <td className="px-4 py-3 text-right text-red-600">{fmt(m.expenses)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${m.net >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(m.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/40 font-bold">
                      <td className="px-4 py-3">Totals</td>
                      <td className="px-4 py-3 text-right text-blue-700">{fmt(totalSales)}</td>
                      <td className="px-4 py-3 text-right text-green-700">{fmt(totalProfit)}</td>
                      <td className="px-4 py-3 text-right text-red-600">{fmt(totalExpenses)}</td>
                      <td className={`px-4 py-3 text-right ${totalNet >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(totalNet)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { useLocation, useParams } from "wouter";
import { apiCall } from "@/lib/api-config";
import { navigate } from "wouter/use-browser-location";
import { useAuth } from "@/features/auth/useAuth";
import { useCurrency } from "@/utils";

const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

function fmtDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function ProductHistory() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const productId = id;

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState("sales");
  const currency = useCurrency();

  const [salesPage, setSalesPage] = useState(1);
  const [purchasesPage, setPurchasesPage] = useState(1);
  const [badStockPage, setBadStockPage] = useState(1);

  useEffect(() => {
    setSalesPage(1);
    setPurchasesPage(1);
    setBadStockPage(1);
  }, [activeTab]);

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["/api/product", productId],
    enabled: !!productId,
  });

  const { data: summary } = useQuery({
    queryKey: ["/api/product-summary", productId, selectedMonth, selectedYear],
    queryFn: async () => {
      const r = await apiCall(`/api/product-summary?productId=${productId}&month=${selectedMonth}&year=${selectedYear}`);
      return r.json();
    },
    enabled: !!productId,
    staleTime: 0, gcTime: 0,
    refetchOnMount: "always", refetchOnWindowFocus: false,
  });

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ["/api/sales-history", productId, selectedMonth, selectedYear, salesPage],
    queryFn: async () => {
      const r = await apiCall(`/api/sales-history?productId=${productId}&month=${selectedMonth}&year=${selectedYear}&page=${salesPage}`);
      return r.json();
    },
    enabled: !!productId && activeTab === "sales",
    staleTime: 0, gcTime: 0,
    refetchOnMount: "always", refetchOnWindowFocus: false,
  });

  const { data: purchasesData, isLoading: purchasesLoading } = useQuery({
    queryKey: ["/api/purchases-history", productId, selectedMonth, selectedYear, purchasesPage],
    queryFn: async () => {
      const r = await apiCall(`/api/purchases-history?productId=${productId}&month=${selectedMonth}&year=${selectedYear}&page=${purchasesPage}`);
      return r.json();
    },
    enabled: !!productId && activeTab === "stock-in",
    staleTime: 0, gcTime: 0,
    refetchOnMount: "always", refetchOnWindowFocus: false,
  });

  const { data: badStockData, isLoading: badStockLoading } = useQuery({
    queryKey: ["/api/bad-stock-movements", productId, selectedMonth, selectedYear, badStockPage],
    queryFn: async () => {
      const r = await apiCall(`/api/bad-stock-movements?productId=${productId}&month=${selectedMonth}&year=${selectedYear}&page=${badStockPage}`);
      return r.json();
    },
    enabled: !!productId && activeTab === "bad-stock",
    staleTime: 0, gcTime: 0,
    refetchOnMount: "always", refetchOnWindowFocus: false,
  });

  const sales     = Array.isArray(salesData?.data)     ? salesData.data     : [];
  const purchases = Array.isArray(purchasesData?.data) ? purchasesData.data : [];
  const badStockMovements = Array.isArray(badStockData?.data) ? badStockData.data : [];

  const getPaginationInfo = () => {
    switch (activeTab) {
      case "sales":    return { totalPages: salesData?.totalPages     || 1, currentPage: salesData?.currentPage     || 1, setPage: setSalesPage };
      case "stock-in": return { totalPages: purchasesData?.totalPages || 1, currentPage: purchasesData?.currentPage || 1, setPage: setPurchasesPage };
      case "bad-stock":return { totalPages: badStockData?.totalPages  || 1, currentPage: badStockData?.currentPage  || 1, setPage: setBadStockPage };
      default:         return { totalPages: 1, currentPage: 1, setPage: () => {} };
    }
  };
  const { totalPages, currentPage, setPage } = getPaginationInfo();

  const { admin } = useAuth();
  const isAdmin = !!admin && !localStorage.getItem("attendantData");
  const handleGoBack = () => navigate(isAdmin ? "/stock/products" : "/attendant/products");

  const prevMonth = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  if (!productId) {
    return (
      <DashboardLayout>
        <div className="text-center py-8"><p className="text-gray-500">Product not found</p></div>
      </DashboardLayout>
    );
  }

  const productName = productLoading ? "Loading…" : product?.name || "Product History";

  /* ─── shared pagination bar ─────────────────────────────────────────── */
  const PaginationBar = () =>
    totalPages > 1 ? (
      <div className="flex items-center justify-between px-4 py-2.5 border-t bg-gray-50">
        <span className="text-xs text-gray-500">Page {currentPage} of {totalPages}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={currentPage <= 1}
            onClick={() => setPage(Math.max(1, currentPage - 1))}>Prev</Button>
          <Button variant="outline" size="sm" disabled={currentPage >= totalPages}
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}>Next</Button>
        </div>
      </div>
    ) : null;

  /* ─── month selector (shared) ───────────────────────────────────────── */
  const MonthSelector = ({ compact = false }: { compact?: boolean }) => (
    <div className={`flex items-center gap-1 ${compact ? "" : "justify-center"}`}>
      <button onClick={prevMonth} className="p-1 rounded-full hover:bg-gray-100">
        <ChevronLeft className="h-4 w-4 text-gray-500" />
      </button>
      <span className={`font-medium text-gray-700 ${compact ? "text-xs" : "text-sm"} min-w-[72px] text-center`}>
        {MONTHS[selectedMonth - 1]} {selectedYear}
      </span>
      <button onClick={nextMonth} className="p-1 rounded-full hover:bg-gray-100">
        <ChevronRight className="h-4 w-4 text-gray-500" />
      </button>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════════════
      RENDER
  ═══════════════════════════════════════════════════════════════════════ */
  return (
    <DashboardLayout>

      {/* ── Mobile layout ──────────────────────────────────────────────── */}
      <div className="lg:hidden flex flex-col">

        {/* Sticky top bar */}
        <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
          <div className="flex items-center gap-3 px-3 pt-3 pb-2">
            <button onClick={handleGoBack} className="p-1 -ml-1 rounded-full hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h1 className="flex-1 text-base font-semibold text-gray-900 truncate">{productName}</h1>
            <MonthSelector compact />
          </div>
        </div>

        {/* Stats row */}
        {summary && (
          <div className="grid grid-cols-3 gap-2 px-3 pt-3">
            {[
              { label: "Total Sales", value: `${currency} ${summary.totalSales?.toFixed(2) || "0.00"}`, color: "text-gray-900" },
              { label: "Units Sold",  value: summary.totalUnitsSold || 0,                                color: "text-gray-900" },
              { label: "Stock In",    value: `+${summary.totalStockIn || 0}`,                            color: "text-green-600" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border px-3 py-2.5">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
                <p className={`text-base font-bold ${s.color} leading-tight`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="px-3 pt-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3 h-9 bg-gray-100 rounded-xl p-1">
              <TabsTrigger value="stock-in"  className="text-xs rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Stock In</TabsTrigger>
              <TabsTrigger value="sales"     className="text-xs rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Sales</TabsTrigger>
              <TabsTrigger value="bad-stock" className="text-xs rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Bad Stock</TabsTrigger>
            </TabsList>

            {/* ── Stock In tab ── */}
            <TabsContent value="stock-in" className="mt-3">
              {purchasesLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-7 h-7 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
                </div>
              ) : purchases.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No stock-in records for this period</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border overflow-hidden">
                  {purchases.map((p: any, i: number) => (
                    <div key={p.purchaseNo || p.receiptNo || i} className="flex items-center justify-between px-3 py-2.5 border-b last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono text-gray-500">{p.purchaseNo || p.receiptNo || "—"}</p>
                        <p className="text-sm font-medium text-gray-800 truncate">{p.supplier || "Direct"}</p>
                        <p className="text-[11px] text-gray-400">{fmtDate(p.date)} · <span className="capitalize">{p.paymentType || "cash"}</span></p>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <p className="text-sm font-bold text-green-600">{currency} {parseFloat(p.total || 0).toFixed(2)}</p>
                        <p className="text-[11px] text-gray-400">{p.units || 1} unit{(p.units || 1) !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  ))}
                  <PaginationBar />
                </div>
              )}
            </TabsContent>

            {/* ── Sales tab ── */}
            <TabsContent value="sales" className="mt-3">
              {salesLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-7 h-7 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
                </div>
              ) : sales.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <TrendingDown className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No sales found for this period</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border overflow-hidden">
                  {sales.map((s: any, i: number) => (
                    <div key={s.receiptNo || i} className="flex items-center justify-between px-3 py-2.5 border-b last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono text-gray-500">{s.receiptNo}</p>
                        <p className="text-sm font-medium text-gray-800 truncate">{s.customer || "Walk-in"}</p>
                        <p className="text-[11px] text-gray-400">{fmtDate(s.date)} · <span className="capitalize">{s.paymentType}</span></p>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <p className="text-sm font-bold text-gray-900">{currency} {parseFloat(s.total).toFixed(2)}</p>
                        <p className="text-[11px] text-gray-400">{s.units} unit{s.units !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  ))}
                  <PaginationBar />
                </div>
              )}
            </TabsContent>

            {/* ── Bad Stock tab ── */}
            <TabsContent value="bad-stock" className="mt-3">
              {badStockLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-7 h-7 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
                </div>
              ) : badStockMovements.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No bad stock for this period</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border overflow-hidden">
                  {badStockMovements.map((m: any, i: number) => (
                    <div key={m._id || i} className="flex items-center justify-between px-3 py-2.5 border-b last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 capitalize">{m.reason || "Bad Stock"}</p>
                        <p className="text-[11px] text-gray-400">{fmtDate(m.createdAt || m.date)} · {m.attendantId?.username || m.performedBy || "System"}</p>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <p className="text-sm font-bold text-red-600">
                          {currency} {(parseFloat(m.unitPrice || 0) * parseInt(m.quantity || 1)).toFixed(2)}
                        </p>
                        <p className="text-[11px] text-red-400">−{m.quantity || 1} unit{(m.quantity || 1) !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  ))}
                  <PaginationBar />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* bottom breathing room */}
        <div className="h-6" />
      </div>

      {/* ── Desktop layout ─────────────────────────────────────────────── */}
      <div className="hidden lg:block space-y-5">
        <PageHeader
          title={productName}
          subtitle={`${MONTHS[selectedMonth - 1]} ${selectedYear}`}
          onBack={handleGoBack}
          actions={<MonthSelector />}
        />

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Sales", value: `${currency} ${summary.totalSales?.toFixed(2) || "0.00"}`, color: "text-gray-900" },
              { label: "Units Sold",  value: summary.totalUnitsSold || 0,                                color: "text-gray-900" },
              { label: "Stock In",    value: `+${summary.totalStockIn || 0}`,                            color: "text-green-600" },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="p-5">
                  <p className="text-sm font-medium text-gray-600">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tabbed history */}
        <Card>
          <CardHeader><h2 className="text-xl font-semibold">Product History</h2></CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 bg-muted">
                <TabsTrigger value="stock-in"  className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Stock In</TabsTrigger>
                <TabsTrigger value="sales"     className="flex items-center gap-2"><TrendingDown className="h-4 w-4" /> Sales</TabsTrigger>
                <TabsTrigger value="bad-stock" className="flex items-center gap-2"><Package className="h-4 w-4" /> Bad Stock</TabsTrigger>
              </TabsList>

              {/* Stock In desktop table */}
              <TabsContent value="stock-in" className="space-y-4">
                {purchasesLoading ? (
                  <div className="text-center py-8 text-gray-500"><div className="w-8 h-8 border-4 border-gray-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" /><p>Loading…</p></div>
                ) : purchases.length === 0 ? (
                  <div className="text-center py-8 text-gray-500"><TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No purchases found for this period</p></div>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full">
                      <thead><tr className="border-b bg-gray-50">
                        <th className="text-left p-4 font-medium">Receipt No</th>
                        <th className="text-left p-4 font-medium">Supplier</th>
                        <th className="text-left p-4 font-medium">Date</th>
                        <th className="text-left p-4 font-medium">Payment</th>
                        <th className="text-right p-4 font-medium">Units</th>
                        <th className="text-right p-4 font-medium">Unit Price</th>
                        <th className="text-right p-4 font-medium">Total</th>
                      </tr></thead>
                      <tbody>
                        {purchases.map((p: any, i: number) => (
                          <tr key={p.purchaseNo || p.receiptNo || i} className="border-b hover:bg-gray-50">
                            <td className="p-4 font-mono text-sm">{p.purchaseNo || p.receiptNo || "—"}</td>
                            <td className="p-4">{p.supplier || "Direct"}</td>
                            <td className="p-4 text-sm">{fmtDate(p.date)}</td>
                            <td className="p-4 capitalize">{p.paymentType || "cash"}</td>
                            <td className="p-4 text-right">{p.units || 1}</td>
                            <td className="p-4 text-right">{currency} {parseFloat(p.unitPrice || p.unitCost || 0).toFixed(2)}</td>
                            <td className="p-4 text-right font-medium">{currency} {parseFloat(p.total || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <PaginationBar />
                  </div>
                )}
              </TabsContent>

              {/* Sales desktop table */}
              <TabsContent value="sales" className="space-y-4">
                {salesLoading ? (
                  <div className="text-center py-8 text-gray-500"><div className="w-8 h-8 border-4 border-gray-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" /><p>Loading…</p></div>
                ) : sales.length === 0 ? (
                  <div className="text-center py-8 text-gray-500"><TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No sales found for this period</p></div>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full">
                      <thead><tr className="border-b bg-gray-50">
                        <th className="text-left p-4 font-medium">Receipt No</th>
                        <th className="text-left p-4 font-medium">Customer</th>
                        <th className="text-left p-4 font-medium">Date</th>
                        <th className="text-left p-4 font-medium">Payment</th>
                        <th className="text-right p-4 font-medium">Units</th>
                        <th className="text-right p-4 font-medium">Unit Price</th>
                        <th className="text-right p-4 font-medium">Total</th>
                      </tr></thead>
                      <tbody>
                        {sales.map((s: any, i: number) => (
                          <tr key={s.receiptNo || i} className="border-b hover:bg-gray-50">
                            <td className="p-4 font-mono text-sm">{s.receiptNo}</td>
                            <td className="p-4">{s.customer || "Walk-in"}</td>
                            <td className="p-4 text-sm">{fmtDate(s.date)}</td>
                            <td className="p-4 capitalize">{s.paymentType}</td>
                            <td className="p-4 text-right">{s.units}</td>
                            <td className="p-4 text-right">{currency} {parseFloat(s.unitPrice).toFixed(2)}</td>
                            <td className="p-4 text-right font-medium">{currency} {parseFloat(s.total).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <PaginationBar />
                  </div>
                )}
              </TabsContent>

              {/* Bad Stock desktop table */}
              <TabsContent value="bad-stock" className="space-y-4">
                {badStockLoading ? (
                  <div className="text-center py-8 text-gray-500"><div className="w-8 h-8 border-4 border-gray-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" /><p>Loading…</p></div>
                ) : badStockMovements.length === 0 ? (
                  <div className="text-center py-8 text-gray-500"><Package className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No bad stock movements found for this period</p></div>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full">
                      <thead><tr className="border-b bg-gray-50">
                        <th className="text-left p-4 font-medium">Date</th>
                        <th className="text-left p-4 font-medium">Reason</th>
                        <th className="text-left p-4 font-medium">Performed By</th>
                        <th className="text-right p-4 font-medium">Qty</th>
                        <th className="text-right p-4 font-medium">Unit Price</th>
                        <th className="text-right p-4 font-medium">Total Loss</th>
                      </tr></thead>
                      <tbody>
                        {badStockMovements.map((m: any, i: number) => (
                          <tr key={m._id || i} className="border-b hover:bg-gray-50">
                            <td className="p-4 text-sm">{fmtDate(m.createdAt || m.date)}</td>
                            <td className="p-4 capitalize">{m.reason || "Bad Stock"}</td>
                            <td className="p-4">{m.attendantId?.username || m.performedBy || "System"}</td>
                            <td className="p-4 text-right text-red-600 font-medium">-{m.quantity || 1}</td>
                            <td className="p-4 text-right">{currency} {parseFloat(m.unitPrice || 0).toFixed(2)}</td>
                            <td className="p-4 text-right font-medium text-red-600">
                              {currency} {(parseFloat(m.unitPrice || 0) * parseInt(m.quantity || 1)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <PaginationBar />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

    </DashboardLayout>
  );
}

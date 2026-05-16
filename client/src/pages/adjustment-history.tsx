import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChevronLeft, Calendar, SlidersHorizontal, RefreshCw, Download, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

export default function AdjustmentHistoryPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { selectedShopId } = useSelector((state: RootState) => state.shop);

  const pathParts = location.split('/');
  const productId = pathParts[pathParts.indexOf('adjustment-history') + 1];

  const [product, setProduct] = useState<any>(null);
  const [adjustmentHistory, setAdjustmentHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Pending filter values (only applied on Apply)
  const [pendingType, setPendingType] = useState("all");
  const [pendingFrom, setPendingFrom] = useState("");
  const [pendingTo, setPendingTo] = useState("");

  const isAttendant = location.startsWith("/attendant/");

  const getShopId = () => {
    if (selectedShopId) return selectedShopId;
    if (isAttendant) {
      const attendantData = localStorage.getItem("attendantData");
      if (attendantData) {
        try {
          const parsed = JSON.parse(attendantData);
          return typeof parsed.shopId === "string" ? parsed.shopId : parsed.shopId?._id;
        } catch { return null; }
      }
      return null;
    }
    const adminData = localStorage.getItem("adminData");
    if (adminData) {
      try {
        const parsed = JSON.parse(adminData);
        return parsed.primaryShop?._id || parsed.primaryShop;
      } catch { return null; }
    }
    return null;
  };

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/product/${productId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('attendantToken')}` }
      });
      if (res.ok) setProduct(await res.json());
    } catch (e) { console.error('Error fetching product:', e); }
  };

  const fetchAdjustmentHistory = async () => {
    setIsLoading(true);
    try {
      const shopId = getShopId();
      const endDate = toDate || new Date().toISOString().split('T')[0];
      const startDate = fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const params = new URLSearchParams({ shopId, fromDate: startDate, toDate: endDate, page: "1", limit: "100", ...(filterType !== "all" && { type: filterType }) });
      const res = await fetch(`/api/product/adjust/history/${productId}?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('attendantToken')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      let historyData = data.data || data.adjustments || data || [];
      if (!Array.isArray(historyData)) historyData = [];
      setAdjustmentHistory(historyData);
    } catch (e) {
      console.error('Error fetching adjustment history:', e);
      toast({ title: "Error", description: "Failed to load adjustment history", variant: "destructive" });
      setAdjustmentHistory([]);
    } finally { setIsLoading(false); }
  };

  const exportToCsv = () => {
    const headers = ['Date', 'Type', 'Before', 'After', 'Change'];
    const rows = adjustmentHistory.map(a => {
      const before = a.before || a.previousQuantity || 0;
      const after = a.after || a.newQuantity || a.currentQuantity || 0;
      const change = after - before;
      const date = (a.date || a.createdAt || a.timestamp) ? new Date(a.date || a.createdAt || a.timestamp).toLocaleString() : 'N/A';
      return [date, change > 0 ? 'Stock In' : 'Stock Out', before, after, Math.abs(change)];
    });
    const csv = [headers, ...rows].map(r => r.map(f => `"${f}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${product?.name || 'product'}_adjustments_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast({ title: "Exported", description: "Adjustment history exported to CSV" });
  };

  const goBack = () => window.history.back();

  const openFilterSheet = () => {
    setPendingType(filterType);
    setPendingFrom(fromDate);
    setPendingTo(toDate);
    setFilterSheetOpen(true);
  };

  const applyFilters = () => {
    setFilterType(pendingType);
    setFromDate(pendingFrom);
    setToDate(pendingTo);
    setFilterSheetOpen(false);
  };

  const clearFilters = () => {
    setPendingType("all");
    setPendingFrom("");
    setPendingTo("");
  };

  const activeFilterCount = [filterType !== "all", !!fromDate, !!toDate].filter(Boolean).length;

  const fmtDate = (raw: any) => {
    if (!raw) return "—";
    const d = new Date(raw);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  useEffect(() => {
    if (productId) { fetchProduct(); fetchAdjustmentHistory(); }
  }, [productId, filterType, fromDate, toDate]);

  return (
    <DashboardLayout>

      {/* ── MOBILE ── */}
      <div className="lg:hidden min-h-screen bg-gray-50">

        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white border-b px-3 py-3 flex items-center gap-2">
          <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 leading-none">Adjustment History</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{product?.name || "Product"}</p>
          </div>
          <button onClick={openFilterSheet} className="relative p-2 rounded-lg hover:bg-gray-100">
            <SlidersHorizontal className="w-4.5 h-4.5 text-gray-600" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-purple-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
          <button onClick={fetchAdjustmentHistory} disabled={isLoading} className="p-2 rounded-lg hover:bg-gray-100">
            <RefreshCw className={`w-4 h-4 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={exportToCsv} disabled={adjustmentHistory.length === 0} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40">
            <Download className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex gap-2 px-3 py-2 bg-white border-b overflow-x-auto">
            {filterType !== "all" && (
              <span className="shrink-0 inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 rounded-full px-2.5 py-1">
                {filterType === "add" ? "Stock In" : "Stock Out"}
              </span>
            )}
            {fromDate && <span className="shrink-0 inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 rounded-full px-2.5 py-1">From {fromDate}</span>}
            {toDate && <span className="shrink-0 inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 rounded-full px-2.5 py-1">To {toDate}</span>}
          </div>
        )}

        {/* Product info */}
        {product && (
          <div className="grid grid-cols-3 gap-2 px-3 pt-3">
            {[
              { label: "Current Stock", value: product.quantity || 0, color: "text-gray-900" },
              { label: "Category", value: product.productCategoryId?.name || "Uncategorized", color: "text-gray-700" },
              { label: "Type", value: product.virtual ? "Service" : "Physical", color: "text-gray-700" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border px-3 py-2.5">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
                <p className={`text-sm font-bold ${s.color} leading-tight truncate`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Records count */}
        <div className="flex items-center justify-between px-3 pt-4 pb-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Records</p>
          <span className="text-xs text-gray-400">{adjustmentHistory.length} total</span>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : adjustmentHistory.length === 0 ? (
          <div className="text-center py-16 text-gray-400 px-6">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No adjustment records found</p>
            <p className="text-xs mt-1">Try changing the date range or filters</p>
          </div>
        ) : (
          <div className="px-3 pb-6 space-y-2">
            {adjustmentHistory.map((a: any, i: number) => {
              const before = a.before || a.previousQuantity || 0;
              const after = a.after || a.newQuantity || a.currentQuantity || 0;
              const change = after - before;
              const isIn = change > 0;
              return (
                <div key={i} className="bg-white rounded-xl border px-3 py-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isIn ? 'bg-green-100' : 'bg-red-100'}`}>
                    {isIn
                      ? <TrendingUp className="w-4 h-4 text-green-600" />
                      : <TrendingDown className="w-4 h-4 text-red-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${isIn ? 'text-green-600' : 'text-red-600'}`}>
                        {isIn ? "Stock In" : "Stock Out"}
                      </span>
                      <span className={`text-sm font-bold ${isIn ? 'text-green-600' : 'text-red-600'}`}>
                        {isIn ? '+' : ''}{change}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(a.date || a.createdAt || a.timestamp)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">{before} → {after}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Before → After</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Filter bottom sheet */}
        <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
          <SheetContent side="bottom" className="p-0 rounded-t-3xl">
            <SheetHeader className="px-5 pt-4 pb-3 border-b">
              <SheetTitle className="text-base">Filter Records</SheetTitle>
            </SheetHeader>
            <div className="px-5 pt-4 pb-2 space-y-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={pendingType} onValueChange={setPendingType}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="add">Stock In (Add)</SelectItem>
                    <SelectItem value="remove">Stock Out (Remove)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>From Date</Label>
                <input
                  type="date"
                  value={pendingFrom}
                  onChange={(e) => setPendingFrom(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label>To Date</Label>
                <input
                  type="date"
                  value={pendingTo}
                  onChange={(e) => setPendingTo(e.target.value)}
                  className="w-full h-11 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4">
              <button onClick={clearFilters} className="flex-1 h-11 rounded-xl border border-gray-300 text-sm font-medium text-gray-700">
                Clear
              </button>
              <button onClick={applyFilters} className="flex-1 h-11 rounded-xl bg-purple-600 text-white text-sm font-semibold">
                Apply Filters
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* ── DESKTOP ── */}
      <div className="hidden lg:block space-y-5">
        <PageHeader
          title="Adjustment History"
          subtitle={product?.name || 'Product'}
          onBack={goBack}
          actions={<>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={fetchAdjustmentHistory} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />Refresh
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportToCsv} disabled={adjustmentHistory.length === 0}>
              <Download className="h-3.5 w-3.5 mr-1" />CSV
            </Button>
          </>}
        />

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">From Date</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">To Date</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Filter by Type</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="add">Stock In (Add)</SelectItem>
                    <SelectItem value="remove">Stock Out (Remove)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Info */}
        {product && (
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Product Name</p>
                  <p className="font-semibold">{product.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Stock</p>
                  <p className="font-semibold">{product.quantity || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <p className="font-semibold">{product.productCategoryId?.name || 'Uncategorized'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <Badge variant={product.virtual ? "secondary" : "default"}>
                    {product.virtual ? 'Service' : 'Physical'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Adjustment Records</span>
              <Badge variant="outline">{adjustmentHistory.length} records</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center text-gray-500 py-12">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
                  <span>Loading adjustment history…</span>
                </div>
              </div>
            ) : adjustmentHistory.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No adjustment history found</p>
                <p className="text-sm">Try adjusting the date range or filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-medium text-gray-700">Date</th>
                      <th className="text-left p-3 font-medium text-gray-700">Type</th>
                      <th className="text-left p-3 font-medium text-gray-700">Before</th>
                      <th className="text-left p-3 font-medium text-gray-700">After</th>
                      <th className="text-left p-3 font-medium text-gray-700">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adjustmentHistory.map((a: any, i: number) => {
                      const before = a.before || a.previousQuantity || 0;
                      const after = a.after || a.newQuantity || a.currentQuantity || 0;
                      const change = after - before;
                      return (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-sm">{fmtDate(a.date || a.createdAt || a.timestamp)}</td>
                          <td className="p-3 text-sm">
                            <Badge variant={change > 0 ? 'default' : 'destructive'}>{change > 0 ? 'Stock In' : 'Stock Out'}</Badge>
                          </td>
                          <td className="p-3 text-sm">{before}</td>
                          <td className="p-3 text-sm">{after}</td>
                          <td className="p-3 text-sm">
                            <span className={change > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                              {change > 0 ? '+' : ''}{change}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

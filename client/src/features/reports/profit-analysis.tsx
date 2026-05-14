import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Download, Eye, FileText, Calendar, Filter, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { RootState } from '@/store';
import { useNavigationRoute } from '@/lib/navigation-utils';
import { useAttendantAuth } from '@/contexts/AttendantAuthContext';
import { usePrimaryShop } from '@/hooks/usePrimaryShop';
import DashboardLayout from '@/components/layout/dashboard-layout';

interface NetProfitData {
  creditTotals: number;
  debtPaid: number;
  totalProfitAndSalesValue: {
    totalProfit: number;
    totalCashSales: number;
    totalSales: number;
    totalPurchases: number;
    totalTaxes: number;
  };
  badStockValue: { badStockValue: number };
  totalExpenses: { totalExpenses: number };
  totalTaxes: number;
  gross: number;
  net: number;
}

interface ProductProfit {
  _id?: string;
  productId?: string;
  productName?: string;
  name?: string;
  category?: string;
  totalSales?: number;
  totalRevenue?: number;
  totalCost?: number;
  grossProfit?: number;
  profit?: number;
  profitMargin?: number;
  margin?: number;
  unitsSold?: number;
  quantity?: number;
}

// Date range helpers
const today = () => new Date().toISOString().split('T')[0];
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};
const yesterday = () => daysAgo(1);

export default function ProfitAnalysis() {
  const { selectedShopId } = useSelector((state: RootState) => state.shop);
  const { user } = useSelector((state: RootState) => state.auth);
  const { attendant } = useAttendantAuth();
  const { shopId: primaryShopId } = usePrimaryShop();

  const effectiveShopId = selectedShopId ||
    (attendant ? (typeof attendant.shopId === 'string' ? attendant.shopId : attendant.shopId._id) : primaryShopId);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('grossProfit');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('7days');

  const reportsRoute = useNavigationRoute('reports');

  const periodRange = (period: string) => {
    switch (period) {
      case 'today':     return { from: today(), to: today() };
      case 'yesterday': return { from: yesterday(), to: yesterday() };
      case '7days':     return { from: daysAgo(6), to: today() };
      case '30days':    return { from: daysAgo(29), to: today() };
      case '90days':    return { from: daysAgo(89), to: today() };
      default:          return { from: daysAgo(6), to: today() };
    }
  };

  const { from, to } = periodRange(selectedPeriod);

  const buildNetProfitUrl = (fromDate: string, toDate: string) => {
    const p = new URLSearchParams({ shopId: effectiveShopId || '', fromDate, toDate });
    return `/api/analysis/netprofit?${p}`;
  };

  // Main period query (used for summary cards)
  const { data: mainData, isLoading: mainLoading } = useQuery<NetProfitData>({
    queryKey: [buildNetProfitUrl(from, to)],
    enabled: !!effectiveShopId,
    staleTime: 60_000,
  });

  // Product profit query
  const { data: productData, isLoading: productLoading } = useQuery<ProductProfit[] | any>({
    queryKey: ['/api/analysis/profit', effectiveShopId, from, to],
    queryFn: async () => {
      const p = new URLSearchParams({ shopId: effectiveShopId || '', fromDate: from, toDate: to });
      const token = localStorage.getItem('token') || localStorage.getItem('attendantToken');
      const res = await fetch(`/api/analysis/profit?${p}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch profit data');
      return res.json();
    },
    enabled: !!effectiveShopId,
    staleTime: 60_000,
  });

  // Periods queries — 4 fixed named hooks (no hooks in loops)
  const periodDefs = [
    { label: 'Today',        from: today(),     to: today()     },
    { label: 'Yesterday',    from: yesterday(), to: yesterday() },
    { label: 'Last 7 Days',  from: daysAgo(6),  to: today()     },
    { label: 'Last 30 Days', from: daysAgo(29), to: today()     },
  ];
  const pq0 = useQuery<NetProfitData>({ queryKey: [buildNetProfitUrl(periodDefs[0].from, periodDefs[0].to), 'p0'], enabled: !!effectiveShopId, staleTime: 300_000 });
  const pq1 = useQuery<NetProfitData>({ queryKey: [buildNetProfitUrl(periodDefs[1].from, periodDefs[1].to), 'p1'], enabled: !!effectiveShopId, staleTime: 300_000 });
  const pq2 = useQuery<NetProfitData>({ queryKey: [buildNetProfitUrl(periodDefs[2].from, periodDefs[2].to), 'p2'], enabled: !!effectiveShopId, staleTime: 300_000 });
  const pq3 = useQuery<NetProfitData>({ queryKey: [buildNetProfitUrl(periodDefs[3].from, periodDefs[3].to), 'p3'], enabled: !!effectiveShopId, staleTime: 300_000 });
  const periodQueries = [pq0, pq1, pq2, pq3];

  const formatCurrency = (n: number | undefined | null) => {
    if (n == null || isNaN(n)) return 'KES 0';
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  };

  // Normalise product data — the API may return various shapes
  const rawProducts: ProductProfit[] = Array.isArray(productData)
    ? productData
    : productData?.data
      ? productData.data
      : productData?.products
        ? productData.products
        : [];

  const products = rawProducts.map((p) => ({
    id: p._id || p.productId || Math.random().toString(),
    name: p.productName || p.name || 'Unknown',
    category: p.category || '—',
    totalSales: p.totalRevenue ?? p.totalSales ?? 0,
    totalCost: p.totalCost ?? 0,
    grossProfit: p.grossProfit ?? p.profit ?? 0,
    profitMargin: p.profitMargin ?? p.margin ?? 0,
    unitsSold: p.unitsSold ?? p.quantity ?? 0,
  }));

  const filteredProducts = products
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const m = sortOrder === 'desc' ? -1 : 1;
      if (sortBy === 'grossProfit')   return (a.grossProfit - b.grossProfit) * m;
      if (sortBy === 'profitMargin')  return (a.profitMargin - b.profitMargin) * m;
      if (sortBy === 'totalSales')    return (a.totalSales - b.totalSales) * m;
      if (sortBy === 'unitsSold')     return (a.unitsSold - b.unitsSold) * m;
      return 0;
    });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  const filtersActive = sortBy !== 'grossProfit' || sortOrder !== 'desc';

  // Summary totals from main query
  const totalRevenue  = mainData?.totalProfitAndSalesValue?.totalSales ?? 0;
  const totalCost     = mainData?.totalProfitAndSalesValue?.totalPurchases ?? 0;
  const grossProfit   = mainData?.gross ?? 0;
  const netProfit     = mainData?.net ?? 0;
  const totalExpenses = mainData?.totalExpenses?.totalExpenses ?? 0;

  const exportToCSV = () => {
    const rows = [
      ['Product', 'Category', 'Sales', 'Costs', 'Gross Profit', 'Margin %', 'Units'],
      ...filteredProducts.map(p => [p.name, p.category, p.totalSales, p.totalCost, p.grossProfit, p.profitMargin.toFixed(1), p.unitsSold]),
    ].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }));
    a.download = 'profit-analysis.csv';
    a.click();
  };

  return (
    <DashboardLayout title="Profit Analysis">
      <div className="space-y-3 pb-24 lg:pb-6">
        <PageHeader title="Profit Analysis" backHref={reportsRoute} />

        {/* Period selector */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {[
            { key: 'today',   label: 'Today'   },
            { key: 'yesterday', label: 'Yesterday' },
            { key: '7days',   label: '7 Days'  },
            { key: '30days',  label: '30 Days' },
            { key: '90days',  label: '90 Days' },
          ].map(p => (
            <Button
              key={p.key}
              variant={selectedPeriod === p.key ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs px-3 shrink-0"
              onClick={() => { setSelectedPeriod(p.key); setCurrentPage(1); }}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Summary stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <Card>
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground">Revenue</p>
              {mainLoading ? <div className="h-4 w-20 bg-muted animate-pulse rounded mt-1" /> : <p className="text-sm font-bold truncate">{formatCurrency(totalRevenue)}</p>}
              <p className="text-[10px] text-muted-foreground">{filteredProducts.length} products</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground">Gross Profit</p>
              {mainLoading ? <div className="h-4 w-20 bg-muted animate-pulse rounded mt-1" /> : <p className="text-sm font-bold text-green-600 truncate">{formatCurrency(grossProfit)}</p>}
              <p className="text-[10px] text-muted-foreground">{totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0'}% margin</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground">Net Profit</p>
              {mainLoading ? <div className="h-4 w-20 bg-muted animate-pulse rounded mt-1" /> : <p className={`text-sm font-bold truncate ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(netProfit)}</p>}
              <p className="text-[10px] text-muted-foreground">After expenses</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground">Expenses</p>
              {mainLoading ? <div className="h-4 w-20 bg-muted animate-pulse rounded mt-1" /> : <p className="text-sm font-bold text-red-600 truncate">{formatCurrency(totalExpenses)}</p>}
              <p className="text-[10px] text-muted-foreground">Total costs</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="products" className="space-y-3">
          <TabsList className="h-9 w-full grid grid-cols-3">
            <TabsTrigger value="products" className="text-xs">Products</TabsTrigger>
            <TabsTrigger value="periods" className="text-xs">Periods</TabsTrigger>
            <TabsTrigger value="summary" className="text-xs">Summary</TabsTrigger>
          </TabsList>

          {/* ── Products Tab ── */}
          <TabsContent value="products" className="space-y-3">
            <Card>
              <CardHeader className="py-2.5 px-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="h-8 text-xs flex-1"
                  />
                  {/* Mobile filter sheet */}
                  <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 px-2.5 relative lg:hidden">
                        <Filter className="h-3.5 w-3.5" />
                        {filtersActive && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-500" />}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="rounded-t-2xl pb-8">
                      <SheetHeader className="mb-4">
                        <SheetTitle className="text-sm">Sort Products</SheetTitle>
                      </SheetHeader>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs font-medium mb-1.5 block">Sort By</Label>
                          <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="grossProfit">Gross Profit</SelectItem>
                              <SelectItem value="profitMargin">Margin %</SelectItem>
                              <SelectItem value="totalSales">Sales</SelectItem>
                              <SelectItem value="unitsSold">Units Sold</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs font-medium mb-1.5 block">Order</Label>
                          <div className="flex gap-2">
                            <Button variant={sortOrder === 'desc' ? 'default' : 'outline'} size="sm" className="flex-1 h-9" onClick={() => setSortOrder('desc')}>↓ High–Low</Button>
                            <Button variant={sortOrder === 'asc' ? 'default' : 'outline'} size="sm" className="flex-1 h-9" onClick={() => setSortOrder('asc')}>↑ Low–High</Button>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button variant="outline" className="flex-1 h-9" onClick={() => { setSortBy('grossProfit'); setSortOrder('desc'); }}>Reset</Button>
                          <Button className="flex-1 h-9" onClick={() => setFilterSheetOpen(false)}>Apply</Button>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>

                  {/* Desktop controls */}
                  <div className="hidden lg:flex items-center gap-2">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grossProfit">Gross Profit</SelectItem>
                        <SelectItem value="profitMargin">Margin %</SelectItem>
                        <SelectItem value="totalSales">Sales</SelectItem>
                        <SelectItem value="unitsSold">Units Sold</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}>
                      {sortOrder === 'desc' ? '↓ High–Low' : '↑ Low–High'}
                    </Button>
                  </div>

                  <div className="flex gap-1 ml-auto">
                    <Button onClick={exportToCSV} variant="outline" size="sm" className="h-8 text-xs px-2">
                      <Download className="h-3 w-3 lg:mr-1" /><span className="hidden lg:inline">CSV</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {productLoading ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />Loading product data...
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground">
                    {products.length === 0 ? 'No product profit data available for this period' : 'No products match your search'}
                  </div>
                ) : (
                  <>
                    {/* Mobile cards */}
                    <div className="divide-y lg:hidden">
                      {paginatedProducts.map((item) => (
                        <div key={item.id} className="px-3 py-3">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{item.name}</p>
                              <p className="text-[11px] text-muted-foreground">{item.category}</p>
                            </div>
                            {item.profitMargin > 0 && (
                              <Badge
                                variant={item.profitMargin >= 40 ? 'default' : item.profitMargin >= 20 ? 'secondary' : 'destructive'}
                                className="text-[10px] shrink-0"
                              >
                                {item.profitMargin.toFixed(1)}%
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-[10px] text-muted-foreground">Sales</p>
                              <p className="font-medium">{formatCurrency(item.totalSales)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">Profit</p>
                              <p className={`font-medium ${item.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(item.grossProfit)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-muted-foreground">Units</p>
                              <p>{item.unitsSold}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden lg:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="text-xs py-2">Product</TableHead>
                            <TableHead className="text-xs py-2">Category</TableHead>
                            <TableHead className="text-xs py-2 text-right">Sales</TableHead>
                            <TableHead className="text-xs py-2 text-right">Costs</TableHead>
                            <TableHead className="text-xs py-2 text-right">Gross Profit</TableHead>
                            <TableHead className="text-xs py-2 text-right">Margin</TableHead>
                            <TableHead className="text-xs py-2 text-right">Units</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedProducts.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="py-2 text-xs font-medium">{item.name}</TableCell>
                              <TableCell className="py-2">
                                <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                              </TableCell>
                              <TableCell className="py-2 text-right text-xs">{formatCurrency(item.totalSales)}</TableCell>
                              <TableCell className="py-2 text-right text-xs text-red-600">{formatCurrency(item.totalCost)}</TableCell>
                              <TableCell className="py-2 text-right text-xs font-medium text-green-600">{formatCurrency(item.grossProfit)}</TableCell>
                              <TableCell className="py-2 text-right">
                                {item.profitMargin > 0 && (
                                  <Badge variant={item.profitMargin >= 40 ? 'default' : item.profitMargin >= 20 ? 'secondary' : 'destructive'} className="text-[10px]">
                                    {item.profitMargin.toFixed(1)}%
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="py-2 text-right text-xs">{item.unitsSold}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {filteredProducts.length > itemsPerPage && (
                      <div className="flex items-center justify-between px-3 py-3 border-t">
                        <p className="text-[11px] text-muted-foreground">
                          {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredProducts.length)} of {filteredProducts.length}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                            <ChevronLeft className="h-3.5 w-3.5" />Prev
                          </Button>
                          <span className="text-xs text-muted-foreground">{currentPage}/{totalPages}</span>
                          <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
                            Next<ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Periods Tab ── */}
          <TabsContent value="periods" className="space-y-3">
            <Card>
              <CardHeader className="py-2.5 px-3">
                <CardTitle className="text-sm">Period Comparison</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Mobile cards */}
                <div className="divide-y lg:hidden">
                  {periodDefs.map((pd, i) => {
                    const d = periodQueries[i].data;
                    const loading = periodQueries[i].isLoading;
                    const rev   = d?.totalProfitAndSalesValue?.totalSales ?? 0;
                    const gross = d?.gross ?? 0;
                    const net   = d?.net ?? 0;
                    const margin = rev > 0 ? (gross / rev) * 100 : 0;
                    return (
                      <div key={pd.label} className="px-3 py-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-semibold">{pd.label}</p>
                          {loading
                            ? <div className="h-5 w-12 bg-muted animate-pulse rounded-full" />
                            : <Badge variant={margin >= 30 ? 'default' : margin >= 15 ? 'secondary' : 'destructive'} className="text-[10px]">{margin.toFixed(1)}%</Badge>
                          }
                        </div>
                        {loading ? (
                          <div className="space-y-1.5">
                            <div className="h-3 w-full bg-muted animate-pulse rounded" />
                            <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <div className="flex justify-between"><span className="text-muted-foreground">Revenue</span><span className="font-medium">{formatCurrency(rev)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Net Profit</span><span className={`font-semibold ${net >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatCurrency(net)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Gross</span><span className="text-green-600">{formatCurrency(gross)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Expenses</span><span className="text-red-600">{formatCurrency(d?.totalExpenses?.totalExpenses ?? 0)}</span></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table */}
                <div className="hidden lg:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="text-xs py-2">Period</TableHead>
                        <TableHead className="text-xs py-2 text-right">Revenue</TableHead>
                        <TableHead className="text-xs py-2 text-right">Gross Profit</TableHead>
                        <TableHead className="text-xs py-2 text-right">Expenses</TableHead>
                        <TableHead className="text-xs py-2 text-right">Net Profit</TableHead>
                        <TableHead className="text-xs py-2 text-right">Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periodDefs.map((pd, i) => {
                        const d = periodQueries[i].data;
                        const loading = periodQueries[i].isLoading;
                        const rev = d?.totalProfitAndSalesValue?.totalSales ?? 0;
                        const gross = d?.gross ?? 0;
                        const net = d?.net ?? 0;
                        const exp = d?.totalExpenses?.totalExpenses ?? 0;
                        const margin = rev > 0 ? (gross / rev) * 100 : 0;
                        const cell = (content: React.ReactNode) =>
                          loading ? <div className="h-3 w-16 bg-muted animate-pulse rounded inline-block" /> : content;
                        return (
                          <TableRow key={pd.label}>
                            <TableCell className="py-2 text-xs font-medium">{pd.label}</TableCell>
                            <TableCell className="py-2 text-right text-xs">{cell(formatCurrency(rev))}</TableCell>
                            <TableCell className="py-2 text-right text-xs text-green-600 font-medium">{cell(formatCurrency(gross))}</TableCell>
                            <TableCell className="py-2 text-right text-xs text-red-600">{cell(formatCurrency(exp))}</TableCell>
                            <TableCell className="py-2 text-right text-xs font-bold text-green-700">{cell(formatCurrency(net))}</TableCell>
                            <TableCell className="py-2 text-right">
                              {loading
                                ? <div className="h-5 w-12 bg-muted animate-pulse rounded-full inline-block" />
                                : <Badge variant={margin >= 30 ? 'default' : margin >= 15 ? 'secondary' : 'destructive'} className="text-[10px]">{margin.toFixed(1)}%</Badge>
                              }
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Summary Tab ── */}
          <TabsContent value="summary" className="space-y-3">
            {mainLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />Loading...
              </div>
            ) : mainData ? (
              <div className="space-y-3">
                <Card>
                  <CardHeader className="py-2.5 px-3">
                    <CardTitle className="text-sm">Income Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 pt-0 space-y-2">
                    {[
                      { label: 'Total Sales',       value: mainData.totalProfitAndSalesValue?.totalSales,       color: '' },
                      { label: 'Cash Sales',        value: mainData.totalProfitAndSalesValue?.totalCashSales,   color: 'text-green-600' },
                      { label: 'Credit Sales',      value: mainData.creditTotals,                               color: 'text-blue-600' },
                      { label: 'Debt Collected',    value: mainData.debtPaid,                                   color: 'text-purple-600' },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center py-1.5 border-b last:border-0">
                        <span className="text-xs text-muted-foreground">{row.label}</span>
                        <span className={`text-sm font-semibold ${row.color}`}>{formatCurrency(row.value)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-2.5 px-3">
                    <CardTitle className="text-sm">Cost Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 pt-0 space-y-2">
                    {[
                      { label: 'Cost of Goods',  value: mainData.totalProfitAndSalesValue?.totalPurchases,  color: 'text-red-600' },
                      { label: 'Total Expenses', value: mainData.totalExpenses?.totalExpenses,               color: 'text-orange-600' },
                      { label: 'Bad Stock',      value: mainData.badStockValue?.badStockValue,               color: 'text-red-400' },
                      { label: 'Taxes',          value: mainData.totalTaxes,                                 color: 'text-gray-600' },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center py-1.5 border-b last:border-0">
                        <span className="text-xs text-muted-foreground">{row.label}</span>
                        <span className={`text-sm font-semibold ${row.color}`}>{formatCurrency(row.value)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold">Gross Profit</span>
                      <span className={`text-base font-bold ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(grossProfit)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold">Net Profit</span>
                      <span className={`text-base font-bold ${netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatCurrency(netProfit)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-10 text-sm text-muted-foreground">No data available for this period</div>
            )}
          </TabsContent>
        </Tabs>

        {/* Bottom actions */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="h-9 text-xs" onClick={exportToCSV}>
            <Download className="h-3.5 w-3.5 mr-1.5" />Export CSV
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs">
            <Eye className="h-3.5 w-3.5 mr-1.5" />Detailed View
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

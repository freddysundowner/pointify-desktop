import { useState } from 'react';
import { TrendingUp, TrendingDown, Download, Eye, BarChart3, FileText, Calendar, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { useNavigationRoute } from '@/lib/navigation-utils';
import DashboardLayout from '@/components/layout/dashboard-layout';

interface ProfitData {
  id: string;
  productName: string;
  category: string;
  totalSales: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
  unitsSold: number;
  avgSellingPrice: number;
  avgCostPrice: number;
  profitPerUnit: number;
  lastSold: string;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

interface PeriodProfit {
  period: string;
  revenue: number;
  costs: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  expenses: number;
  itemsSold: number;
}

export default function ProfitAnalysis() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('grossProfit');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const profitData: ProfitData[] = [
    { id: '1', productName: 'Premium Coffee Beans', category: 'Beverages', totalSales: 45000, totalCost: 27000, grossProfit: 18000, profitMargin: 40.0, unitsSold: 150, avgSellingPrice: 300, avgCostPrice: 180, profitPerUnit: 120, lastSold: '2025-06-19', trend: 'up', trendPercentage: 12.5 },
    { id: '2', productName: 'Wireless Headphones', category: 'Electronics', totalSales: 85000, totalCost: 55000, grossProfit: 30000, profitMargin: 35.3, unitsSold: 85, avgSellingPrice: 1000, avgCostPrice: 647, profitPerUnit: 353, lastSold: '2025-06-19', trend: 'up', trendPercentage: 8.2 },
    { id: '3', productName: 'Organic Honey', category: 'Food', totalSales: 28000, totalCost: 16800, grossProfit: 11200, profitMargin: 40.0, unitsSold: 140, avgSellingPrice: 200, avgCostPrice: 120, profitPerUnit: 80, lastSold: '2025-06-18', trend: 'stable', trendPercentage: 0.5 },
    { id: '4', productName: 'Designer T-Shirt', category: 'Clothing', totalSales: 36000, totalCost: 21600, grossProfit: 14400, profitMargin: 40.0, unitsSold: 120, avgSellingPrice: 300, avgCostPrice: 180, profitPerUnit: 120, lastSold: '2025-06-18', trend: 'down', trendPercentage: -5.2 },
    { id: '5', productName: 'Smartphone Case', category: 'Electronics', totalSales: 15000, totalCost: 7500, grossProfit: 7500, profitMargin: 50.0, unitsSold: 100, avgSellingPrice: 150, avgCostPrice: 75, profitPerUnit: 75, lastSold: '2025-06-17', trend: 'up', trendPercentage: 15.8 },
    { id: '6', productName: 'Notebook Set', category: 'Stationery', totalSales: 8000, totalCost: 5600, grossProfit: 2400, profitMargin: 30.0, unitsSold: 80, avgSellingPrice: 100, avgCostPrice: 70, profitPerUnit: 30, lastSold: '2025-06-17', trend: 'down', trendPercentage: -3.1 },
  ];

  const periodData: PeriodProfit[] = [
    { period: 'Today', revenue: 35000, costs: 21000, grossProfit: 14000, netProfit: 11500, profitMargin: 32.9, expenses: 2500, itemsSold: 45 },
    { period: 'Yesterday', revenue: 42000, costs: 25200, grossProfit: 16800, netProfit: 14300, profitMargin: 34.0, expenses: 2500, itemsSold: 52 },
    { period: 'Last 7 Days', revenue: 287000, costs: 172200, grossProfit: 114800, netProfit: 97300, profitMargin: 33.9, expenses: 17500, itemsSold: 368 },
    { period: 'Last 30 Days', revenue: 1250000, costs: 750000, grossProfit: 500000, netProfit: 425000, profitMargin: 34.0, expenses: 75000, itemsSold: 1580 },
  ];

  const filteredData = profitData
    .filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = item.productName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      const m = sortOrder === 'desc' ? -1 : 1;
      if (sortBy === 'grossProfit') return (a.grossProfit - b.grossProfit) * m;
      if (sortBy === 'profitMargin') return (a.profitMargin - b.profitMargin) * m;
      if (sortBy === 'totalSales') return (a.totalSales - b.totalSales) * m;
      if (sortBy === 'unitsSold') return (a.unitsSold - b.unitsSold) * m;
      return 0;
    });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const categories = Array.from(new Set(profitData.map(item => item.category)));
  const reportsRoute = useNavigationRoute('reports');

  const totalRevenue = filteredData.reduce((sum, item) => sum + item.totalSales, 0);
  const totalCosts = filteredData.reduce((sum, item) => sum + item.totalCost, 0);
  const totalGrossProfit = totalRevenue - totalCosts;
  const averageProfitMargin = filteredData.length > 0
    ? filteredData.reduce((sum, item) => sum + item.profitMargin, 0) / filteredData.length : 0;

  const filtersActive = selectedCategory !== 'all' || sortBy !== 'grossProfit' || sortOrder !== 'desc';

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-3.5 w-3.5 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
    return <div className="h-3.5 w-3.5 bg-gray-300 rounded-full" />;
  };

  const exportToCSV = () => {
    const csv = [
      ['Product', 'Category', 'Sales', 'Costs', 'Gross Profit', 'Margin %', 'Units Sold', 'Profit/Unit'],
      ...filteredData.map(item => [item.productName, item.category, item.totalSales, item.totalCost, item.grossProfit, item.profitMargin, item.unitsSold, item.profitPerUnit])
    ].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'profit-analysis.csv';
    a.click();
  };

  const exportToPDF = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Profit Analysis</title><style>body{font-family:Arial;margin:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f2f2f2}</style></head><body><h1>Profit Analysis</h1><p>Generated: ${new Date().toLocaleDateString()}</p><table><thead><tr><th>Product</th><th>Category</th><th>Sales</th><th>Gross Profit</th><th>Margin</th><th>Units</th></tr></thead><tbody>${filteredData.map(item => `<tr><td>${item.productName}</td><td>${item.category}</td><td>${formatCurrency(item.totalSales)}</td><td>${formatCurrency(item.grossProfit)}</td><td>${item.profitMargin.toFixed(1)}%</td><td>${item.unitsSold}</td></tr>`).join('')}</tbody></table></body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <DashboardLayout title="Profit Analysis">
      <div className="space-y-3 pb-24 lg:pb-6">
        <PageHeader title="Profit Analysis" backHref={reportsRoute} />

        {/* Summary stat cards — 2×2 on mobile, 4 across on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <Card>
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground">Revenue</p>
              <p className="text-sm font-bold truncate">{formatCurrency(totalRevenue)}</p>
              <p className="text-[10px] text-muted-foreground">{filteredData.length} products</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground">Gross Profit</p>
              <p className="text-sm font-bold text-green-600 truncate">{formatCurrency(totalGrossProfit)}</p>
              <p className="text-[10px] text-muted-foreground">{((totalGrossProfit / totalRevenue) * 100).toFixed(1)}% margin</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground">Total Costs</p>
              <p className="text-sm font-bold text-red-600 truncate">{formatCurrency(totalCosts)}</p>
              <p className="text-[10px] text-muted-foreground">Cost of goods</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground">Avg Margin</p>
              <p className="text-sm font-bold">{averageProfitMargin.toFixed(1)}%</p>
              <p className="text-[10px] text-muted-foreground">All products</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="products" className="space-y-3">
          <TabsList className="h-9 w-full grid grid-cols-3">
            <TabsTrigger value="products" className="text-xs">Products</TabsTrigger>
            <TabsTrigger value="periods" className="text-xs">Periods</TabsTrigger>
            <TabsTrigger value="insights" className="text-xs">Insights</TabsTrigger>
          </TabsList>

          {/* ── Products Tab ── */}
          <TabsContent value="products" className="space-y-3">
            <Card>
              {/* Mobile toolbar: search + filter trigger + exports */}
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
                        <SheetTitle className="text-sm">Filter & Sort</SheetTitle>
                      </SheetHeader>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs font-medium mb-1.5 block">Category</Label>
                          <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setCurrentPage(1); }}>
                            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Categories</SelectItem>
                              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
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
                          <Button variant="outline" className="flex-1 h-9 text-sm" onClick={() => { setSelectedCategory('all'); setSortBy('grossProfit'); setSortOrder('desc'); }}>Reset</Button>
                          <Button className="flex-1 h-9 text-sm" onClick={() => setFilterSheetOpen(false)}>Apply</Button>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>

                  {/* Desktop filter controls */}
                  <div className="hidden lg:flex items-center gap-2">
                    <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setCurrentPage(1); }}>
                      <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
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

                  {/* Export buttons — both mobile and desktop */}
                  <div className="flex gap-1 ml-auto">
                    <Button onClick={exportToCSV} variant="outline" size="sm" className="h-8 text-xs px-2">
                      <Download className="h-3 w-3 lg:mr-1" /><span className="hidden lg:inline">CSV</span>
                    </Button>
                    <Button onClick={exportToPDF} variant="outline" size="sm" className="h-8 text-xs px-2">
                      <FileText className="h-3 w-3 lg:mr-1" /><span className="hidden lg:inline">PDF</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {/* Mobile card list */}
                <div className="divide-y lg:hidden">
                  {paginatedData.map((item) => (
                    <div key={item.id} className="px-3 py-3">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.productName}</p>
                          <p className="text-[11px] text-muted-foreground">{item.category}</p>
                        </div>
                        <Badge
                          variant={item.profitMargin >= 40 ? 'default' : item.profitMargin >= 30 ? 'secondary' : 'destructive'}
                          className="text-[10px] shrink-0"
                        >
                          {item.profitMargin.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Sales</p>
                          <p className="font-medium">{formatCurrency(item.totalSales)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Profit</p>
                          <p className="font-medium text-green-600">{formatCurrency(item.grossProfit)}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <p className="text-[10px] text-muted-foreground">Trend</p>
                          <div className={`flex items-center gap-1 ${item.trend === 'up' ? 'text-green-600' : item.trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                            {getTrendIcon(item.trend)}
                            <span className="text-xs">{item.trendPercentage > 0 ? '+' : ''}{item.trendPercentage}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {paginatedData.length === 0 && (
                    <div className="px-3 py-8 text-center text-sm text-muted-foreground">No products found</div>
                  )}
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
                        <TableHead className="text-xs py-2 text-right">Profit</TableHead>
                        <TableHead className="text-xs py-2 text-right">Margin</TableHead>
                        <TableHead className="text-xs py-2 text-right">Units</TableHead>
                        <TableHead className="text-xs py-2 text-right">Profit/Unit</TableHead>
                        <TableHead className="text-xs py-2 text-right">Trend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="py-2 text-xs font-medium">{item.productName}</TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                          </TableCell>
                          <TableCell className="py-2 text-right text-xs">{formatCurrency(item.totalSales)}</TableCell>
                          <TableCell className="py-2 text-right text-xs text-red-600">{formatCurrency(item.totalCost)}</TableCell>
                          <TableCell className="py-2 text-right text-xs font-medium text-green-600">{formatCurrency(item.grossProfit)}</TableCell>
                          <TableCell className="py-2 text-right">
                            <Badge variant={item.profitMargin >= 40 ? 'default' : item.profitMargin >= 30 ? 'secondary' : 'destructive'} className="text-[10px]">
                              {item.profitMargin.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 text-right text-xs">{item.unitsSold}</TableCell>
                          <TableCell className="py-2 text-right text-xs text-green-600">{formatCurrency(item.profitPerUnit)}</TableCell>
                          <TableCell className="py-2 text-right">
                            <div className={`flex items-center justify-end gap-1 ${item.trend === 'up' ? 'text-green-600' : item.trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                              {getTrendIcon(item.trend)}
                              <span className="text-xs">{item.trendPercentage}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {paginatedData.length === 0 && (
                        <TableRow><TableCell colSpan={9} className="text-center py-8 text-sm text-muted-foreground">No products found</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {filteredData.length > itemsPerPage && (
                  <div className="flex items-center justify-between px-3 py-3 border-t">
                    <p className="text-[11px] text-muted-foreground">
                      {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length}
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Periods Tab ── */}
          <TabsContent value="periods" className="space-y-3">
            <Card>
              <CardHeader className="py-2.5 px-3">
                <CardTitle className="text-sm">Period Profit Analysis</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Mobile cards */}
                <div className="divide-y lg:hidden">
                  {periodData.map((period, i) => (
                    <div key={i} className="px-3 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-semibold">{period.period}</p>
                        <Badge variant={period.profitMargin >= 35 ? 'default' : period.profitMargin >= 25 ? 'secondary' : 'destructive'} className="text-[10px]">
                          {period.profitMargin.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Revenue</span>
                          <span className="font-medium">{formatCurrency(period.revenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Net Profit</span>
                          <span className="font-semibold text-green-700">{formatCurrency(period.netProfit)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Costs</span>
                          <span className="text-red-600">{formatCurrency(period.costs)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Items Sold</span>
                          <span>{period.itemsSold}</span>
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
                        <TableHead className="text-xs py-2">Period</TableHead>
                        <TableHead className="text-xs py-2 text-right">Revenue</TableHead>
                        <TableHead className="text-xs py-2 text-right">Costs</TableHead>
                        <TableHead className="text-xs py-2 text-right">Expenses</TableHead>
                        <TableHead className="text-xs py-2 text-right">Gross Profit</TableHead>
                        <TableHead className="text-xs py-2 text-right">Net Profit</TableHead>
                        <TableHead className="text-xs py-2 text-right">Margin</TableHead>
                        <TableHead className="text-xs py-2 text-right">Items</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periodData.map((period, i) => (
                        <TableRow key={i}>
                          <TableCell className="py-2 text-xs font-medium">{period.period}</TableCell>
                          <TableCell className="py-2 text-right text-xs">{formatCurrency(period.revenue)}</TableCell>
                          <TableCell className="py-2 text-right text-xs text-red-600">{formatCurrency(period.costs)}</TableCell>
                          <TableCell className="py-2 text-right text-xs text-orange-600">{formatCurrency(period.expenses)}</TableCell>
                          <TableCell className="py-2 text-right text-xs text-green-600 font-medium">{formatCurrency(period.grossProfit)}</TableCell>
                          <TableCell className="py-2 text-right text-xs text-green-700 font-bold">{formatCurrency(period.netProfit)}</TableCell>
                          <TableCell className="py-2 text-right">
                            <Badge variant={period.profitMargin >= 35 ? 'default' : period.profitMargin >= 25 ? 'secondary' : 'destructive'} className="text-[10px]">
                              {period.profitMargin.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 text-right text-xs">{period.itemsSold}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Insights Tab ── */}
          <TabsContent value="insights" className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Card>
                <CardHeader className="py-2.5 px-3">
                  <CardTitle className="text-sm text-green-600">Top Performers</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0 divide-y divide-gray-100">
                  <div className="py-2">
                    <p className="text-xs font-medium">Highest Profit Margin</p>
                    <p className="text-xs text-muted-foreground">Smartphone Case (50.0%)</p>
                  </div>
                  <div className="py-2">
                    <p className="text-xs font-medium">Highest Gross Profit</p>
                    <p className="text-xs text-muted-foreground">Wireless Headphones ({formatCurrency(30000)})</p>
                  </div>
                  <div className="py-2">
                    <p className="text-xs font-medium">Best Selling</p>
                    <p className="text-xs text-muted-foreground">Premium Coffee Beans (150 units)</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-2.5 px-3">
                  <CardTitle className="text-sm text-red-600">Areas for Improvement</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0 divide-y divide-gray-100">
                  <div className="py-2">
                    <p className="text-xs font-medium">Lowest Profit Margin</p>
                    <p className="text-xs text-muted-foreground">Notebook Set (30.0%)</p>
                  </div>
                  <div className="py-2">
                    <p className="text-xs font-medium">Declining Trend</p>
                    <p className="text-xs text-muted-foreground">Designer T-Shirt (-5.2%)</p>
                  </div>
                  <div className="py-2">
                    <p className="text-xs font-medium">Low Volume, High Margin</p>
                    <p className="text-xs text-muted-foreground">Consider promoting Smartphone Case</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="sm:col-span-2">
                <CardHeader className="py-2.5 px-3">
                  <CardTitle className="text-sm">Profit Analysis Summary</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-xs font-medium text-green-800">Strong Performance</p>
                      <p className="text-[10px] text-green-600 mt-1">Electronics showing consistent 35%+ margins with strong volume</p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <p className="text-xs font-medium text-yellow-800">Optimization Opportunity</p>
                      <p className="text-[10px] text-yellow-600 mt-1">F&B showing good margins — increase volume through promotions</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs font-medium text-blue-800">Growth Potential</p>
                      <p className="text-[10px] text-blue-600 mt-1">High-margin Smartphone Case has low volume — consider marketing</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Bottom action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="h-9 text-xs" onClick={exportToCSV}>
            <Download className="h-3.5 w-3.5 mr-1.5" />Export Report
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs">
            <Calendar className="h-3.5 w-3.5 mr-1.5" />Schedule
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs">
            <Eye className="h-3.5 w-3.5 mr-1.5" />Detailed View
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

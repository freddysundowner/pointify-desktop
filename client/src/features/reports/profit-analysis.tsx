import { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, Calendar, Filter, Download, Eye, BarChart3, FileText, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from 'wouter';
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
  const [selectedPeriod, setSelectedPeriod] = useState('7days');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('grossProfit');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Mock profit data
  const profitData: ProfitData[] = [
    {
      id: '1',
      productName: 'Premium Coffee Beans',
      category: 'Beverages',
      totalSales: 45000,
      totalCost: 27000,
      grossProfit: 18000,
      profitMargin: 40.0,
      unitsSold: 150,
      avgSellingPrice: 300,
      avgCostPrice: 180,
      profitPerUnit: 120,
      lastSold: '2025-06-19',
      trend: 'up',
      trendPercentage: 12.5
    },
    {
      id: '2',
      productName: 'Wireless Headphones',
      category: 'Electronics',
      totalSales: 85000,
      totalCost: 55000,
      grossProfit: 30000,
      profitMargin: 35.3,
      unitsSold: 85,
      avgSellingPrice: 1000,
      avgCostPrice: 647,
      profitPerUnit: 353,
      lastSold: '2025-06-19',
      trend: 'up',
      trendPercentage: 8.2
    },
    {
      id: '3',
      productName: 'Organic Honey',
      category: 'Food',
      totalSales: 28000,
      totalCost: 16800,
      grossProfit: 11200,
      profitMargin: 40.0,
      unitsSold: 140,
      avgSellingPrice: 200,
      avgCostPrice: 120,
      profitPerUnit: 80,
      lastSold: '2025-06-18',
      trend: 'stable',
      trendPercentage: 0.5
    },
    {
      id: '4',
      productName: 'Designer T-Shirt',
      category: 'Clothing',
      totalSales: 36000,
      totalCost: 21600,
      grossProfit: 14400,
      profitMargin: 40.0,
      unitsSold: 120,
      avgSellingPrice: 300,
      avgCostPrice: 180,
      profitPerUnit: 120,
      lastSold: '2025-06-18',
      trend: 'down',
      trendPercentage: -5.2
    },
    {
      id: '5',
      productName: 'Smartphone Case',
      category: 'Electronics',
      totalSales: 15000,
      totalCost: 7500,
      grossProfit: 7500,
      profitMargin: 50.0,
      unitsSold: 100,
      avgSellingPrice: 150,
      avgCostPrice: 75,
      profitPerUnit: 75,
      lastSold: '2025-06-17',
      trend: 'up',
      trendPercentage: 15.8
    },
    {
      id: '6',
      productName: 'Notebook Set',
      category: 'Stationery',
      totalSales: 8000,
      totalCost: 5600,
      grossProfit: 2400,
      profitMargin: 30.0,
      unitsSold: 80,
      avgSellingPrice: 100,
      avgCostPrice: 70,
      profitPerUnit: 30,
      lastSold: '2025-06-17',
      trend: 'down',
      trendPercentage: -3.1
    }
  ];

  // Mock period data
  const periodData: PeriodProfit[] = [
    {
      period: 'Today',
      revenue: 35000,
      costs: 21000,
      grossProfit: 14000,
      netProfit: 11500,
      profitMargin: 32.9,
      expenses: 2500,
      itemsSold: 45
    },
    {
      period: 'Yesterday',
      revenue: 42000,
      costs: 25200,
      grossProfit: 16800,
      netProfit: 14300,
      profitMargin: 34.0,
      expenses: 2500,
      itemsSold: 52
    },
    {
      period: 'Last 7 Days',
      revenue: 287000,
      costs: 172200,
      grossProfit: 114800,
      netProfit: 97300,
      profitMargin: 33.9,
      expenses: 17500,
      itemsSold: 368
    },
    {
      period: 'Last 30 Days',
      revenue: 1250000,
      costs: 750000,
      grossProfit: 500000,
      netProfit: 425000,
      profitMargin: 34.0,
      expenses: 75000,
      itemsSold: 1580
    }
  ];

  // Filter and sort data
  const filteredData = profitData
    .filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch = item.productName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      const multiplier = sortOrder === 'desc' ? -1 : 1;
      if (sortBy === 'grossProfit') return (a.grossProfit - b.grossProfit) * multiplier;
      if (sortBy === 'profitMargin') return (a.profitMargin - b.profitMargin) * multiplier;
      if (sortBy === 'totalSales') return (a.totalSales - b.totalSales) * multiplier;
      if (sortBy === 'unitsSold') return (a.unitsSold - b.unitsSold) * multiplier;
      return 0;
    });

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Export functions
  const exportToExcel = () => {
    const csvContent = [
      ['Product', 'Category', 'Sales', 'Costs', 'Gross Profit', 'Margin %', 'Units Sold', 'Profit/Unit'],
      ...filteredData.map(item => [
        item.productName,
        item.category,
        item.totalSales,
        item.totalCost,
        item.grossProfit,
        item.profitMargin,
        item.unitsSold,
        item.profitPerUnit
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'profit-analysis.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const printContent = `
      <html>
        <head>
          <title>Profit Analysis</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>Profit Analysis</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Sales</th>
                <th>Costs</th>
                <th>Gross Profit</th>
                <th>Margin %</th>
                <th>Units Sold</th>
                <th>Profit/Unit</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData.map(item => `
                <tr>
                  <td>${item.productName}</td>
                  <td>${item.category}</td>
                  <td>${formatCurrency(item.totalSales)}</td>
                  <td>${formatCurrency(item.totalCost)}</td>
                  <td>${formatCurrency(item.grossProfit)}</td>
                  <td>${item.profitMargin.toFixed(1)}%</td>
                  <td>${item.unitsSold}</td>
                  <td>${formatCurrency(item.profitPerUnit)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow!.document.write(printContent);
    printWindow!.document.close();
    printWindow!.print();
  };

  const categories = Array.from(new Set(profitData.map(item => item.category)));
  const reportsRoute = useNavigationRoute('reports');

  // Calculate totals
  const totalRevenue = filteredData.reduce((sum, item) => sum + item.totalSales, 0);
  const totalCosts = filteredData.reduce((sum, item) => sum + item.totalCost, 0);
  const totalGrossProfit = totalRevenue - totalCosts;
  const averageProfitMargin = filteredData.length > 0 ? 
    filteredData.reduce((sum, item) => sum + item.profitMargin, 0) / filteredData.length : 0;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <div className="h-4 w-4 bg-gray-400 rounded-full" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <DashboardLayout title="Profit Analysis">
      <div className="space-y-3 sm:space-y-5">
        <PageHeader
          title="Profit Analysis"
          backHref={reportsRoute}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-1.5">
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500 leading-tight">Revenue</div>
              <div className="text-xs sm:text-sm font-bold truncate">{formatCurrency(totalRevenue)}</div>
              <div className="text-[10px] text-muted-foreground">{filteredData.length} products</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500 leading-tight">Gross Profit</div>
              <div className="text-xs sm:text-sm font-bold text-green-600 truncate">{formatCurrency(totalGrossProfit)}</div>
              <div className="text-[10px] text-muted-foreground">{((totalGrossProfit / totalRevenue) * 100).toFixed(1)}% margin</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500 leading-tight">Total Costs</div>
              <div className="text-xs sm:text-sm font-bold text-red-600 truncate">{formatCurrency(totalCosts)}</div>
              <div className="text-[10px] text-muted-foreground">Cost of goods</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500 leading-tight">Avg Margin</div>
              <div className="text-xs sm:text-sm font-bold">{averageProfitMargin.toFixed(1)}%</div>
              <div className="text-[10px] text-muted-foreground">All products</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="products" className="space-y-3">
          <TabsList className="h-8 text-xs">
            <TabsTrigger value="products" className="text-xs px-3">Products</TabsTrigger>
            <TabsTrigger value="periods" className="text-xs px-3">Periods</TabsTrigger>
            <TabsTrigger value="insights" className="text-xs px-3">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-3">
            <Card>
              <CardHeader className="py-2 px-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-32">
                    <Input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-8 text-xs w-36">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-8 text-xs w-32">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grossProfit">Gross Profit</SelectItem>
                      <SelectItem value="profitMargin">Margin %</SelectItem>
                      <SelectItem value="totalSales">Sales</SelectItem>
                      <SelectItem value="unitsSold">Units Sold</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-8 text-xs"
                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}>
                    {sortOrder === 'desc' ? '↓ High–Low' : '↑ Low–High'}
                  </Button>
                  <div className="flex gap-1 ml-auto">
                    <Button onClick={exportToExcel} variant="outline" size="sm" className="h-8 text-xs">
                      <Download className="h-3 w-3 mr-1" />CSV
                    </Button>
                    <Button onClick={exportToPDF} variant="outline" size="sm" className="h-8 text-xs">
                      <FileText className="h-3 w-3 mr-1" />PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs py-2">Product</TableHead>
                      <TableHead className="text-xs py-2 hidden sm:table-cell">Category</TableHead>
                      <TableHead className="text-xs py-2 text-right">Sales</TableHead>
                      <TableHead className="text-xs py-2 text-right hidden sm:table-cell">Costs</TableHead>
                      <TableHead className="text-xs py-2 text-right">Profit</TableHead>
                      <TableHead className="text-xs py-2 text-right">Margin</TableHead>
                      <TableHead className="text-xs py-2 text-right hidden md:table-cell">Units</TableHead>
                      <TableHead className="text-xs py-2 text-right hidden md:table-cell">Profit/Unit</TableHead>
                      <TableHead className="text-xs py-2 text-right hidden sm:table-cell">Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="py-2 px-2 sm:px-4">
                          <div className="text-xs font-medium">{item.productName}</div>
                          <div className="sm:hidden text-[10px] text-gray-400">{item.category}</div>
                        </TableCell>
                        <TableCell className="py-2 hidden sm:table-cell">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.category}</Badge>
                        </TableCell>
                        <TableCell className="py-2 text-right text-xs font-medium">{formatCurrency(item.totalSales)}</TableCell>
                        <TableCell className="py-2 text-right text-xs text-red-600 hidden sm:table-cell">{formatCurrency(item.totalCost)}</TableCell>
                        <TableCell className="py-2 text-right text-xs font-medium text-green-600">{formatCurrency(item.grossProfit)}</TableCell>
                        <TableCell className="py-2 text-right">
                          <Badge variant={item.profitMargin >= 40 ? "default" : item.profitMargin >= 30 ? "secondary" : "destructive"} className="text-[10px] px-1.5 py-0">
                            {item.profitMargin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-right text-xs hidden md:table-cell">{item.unitsSold}</TableCell>
                        <TableCell className="py-2 text-right text-xs text-green-600 hidden md:table-cell">{formatCurrency(item.profitPerUnit)}</TableCell>
                        <TableCell className="py-2 text-right hidden sm:table-cell">
                          <div className={`flex items-center justify-end gap-1 ${getTrendColor(item.trend)}`}>
                            {getTrendIcon(item.trend)}
                            <span className="text-xs">{item.trendPercentage}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="periods" className="space-y-3">
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm font-semibold">Period Profit Analysis</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs py-2">Period</TableHead>
                      <TableHead className="text-xs py-2 text-right">Revenue</TableHead>
                      <TableHead className="text-xs py-2 text-right hidden sm:table-cell">Costs</TableHead>
                      <TableHead className="text-xs py-2 text-right hidden md:table-cell">Expenses</TableHead>
                      <TableHead className="text-xs py-2 text-right hidden sm:table-cell">Gross Profit</TableHead>
                      <TableHead className="text-xs py-2 text-right">Net Profit</TableHead>
                      <TableHead className="text-xs py-2 text-right">Margin</TableHead>
                      <TableHead className="text-xs py-2 text-right hidden md:table-cell">Items</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periodData.map((period, index) => (
                      <TableRow key={index}>
                        <TableCell className="py-2 text-xs font-medium">{period.period}</TableCell>
                        <TableCell className="py-2 text-right text-xs">{formatCurrency(period.revenue)}</TableCell>
                        <TableCell className="py-2 text-right text-xs text-red-600 hidden sm:table-cell">{formatCurrency(period.costs)}</TableCell>
                        <TableCell className="py-2 text-right text-xs text-orange-600 hidden md:table-cell">{formatCurrency(period.expenses)}</TableCell>
                        <TableCell className="py-2 text-right text-xs text-green-600 font-medium hidden sm:table-cell">{formatCurrency(period.grossProfit)}</TableCell>
                        <TableCell className="py-2 text-right text-xs text-green-700 font-bold">{formatCurrency(period.netProfit)}</TableCell>
                        <TableCell className="py-2 text-right">
                          <Badge variant={period.profitMargin >= 35 ? "default" : period.profitMargin >= 25 ? "secondary" : "destructive"} className="text-[10px] px-1.5 py-0">
                            {period.profitMargin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-right text-xs hidden md:table-cell">{period.itemsSold}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Card>
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-sm font-semibold text-green-600">Top Performers</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  <div className="divide-y divide-gray-100">
                    <div className="py-2">
                      <div className="text-xs font-medium">Highest Profit Margin</div>
                      <div className="text-xs text-gray-500">Smartphone Case (50.0%)</div>
                    </div>
                    <div className="py-2">
                      <div className="text-xs font-medium">Highest Gross Profit</div>
                      <div className="text-xs text-gray-500">Wireless Headphones ({formatCurrency(30000)})</div>
                    </div>
                    <div className="py-2">
                      <div className="text-xs font-medium">Best Selling</div>
                      <div className="text-xs text-gray-500">Premium Coffee Beans (150 units)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-sm font-semibold text-red-600">Areas for Improvement</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  <div className="divide-y divide-gray-100">
                    <div className="py-2">
                      <div className="text-xs font-medium">Lowest Profit Margin</div>
                      <div className="text-xs text-gray-500">Notebook Set (30.0%)</div>
                    </div>
                    <div className="py-2">
                      <div className="text-xs font-medium">Declining Trend</div>
                      <div className="text-xs text-gray-500">Designer T-Shirt (-5.2%)</div>
                    </div>
                    <div className="py-2">
                      <div className="text-xs font-medium">Low Volume, High Margin</div>
                      <div className="text-xs text-gray-500">Consider promoting Smartphone Case</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="sm:col-span-2">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-sm font-semibold">Profit Analysis Summary</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-xs font-medium text-green-800">Strong Performance</div>
                      <p className="text-[10px] text-green-600 mt-1">Electronics showing consistent 35%+ margins with strong volume</p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="text-xs font-medium text-yellow-800">Optimization Opportunity</div>
                      <p className="text-[10px] text-yellow-600 mt-1">F&B showing good margins — increase volume through promotions</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-xs font-medium text-blue-800">Growth Potential</div>
                      <p className="text-[10px] text-blue-600 mt-1">High-margin Smartphone Case has low volume — consider marketing</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="h-8 text-xs" onClick={exportToExcel}>
            <Download className="h-3.5 w-3.5 mr-1.5" />Export Report
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <Calendar className="h-3.5 w-3.5 mr-1.5" />Schedule
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <Eye className="h-3.5 w-3.5 mr-1.5" />Detailed View
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
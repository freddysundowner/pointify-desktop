import { useState } from 'react';
import { ArrowLeft, Download, Calendar, Package, AlertTriangle, TrendingUp, Filter, Search, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Link } from 'wouter';

interface StockItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitCost: number;
  totalValue: number;
  status: 'good' | 'low' | 'out' | 'excess';
  lastRestocked: string;
  velocity: 'fast' | 'medium' | 'slow' | 'dead';
}

const stockData: StockItem[] = [
  {
    id: 'PRD001',
    name: 'Rice 25kg',
    category: 'Grains',
    currentStock: 45,
    minStock: 20,
    maxStock: 100,
    unitCost: 2500,
    totalValue: 112500,
    status: 'good',
    lastRestocked: '2025-06-15',
    velocity: 'fast'
  },
  {
    id: 'PRD002',
    name: 'Cooking Oil 5L',
    category: 'Oils',
    currentStock: 8,
    minStock: 15,
    maxStock: 50,
    unitCost: 1200,
    totalValue: 9600,
    status: 'low',
    lastRestocked: '2025-06-10',
    velocity: 'fast'
  },
  {
    id: 'PRD003',
    name: 'Sugar 2kg',
    category: 'Sweeteners',
    currentStock: 0,
    minStock: 10,
    maxStock: 30,
    unitCost: 300,
    totalValue: 0,
    status: 'out',
    lastRestocked: '2025-06-05',
    velocity: 'medium'
  },
  {
    id: 'PRD004',
    name: 'Detergent Powder',
    category: 'Household',
    currentStock: 120,
    minStock: 25,
    maxStock: 80,
    unitCost: 450,
    totalValue: 54000,
    status: 'excess',
    lastRestocked: '2025-06-18',
    velocity: 'slow'
  },
  {
    id: 'PRD005',
    name: 'Vintage Wine',
    category: 'Beverages',
    currentStock: 25,
    minStock: 5,
    maxStock: 30,
    unitCost: 3500,
    totalValue: 87500,
    status: 'good',
    lastRestocked: '2025-05-01',
    velocity: 'dead'
  }
];

export default function StockReport() {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const totalValue = stockData.reduce((sum, item) => sum + item.totalValue, 0);
  const lowStockItems = stockData.filter(item => (item.status === 'low' || item.status === 'out')).length;
  const fastMovingValue = stockData.filter(item => item.velocity === 'fast').reduce((sum, item) => sum + item.totalValue, 0);
  const deadStockValue = stockData.filter(item => item.velocity === 'dead').reduce((sum, item) => sum + item.totalValue, 0);

  const getStatusBadge = (status: string) => {
    const colors = {
      good: 'bg-green-100 text-green-800',
      low: 'bg-yellow-100 text-yellow-800',
      out: 'bg-red-100 text-red-800',
      excess: 'bg-blue-100 text-blue-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getVelocityBadge = (velocity: string) => {
    const colors = {
      fast: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      slow: 'bg-orange-100 text-orange-800',
      dead: 'bg-red-100 text-red-800'
    };
    return colors[velocity as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const filteredData = stockData.filter(item => {
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Export functions
  const exportToExcel = () => {
    const csvContent = [
      ['Product', 'Category', 'Current Stock', 'Min Stock', 'Max Stock', 'Unit Cost', 'Total Value', 'Status', 'Velocity'],
      ...filteredData.map(item => [
        item.name,
        item.category,
        item.currentStock,
        item.minStock,
        item.maxStock,
        item.unitCost,
        item.totalValue,
        item.status,
        item.velocity
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stock-report.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const printContent = `
      <html>
        <head>
          <title>Stock Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>Stock Report</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Min Stock</th>
                <th>Max Stock</th>
                <th>Unit Cost</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Velocity</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.category}</td>
                  <td>${item.currentStock}</td>
                  <td>${item.minStock}</td>
                  <td>${item.maxStock}</td>
                  <td>KES ${item.unitCost.toLocaleString()}</td>
                  <td>KES ${item.totalValue.toLocaleString()}</td>
                  <td>${item.status}</td>
                  <td>${item.velocity}</td>
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

  const categories = Array.from(new Set(stockData.map(item => item.category)));

  return (
    <DashboardLayout title="Stock Report">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link href="/reports">
              <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <h1 className="text-base sm:text-xl font-bold leading-tight">Stock Report</h1>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <Button onClick={exportToExcel} variant="outline" size="sm" className="h-8 text-xs">
              <Download className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">CSV</span>
            </Button>
            <Button onClick={exportToPDF} variant="outline" size="sm" className="h-8 text-xs">
              <FileText className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">PDF</span>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-1.5">
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500">Stock Value</div>
              <div className="text-xs font-bold text-purple-600 truncate">KES {totalValue.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500">Alerts</div>
              <div className="text-xs font-bold text-red-600">{lowStockItems}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500">Fast Moving</div>
              <div className="text-xs font-bold text-green-600 truncate">KES {fastMovingValue.toLocaleString()}</div>
              <div className="text-[10px] text-gray-400">{((fastMovingValue/totalValue)*100).toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500">Dead Stock</div>
              <div className="text-xs font-bold text-red-600 truncate">KES {deadStockValue.toLocaleString()}</div>
              <div className="text-[10px] text-gray-400">{((deadStockValue/totalValue)*100).toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-gray-50 border rounded-lg">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-7 text-xs border rounded px-1.5 bg-white">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="h-7 text-xs border rounded px-1.5 bg-white capitalize">
            {['all', 'good', 'low', 'out', 'excess'].map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All Status' : s}</option>
            ))}
          </select>
          <Input placeholder="Search products..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="h-7 text-xs w-32 ml-auto" />
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm font-semibold">Inventory Details</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Product</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 hidden sm:table-cell">Category</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Stock</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 hidden md:table-cell">Min/Max</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 hidden sm:table-cell">Unit Cost</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Value</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-gray-500 hidden sm:table-cell">Speed</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 hidden md:table-cell">Restocked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs font-medium">{item.name}</td>
                    <td className="px-3 py-2 text-xs hidden sm:table-cell">{item.category}</td>
                    <td className="px-3 py-2 text-right text-xs font-bold">{item.currentStock}</td>
                    <td className="px-3 py-2 text-right text-xs text-gray-500 hidden md:table-cell">{item.minStock}/{item.maxStock}</td>
                    <td className="px-3 py-2 text-right text-xs hidden sm:table-cell">KES {item.unitCost.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-xs font-bold">KES {item.totalValue.toLocaleString()}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge className={`text-[10px] py-0 ${getStatusBadge(item.status)}`}>{item.status}</Badge>
                    </td>
                    <td className="px-3 py-2 text-center hidden sm:table-cell">
                      <Badge className={`text-[10px] py-0 ${getVelocityBadge(item.velocity)}`}>{item.velocity}</Badge>
                    </td>
                    <td className="px-3 py-2 text-xs hidden md:table-cell">{new Date(item.lastRestocked).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 border-t">
                <span className="text-xs text-gray-500">{currentPage}/{totalPages}</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs"
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>Prev</Button>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs"
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Analysis */}
        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm font-semibold">Stock Alerts</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              {stockData.filter(item => item.status === 'low' || item.status === 'out').map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                  <div>
                    <div className="text-xs font-medium text-red-800">{item.name}</div>
                    <div className="text-[10px] text-red-600">
                      {item.status === 'out' ? 'Out of Stock' : `Low: ${item.currentStock} left`}
                    </div>
                  </div>
                  <Badge className="bg-red-100 text-red-800 text-[10px] py-0">{item.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm font-semibold">Top Performers</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              {stockData.filter(item => item.velocity === 'fast').sort((a, b) => b.totalValue - a.totalValue).slice(0, 3).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                  <div>
                    <div className="text-xs font-medium text-green-800">{item.name}</div>
                    <div className="text-[10px] text-green-600">{item.currentStock} units</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-green-800">KES {item.totalValue.toLocaleString()}</div>
                    <Badge className="bg-green-100 text-green-800 text-[10px] py-0">Fast</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
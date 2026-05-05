import { useState } from 'react';
import { ArrowLeft, Download, Calendar, ArrowDownRight, TrendingDown, Filter, Users, Tag, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Link } from 'wouter';

interface DiscountData {
  date: string;
  customer: string;
  discountType: 'bulk' | 'loyalty' | 'promotional' | 'staff';
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  discountPercentage: number;
}

const discountData: DiscountData[] = [
  {
    date: '2025-06-19',
    customer: 'John Doe',
    discountType: 'bulk',
    originalAmount: 5000,
    discountAmount: 500,
    finalAmount: 4500,
    discountPercentage: 10
  },
  {
    date: '2025-06-19',
    customer: 'Jane Smith',
    discountType: 'loyalty',
    originalAmount: 2500,
    discountAmount: 250,
    finalAmount: 2250,
    discountPercentage: 10
  },
  {
    date: '2025-06-18',
    customer: 'Mike Johnson',
    discountType: 'promotional',
    originalAmount: 1800,
    discountAmount: 180,
    finalAmount: 1620,
    discountPercentage: 10
  },
  {
    date: '2025-06-18',
    customer: 'Staff Purchase',
    discountType: 'staff',
    originalAmount: 800,
    discountAmount: 120,
    finalAmount: 680,
    discountPercentage: 15
  },
  {
    date: '2025-06-17',
    customer: 'Sarah Wilson',
    discountType: 'bulk',
    originalAmount: 7500,
    discountAmount: 750,
    finalAmount: 6750,
    discountPercentage: 10
  }
];

export default function DiscountReports() {
  const [dateFilter, setDateFilter] = useState('thisWeek');
  const [discountFilter, setDiscountFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredData = discountData.filter(item => {
    const matchesSearch = item.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.discountType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = discountFilter === 'all' || item.discountType === discountFilter;
    return matchesSearch && matchesFilter;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Export functions
  const exportToExcel = () => {
    const csvContent = [
      ['Date', 'Customer', 'Type', 'Original Amount', 'Discount Amount', 'Final Amount', 'Discount %'],
      ...filteredData.map(item => [
        item.date,
        item.customer,
        item.discountType,
        item.originalAmount,
        item.discountAmount,
        item.finalAmount,
        item.discountPercentage
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'discount-reports.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const printContent = `
      <html>
        <head>
          <title>Discount Reports</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>Discount Reports</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Original Amount</th>
                <th>Discount Amount</th>
                <th>Final Amount</th>
                <th>Discount %</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData.map(item => `
                <tr>
                  <td>${item.date}</td>
                  <td>${item.customer}</td>
                  <td>${item.discountType}</td>
                  <td>KES ${item.originalAmount.toLocaleString()}</td>
                  <td>KES ${item.discountAmount.toLocaleString()}</td>
                  <td>KES ${item.finalAmount.toLocaleString()}</td>
                  <td>${item.discountPercentage}%</td>
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

  const totalDiscounts = discountData.reduce((sum, item) => sum + item.discountAmount, 0);
  const bulkDiscounts = discountData.filter(d => d.discountType === 'bulk').reduce((sum, item) => sum + item.discountAmount, 0);
  const loyaltyDiscounts = discountData.filter(d => d.discountType === 'loyalty').reduce((sum, item) => sum + item.discountAmount, 0);
  const promotionalDiscounts = discountData.filter(d => d.discountType === 'promotional').reduce((sum, item) => sum + item.discountAmount, 0);
  const staffDiscounts = discountData.filter(d => d.discountType === 'staff').reduce((sum, item) => sum + item.discountAmount, 0);

  const getDiscountBadge = (type: string) => {
    const colors = {
      bulk: 'bg-blue-100 text-blue-800',
      loyalty: 'bg-green-100 text-green-800',
      promotional: 'bg-orange-100 text-orange-800',
      staff: 'bg-purple-100 text-purple-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };



  return (
    <DashboardLayout title="Discount Reports">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link href="/reports">
              <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <h1 className="text-base sm:text-xl font-bold leading-tight">Discount Reports</h1>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportToExcel}>
              <Download className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">CSV</span>
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={exportToPDF}>
              <FileText className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">PDF</span>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500">Total</div>
              <div className="text-xs font-bold text-orange-600 truncate">KES {totalDiscounts.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500">Bulk</div>
              <div className="text-xs font-bold text-blue-600 truncate">KES {bulkDiscounts.toLocaleString()}</div>
              <div className="text-[10px] text-gray-400">{((bulkDiscounts/totalDiscounts)*100).toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500">Loyalty</div>
              <div className="text-xs font-bold text-green-600 truncate">KES {loyaltyDiscounts.toLocaleString()}</div>
              <div className="text-[10px] text-gray-400">{((loyaltyDiscounts/totalDiscounts)*100).toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500">Promo</div>
              <div className="text-xs font-bold text-orange-500 truncate">KES {promotionalDiscounts.toLocaleString()}</div>
              <div className="text-[10px] text-gray-400">{((promotionalDiscounts/totalDiscounts)*100).toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500">Staff</div>
              <div className="text-xs font-bold text-purple-600 truncate">KES {staffDiscounts.toLocaleString()}</div>
              <div className="text-[10px] text-gray-400">{((staffDiscounts/totalDiscounts)*100).toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-gray-50 border rounded-lg">
          {['all', 'bulk', 'loyalty', 'promotional', 'staff'].map((type) => (
            <Button key={type} variant={discountFilter === type ? 'default' : 'outline'} size="sm"
              onClick={() => setDiscountFilter(type)} className="h-7 text-xs px-2 capitalize">
              {type === 'all' ? 'All' : type}
            </Button>
          ))}
          <Input placeholder="Search customer..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="h-7 text-xs w-32 ml-auto" />
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm font-semibold">Discount Details</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 hidden sm:table-cell">Date</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Customer</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Type</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 hidden md:table-cell">Original</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 hidden sm:table-cell">Disc%</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Discount</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs hidden sm:table-cell">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-xs font-medium">{item.customer}</td>
                    <td className="px-3 py-2 text-xs">
                      <Badge className={`text-[10px] py-0 ${getDiscountBadge(item.discountType)}`}>{item.discountType}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right text-xs hidden md:table-cell">KES {item.originalAmount.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-xs hidden sm:table-cell">{item.discountPercentage}%</td>
                    <td className="px-3 py-2 text-right text-xs text-orange-600 font-bold">KES {item.discountAmount.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-xs font-bold">KES {item.finalAmount.toLocaleString()}</td>
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

        {/* Analysis */}
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-xs font-semibold text-blue-800">Top Type</div>
            <div className="text-[10px] text-blue-600">Bulk Purchase</div>
            <div className="text-sm font-bold text-blue-800">KES {bulkDiscounts.toLocaleString()}</div>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <div className="text-xs font-semibold text-orange-800">Avg Discount</div>
            <div className="text-[10px] text-orange-600">Per transaction</div>
            <div className="text-sm font-bold text-orange-800">KES {(totalDiscounts/discountData.length).toLocaleString()}</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-xs font-semibold text-green-800">Unique Customers</div>
            <div className="text-[10px] text-green-600">With discounts</div>
            <div className="text-sm font-bold text-green-800">{new Set(discountData.map(d => d.customer)).size}</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
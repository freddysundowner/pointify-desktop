import { useState } from 'react';
import { ArrowLeft, Download, Calendar, DollarSign, TrendingUp, Filter, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Link } from 'wouter';

interface IncomeData {
  date: string;
  cashSales: number;
  creditSales: number;
  walletPayments: number;
  cardPayments: number;
  total: number;
}

const incomeData: IncomeData[] = [
  {
    date: '2025-06-19',
    cashSales: 8500,
    creditSales: 2200,
    walletPayments: 1800,
    cardPayments: 650,
    total: 13150
  },
  {
    date: '2025-06-18',
    cashSales: 7200,
    creditSales: 1950,
    walletPayments: 1200,
    cardPayments: 800,
    total: 11150
  },
  {
    date: '2025-06-17',
    cashSales: 9800,
    creditSales: 2800,
    walletPayments: 1650,
    cardPayments: 550,
    total: 14800
  },
  {
    date: '2025-06-16',
    cashSales: 4700,
    creditSales: 1800,
    walletPayments: 0,
    cardPayments: 0,
    total: 6500
  }
];

export default function IncomeReports() {
  const [dateFilter, setDateFilter] = useState('thisWeek');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredData = incomeData.filter(item =>
    item.date.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Export functions
  const exportToExcel = () => {
    const csvContent = [
      ['Date', 'Cash Sales', 'Credit Sales', 'Wallet Payments', 'Card Payments', 'Total'],
      ...filteredData.map(item => [
        item.date,
        item.cashSales,
        item.creditSales,
        item.walletPayments,
        item.cardPayments,
        item.total
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'income-reports.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const printContent = `
      <html>
        <head>
          <title>Income Reports</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>Income Reports</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Cash Sales</th>
                <th>Credit Sales</th>
                <th>Wallet Payments</th>
                <th>Card Payments</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData.map(item => `
                <tr>
                  <td>${item.date}</td>
                  <td>KES ${item.cashSales.toLocaleString()}</td>
                  <td>KES ${item.creditSales.toLocaleString()}</td>
                  <td>KES ${item.walletPayments.toLocaleString()}</td>
                  <td>KES ${item.cardPayments.toLocaleString()}</td>
                  <td>KES ${item.total.toLocaleString()}</td>
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

  const totalIncome = filteredData.reduce((sum, day) => sum + day.total, 0);
  const totalCash = filteredData.reduce((sum, day) => sum + day.cashSales, 0);
  const totalCredit = filteredData.reduce((sum, day) => sum + day.creditSales, 0);
  const totalWallet = filteredData.reduce((sum, day) => sum + day.walletPayments, 0);
  const totalCard = filteredData.reduce((sum, day) => sum + day.cardPayments, 0);

  const fmtK = (n: number) => n >= 1_000_000 ? `KES ${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `KES ${(n/1_000).toFixed(1)}K` : `KES ${n}`;

  return (
    <DashboardLayout title="Income Reports">
      <div className="space-y-3">
        <PageHeader
          title="Income Reports"
          backHref="/reports"
          actions={<>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportToExcel}>
              <Download className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">CSV</span>
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={exportToPDF}>
              <FileText className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">PDF</span>
            </Button>
          </>}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          <Card className="sm:col-span-1">
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500">Total</div>
              <div className="text-xs font-bold">{fmtK(totalIncome)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500">Cash</div>
              <div className="text-xs font-bold text-green-600">{fmtK(totalCash)}</div>
              <div className="text-[10px] text-gray-400">{((totalCash/totalIncome)*100).toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500">Credit</div>
              <div className="text-xs font-bold text-blue-600">{fmtK(totalCredit)}</div>
              <div className="text-[10px] text-gray-400">{((totalCredit/totalIncome)*100).toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500">Wallet</div>
              <div className="text-xs font-bold text-purple-600">{fmtK(totalWallet)}</div>
              <div className="text-[10px] text-gray-400">{((totalWallet/totalIncome)*100).toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500">Card</div>
              <div className="text-xs font-bold text-orange-600">{fmtK(totalCard)}</div>
              <div className="text-[10px] text-gray-400">{((totalCard/totalIncome)*100).toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-gray-50 border rounded-lg">
          {['today', 'thisWeek', 'thisMonth', 'thisYear'].map((period) => (
            <Button key={period} variant={dateFilter === period ? 'default' : 'outline'} size="sm"
              onClick={() => setDateFilter(period)} className="h-7 text-xs px-2">
              {period === 'thisWeek' ? 'Week' : period === 'thisMonth' ? 'Month' : period === 'thisYear' ? 'Year' : 'Today'}
            </Button>
          ))}
          <Input placeholder="Search by date..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="h-7 text-xs w-36 ml-auto" />
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm font-semibold">Daily Income Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Date</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Cash</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 hidden sm:table-cell">Credit</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 hidden sm:table-cell">Wallet</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500 hidden md:table-cell">Card</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((day, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs font-medium">{new Date(day.date).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-right text-xs text-green-600">KES {day.cashSales.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-xs text-blue-600 hidden sm:table-cell">KES {day.creditSales.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-xs text-purple-600 hidden sm:table-cell">KES {day.walletPayments.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-xs text-orange-600 hidden md:table-cell">KES {day.cardPayments.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-xs font-bold">KES {day.total.toLocaleString()}</td>
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

        {/* Performance Insights */}
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-xs font-semibold text-green-800">Best Day</div>
            <div className="text-[10px] text-green-600">June 17, 2025</div>
            <div className="text-sm font-bold text-green-800">KES 14,800</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-xs font-semibold text-blue-800">Avg Daily</div>
            <div className="text-[10px] text-blue-600">Last 7 days</div>
            <div className="text-sm font-bold text-blue-800">KES {(totalIncome/incomeData.length).toLocaleString()}</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="text-xs font-semibold text-purple-800">Top Method</div>
            <div className="text-[10px] text-purple-600">Cash dominates</div>
            <div className="text-sm font-bold text-purple-800">{((totalCash/totalIncome)*100).toFixed(1)}%</div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
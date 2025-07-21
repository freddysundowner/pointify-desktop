import { useState } from 'react';
import { ArrowLeft, Download, Calendar, Users, AlertCircle, Clock, Filter, Search, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Link } from 'wouter';

interface DueSalesData {
  id: string;
  customerName: string;
  phone: string;
  saleDate: string;
  dueDate: string;
  originalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'current' | 'overdue_7' | 'overdue_30' | 'overdue_60';
  lastPayment?: string;
  salesReference: string;
}

const dueSalesData: DueSalesData[] = [
  {
    id: 'DUE001',
    customerName: 'John Doe',
    phone: '+254123456789',
    saleDate: '2025-05-15',
    dueDate: '2025-06-15',
    originalAmount: 15000,
    paidAmount: 8000,
    balanceAmount: 7000,
    status: 'overdue_7',
    lastPayment: '2025-06-10',
    salesReference: 'SALE-2025-089'
  },
  {
    id: 'DUE002',
    customerName: 'Jane Smith',
    phone: '+254987654321',
    saleDate: '2025-04-20',
    dueDate: '2025-05-20',
    originalAmount: 25000,
    paidAmount: 0,
    balanceAmount: 25000,
    status: 'overdue_30',
    salesReference: 'SALE-2025-067'
  },
  {
    id: 'DUE003',
    customerName: 'Mike Johnson',
    phone: '+254456789123',
    saleDate: '2025-06-01',
    dueDate: '2025-07-01',
    originalAmount: 8500,
    paidAmount: 3000,
    balanceAmount: 5500,
    status: 'current',
    lastPayment: '2025-06-15',
    salesReference: 'SALE-2025-125'
  },
  {
    id: 'DUE004',
    customerName: 'Sarah Wilson',
    phone: '+254789123456',
    saleDate: '2025-03-10',
    dueDate: '2025-04-10',
    originalAmount: 18000,
    paidAmount: 5000,
    balanceAmount: 13000,
    status: 'overdue_60',
    lastPayment: '2025-04-05',
    salesReference: 'SALE-2025-034'
  },
  {
    id: 'DUE005',
    customerName: 'David Brown',
    phone: '+254321654987',
    saleDate: '2025-06-05',
    dueDate: '2025-07-05',
    originalAmount: 12000,
    paidAmount: 12000,
    balanceAmount: 0,
    status: 'current',
    lastPayment: '2025-06-18',
    salesReference: 'SALE-2025-134'
  }
];

export default function CustomerDueSales() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const totalOutstanding = dueSalesData.reduce((sum, item) => sum + item.balanceAmount, 0);
  const overdueAmount = dueSalesData
    .filter(item => item.status.includes('overdue'))
    .reduce((sum, item) => sum + item.balanceAmount, 0);
  const currentAmount = dueSalesData
    .filter(item => item.status === 'current' && item.balanceAmount > 0)
    .reduce((sum, item) => sum + item.balanceAmount, 0);
  const customersWithDue = dueSalesData.filter(item => item.balanceAmount > 0).length;

  const getStatusBadge = (status: string) => {
    const colors = {
      current: 'bg-green-100 text-green-800',
      overdue_7: 'bg-yellow-100 text-yellow-800',
      overdue_30: 'bg-orange-100 text-orange-800',
      overdue_60: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string) => {
    const texts = {
      current: 'Current',
      overdue_7: 'Overdue (7+ days)',
      overdue_30: 'Overdue (30+ days)',
      overdue_60: 'Overdue (60+ days)'
    };
    return texts[status as keyof typeof texts] || status;
  };

  const getDaysOverdue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const filteredData = dueSalesData.filter(item => {
    if (statusFilter === 'outstanding') {
      return item.balanceAmount > 0;
    }
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesSearch = item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.phone.includes(searchQuery) ||
                         item.salesReference.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Export functions
  const exportToExcel = () => {
    const csvContent = [
      ['Customer', 'Phone', 'Sale Date', 'Due Date', 'Original Amount', 'Paid Amount', 'Balance', 'Status', 'Sales Reference'],
      ...filteredData.map(item => [
        item.customerName,
        item.phone,
        item.saleDate,
        item.dueDate,
        item.originalAmount,
        item.paidAmount,
        item.balanceAmount,
        getStatusText(item.status),
        item.salesReference
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer-due-sales.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const printContent = `
      <html>
        <head>
          <title>Customer Due Sales Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>Customer Due Sales Report</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Sale Date</th>
                <th>Due Date</th>
                <th>Original Amount</th>
                <th>Paid Amount</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Sales Reference</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData.map(item => `
                <tr>
                  <td>${item.customerName}</td>
                  <td>${item.phone}</td>
                  <td>${new Date(item.saleDate).toLocaleDateString()}</td>
                  <td>${new Date(item.dueDate).toLocaleDateString()}</td>
                  <td>KES ${item.originalAmount.toLocaleString()}</td>
                  <td>KES ${item.paidAmount.toLocaleString()}</td>
                  <td>KES ${item.balanceAmount.toLocaleString()}</td>
                  <td>${getStatusText(item.status)}</td>
                  <td>${item.salesReference}</td>
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

  return (
    <DashboardLayout title="Customer Due Sales">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/reports">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Reports
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="h-8 w-8 text-red-600" />
                Customer Due Sales
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Track outstanding credit sales and payment status</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Report
            </Button>
            <Button onClick={exportToExcel} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button onClick={exportToPDF} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Outstanding</p>
                  <p className="text-2xl font-bold text-red-600">KES {totalOutstanding.toLocaleString()}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Overdue Amount</p>
                  <p className="text-2xl font-bold text-orange-600">KES {overdueAmount.toLocaleString()}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current Due</p>
                <p className="text-xl font-bold text-yellow-600">KES {currentAmount.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Not yet overdue</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Customers with Due</p>
                <p className="text-2xl font-bold text-blue-600">{customersWithDue}</p>
                <p className="text-xs text-gray-500">Active accounts</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Due Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex gap-2">
                <Button 
                  variant={statusFilter === 'all' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  All Status
                </Button>
                <Button 
                  variant={statusFilter === 'outstanding' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setStatusFilter('outstanding')}
                >
                  Outstanding Only
                </Button>
                {['current', 'overdue_7', 'overdue_30', 'overdue_60'].map((status) => (
                  <Button 
                    key={status}
                    variant={statusFilter === status ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                  >
                    {getStatusText(status)}
                  </Button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search customer, phone, or reference..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Due Sales Table */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Due Sales Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Customer</th>
                    <th className="text-left p-3">Contact</th>
                    <th className="text-left p-3">Sale Date</th>
                    <th className="text-left p-3">Due Date</th>
                    <th className="text-right p-3">Original Amount</th>
                    <th className="text-right p-3">Paid Amount</th>
                    <th className="text-right p-3">Balance</th>
                    <th className="text-center p-3">Status</th>
                    <th className="text-center p-3">Days Overdue</th>
                    <th className="text-left p-3">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item, index) => {
                    const daysOverdue = getDaysOverdue(item.dueDate);
                    return (
                      <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="p-3 font-medium">{item.customerName}</td>
                        <td className="p-3 text-sm">{item.phone}</td>
                        <td className="p-3">{new Date(item.saleDate).toLocaleDateString()}</td>
                        <td className="p-3">{new Date(item.dueDate).toLocaleDateString()}</td>
                        <td className="p-3 text-right">KES {item.originalAmount.toLocaleString()}</td>
                        <td className="p-3 text-right text-green-600">KES {item.paidAmount.toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-red-600">KES {item.balanceAmount.toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <Badge className={getStatusBadge(item.status)}>
                            {getStatusText(item.status)}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          {daysOverdue > 0 ? (
                            <span className="font-bold text-red-600">{daysOverdue}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-sm font-mono">{item.salesReference}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show</span>
                <select 
                  value={itemsPerPage} 
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-gray-600">entries</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length} entries
                </span>
                
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                      if (pageNum > totalPages) return null;
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Critical Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dueSalesData
                  .filter(item => item.status === 'overdue_60' || (item.status === 'overdue_30' && item.balanceAmount > 10000))
                  .sort((a, b) => b.balanceAmount - a.balanceAmount)
                  .slice(0, 4)
                  .map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div>
                        <p className="font-medium text-red-800 dark:text-red-200">{item.customerName}</p>
                        <p className="text-sm text-red-600 dark:text-red-400">
                          Due: {new Date(item.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-800 dark:text-red-200">KES {item.balanceAmount.toLocaleString()}</p>
                        <Badge className="bg-red-100 text-red-800">
                          {getDaysOverdue(item.dueDate)} days overdue
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="font-medium">Total Credit Sales</span>
                  <span className="font-bold">KES {dueSalesData.reduce((sum, item) => sum + item.originalAmount, 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="font-medium text-green-800 dark:text-green-200">Total Payments Received</span>
                  <span className="font-bold text-green-800 dark:text-green-200">KES {dueSalesData.reduce((sum, item) => sum + item.paidAmount, 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <span className="font-medium text-red-800 dark:text-red-200">Outstanding Balance</span>
                  <span className="font-bold text-red-800 dark:text-red-200">KES {totalOutstanding.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="font-medium text-blue-800 dark:text-blue-200">Collection Rate</span>
                  <span className="font-bold text-blue-800 dark:text-blue-200">
                    {((dueSalesData.reduce((sum, item) => sum + item.paidAmount, 0) / dueSalesData.reduce((sum, item) => sum + item.originalAmount, 0)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
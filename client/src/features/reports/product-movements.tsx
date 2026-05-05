import { useState } from 'react';
import { ArrowLeft, Download, Calendar, TrendingUp, ArrowUpRight, ArrowDownRight, RotateCcw, Filter, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Link } from 'wouter';

interface MovementData {
  id: string;
  date: string;
  product: string;
  type: 'sale' | 'purchase' | 'return' | 'transfer' | 'adjustment';
  quantity: number;
  direction: 'in' | 'out';
  reference: string;
  performedBy: string;
  notes?: string;
}

const movementData: MovementData[] = [
  {
    id: 'MOV001',
    date: '2025-06-19',
    product: 'Rice 25kg',
    type: 'sale',
    quantity: 12,
    direction: 'out',
    reference: 'SALE-2025-001',
    performedBy: 'John Cashier'
  },
  {
    id: 'MOV002',
    date: '2025-06-19',
    product: 'Cooking Oil 5L',
    type: 'purchase',
    quantity: 24,
    direction: 'in',
    reference: 'PO-2025-015',
    performedBy: 'Mary Manager'
  },
  {
    id: 'MOV003',
    date: '2025-06-18',
    product: 'Sugar 2kg',
    type: 'return',
    quantity: 3,
    direction: 'in',
    reference: 'RET-2025-003',
    performedBy: 'Jane Supervisor',
    notes: 'Customer return - damaged packaging'
  },
  {
    id: 'MOV004',
    date: '2025-06-18',
    product: 'Detergent Powder',
    type: 'transfer',
    quantity: 15,
    direction: 'out',
    reference: 'TRF-2025-008',
    performedBy: 'Mike Stock',
    notes: 'Transfer to branch store'
  },
  {
    id: 'MOV005',
    date: '2025-06-17',
    product: 'Rice 25kg',
    type: 'adjustment',
    quantity: 2,
    direction: 'out',
    reference: 'ADJ-2025-002',
    performedBy: 'Mary Manager',
    notes: 'Stock count adjustment'
  },
  {
    id: 'MOV006',
    date: '2025-06-17',
    product: 'Cooking Oil 5L',
    type: 'sale',
    quantity: 18,
    direction: 'out',
    reference: 'SALE-2025-045',
    performedBy: 'Sarah Cashier'
  }
];

export default function ProductMovements() {
  const [typeFilter, setTypeFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const totalMovements = movementData.length;
  const itemsIn = movementData.filter(m => m.direction === 'in').reduce((sum, m) => sum + m.quantity, 0);
  const itemsOut = movementData.filter(m => m.direction === 'out').reduce((sum, m) => sum + m.quantity, 0);
  const netMovement = itemsIn - itemsOut;

  const getTypeBadge = (type: string) => {
    const colors = {
      sale: 'bg-green-100 text-green-800',
      purchase: 'bg-blue-100 text-blue-800',
      return: 'bg-yellow-100 text-yellow-800',
      transfer: 'bg-purple-100 text-purple-800',
      adjustment: 'bg-red-100 text-red-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getDirectionIcon = (direction: string, type: string) => {
    if (direction === 'in') {
      return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    } else {
      return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    }
  };

  const filteredData = movementData.filter(item => {
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesDirection = directionFilter === 'all' || item.direction === directionFilter;
    const matchesSearch = item.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.reference.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesDirection && matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Export functions
  const exportToExcel = () => {
    const csvContent = [
      ['Date', 'Product', 'Type', 'Direction', 'Quantity', 'Reference', 'Performed By', 'Notes'],
      ...filteredData.map(item => [
        item.date,
        item.product,
        item.type,
        item.direction,
        item.quantity,
        item.reference,
        item.performedBy,
        item.notes || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-movements.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const printContent = `
      <html>
        <head>
          <title>Product Movements</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>Product Movements Report</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Type</th>
                <th>Direction</th>
                <th>Quantity</th>
                <th>Reference</th>
                <th>Performed By</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${filteredData.map(item => `
                <tr>
                  <td>${new Date(item.date).toLocaleDateString()}</td>
                  <td>${item.product}</td>
                  <td>${item.type}</td>
                  <td>${item.direction}</td>
                  <td>${item.quantity}</td>
                  <td>${item.reference}</td>
                  <td>${item.performedBy}</td>
                  <td>${item.notes || ''}</td>
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
    <DashboardLayout title="Product Movements">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link href="/reports">
              <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <h1 className="text-base sm:text-xl font-bold leading-tight">Product Movements</h1>
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
              <div className="text-[10px] text-gray-500">Movements</div>
              <div className="text-xs font-bold text-blue-600">{totalMovements}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500">Items In</div>
              <div className="text-xs font-bold text-green-600">{itemsIn}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500">Items Out</div>
              <div className="text-xs font-bold text-red-600">{itemsOut}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500">Net</div>
              <div className={`text-xs font-bold ${netMovement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netMovement >= 0 ? '+' : ''}{netMovement}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-gray-50 border rounded-lg">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="h-7 text-xs border rounded px-1.5 bg-white capitalize">
            <option value="all">All Types</option>
            {['sale', 'purchase', 'return', 'transfer', 'adjustment'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select value={directionFilter} onChange={(e) => setDirectionFilter(e.target.value)}
            className="h-7 text-xs border rounded px-1.5 bg-white">
            <option value="all">All Directions</option>
            <option value="in">In</option>
            <option value="out">Out</option>
          </select>
          <Input placeholder="Search product/ref..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="h-7 text-xs w-32 ml-auto" />
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm font-semibold">Movement Details</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 hidden sm:table-cell">Date</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Product</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Type</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">Dir</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Qty</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 hidden sm:table-cell">Ref</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 hidden md:table-cell">By</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((movement, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs hidden sm:table-cell">{new Date(movement.date).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-xs font-medium">{movement.product}</td>
                    <td className="px-3 py-2 text-xs">
                      <Badge className={`text-[10px] py-0 ${getTypeBadge(movement.type)}`}>{movement.type}</Badge>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        {getDirectionIcon(movement.direction, movement.type)}
                        <span className={`text-[10px] font-medium ${movement.direction === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                          {movement.direction.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-bold">{movement.quantity}</td>
                    <td className="px-3 py-2 text-xs font-mono hidden sm:table-cell">{movement.reference}</td>
                    <td className="px-3 py-2 text-xs hidden md:table-cell">{movement.performedBy}</td>
                    <td className="px-3 py-2 text-xs text-gray-500 hidden md:table-cell">{movement.notes || '-'}</td>
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
        <div className="grid gap-3 md:grid-cols-2">
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm font-semibold">Type Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-1.5">
              {['sale', 'purchase', 'return', 'transfer', 'adjustment'].map((type) => {
                const count = movementData.filter(m => m.type === type).length;
                const pct = ((count / totalMovements) * 100).toFixed(1);
                return (
                  <div key={type} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] py-0 ${getTypeBadge(type)}`}>{type}</Badge>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold">{count}</span>
                      <span className="text-[10px] text-gray-500 ml-1">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-1.5">
              {movementData.slice(0, 5).map((movement, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {getDirectionIcon(movement.direction, movement.type)}
                    <div>
                      <div className="text-xs font-medium">{movement.product}</div>
                      <div className="text-[10px] text-gray-500">{movement.reference}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold">{movement.quantity}</div>
                    <div className="text-[10px] text-gray-500">{new Date(movement.date).toLocaleDateString()}</div>
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
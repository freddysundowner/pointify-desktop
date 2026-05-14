import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { Package, Loader2, Download, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { RootState } from '@/store';
import { useAttendantAuth } from '@/contexts/AttendantAuthContext';
import { usePrimaryShop } from '@/hooks/usePrimaryShop';
import { useNavigationRoute } from '@/lib/navigation-utils';

interface StockItem {
  _id?: string;
  name?: string;
  inStockQuantity?: number;
  totalSoldQuantity?: number;
  totalSales?: number;
  totalProfit?: number;
}

const fmtAmt = (n: any) => {
  const v = Number(n) || 0;
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
};

export default function StockReport() {
  const { selectedShopId } = useSelector((state: RootState) => state.shop);
  const { attendant } = useAttendantAuth();
  const { shopId: primaryShopId } = usePrimaryShop();
  const currency = useSelector((state: RootState) => state.currency) || 'KES';
  const reportsRoute = useNavigationRoute('reports');

  const effectiveShopId = selectedShopId ||
    (attendant ? (typeof attendant.shopId === 'string' ? attendant.shopId : attendant.shopId._id) : primaryShopId);

  const [nameSearch, setNameSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  const stockUrl = effectiveShopId
    ? `/api/product/stockreport/${effectiveShopId}?page=${page}&limit=${LIMIT}&name=${encodeURIComponent(submittedSearch)}`
    : null;

  const { data: rawData, isLoading, isError } = useQuery<any>({
    queryKey: [stockUrl],
    enabled: !!stockUrl,
    staleTime: 60_000,
  });

  const items: StockItem[] = Array.isArray(rawData) ? rawData : (Array.isArray(rawData?.data) ? rawData.data : []);
  const hasMore = items.length === LIMIT;

  const totalStockValue = items.reduce((s, i) => s + (Number(i.totalSales) || 0), 0);
  const totalProfit     = items.reduce((s, i) => s + (Number(i.totalProfit) || 0), 0);

  const doSearch = () => { setSubmittedSearch(nameSearch); setPage(1); };

  const exportCSV = () => {
    const rows = [
      ['Product', 'In Stock', 'Sold', 'Sales', 'Profit'].join(','),
      ...items.map(i => [i.name, i.inStockQuantity, i.totalSoldQuantity, i.totalSales, i.totalProfit].join(','))
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'stock-report.csv'; a.click();
  };

  return (
    <DashboardLayout title="Stock Report">
      <div className="space-y-3 pb-24 lg:pb-6">
        <PageHeader title="Stock Report" backHref={reportsRoute}
          actions={
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportCSV}>
              <Download className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">CSV</span>
            </Button>
          }
        />

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input value={nameSearch} onChange={e => setNameSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder="Search product..." className="h-9 pl-8 text-sm" />
          </div>
          <Button size="sm" className="h-9 px-4 text-xs" onClick={doSearch}>Search</Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-2">
          <Card className="border-blue-200">
            <CardContent className="p-3">
              <div className="text-[11px] text-gray-500">Total Sales Value</div>
              <div className="text-lg font-bold text-blue-600">{currency} {fmtAmt(totalStockValue)}</div>
            </CardContent>
          </Card>
          <Card className="border-green-200">
            <CardContent className="p-3">
              <div className="text-[11px] text-gray-500">Total Profit</div>
              <div className="text-lg font-bold text-green-600">{currency} {fmtAmt(totalProfit)}</div>
            </CardContent>
          </Card>
        </div>

        {/* List */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              Products ({items.length}{hasMore ? '+' : ''})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-purple-500" /></div>
            ) : isError ? (
              <div className="text-center py-8 text-sm text-red-500">Failed to load stock report.</div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">No stock data found.</div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="divide-y lg:hidden">
                  {items.map((item, i) => (
                    <div key={i} className="p-3">
                      <div className="font-medium text-xs mb-1">{item.name ?? '—'}</div>
                      <div className="grid grid-cols-2 gap-x-4 text-[11px] text-gray-500">
                        <span>In Stock: <strong className="text-gray-700">{item.inStockQuantity ?? 0}</strong></span>
                        <span>Sold: <strong className="text-gray-700">{item.totalSoldQuantity ?? 0}</strong></span>
                        <span>Sales: <strong className="text-blue-600">{currency} {fmtAmt(item.totalSales)}</strong></span>
                        <span>Profit: <strong className="text-green-600">{currency} {fmtAmt(item.totalProfit)}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        {['Product', 'In Stock', 'Sold Qty', 'Total Sales', 'Total Profit'].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((item, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs font-medium">{item.name ?? '—'}</td>
                          <td className="px-3 py-2 text-xs">{item.inStockQuantity ?? 0}</td>
                          <td className="px-3 py-2 text-xs">{item.totalSoldQuantity ?? 0}</td>
                          <td className="px-3 py-2 text-xs text-blue-600 font-semibold">{currency} {fmtAmt(item.totalSales)}</td>
                          <td className="px-3 py-2 text-xs text-green-600 font-semibold">{currency} {fmtAmt(item.totalProfit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                <div className="flex items-center justify-between px-3 py-2 border-t">
                  <span className="text-xs text-gray-500">Page {page}</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs"
                      onClick={() => setPage(p => Math.max(p-1,1))} disabled={page===1}>Prev</Button>
                    <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs"
                      onClick={() => setPage(p => p+1)} disabled={!hasMore}>Next</Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { BarChart2, Loader2, Download, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { RootState } from '@/store';
import { useAttendantAuth } from '@/contexts/AttendantAuthContext';
import { usePrimaryShop } from '@/hooks/usePrimaryShop';
import { useNavigationRoute } from '@/lib/navigation-utils';

const today = () => new Date().toISOString().split('T')[0];
const daysAgo = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0];
};
const yesterday = () => daysAgo(1);

const PERIOD_OPTS = [
  { key: 'today',    label: 'Today',     from: () => today(),     to: () => today()     },
  { key: 'yesterday',label: 'Yesterday', from: () => yesterday(), to: () => yesterday() },
  { key: '7days',   label: '7 Days',    from: () => daysAgo(6),  to: () => today()     },
  { key: '30days',  label: '30 Days',   from: () => daysAgo(29), to: () => today()     },
];

const SALE_TYPES = ['All', 'Wholesale', 'Retail', 'Dealer', 'Receipt'];

const fmtAmt = (n: any) => {
  const v = Number(n) || 0;
  return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(1)}K` : String(Math.round(v));
};

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch { return d; }
};

const saleTypeBadge: Record<string, string> = {
  Wholesale: 'bg-blue-100 text-blue-800',
  Retail: 'bg-green-100 text-green-800',
  Dealer: 'bg-purple-100 text-purple-800',
  Receipt: 'bg-amber-100 text-amber-800',
};

export default function ProductSalesReport() {
  const { selectedShopId } = useSelector((state: RootState) => state.shop);
  const { attendant } = useAttendantAuth();
  const { shopId: primaryShopId } = usePrimaryShop();
  const currency = useSelector((state: RootState) => state.currency) || 'KES';
  const reportsRoute = useNavigationRoute('reports');

  const effectiveShopId = selectedShopId ||
    (attendant ? (typeof attendant.shopId === 'string' ? attendant.shopId : attendant.shopId._id) : primaryShopId);

  const [period, setPeriod] = useState('7days');
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [saleType, setSaleType] = useState('All');
  const [productSearch, setProductSearch] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const opt = PERIOD_OPTS.find(p => p.key === period);
  const fromDate = showCustom && customFrom ? customFrom : (opt?.from() ?? today());
  const toDate   = showCustom && customTo   ? customTo   : (opt?.to()   ?? today());

  const url = effectiveShopId
    ? `/api/sales/products/reports?shop=${effectiveShopId}&fromDate=${fromDate}&toDate=${toDate}&saleType=${saleType === 'All' ? '' : saleType}&product=${encodeURIComponent(productSearch)}`
    : null;

  const { data: rawData, isLoading, isError } = useQuery<any>({
    queryKey: [url],
    enabled: !!url,
    staleTime: 60_000,
  });

  const items: any[] = Array.isArray(rawData) ? rawData : (Array.isArray(rawData?.data) ? rawData.data : []);
  const totalSales  = items.reduce((s: number, i: any) => s + (Number(i.totalAmount ?? i.amount ?? i.price ?? 0)), 0);
  const totalQty    = items.reduce((s: number, i: any) => s + (Number(i.quantity ?? i.qty ?? 0)), 0);
  const totalPages  = Math.ceil(items.length / PER_PAGE);
  const pageItems   = items.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const exportCSV = () => {
    const rows = [
      ['Product', 'Qty', 'Amount', 'Sale Type', 'Attendant', 'Date', 'Receipt'].join(','),
      ...items.map((i: any) => [
        i.productName ?? i.name ?? '',
        i.quantity ?? i.qty ?? '',
        i.totalAmount ?? i.amount ?? i.price ?? '',
        i.saleType ?? '',
        i.attendant?.name ?? i.attendantName ?? '',
        i.createdAt ?? i.date ?? '',
        i.receiptNo ?? i.saleId ?? '',
      ].join(','))
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'product-sales-report.csv'; a.click();
  };

  return (
    <DashboardLayout title="Product Sales">
      <div className="space-y-3 pb-24 lg:pb-6">
        <PageHeader title="Product Sales" backHref={reportsRoute}
          actions={
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportCSV}>
              <Download className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">CSV</span>
            </Button>
          }
        />

        {/* Filters */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {PERIOD_OPTS.map(p => (
              <Button key={p.key} size="sm"
                variant={period === p.key && !showCustom ? 'default' : 'outline'}
                className="h-7 text-xs px-2.5"
                onClick={() => { setPeriod(p.key); setShowCustom(false); setPage(1); }}>
                {p.label}
              </Button>
            ))}
            <Button size="sm" variant={showCustom ? 'default' : 'outline'} className="h-7 text-xs px-2.5"
              onClick={() => setShowCustom(v => !v)}>Custom</Button>
          </div>
          {showCustom && (
            <div className="flex gap-2 items-center flex-wrap">
              <input type="date" value={customFrom} onChange={e => { setCustomFrom(e.target.value); setPage(1); }}
                className="h-8 text-xs border rounded px-2 bg-white" />
              <span className="text-xs text-gray-500">to</span>
              <input type="date" value={customTo} onChange={e => { setCustomTo(e.target.value); setPage(1); }}
                className="h-8 text-xs border rounded px-2 bg-white" />
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {SALE_TYPES.map(t => (
              <Button key={t} size="sm"
                variant={saleType === t ? 'default' : 'outline'}
                className="h-7 text-xs px-2.5"
                onClick={() => { setSaleType(t); setPage(1); }}>
                {t}
              </Button>
            ))}
            <div className="relative ml-auto">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
              <Input value={productSearch} onChange={e => { setProductSearch(e.target.value); setPage(1); }}
                placeholder="Product..." className="h-7 text-xs pl-6 w-32" />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="border-green-200">
            <CardContent className="p-3">
              <div className="text-[11px] text-gray-500">Total Sales</div>
              <div className="text-base font-bold text-green-600">{currency} {fmtAmt(totalSales)}</div>
            </CardContent>
          </Card>
          <Card className="border-blue-200">
            <CardContent className="p-3">
              <div className="text-[11px] text-gray-500">Total Qty</div>
              <div className="text-base font-bold text-blue-600">{totalQty}</div>
            </CardContent>
          </Card>
          <Card className="border-purple-200">
            <CardContent className="p-3">
              <div className="text-[11px] text-gray-500">Transactions</div>
              <div className="text-base font-bold text-purple-600">{items.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-green-500" />
              Sales by Product
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-purple-500" /></div>
            ) : isError ? (
              <div className="text-center py-8 text-sm text-red-500">Failed to load data.</div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">No records found for this period.</div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="divide-y lg:hidden">
                  {pageItems.map((item: any, i: number) => (
                    <div key={i} className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{item.productName ?? item.name ?? '—'}</span>
                        <Badge className={`text-[10px] ${saleTypeBadge[item.saleType] ?? 'bg-gray-100 text-gray-700'}`}>
                          {item.saleType ?? '—'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span>Qty: {item.quantity ?? item.qty ?? '—'}</span>
                        <span className="font-semibold text-green-600">{currency} {fmtAmt(item.totalAmount ?? item.amount ?? item.price)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span>{item.attendant?.name ?? item.attendantName ?? '—'}</span>
                        <span>{fmtDate(item.createdAt ?? item.date ?? '')}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        {['Product', 'Qty', 'Amount', 'Sale Type', 'Attendant', 'Date', 'Receipt'].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pageItems.map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs font-medium">{item.productName ?? item.name ?? '—'}</td>
                          <td className="px-3 py-2 text-xs">{item.quantity ?? item.qty ?? '—'}</td>
                          <td className="px-3 py-2 text-xs text-green-600 font-semibold">{currency} {fmtAmt(item.totalAmount ?? item.amount ?? item.price)}</td>
                          <td className="px-3 py-2 text-xs">
                            <Badge className={`text-[10px] ${saleTypeBadge[item.saleType] ?? 'bg-gray-100 text-gray-700'}`}>{item.saleType ?? '—'}</Badge>
                          </td>
                          <td className="px-3 py-2 text-xs">{item.attendant?.name ?? item.attendantName ?? '—'}</td>
                          <td className="px-3 py-2 text-xs">{fmtDate(item.createdAt ?? item.date ?? '')}</td>
                          <td className="px-3 py-2 text-xs font-mono">{item.receiptNo ?? item.saleId ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-3 py-2 border-t">
                    <span className="text-xs text-gray-500">{(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, items.length)} of {items.length}</span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs"
                        onClick={() => setPage(p => Math.max(p-1,1))} disabled={page===1}>Prev</Button>
                      <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs"
                        onClick={() => setPage(p => Math.min(p+1,totalPages))} disabled={page===totalPages}>Next</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

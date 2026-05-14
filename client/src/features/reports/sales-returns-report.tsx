import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { RotateCcw, Loader2, Download } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

const fmtAmt = (n: any) => {
  const v = Number(n) || 0;
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
};

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch { return d; }
};

export default function SalesReturnsReport() {
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
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const opt = PERIOD_OPTS.find(p => p.key === period);
  const fromDate = showCustom && customFrom ? customFrom : (opt?.from() ?? today());
  const toDate   = showCustom && customTo   ? customTo   : (opt?.to()   ?? today());

  const url = effectiveShopId
    ? `/api/salereturns/filter?shopId=${effectiveShopId}&fromDate=${fromDate}&toDate=${toDate}`
    : null;

  const { data: rawData, isLoading, isError } = useQuery<any>({
    queryKey: [url],
    enabled: !!url,
    staleTime: 60_000,
  });

  const items: any[] = Array.isArray(rawData) ? rawData
    : (Array.isArray(rawData?.items) ? rawData.items
    : (Array.isArray(rawData?.data) ? rawData.data : []));
  const totalReturned  = items.reduce((s: number, i: any) => s + (Number(i.totalAmount ?? i.amount ?? i.total ?? 0)), 0);
  const totalPages     = Math.ceil(items.length / PER_PAGE);
  const pageItems      = items.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const exportCSV = () => {
    const rows = [
      ['Receipt', 'Items', 'Amount', 'Reason', 'Attendant', 'Date'].join(','),
      ...items.map((i: any) => [
        i.receiptNo ?? i.saleId ?? '',
        (i.products ?? i.items ?? []).map((p: any) => p.name ?? p.productName ?? '').join('; '),
        i.totalAmount ?? i.amount ?? i.total ?? '',
        i.reason ?? '',
        i.attendant?.name ?? i.attendantName ?? '',
        i.createdAt ?? i.date ?? '',
      ].join(','))
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'sales-returns.csv'; a.click();
  };

  return (
    <DashboardLayout title="Sales Returns">
      <div className="space-y-3 pb-24 lg:pb-6">
        <PageHeader title="Sales Returns" backHref={reportsRoute}
          actions={
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportCSV}>
              <Download className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">CSV</span>
            </Button>
          }
        />

        {/* Period Filter */}
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
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-2">
          <Card className="border-red-200">
            <CardContent className="p-3">
              <div className="text-[11px] text-gray-500">Total Returned</div>
              <div className="text-lg font-bold text-red-600">{currency} {fmtAmt(totalReturned)}</div>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-3">
              <div className="text-[11px] text-gray-500">Return Records</div>
              <div className="text-lg font-bold text-gray-700">{items.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* List */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-red-500" />
              Return Records
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-purple-500" /></div>
            ) : isError ? (
              <div className="text-center py-8 text-sm text-red-500">Failed to load returns data.</div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">No returns found for this period.</div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="divide-y lg:hidden">
                  {pageItems.map((item: any, i: number) => (
                    <div key={i} className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-medium">{item.receiptNo ?? item.saleId ?? `#${i+1}`}</span>
                        <span className="text-xs font-bold text-red-600">{currency} {fmtAmt(item.totalAmount ?? item.amount ?? item.total)}</span>
                      </div>
                      {(item.products ?? item.items ?? []).length > 0 && (
                        <div className="text-[11px] text-gray-500">
                          {(item.products ?? item.items ?? []).map((p: any) => p.name ?? p.productName ?? '').join(', ')}
                        </div>
                      )}
                      {item.reason && <div className="text-[11px] text-gray-400 italic">{item.reason}</div>}
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
                        {['Receipt', 'Products', 'Amount', 'Reason', 'Attendant', 'Date'].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-xs font-medium text-gray-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pageItems.map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs font-mono">{item.receiptNo ?? item.saleId ?? `#${i+1}`}</td>
                          <td className="px-3 py-2 text-xs max-w-[200px] truncate">
                            {(item.products ?? item.items ?? []).map((p: any) => p.name ?? p.productName ?? '').join(', ') || '—'}
                          </td>
                          <td className="px-3 py-2 text-xs text-red-600 font-semibold">{currency} {fmtAmt(item.totalAmount ?? item.amount ?? item.total)}</td>
                          <td className="px-3 py-2 text-xs text-gray-500 italic">{item.reason ?? '—'}</td>
                          <td className="px-3 py-2 text-xs">{item.attendant?.name ?? item.attendantName ?? '—'}</td>
                          <td className="px-3 py-2 text-xs">{fmtDate(item.createdAt ?? item.date ?? '')}</td>
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

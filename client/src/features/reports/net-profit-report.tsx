import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { TrendingUp, Loader2, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { RootState } from '@/store';
import { useAttendantAuth } from '@/contexts/AttendantAuthContext';
import { usePrimaryShop } from '@/hooks/usePrimaryShop';
import { useNavigationRoute } from '@/lib/navigation-utils';

interface NetProfitData {
  creditTotals: number;
  debtPaid: number;
  totalProfitAndSalesValue: {
    totalCashSales: number;
    totalSales: number;
    totalPurchases: number;
    totalTaxes: number;
    totalProfit: number;
  };
  badStockValue: { badStockValue: number };
  totalExpenses: { totalExpenses: number };
  totalTaxes: number;
  gross: number;
  net: number;
}

const today = () => new Date().toISOString().split('T')[0];
const daysAgo = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0];
};
const yesterday = () => daysAgo(1);

const PERIOD_OPTS = [
  { key: 'today',     label: 'Today',     from: () => today(),     to: () => today()     },
  { key: 'yesterday', label: 'Yesterday', from: () => yesterday(), to: () => yesterday() },
  { key: '7days',     label: '7 Days',    from: () => daysAgo(6),  to: () => today()     },
  { key: '30days',    label: '30 Days',   from: () => daysAgo(29), to: () => today()     },
];

const fmtAmt = (n: any) => {
  const v = Number(n) || 0;
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
};

export default function NetProfitReport() {
  const { selectedShopId } = useSelector((state: RootState) => state.shop);
  const { attendant } = useAttendantAuth();
  const { shopId: primaryShopId } = usePrimaryShop();
  const currency = useSelector((state: RootState) => state.currency) || 'KES';
  const reportsRoute = useNavigationRoute('reports');
  const [, navigate] = useLocation();

  const effectiveShopId = selectedShopId ||
    (attendant ? (typeof attendant.shopId === 'string' ? attendant.shopId : attendant.shopId._id) : primaryShopId);

  const [period, setPeriod] = useState('today');
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const opt = PERIOD_OPTS.find(p => p.key === period);
  const fromDate = showCustom && customFrom ? customFrom : (opt?.from() ?? today());
  const toDate   = showCustom && customTo   ? customTo   : (opt?.to()   ?? today());

  const url = effectiveShopId
    ? `/api/analysis/netprofit?shopId=${effectiveShopId}&fromDate=${fromDate}&toDate=${toDate}`
    : null;

  const { data, isLoading, isError } = useQuery<NetProfitData>({
    queryKey: [url],
    enabled: !!url,
    staleTime: 60_000,
  });

  const cashSales   = data?.totalProfitAndSalesValue?.totalCashSales ?? 0;
  const debtPaid    = data?.debtPaid ?? 0;
  const expenses    = data?.totalExpenses?.totalExpenses ?? 0;
  const grossProfit = data?.gross ?? 0;
  const netProfit   = data?.net ?? 0;
  const taxes       = data?.totalTaxes ?? 0;
  const badStock    = data?.badStockValue?.badStockValue ?? 0;

  const heroValue = (cashSales + debtPaid) - expenses;

  const rows = [
    { label: 'Total Sales Paid',  value: cashSales,   color: 'text-gray-800',                                        tag: 'income',   href: '/sales-report'   },
    { label: 'Debt Collected',    value: debtPaid,    color: 'text-blue-600',                                        tag: 'income',   href: '/debtors'        },
    { label: 'Gross Profit',      value: grossProfit, color: 'text-green-600', bold: true,                           tag: 'profit',   href: null              },
    { label: 'Net Profit',        value: netProfit,   color: netProfit >= 0 ? 'text-green-700' : 'text-red-600', bold: true, tag: 'profit', href: null },
    { label: 'Total Taxes',       value: taxes,       color: 'text-gray-600',                                        tag: 'cost',     href: null              },
    { label: 'Total Expenses',    value: expenses,    color: 'text-orange-600',                                      tag: 'cost',     href: '/expense-report' },
    { label: 'Bad Stock',         value: badStock,    color: 'text-red-500',                                         tag: 'cost',     href: null              },
  ].filter(r => r.label === 'Bad Stock' || r.value !== 0);

  const summaryCards = [
    { label: 'Gross Profit', value: heroValue,   color: heroValue   >= 0 ? 'text-green-700' : 'text-red-600', bg: 'bg-green-50'  },
    { label: 'Net Profit',   value: netProfit,   color: netProfit   >= 0 ? 'text-green-700' : 'text-red-600', bg: 'bg-blue-50'   },
    { label: 'Total Expenses', value: expenses,  color: 'text-orange-600',                                    bg: 'bg-orange-50' },
    { label: 'Bad Stock',    value: badStock,    color: 'text-red-500',                                       bg: 'bg-red-50'    },
  ];

  return (
    <DashboardLayout title="Income Report">
      <div className="space-y-4 pb-24 lg:pb-8 w-full">
        <PageHeader title="Income Report" backHref={reportsRoute} />

        {/* Period filter */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {PERIOD_OPTS.map(p => (
            <Button key={p.key} size="sm"
              variant={period === p.key && !showCustom ? 'default' : 'outline'}
              className="h-7 text-xs px-2.5"
              onClick={() => { setPeriod(p.key); setShowCustom(false); }}>
              {p.label}
            </Button>
          ))}
          <Button size="sm" variant={showCustom ? 'default' : 'outline'} className="h-7 text-xs px-2.5"
            onClick={() => setShowCustom(v => !v)}>
            Custom
          </Button>
          {showCustom && (
            <div className="flex gap-2 items-center flex-wrap ml-1">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="h-7 text-xs border rounded px-2 bg-white" />
              <span className="text-xs text-gray-500">to</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="h-7 text-xs border rounded px-2 bg-white" />
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : isError ? (
          <div className="text-center py-10 text-sm text-red-500">Failed to load income report.</div>
        ) : (
          <>
            {/* ── Desktop: 4 summary stat cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {summaryCards.map(c => (
                <Card key={c.label}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
                    <p className={`text-xl font-bold ${c.color}`}>{currency} {fmtAmt(c.value)}</p>
                    <div className={`mt-2 w-8 h-1 rounded-full ${c.bg}`} />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ── Desktop two-column: hero left, rows table right ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Hero card */}
              <Card className="lg:col-span-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full min-h-[180px]">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                  <p className="text-sm text-gray-500 mb-1">Gross Profit</p>
                  <p className={`text-3xl font-bold ${heroValue >= 0 ? 'text-purple-700' : 'text-red-600'}`}>
                    {currency} {fmtAmt(heroValue)}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    After taxes: <span className="font-semibold text-gray-600">{currency} {fmtAmt(netProfit)}</span>
                  </p>
                  <p className="text-[11px] text-gray-400 mt-3">
                    {fromDate === toDate ? fromDate : `${fromDate} — ${toDate}`}
                  </p>
                </CardContent>
              </Card>

              {/* Rows — mobile: simple list, desktop: enhanced table */}
              <Card className="lg:col-span-3">
                <CardHeader className="pb-0 pt-4 px-4 hidden lg:block">
                  <CardTitle className="text-sm text-muted-foreground font-medium">Breakdown</CardTitle>
                </CardHeader>

                {/* Mobile list */}
                <CardContent className="p-0 divide-y lg:hidden">
                  {rows.map(row => (
                    <div key={row.label}
                      onClick={() => row.href && navigate(row.href)}
                      className={`flex items-center justify-between px-4 py-3 gap-2 ${row.href ? 'cursor-pointer hover:bg-muted/40 active:bg-muted/60 transition-colors' : ''}`}>
                      <span className="text-sm text-gray-600 flex-1">{row.label}</span>
                      <span className={`text-sm font-semibold ${row.color} ${row.bold ? 'text-base' : ''}`}>
                        {currency} {fmtAmt(row.value)}
                      </span>
                      {row.href
                        ? <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        : <span className="w-4 shrink-0" />}
                    </div>
                  ))}
                </CardContent>

                {/* Desktop table */}
                <div className="hidden lg:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Item</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Amount</th>
                        <th className="w-6 px-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {rows.map(row => (
                        <tr key={row.label}
                          onClick={() => row.href && navigate(row.href)}
                          className={`${row.href ? 'cursor-pointer hover:bg-muted/40 transition-colors' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {row.tag === 'income' && <ArrowUpRight className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                              {row.tag === 'cost'   && <ArrowDownRight className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                              {row.tag === 'profit' && <TrendingUp className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                              <span className={`${row.bold ? 'font-semibold' : 'text-gray-600'}`}>{row.label}</span>
                            </div>
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold ${row.color} ${row.bold ? 'text-base' : ''}`}>
                            {currency} {fmtAmt(row.value)}
                          </td>
                          <td className="px-2 py-3">
                            {row.href && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

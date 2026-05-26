import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, RotateCcw, Wallet, CreditCard, Clock, Loader2, TrendingDown, Receipt, PiggyBank } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { RootState } from '@/store';
import { useAttendantAuth } from '@/contexts/AttendantAuthContext';
import { usePrimaryShop } from '@/hooks/usePrimaryShop';
import { useNavigationRoute } from '@/lib/navigation-utils';

interface SalesSummary {
  cash?: number;
  credit?: number;
  debtpaid?: number;
  returns?: number;
  wallet?: number;
  hold?: number;
}

// The /analysis/netprofit endpoint's exact field names vary by deployment, so
// we accept several common spellings and fall back gracefully.
interface NetProfitResponse {
  totalSales?: number; sales?: number; grossSales?: number;
  totalExpenses?: number; expenses?: number;
  totalPurchases?: number; purchases?: number; cogs?: number;
  totalReturns?: number; returns?: number;
  grossProfit?: number; gross?: number;
  netProfit?: number; net?: number; profit?: number;
  discount?: number; tax?: number;
  duesales?: number; debt?: number;
  [k: string]: any;
}

const pickNum = (obj: any, ...keys: string[]): number => {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === 'number' && !isNaN(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v);
  }
  return 0;
};

const today = () => new Date().toISOString().split('T')[0];
const daysAgo = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0];
};
const yesterday = () => daysAgo(1);

const fmtAmt = (n: number | undefined) => {
  const v = n ?? 0;
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
};

const PERIOD_OPTS = [
  { key: 'today',   label: 'Today',     from: () => today(),     to: () => today()     },
  { key: 'yesterday', label: 'Yesterday', from: () => yesterday(), to: () => yesterday() },
  { key: '7days',  label: '7 Days',    from: () => daysAgo(6),  to: () => today()     },
  { key: '30days', label: '30 Days',   from: () => daysAgo(29), to: () => today()     },
];

export default function IncomeReports() {
  const { selectedShopId } = useSelector((state: RootState) => state.shop);
  const { attendant } = useAttendantAuth();
  const { shopId: primaryShopId } = usePrimaryShop();
  const reportsRoute = useNavigationRoute('reports');

  const effectiveShopId = selectedShopId ||
    (attendant ? (typeof attendant.shopId === 'string' ? attendant.shopId : attendant.shopId._id) : primaryShopId);

  const [period, setPeriod] = useState('7days');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const opt = PERIOD_OPTS.find(p => p.key === period);
  const fromDate = showCustom && customFrom ? customFrom : (opt?.from() ?? today());
  const toDate   = showCustom && customTo   ? customTo   : (opt?.to()   ?? today());

  const summaryUrl = effectiveShopId
    ? `/api/analysis/report/sales?shopid=${effectiveShopId}&fromDate=${fromDate}&toDate=${toDate}`
    : null;

  const { data, isLoading, isError } = useQuery<SalesSummary>({
    queryKey: [summaryUrl],
    enabled: !!summaryUrl,
    staleTime: 60_000,
  });

  const attendantId = attendant ? (typeof (attendant as any)._id === 'string' ? (attendant as any)._id : '') : '';
  const netProfitUrl = effectiveShopId
    ? `/api/analysis/netprofit/?fromDate=${fromDate}&toDate=${toDate}&shopId=${effectiveShopId}&attendant=${attendantId}&type=null&duesales=`
    : null;

  const { data: netData, isLoading: netLoading, isError: netError } = useQuery<NetProfitResponse>({
    queryKey: [netProfitUrl],
    enabled: !!netProfitUrl,
    staleTime: 60_000,
  });

  const currency = useSelector((state: RootState) => state.currency) || 'KES';

  const tiles = [
    { key: 'cash',     label: 'Cash Sales',       value: data?.cash,     icon: DollarSign, color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
    { key: 'credit',   label: 'Credit Sales',      value: data?.credit,   icon: CreditCard,  color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200'  },
    { key: 'debtpaid', label: 'Collected Debt',    value: data?.debtpaid, icon: TrendingUp,  color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200'},
    { key: 'returns',  label: 'Returns',           value: data?.returns,  icon: RotateCcw,   color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200'   },
    { key: 'wallet',   label: 'Wallet Sales',      value: data?.wallet,   icon: Wallet,      color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
    { key: 'hold',     label: 'On Hold',           value: data?.hold,     icon: Clock,       color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200'  },
  ];

  const totalSales = (data?.cash ?? 0) + (data?.credit ?? 0) + (data?.wallet ?? 0);

  return (
    <DashboardLayout title="Sales Summary">
      <div className="space-y-3 pb-24 lg:pb-6">
        <PageHeader title="Sales Summary" backHref={reportsRoute} />

        {/* Period Filter */}
        <div className="flex flex-wrap gap-1.5">
          {PERIOD_OPTS.map(p => (
            <Button key={p.key} size="sm"
              variant={period === p.key && !showCustom ? 'default' : 'outline'}
              className="h-7 text-xs px-2.5"
              onClick={() => { setPeriod(p.key); setShowCustom(false); }}>
              {p.label}
            </Button>
          ))}
          <Button size="sm" variant={showCustom ? 'default' : 'outline'} className="h-7 text-xs px-2.5"
            onClick={() => setShowCustom(v => !v)}>Custom</Button>
        </div>
        {showCustom && (
          <div className="flex gap-2 items-center flex-wrap">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="h-8 text-xs border rounded px-2 bg-white" />
            <span className="text-xs text-gray-500">to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="h-8 text-xs border rounded px-2 bg-white" />
          </div>
        )}

        {/* Total banner */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
          </div>
        ) : isError ? (
          <div className="text-center py-8 text-sm text-red-500">Failed to load sales summary.</div>
        ) : (
          <>
            <div className="rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 p-4 text-white">
              <div className="text-xs opacity-80 mb-1">Total Sales ({fromDate} – {toDate})</div>
              <div className="text-2xl font-bold">{currency} {fmtAmt(totalSales)}</div>
              <div className="text-xs opacity-70 mt-1">Cash + Credit + Wallet</div>
            </div>

            {/* 6 tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {tiles.map(({ key, label, value, icon: Icon, color, bg, border }) => (
                <Card key={key} className={`border ${border}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`h-3.5 w-3.5 ${color}`} />
                      </div>
                      <span className="text-[11px] text-gray-500 leading-tight">{label}</span>
                    </div>
                    <div className={`text-base font-bold ${color}`}>{currency} {fmtAmt(value)}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Net Profit breakdown */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Net Profit Breakdown</h3>
                {netLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-500" />}
              </div>

              {netError ? (
                <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded p-2" data-testid="text-netprofit-error">
                  Failed to load net profit.
                </div>
              ) : netLoading && !netData ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <Card key={i} className="border border-gray-100">
                      <CardContent className="p-3">
                        <div className="h-3 w-16 bg-gray-100 rounded animate-pulse mb-2" />
                        <div className="h-5 w-24 bg-gray-100 rounded animate-pulse" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : netData ? (
                (() => {
                  const grossSales = pickNum(netData, 'totalSales', 'sales', 'grossSales');
                  const purchases  = pickNum(netData, 'totalPurchases', 'purchases', 'cogs');
                  const expenses   = pickNum(netData, 'totalExpenses', 'expenses');
                  const returnsAmt = pickNum(netData, 'totalReturns', 'returns');
                  const grossProfit= pickNum(netData, 'grossProfit', 'gross');
                  const netProfit  = pickNum(netData, 'netProfit', 'net', 'profit');
                  const dueSales   = pickNum(netData, 'duesales', 'debt');
                  const discount   = pickNum(netData, 'discount');
                  const tax        = pickNum(netData, 'tax');

                  const profitColor = netProfit >= 0 ? 'from-emerald-600 to-emerald-500' : 'from-rose-600 to-rose-500';

                  const npTiles = [
                    { label: 'Gross Sales',   value: grossSales, icon: DollarSign,  color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
                    { label: 'Purchases/COGS', value: purchases,  icon: Receipt,    color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
                    { label: 'Expenses',      value: expenses,   icon: TrendingDown, color: 'text-rose-600',  bg: 'bg-rose-50',   border: 'border-rose-200' },
                    { label: 'Returns',       value: returnsAmt, icon: RotateCcw,   color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
                    { label: 'Gross Profit',  value: grossProfit, icon: TrendingUp, color: 'text-teal-600',   bg: 'bg-teal-50',   border: 'border-teal-200' },
                    { label: 'Due Sales',     value: dueSales,   icon: Clock,       color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
                    ...(discount > 0 ? [{ label: 'Discount', value: discount, icon: TrendingDown, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' }] : []),
                    ...(tax > 0 ? [{ label: 'Tax', value: tax, icon: Receipt, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' }] : []),
                  ];

                  return (
                    <div className="space-y-2">
                      <div className={`rounded-xl bg-gradient-to-r ${profitColor} p-4 text-white`} data-testid="card-net-profit">
                        <div className="flex items-center gap-2 mb-1">
                          <PiggyBank className="h-4 w-4 opacity-80" />
                          <div className="text-xs opacity-80">Net Profit ({fromDate} – {toDate})</div>
                        </div>
                        <div className="text-2xl font-bold" data-testid="text-net-profit-value">
                          {currency} {fmtAmt(netProfit)}
                        </div>
                        <div className="text-xs opacity-70 mt-1">
                          Gross Profit {currency} {fmtAmt(grossProfit)} − Expenses {currency} {fmtAmt(expenses)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {npTiles.map((t) => (
                          <Card key={t.label} className={`border ${t.border}`} data-testid={`card-np-${t.label.toLowerCase().replace(/\W+/g, '-')}`}>
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2 mb-1.5">
                                <div className={`w-7 h-7 rounded-lg ${t.bg} flex items-center justify-center flex-shrink-0`}>
                                  <t.icon className={`h-3.5 w-3.5 ${t.color}`} />
                                </div>
                                <span className="text-[11px] text-gray-500 leading-tight">{t.label}</span>
                              </div>
                              <div className={`text-base font-bold ${t.color}`}>{currency} {fmtAmt(t.value)}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })()
              ) : null}
            </div>

            {/* Date range note */}
            <p className="text-[11px] text-gray-400 text-center">
              Showing data from <strong>{fromDate}</strong> to <strong>{toDate}</strong>
            </p>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

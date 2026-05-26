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
  if (!obj) return 0;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && !isNaN(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v);
  }
  return 0;
};

// Pretty-print a camelCase / snake_case key as a human label.
const humanizeKey = (k: string): string => {
  const s = k
    .replace(/[_\-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const isPlainObject = (v: any) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Renders whatever the /analysis/netprofit endpoint returns, as-is. Numbers
// are formatted with the shop currency; nested objects/arrays render as
// indented sub-sections; everything else is shown as a string.
// Mobile-style "Analysis" layout: a big Gross Profit pill at the top with an
// "After taxes" subnote, then a list of label / subtitle / amount rows that
// mirrors the iOS app screen.
function NetProfitMobile({ data, currency }: { data: any; currency: string }) {
  const grossProfit    = pickNum(data, 'grossProfit', 'gross', 'grossprofit');
  const netProfit      = pickNum(data, 'netProfit', 'net', 'netprofit', 'profit');
  const totalSalesPaid = pickNum(data, 'totalSalesPaid', 'totalsalespaid', 'totalSales', 'sales', 'totalsales');
  const debtCollected  = pickNum(data, 'debtCollected', 'debtcollected', 'debtpaid', 'debt');
  const totalTaxes     = pickNum(data, 'totalTaxes', 'totaltaxes', 'taxes', 'tax');
  const totalExpenses  = pickNum(data, 'totalExpenses', 'totalexpenses', 'expenses');
  const badStock       = pickNum(data, 'badStock', 'badstock', 'bad_stock');
  const afterTaxes     = pickNum(data, 'afterTaxes', 'aftertaxes', 'afterTax', 'aftertax');

  const headerAmount = grossProfit || totalSalesPaid;
  const afterTaxAmount = afterTaxes || grossProfit;

  const fmt0 = (n: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);
  const fmt1 = (n: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n || 0);

  const rows = [
    { key: 'totalSalesPaid', label: 'Total Sales Paid', sub: 'Click To View Sales Report', value: totalSalesPaid, fmt: fmt0 },
    { key: 'debtCollected',  label: 'Debt Collected',   sub: 'Click To View Sales Report', value: debtCollected,  fmt: fmt0 },
    { key: 'grossProfit',    label: 'Gross Profit',     sub: 'Profit on sales',              value: grossProfit,    fmt: fmt0 },
    { key: 'netProfit',      label: 'Net Profit',       sub: 'Click to view more on Gross Profit – All deductions, taxes & Expenses', value: netProfit, fmt: fmt1 },
    { key: 'totalTaxes',     label: 'Total Taxes',      sub: '',                              value: totalTaxes,     fmt: fmt1 },
    { key: 'totalExpenses',  label: 'Total Expenses',   sub: 'All Expenses',                  value: totalExpenses,  fmt: fmt0 },
    { key: 'badStock',       label: 'Bad stock',        sub: 'Click to view bad stock',       value: badStock,       fmt: fmt0 },
  ];

  return (
    <div className="space-y-3" data-testid="netprofit-mobile">
      {/* Gross Profit pill */}
      <div className="flex flex-col items-center text-center">
        <div className="text-sm text-gray-700 mb-2">Gross Profit</div>
        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-purple-300 bg-white">
          <CreditCard className="h-4 w-4 text-purple-600" />
          <span className="text-xl font-bold text-purple-700" data-testid="text-gross-profit-header">
            {currency} {fmt0(headerAmount)}
          </span>
        </div>
        <div className="text-xs text-red-500 mt-1.5" data-testid="text-after-taxes">
          After taxes {currency} {fmt1(afterTaxAmount)}
        </div>
      </div>

      {/* List rows */}
      <div className="rounded-xl bg-gray-50 border border-gray-100 divide-y divide-gray-200">
        {rows.map((r) => (
          <div
            key={r.key}
            className="flex items-start justify-between gap-3 px-4 py-3"
            data-testid={`row-np-${r.key}`}
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900">{r.label}</div>
              {r.sub && <div className="text-[11px] text-gray-400 mt-0.5 leading-snug">{r.sub}</div>}
            </div>
            <div className="text-sm font-bold text-gray-900 whitespace-nowrap pt-0.5">
              {currency} {r.fmt(r.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NetProfitRaw({ data, currency }: { data: any; currency: string }) {
  if (data == null) return null;

  const renderValue = (val: any): React.ReactNode => {
    if (val == null || val === '') return <span className="text-gray-300">—</span>;
    if (typeof val === 'number') return <span>{currency} {fmtAmt(val)}</span>;
    if (typeof val === 'boolean') return <span>{val ? 'Yes' : 'No'}</span>;
    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="text-gray-300">[]</span>;
      return (
        <div className="space-y-1">
          {val.map((item, i) => (
            <div key={i} className="rounded border border-gray-100 bg-gray-50 p-2">
              {isPlainObject(item) ? <NetProfitRaw data={item} currency={currency} /> : renderValue(item)}
            </div>
          ))}
        </div>
      );
    }
    if (isPlainObject(val)) {
      return <NetProfitRaw data={val} currency={currency} />;
    }
    return <span className="break-words">{String(val)}</span>;
  };

  const entries = Object.entries(data);
  if (entries.length === 0) {
    return <div className="text-xs text-gray-400">Empty response.</div>;
  }

  return (
    <div className="rounded-lg border border-gray-100 bg-white divide-y divide-gray-100" data-testid="netprofit-raw">
      {entries.map(([k, v]) => {
        const nested = isPlainObject(v) || Array.isArray(v);
        return (
          <div
            key={k}
            className={
              nested
                ? 'p-2.5'
                : 'flex items-center justify-between gap-3 p-2.5 text-xs'
            }
            data-testid={`netprofit-row-${k}`}
          >
            <div className={nested ? 'text-xs font-semibold text-gray-600 mb-1.5' : 'text-gray-500 truncate'}>
              {humanizeKey(k)}
            </div>
            <div className={nested ? '' : 'font-semibold text-gray-800 text-right'}>
              {renderValue(v)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
                <NetProfitMobile data={netData} currency={currency} />
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

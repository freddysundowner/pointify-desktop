import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, CreditCard, RotateCcw, Loader2, Clock } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
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

export default function PurchasesSummary() {
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

  const opt = PERIOD_OPTS.find(p => p.key === period);
  const fromDate = showCustom && customFrom ? customFrom : (opt?.from() ?? today());
  const toDate   = showCustom && customTo   ? customTo   : (opt?.to()   ?? today());

  const url = effectiveShopId
    ? `/api/analysis/report/purchases?shopid=${effectiveShopId}&fromDate=${fromDate}&toDate=${toDate}`
    : null;

  const { data: rawData, isLoading, isError } = useQuery<any>({
    queryKey: [url],
    enabled: !!url,
    staleTime: 60_000,
  });

  const summary = Array.isArray(rawData) ? null : rawData;
  const cards   = Array.isArray(rawData) ? rawData : null;

  const getVal = (key: string) => {
    if (summary) return summary[key] ?? 0;
    if (cards) {
      const card = cards.find((c: any) => c.key === key || c.title?.toLowerCase().includes(key));
      return card?.amount ?? 0;
    }
    return 0;
  };

  const tiles = [
    { label: 'Total Purchases',  key: 'cash',    icon: ShoppingCart, color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
    { label: 'Credit Purchases', key: 'credit',  icon: CreditCard,   color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
    { label: 'Returns',          key: 'returns', icon: RotateCcw,    color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
    { label: 'On Hold',          key: 'hold',    icon: Clock,        color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  ];

  const normalizedCards = Array.isArray(rawData) ? rawData : null;

  return (
    <DashboardLayout title="Purchases Summary">
      <div className="space-y-3 pb-24 lg:pb-6">
        <PageHeader title="Purchases Summary" backHref={reportsRoute} />

        {/* Period Filter */}
        <div className="space-y-2">
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
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-purple-500" /></div>
        ) : isError ? (
          <div className="text-center py-8 text-sm text-red-500">Failed to load purchases summary.</div>
        ) : (
          <>
            {/* If API returns array of cards */}
            {normalizedCards ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {normalizedCards.map((card: any, i: number) => (
                  <Card key={i} className="border-blue-200">
                    <CardContent className="p-3">
                      <div className="text-[11px] text-gray-500">{card.title ?? card.key ?? `Item ${i+1}`}</div>
                      <div className="text-base font-bold text-blue-600">{currency} {fmtAmt(card.amount)}</div>
                      {card.description && <div className="text-[10px] text-gray-400 mt-0.5">{card.description}</div>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              /* If API returns object with named fields */
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {tiles.map(({ label, key, icon: Icon, color, bg, border }) => (
                  <Card key={key+label} className={`border ${border}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`h-3.5 w-3.5 ${color}`} />
                        </div>
                        <span className="text-[11px] text-gray-500 leading-tight">{label}</span>
                      </div>
                      <div className={`text-base font-bold ${color}`}>{currency} {fmtAmt(getVal(key))}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <p className="text-[11px] text-gray-400 text-center">
              Data from <strong>{fromDate}</strong> to <strong>{toDate}</strong>
            </p>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

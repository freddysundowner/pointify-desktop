import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useLocation } from "wouter";
import { RootState } from "@/store";
import { usePrimaryShop } from "@/hooks/usePrimaryShop";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, ShoppingCart, RotateCcw, ChevronRight } from "lucide-react";
import { useNavigationRoute } from "@/lib/navigation-utils";

const fmt = (val: any) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(val) || 0);

const toYMD = (d: Date) => d.toISOString().split("T")[0];
const today = () => toYMD(new Date());
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return toYMD(d); };

const PERIODS = [
  { key: "today",     label: "Today",      from: () => today(),     to: () => today() },
  { key: "yesterday", label: "Yesterday",  from: () => daysAgo(1),  to: () => daysAgo(1) },
  { key: "7days",     label: "This Week",  from: () => daysAgo(6),  to: () => today() },
  { key: "30days",    label: "This Month", from: () => daysAgo(29), to: () => today() },
];

interface SummaryData {
  cash?: number;
  credit?: number;
  returns?: number;
  paid?: number;
  totalpurchases?: number;
}

export default function PurchasesReportPage() {
  const currency = useSelector((s: RootState) => s.currency) || "KES";
  const { shopId } = usePrimaryShop();
  const reportsRoute = useNavigationRoute("reports");
  const purchasesRoute = useNavigationRoute("purchases");
  const [, setLocation] = useLocation();

  const [period, setPeriod] = useState("today");
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const opt = PERIODS.find(p => p.key === period);
  const fromDate = showCustom && customFrom ? customFrom : (opt?.from() ?? today());
  const toDate   = showCustom && customTo   ? customTo   : (opt?.to()   ?? today());

  const url = shopId
    ? `/api/analysis/report/purchases?shopid=${shopId}&fromDate=${fromDate}&toDate=${toDate}`
    : null;

  const { data, isLoading, isError } = useQuery<SummaryData>({
    queryKey: [url],
    enabled: !!url,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const totalPurchases = Number(data?.totalpurchases ?? 0);
  const creditPurchases = Number(data?.credit ?? 0);
  const returns = Number(data?.returns ?? 0);

  const rows = [
    {
      key: "total",
      title: "Total Purchases",
      description: "Click to view more details",
      amount: totalPurchases,
      icon: ShoppingCart,
      onClick: () => setLocation(purchasesRoute || "/purchases"),
    },
    {
      key: "credit",
      title: "Credit Purchases",
      description: "Purchases made on credit",
      amount: creditPurchases,
      icon: CreditCard,
      onClick: () => setLocation(purchasesRoute || "/purchases"),
    },
    {
      key: "returns",
      title: "Returns",
      description: "Purchases returned to suppliers",
      amount: returns,
      icon: RotateCcw,
      onClick: undefined,
    },
  ];

  return (
    <DashboardLayout title="Purchases Report">
      <div className="space-y-4 pb-24 lg:pb-8 max-w-3xl mx-auto w-full">
        <PageHeader title="Purchases Report" backHref={reportsRoute} />

        {/* Period chips */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {PERIODS.map(p => (
            <Button
              key={p.key}
              size="sm"
              variant={!showCustom && period === p.key ? "default" : "outline"}
              className="h-7 text-xs px-3 rounded-full"
              onClick={() => { setPeriod(p.key); setShowCustom(false); }}
              data-testid={`button-period-${p.key}`}
            >
              {p.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant={showCustom ? "default" : "outline"}
            className="h-7 text-xs px-3 rounded-full"
            onClick={() => setShowCustom(v => !v)}
            data-testid="button-period-custom"
          >
            Custom
          </Button>
          {showCustom && (
            <div className="flex gap-1.5 items-center ml-1 flex-wrap">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-7 text-xs border rounded px-2 bg-background"
                data-testid="input-custom-from"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-7 text-xs border rounded px-2 bg-background"
                data-testid="input-custom-to"
              />
            </div>
          )}
        </div>

        {/* Total pill */}
        <div className="flex justify-center pt-1">
          <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-4 py-1.5 shadow-sm">
            <CreditCard className="h-4 w-4" />
            <span className="text-sm font-semibold tabular-nums" data-testid="text-total-pill">
              {currency} {fmt(totalPurchases)}
            </span>
          </div>
        </div>

        {/* Summary card */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : isError ? (
              <div className="text-center py-10 text-sm text-red-500" data-testid="text-error">
                Failed to load purchases report.
              </div>
            ) : (
              <div className="divide-y">
                {rows.map(({ key, title, description, amount, icon: Icon, onClick }) => {
                  const clickable = !!onClick;
                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between gap-3 px-4 py-4 ${clickable ? "cursor-pointer hover:bg-muted/40 transition-colors" : ""}`}
                      onClick={onClick}
                      data-testid={`row-${key}`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold" data-testid={`text-title-${key}`}>{title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="text-sm font-bold tabular-nums" data-testid={`text-amount-${key}`}>
                          {currency} {fmt(amount)}
                        </div>
                        {clickable && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-[11px] text-muted-foreground text-center">
          {fromDate} → {toDate}
        </p>
      </div>
    </DashboardLayout>
  );
}

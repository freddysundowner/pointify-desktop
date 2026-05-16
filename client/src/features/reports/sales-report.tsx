import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { usePrimaryShop } from "@/hooks/usePrimaryShop";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CreditCard } from "lucide-react";
import { useNavigationRoute } from "@/lib/navigation-utils";

const fmt = (val: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val ?? 0);

type DateRangeKey = "today" | "yesterday" | "week" | "month" | "year" | "custom";

interface DateRange { label: string; key: DateRangeKey; }
const DATE_RANGES: DateRange[] = [
  { label: "Today",      key: "today"     },
  { label: "Yesterday",  key: "yesterday" },
  { label: "This Week",  key: "week"      },
  { label: "This Month", key: "month"     },
  { label: "This Year",  key: "year"      },
  { label: "Custom",     key: "custom"    },
];

function toYMD(d: Date) { return d.toISOString().split("T")[0]; }

function getRange(key: DateRangeKey): { from: string; to: string } {
  const now = new Date();
  switch (key) {
    case "today":
      return { from: toYMD(now), to: toYMD(now) };
    case "yesterday": {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return { from: toYMD(y), to: toYMD(y) };
    }
    case "week": {
      const day = now.getDay() === 0 ? 6 : now.getDay() - 1; // Monday = 0
      const mon = new Date(now); mon.setDate(now.getDate() - day);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { from: toYMD(mon), to: toYMD(sun) };
    }
    case "month": {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: toYMD(first), to: toYMD(last) };
    }
    case "year":
      return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
    default:
      return { from: toYMD(now), to: toYMD(now) };
  }
}

interface SalesReportData {
  cash?: number; credit?: number; debtpaid?: number;
  returns?: number; wallet?: number; hold?: number;
  [key: string]: number | undefined;
}

const ROWS = [
  { key: "cash",     title: "Cash Sales",     description: "All Sales made on cash"            },
  { key: "credit",   title: "Credit Sales",   description: "Sales made on credit"              },
  { key: "debtpaid", title: "Collected Debt", description: "Total credit paid by debtors"      },
  { key: "returns",  title: "Returns",        description: "Sales returned from customers"     },
  { key: "wallet",   title: "Wallet Sales",   description: "Sales sold through customer wallets" },
  { key: "hold",     title: "On hold sales",  description: "Sales that has not been cashed in" },
];

export default function SalesReportPage() {
  const currency = useSelector((state: RootState) => state.currency);
  const { shopId: effectiveShopId } = usePrimaryShop();
  const reportsRoute = useNavigationRoute("reports");

  const [activeKey, setActiveKey] = useState<DateRangeKey>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const isCustom = activeKey === "custom";
  const { from: autoFrom, to: autoTo } = getRange(activeKey);
  const fromDate = isCustom ? customFrom : autoFrom;
  const toDate   = isCustom ? customTo   : autoTo;

  const url = effectiveShopId && (!isCustom || (customFrom && customTo))
    ? `/api/analysis/sales/report?shopid=${effectiveShopId}&fromDate=${fromDate}&toDate=${toDate}`
    : null;

  const { data, isLoading, isError } = useQuery<SalesReportData>({
    queryKey: [url],
    enabled: !!url,
    staleTime: 60_000,
  });

  const total = (data?.cash ?? 0) + (data?.credit ?? 0) + (data?.debtpaid ?? 0) + (data?.wallet ?? 0);

  return (
    <DashboardLayout>
      <div className="space-y-5 pb-24 lg:pb-8 w-full max-w-2xl mx-auto lg:max-w-none">
        <PageHeader title="Sales Report" backHref={reportsRoute} />

        {/* Date filter tabs — horizontal scroll like Flutter */}
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-3 w-max pb-0.5">
            {DATE_RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setActiveKey(r.key)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeKey === r.key
                    ? "bg-primary text-white shadow-sm"
                    : "bg-white text-primary border border-primary/50 hover:border-primary"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date pickers */}
        {isCustom && (
          <div className="flex gap-3 items-center flex-wrap">
            <input
              type="date" value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="h-9 text-sm border border-input rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <input
              type="date" value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="h-9 text-sm border border-input rounded-lg px-3 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        {/* Total pill — centered purple like Flutter */}
        <div className="flex justify-center mt-2">
          <div className="inline-flex items-center gap-2.5 bg-primary text-white px-6 py-2.5 rounded-full">
            <CreditCard className="w-5 h-5" />
            {isLoading
              ? <div className="h-5 w-24 bg-white/30 animate-pulse rounded-full" />
              : <span className="text-base font-medium">{currency} {fmt(total)}</span>
            }
          </div>
        </div>

        {/* Error state */}
        {isError && (
          <Card>
            <CardContent className="p-6 text-center text-red-500">
              Failed to load sales report.
            </CardContent>
          </Card>
        )}

        {/* Summary card — matches Flutter summaryCard list */}
        {!isError && (
          <Card className="shadow-md">
            <CardContent className="p-4 lg:p-6">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div>
                  {ROWS.map((row, idx) => {
                    const amount = data?.[row.key] ?? 0;
                    const isLast = idx === ROWS.length - 1;
                    return (
                      <div key={row.key}>
                        <div className="flex items-start justify-between py-4 lg:py-5 cursor-pointer hover:bg-muted/20 -mx-4 px-4 lg:-mx-6 lg:px-6 transition-colors">
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="text-base lg:text-lg font-normal text-foreground">{row.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{row.description}</p>
                          </div>
                          <p className="text-base lg:text-lg font-bold text-foreground shrink-0">
                            {currency} {fmt(amount)}
                          </p>
                        </div>
                        {!isLast && <div className="border-t border-border" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

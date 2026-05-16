import { useLocation } from "wouter";
import { TrendingUp, DollarSign, Tag, Package, BarChart2, BarChart3, RotateCcw, ShoppingCart, Users, LineChart, Wallet, AlertCircle, ShoppingBag, BarChart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { useNavigationRoute } from "@/lib/navigation-utils";

const reportCards = [
  {
    href: "/sales-report",
    icon: DollarSign,
    color: "text-green-600",
    bg: "bg-green-50",
    title: "Sales Report",
    desc: "Cash, credit, wallet and on-hold sales totals",
  },
  {
    href: "/income-reports",
    icon: BarChart2,
    color: "text-blue-600",
    bg: "bg-blue-50",
    title: "Sales Summary",
    desc: "Detailed sales summary by date range",
  },
  {
    href: "/net-profit-report",
    icon: LineChart,
    color: "text-purple-600",
    bg: "bg-purple-50",
    title: "Income Report",
    desc: "Gross profit, net profit, taxes and expenses",
  },
  {
    href: "/expense-report",
    icon: Wallet,
    color: "text-red-600",
    bg: "bg-red-50",
    title: "Expenses Report",
    desc: "Track all expenses by date",
  },
  {
    href: "/due-sales",
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    title: "Due Sales",
    desc: "Credit sales which are due to be collected",
  },
  {
    href: "/purchases-report",
    icon: ShoppingBag,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    title: "Purchases Report",
    desc: "Purchase invoices and records",
  },
  {
    href: "/analysis-report",
    icon: BarChart,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    title: "Analysis",
    desc: "Monthly sales, profit and expenses graph",
  },
  {
    href: "/profit-analysis",
    icon: TrendingUp,
    color: "text-purple-600",
    bg: "bg-purple-50",
    title: "Profit Analysis",
    desc: "Net/gross profit by product and period",
  },
  {
    href: "/product-sales",
    icon: BarChart2,
    color: "text-blue-600",
    bg: "bg-blue-50",
    title: "Product Sales",
    desc: "Sales breakdown by product and type",
  },
  {
    href: "/discount-reports",
    icon: Tag,
    color: "text-orange-600",
    bg: "bg-orange-50",
    title: "Discount Reports",
    desc: "Discounts applied across all sales",
  },
  {
    href: "/sales-returns",
    icon: RotateCcw,
    color: "text-red-600",
    bg: "bg-red-50",
    title: "Sales Returns",
    desc: "Returned sales and refund records",
  },
  {
    href: "/stock-report",
    icon: Package,
    color: "text-teal-600",
    bg: "bg-teal-50",
    title: "Stock Report",
    desc: "Per-product stock levels and sales",
  },
  {
    href: "/purchases-summary",
    icon: ShoppingCart,
    color: "text-amber-600",
    bg: "bg-amber-50",
    title: "Purchases",
    desc: "Cash, credit and return purchase totals",
  },
  {
    href: "/debtors",
    icon: Users,
    color: "text-rose-600",
    bg: "bg-rose-50",
    title: "Debtors",
    desc: "Customers with outstanding balances",
  },
  {
    href: "/profit-loss",
    icon: BarChart3,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    title: "Profit & Loss",
    desc: "Overall P&L summary across periods",
  },
];

export default function ReportsHub() {
  const [, navigate] = useLocation();
  const dashboardRoute = useNavigationRoute('dashboard');

  return (
    <DashboardLayout title="Reports">
      <div className="space-y-3 pb-24 lg:pb-6">
        <PageHeader
          title="Reports"
          subtitle="Choose a report to view"
          onBack={() => window.history.back()}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {reportCards.map(({ href, icon: Icon, color, bg, title, desc }) => (
            <Card
              key={href}
              className="cursor-pointer hover:shadow-md transition-shadow active:scale-95"
              onClick={() => navigate(href)}
            >
              <CardContent className="p-3 sm:p-4">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${bg} flex items-center justify-center mb-2.5`}>
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${color}`} />
                </div>
                <p className="font-semibold text-xs sm:text-sm leading-tight">{title}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-snug hidden sm:block">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

import { useLocation } from "wouter";
import { ArrowLeft, TrendingUp, DollarSign, Tag, Package, ArrowUpDown, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import DashboardLayout from "@/components/layout/dashboard-layout";

const reportCards = [
  {
    href: "/profit-analysis",
    icon: TrendingUp,
    color: "text-purple-600",
    bg: "bg-purple-50",
    title: "Profit Analysis",
    desc: "View profit margins per product and period",
  },
  {
    href: "/income-reports",
    icon: DollarSign,
    color: "text-green-600",
    bg: "bg-green-50",
    title: "Income Reports",
    desc: "Breakdown of revenue by payment type and date",
  },
  {
    href: "/discount-reports",
    icon: Tag,
    color: "text-orange-600",
    bg: "bg-orange-50",
    title: "Discount Reports",
    desc: "Track discounts applied across all sales",
  },
  {
    href: "/stock-report",
    icon: Package,
    color: "text-blue-600",
    bg: "bg-blue-50",
    title: "Stock Report",
    desc: "Current stock levels, value and alerts",
  },
  {
    href: "/product-movements",
    icon: ArrowUpDown,
    color: "text-rose-600",
    bg: "bg-rose-50",
    title: "Product Movements",
    desc: "In/out stock movements and adjustments",
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

  return (
    <DashboardLayout title="Reports">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-base sm:text-xl font-bold leading-tight">Reports</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Choose a report to view</p>
          </div>
        </div>

        {/* Report Cards Grid */}
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

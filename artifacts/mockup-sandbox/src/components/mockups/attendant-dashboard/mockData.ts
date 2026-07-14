export interface ActionItem {
  title: string;
  icon: any;
  description: string;
  enabled: boolean;
  route: string;
}

export interface ActionGroup {
  id: string;
  title: string;
  icon: any;
  description: string;
  enabled: boolean;
  color: string;
  subActions: ActionItem[];
}

export const mockAttendant = {
  username: "fr",
  uniqueDigits: 53650,
};

export const mockShopName = "Riverside Cosmetics — Branch 1";

// A realistic permission set: cashier + view_sales only (matches a real
// cashier session captured from the live app), so most groups show as locked.
export function buildActionGroups(icons: Record<string, any>): ActionGroup[] {
  const {
    ShoppingCart, Package, Users, BarChart3, DollarSign, Truck, Receipt,
    TrendingUp, Wallet, UserCheck, ClipboardList, Archive, RefreshCw,
    AlertTriangle, ChefHat,
  } = icons;

  return [
    {
      id: "sales",
      title: "Sales & Orders",
      icon: ShoppingCart,
      description: "Process sales and manage orders",
      enabled: true,
      color: "bg-green-500",
      subActions: [
        { title: "Point of Sale", icon: ShoppingCart, description: "Process sales and transactions", enabled: false, route: "/attendant/pos" },
        { title: "Sales History", icon: Receipt, description: "View sales records and receipts", enabled: true, route: "/attendant/sales" },
        { title: "Pending Orders", icon: ChefHat, description: "Take payment for orders sent from the kitchen", enabled: true, route: "/attendant/pending-orders" },
      ],
    },
    {
      id: "inventory",
      title: "Inventory",
      icon: Package,
      description: "Manage products and stock",
      enabled: false,
      color: "bg-blue-500",
      subActions: [
        { title: "Products", icon: Package, description: "Manage inventory and stock", enabled: false, route: "/attendant/products" },
        { title: "Stock Summary", icon: Archive, description: "View stock analytics and insights", enabled: false, route: "/attendant/stock/summary" },
        { title: "Stock Count", icon: ClipboardList, description: "Perform inventory counting", enabled: false, route: "/attendant/stock-count" },
        { title: "Stock Transfer", icon: RefreshCw, description: "Transfer stock between locations", enabled: false, route: "/attendant/stock-transfer" },
        { title: "Bad Stock", icon: AlertTriangle, description: "Report damaged or expired inventory", enabled: false, route: "/attendant/stock/bad-stock" },
      ],
    },
    {
      id: "purchases",
      title: "Purchases",
      icon: Truck,
      description: "Manage purchase orders and returns",
      enabled: false,
      color: "bg-yellow-500",
      subActions: [
        { title: "Purchase Orders", icon: Truck, description: "Manage purchase orders", enabled: false, route: "/attendant/purchases" },
        { title: "Purchase Returns", icon: RefreshCw, description: "Manage purchase returns", enabled: false, route: "/attendant/purchases/returns" },
      ],
    },
    {
      id: "users",
      title: "Users",
      icon: Users,
      description: "Manage customers and suppliers",
      enabled: false,
      color: "bg-purple-500",
      subActions: [
        { title: "Customers", icon: Users, description: "Manage customer accounts", enabled: false, route: "/attendant/customers" },
        { title: "Suppliers", icon: UserCheck, description: "Manage supplier relationships", enabled: false, route: "/attendant/suppliers" },
      ],
    },
    {
      id: "accounts",
      title: "Accounts",
      icon: DollarSign,
      description: "Manage expenses and cash flow",
      enabled: false,
      color: "bg-red-500",
      subActions: [
        { title: "Expenses", icon: DollarSign, description: "Record business expenses", enabled: false, route: "/attendant/expenses" },
        { title: "Cash Flow", icon: Wallet, description: "Monitor cash flow operations", enabled: false, route: "/attendant/cashflow" },
      ],
    },
    {
      id: "reports",
      title: "Reports",
      icon: BarChart3,
      description: "View analytics and reports",
      enabled: false,
      color: "bg-orange-500",
      subActions: [
        { title: "Profit & Loss", icon: TrendingUp, description: "Analyze business profitability", enabled: false, route: "/attendant/profit-loss" },
      ],
    },
  ];
}

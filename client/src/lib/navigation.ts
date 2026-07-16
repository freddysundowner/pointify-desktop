import { Home, ScanBarcode, Package, Store, TrendingUp, ShoppingCart, Receipt, Users, Truck, DollarSign, UserCheck, BarChart3, FileText, Shield, User, Settings, Building2, Crown, Plus, ShoppingBag, Printer, MessageSquare, BedDouble } from "lucide-react";
import { getNavigationRoute } from "./navigation-utils";

export interface NavItem {
  href: string;
  icon?: any;
  label: string;
}

export interface MenuGroup {
  key: string;
  label: string;
  icon: any;
  items: NavItem[];
}

// Dynamic navigation items that adapt based on user type
export const getNavItems = (isAttendant: boolean): NavItem[] => [
  { href: getNavigationRoute('dashboard', isAttendant), icon: Home, label: "Dashboard" },
  { href: getNavigationRoute('pos', isAttendant), icon: ScanBarcode, label: "Point of Sale" },
];

// Legacy static items for backward compatibility
export const navItems: NavItem[] = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/pos", icon: ScanBarcode, label: "Point of Sale" },
];

// Dynamic menu groups that adapt based on user type
export const getMenuGroups = (isAttendant: boolean, isRestaurant: boolean = false, isGuestHouse: boolean = false): MenuGroup[] => [
  {
    key: "transactions",
    label: "Sales & Orders",
    icon: Receipt,
    items: [
      { href: getNavigationRoute('sales', isAttendant), label: "Sales" },
      { href: "/returns", label: "Returns" },
      { href: "/orders", label: "Orders" },
      ...(isRestaurant ? [{ href: isAttendant ? "/attendant/pending-orders" : "/pending-orders", label: "Pending Orders" }] : []),
    ]
  },
  ...(isGuestHouse
    ? [{
        key: "roomBookings",
        label: "Room Bookings",
        icon: BedDouble,
        items: [
          { href: "/bookings", label: "Rooms & Bookings" },
          { href: "/bookings/new", label: "New Booking" },
          { href: "/bookings/report", label: "Rooms Report" },
        ],
      }]
    : []),
  {
    key: "purchases",
    label: "Purchases",
    icon: ShoppingBag,
    items: [
      { href: getNavigationRoute('purchases', isAttendant), label: "Purchases" },
      { href: getNavigationRoute('purchaseReturns', isAttendant), label: "Purchase Returns" },
    ]
  },
  {
    key: "users",
    label: "Users",
    icon: Users,
    items: [
      { href: getNavigationRoute('customers', isAttendant), label: "Customers" },
      { href: getNavigationRoute('suppliers', isAttendant), label: "Suppliers" },
    ]
  },
  {
    key: "inventory",
    label: "Inventory",
    icon: TrendingUp,
    items: [
      { href: getNavigationRoute('products', isAttendant), label: "Products" },
      ...(!isAttendant ? [{ href: "/stock/categories", label: "Categories" }] : []),
      { href: getNavigationRoute('stockSummary', isAttendant), label: "Stock Summary" },
      { href: getNavigationRoute('stockCount', isAttendant), label: "Stock Count" },
      { href: getNavigationRoute('badStock', isAttendant), label: "Bad Stock" },
      { href: getNavigationRoute('stockTransfer', isAttendant), label: "Transfer" },
    ]
  },
  {
    key: "reports",
    label: "Reports",
    icon: DollarSign,
    items: [
      { href: "/reports", label: "All Reports" },
      { href: "/net-profit-report", label: "Income Report" },
      { href: "/sales-report", label: "Sales Report" },
      { href: "/expense-report", label: "Expense Report" },
      { href: "/due-sales", label: "Due Sales" },
      { href: "/purchases-report", label: "Purchases Report" },
      { href: "/analysis-report", label: "Analysis" },
      { href: getNavigationRoute('expenses', isAttendant), label: "Expenses" },
      { href: getNavigationRoute('cashflow', isAttendant), label: "Cash Flow" },
      { href: "/profit-loss", label: "Profit & Loss" },
      { href: "/debtors", label: "Debtors" },
    ]
  },
  {
    key: "management",
    label: "Management",
    icon: Crown,
    items: [
      { href: "/shops", label: "Shops" },
      { href: "/attendants", label: "Attendants" },
      { href: "/printer-config", label: "Printer Setup" },
      { href: "/sms-settings", label: "SMS Settings" },
      { href: "/subscription", label: "Subscription" },
    ]
  },
];

// Legacy static menu groups for backward compatibility
export const menuGroups: MenuGroup[] = [
  {
    key: "transactions",
    label: "Sales & Orders",
    icon: Receipt,
    items: [
      { href: "/sales", label: "Sales" },
      { href: "/returns", label: "Returns" },
      { href: "/orders", label: "Orders" },
    ]
  },
  {
    key: "purchases",
    label: "Purchases",
    icon: ShoppingBag,
    items: [
      { href: "/purchases", label: "Purchases" },
      { href: "/purchase-returns", label: "Purchase Returns" },
    ]
  },
  {
    key: "relationships",
    label: "Relationships",
    icon: Users,
    items: [
      { href: "/customers", label: "Customers" },
      { href: "/suppliers", label: "Suppliers" },
    ]
  },
  {
    key: "inventory",
    label: "Inventory",
    icon: TrendingUp,
    items: [
      { href: "/stock/products", label: "Products" },
      { href: "/stock/categories", label: "Categories" },
      { href: "/stock/summary", label: "Stock Summary" },
      { href: "/stock/count", label: "Stock Count" },
      { href: "/stock/bad-stock", label: "Bad Stock" },
      { href: "/stock/transfer", label: "Transfer" },
    ]
  },
  {
    key: "reports",
    label: "Reports",
    icon: DollarSign,
    items: [
      { href: "/reports", label: "All Reports" },
      { href: "/net-profit-report", label: "Income Report" },
      { href: "/sales-report", label: "Sales Report" },
      { href: "/expense-report", label: "Expense Report" },
      { href: "/due-sales", label: "Due Sales" },
      { href: "/purchases-report", label: "Purchases Report" },
      { href: "/analysis-report", label: "Analysis" },
      { href: "/expenses", label: "Expenses" },
      { href: "/cashflow", label: "Cash Flow" },
      { href: "/profit-loss", label: "Profit & Loss" },
      { href: "/debtors", label: "Debtors" },
    ]
  },
  {
    key: "management",
    label: "Management",
    icon: Crown,
    items: [
      { href: "/shops", label: "Shops" },
      { href: "/attendants", label: "Attendants" },
      { href: "/printer-config", label: "Printer Setup" },
      { href: "/sms-settings", label: "SMS Settings" },
      { href: "/subscription", label: "Subscription" },
    ]
  },
];
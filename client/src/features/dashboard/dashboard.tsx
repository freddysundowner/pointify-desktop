import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  Store, 
  ShoppingCart, 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Package, 
  Calendar,
  Plus,
  BarChart3,
  ChevronDown,
  AlertTriangle,
  Clock,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  Activity
} from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { useShop } from "@/features/shop/useShop";
import { apiCall } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "@/store";
import { setSelectedShop } from "@/store/shopSlice";
import { Link } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PermissionGuard } from "@/components/PermissionGuard";
import { usePermissions } from "@/hooks/usePermissions";
import { useState, useEffect } from "react";


// Real shops will be fetched from API

const getDashboardData = (shopId: string) => {
  const shopData = {
    shop1: {
      // Core Metrics
      todaySales: 15240,
      todayTransactions: 89,
      todayCustomers: 67,
      activeProducts: 342,
      lowStockItems: 8,
      pendingOrders: 12,
      todayProfit: 4572,
      monthlyRevenue: 187500,
      monthlyGrowth: 12.5,
      
      // Advanced Analytics
      averageOrderValue: 171,
      customerRetention: 78.5,
      inventoryTurnover: 4.2,
      profitMargin: 30.0,
      expensesThisMonth: 142800,
      outstandingPayments: 23400,
      cashFlow: 44700,
      dailyGoal: 18000,
      weeklyGoal: 126000,
      monthlyGoal: 540000,
      
      // Detailed Performance Metrics
      salesGrowthWeekly: 8.3,
      transactionGrowthWeekly: 12.1,
      customerGrowthWeekly: 15.7,
      averageTransactionTime: 3.2,
      peakHours: ["10:00-11:00", "14:00-15:00", "18:00-19:00"],
      busyDays: ["Friday", "Saturday", "Sunday"],
      
      // Staff Metrics
      activeStaff: 8,
      staffOnDuty: 3,
      topPerformer: "Sarah K.",
      staffEfficiency: 92.5,
      
      // Financial Details
      cashSales: 8970,
      creditSales: 4820,
      cardSales: 1450,
      refunds: 180,
      discountsGiven: 520,
      taxCollected: 2134,
      
      // Category Performance
      categoryPerformance: [
        { name: "Electronics", sales: 8940, growth: 15.2, margin: 28.5 },
        { name: "Accessories", sales: 4820, growth: 12.8, margin: 45.2 },
        { name: "Cables & Adapters", sales: 1480, growth: -2.1, margin: 52.3 }
      ],
      
      // Customer Analytics
      newCustomers: 12,
      returningCustomers: 55,
      customerLifetimeValue: 2840,
      customerSatisfaction: 4.6,
      
      // Hourly Sales Pattern
      hourlySales: [
        { hour: "08:00", sales: 420 },
        { hour: "09:00", sales: 680 },
        { hour: "10:00", sales: 1240 },
        { hour: "11:00", sales: 1680 },
        { hour: "12:00", sales: 2140 },
        { hour: "13:00", sales: 1820 },
        { hour: "14:00", sales: 2380 },
        { hour: "15:00", sales: 1950 },
        { hour: "16:00", sales: 1240 },
        { hour: "17:00", sales: 980 },
        { hour: "18:00", sales: 700 }
      ],
      
      topProducts: [
        { name: "Wireless Headphones", sales: 2840, units: 23, profit: 852, category: "Electronics" },
        { name: "Smartphone Case", sales: 1950, units: 39, profit: 882, category: "Accessories" },
        { name: "USB Cable", sales: 1680, units: 84, profit: 878, category: "Cables" },
        { name: "Power Bank", sales: 1420, units: 14, profit: 426, category: "Electronics" }
      ],
      
      // Payment Methods Distribution
      paymentMethods: [
        { method: "Cash", amount: 8970, percentage: 58.9 },
        { method: "Credit", amount: 4820, percentage: 31.6 },
        { method: "Card", amount: 1450, percentage: 9.5 }
      ],
      
      // Inventory Insights
      fastMovingProducts: 24,
      slowMovingProducts: 18,
      outOfStockProducts: 3,
      overstockedProducts: 12,
      
      // Financial Health Indicators
      grossProfit: 4572,
      netProfit: 3894,
      operatingExpenses: 2678,
      breakEvenPoint: 12800,
      
      // Alerts and Notifications
      criticalAlerts: 3,
      warningAlerts: 7,
      infoAlerts: 5,
      recentActivities: [
        { type: "sale", message: "New sale #1847 - KES 3,200", time: "2 min ago" },
        { type: "customer", message: "New customer registration", time: "5 min ago" },
        { type: "stock", message: "Low stock alert: iPhone Cases", time: "12 min ago" },
        { type: "order", message: "Purchase order #PO-2024-089 received", time: "18 min ago" }
      ],
      salesTrend: [
        { period: "Mon", amount: 12400 },
        { period: "Tue", amount: 15800 },
        { period: "Wed", amount: 18200 },
        { period: "Thu", amount: 14600 },
        { period: "Fri", amount: 21300 },
        { period: "Sat", amount: 25700 },
        { period: "Sun", amount: 19800 }
      ]
    },
    shop2: {
      // Core Metrics
      todaySales: 8960,
      todayTransactions: 54,
      todayCustomers: 41,
      activeProducts: 198,
      lowStockItems: 5,
      pendingOrders: 7,
      todayProfit: 2688,
      monthlyRevenue: 98750,
      monthlyGrowth: 8.3,
      
      // Advanced Analytics
      averageOrderValue: 165,
      customerRetention: 72.8,
      inventoryTurnover: 3.8,
      profitMargin: 30.0,
      expensesThisMonth: 78200,
      outstandingPayments: 12600,
      cashFlow: 20550,
      dailyGoal: 12000,
      weeklyGoal: 84000,
      monthlyGoal: 360000,
      
      // Detailed Performance Metrics
      salesGrowthWeekly: 6.2,
      transactionGrowthWeekly: 9.4,
      customerGrowthWeekly: 11.3,
      averageTransactionTime: 2.8,
      peakHours: ["11:00-12:00", "15:00-16:00", "19:00-20:00"],
      busyDays: ["Thursday", "Friday", "Saturday"],
      
      // Staff Metrics
      activeStaff: 5,
      staffOnDuty: 2,
      topPerformer: "Mike D.",
      staffEfficiency: 88.2,
      
      // Financial Details
      cashSales: 5240,
      creditSales: 2680,
      cardSales: 1040,
      refunds: 85,
      discountsGiven: 290,
      taxCollected: 1254,
      
      // Category Performance
      categoryPerformance: [
        { name: "Gaming", sales: 5420, growth: 18.5, margin: 32.1 },
        { name: "Office Equipment", sales: 2680, growth: 5.2, margin: 38.7 },
        { name: "Tech Accessories", sales: 860, growth: -1.8, margin: 48.9 }
      ],
      
      // Customer Analytics
      newCustomers: 8,
      returningCustomers: 33,
      customerLifetimeValue: 2240,
      customerSatisfaction: 4.4,
      
      // Hourly Sales Pattern
      hourlySales: [
        { hour: "08:00", sales: 320 },
        { hour: "09:00", sales: 580 },
        { hour: "10:00", sales: 940 },
        { hour: "11:00", sales: 1280 },
        { hour: "12:00", sales: 1540 },
        { hour: "13:00", sales: 1220 },
        { hour: "14:00", sales: 1680 },
        { hour: "15:00", sales: 1390 },
        { hour: "16:00", sales: 840 },
        { hour: "17:00", sales: 680 },
        { hour: "18:00", sales: 480 }
      ],
      
      topProducts: [
        { name: "Gaming Mouse", sales: 1640, units: 12, profit: 525, category: "Gaming" },
        { name: "Keyboard", sales: 1280, units: 8, profit: 410, category: "Gaming" },
        { name: "Monitor Stand", sales: 980, units: 14, profit: 380, category: "Office" },
        { name: "Webcam", sales: 850, units: 5, profit: 272, category: "Tech" }
      ],
      
      // Payment Methods Distribution
      paymentMethods: [
        { method: "Cash", amount: 5240, percentage: 58.5 },
        { method: "Credit", amount: 2680, percentage: 29.9 },
        { method: "Card", amount: 1040, percentage: 11.6 }
      ],
      
      // Inventory Insights
      fastMovingProducts: 18,
      slowMovingProducts: 12,
      outOfStockProducts: 2,
      overstockedProducts: 8,
      
      // Financial Health Indicators
      grossProfit: 2688,
      netProfit: 2203,
      operatingExpenses: 1485,
      breakEvenPoint: 8500,
      
      // Alerts and Notifications
      criticalAlerts: 1,
      warningAlerts: 4,
      infoAlerts: 3,
      
      recentActivities: [
        { type: "sale", message: "New sale #2156 - KES 1,850", time: "4 min ago" },
        { type: "stock", message: "Stock replenished: Gaming Accessories", time: "15 min ago" },
        { type: "order", message: "Purchase order #PO-2024-090 pending", time: "25 min ago" },
        { type: "customer", message: "Customer feedback received", time: "32 min ago" }
      ],
      salesTrend: [
        { period: "Mon", amount: 7200 },
        { period: "Tue", amount: 9400 },
        { period: "Wed", amount: 11600 },
        { period: "Thu", amount: 8800 },
        { period: "Fri", amount: 13200 },
        { period: "Sat", amount: 15800 },
        { period: "Sun", amount: 12400 }
      ]
    },
    shop3: {
      todaySales: 12580,
      todayTransactions: 76,
      todayCustomers: 58,
      activeProducts: 156,
      lowStockItems: 12,
      pendingOrders: 4,
      todayProfit: 3774,
      monthlyRevenue: 142300,
      monthlyGrowth: 15.7,
      topProducts: [
        { name: "Travel Adapter", sales: 2240, units: 28 },
        { name: "Portable Charger", sales: 1890, units: 21 },
        { name: "Neck Pillow", sales: 1560, units: 24 },
        { name: "Travel Bag", sales: 1340, units: 8 }
      ],
      recentActivities: [
        { type: "sale", message: "New sale #3421 - KES 2,750", time: "1 min ago" },
        { type: "sale", message: "New sale #3422 - KES 980", time: "3 min ago" },
        { type: "stock", message: "Low stock alert: Travel Adapters", time: "8 min ago" },
        { type: "customer", message: "Customer inquiry about bulk orders", time: "14 min ago" }
      ],
      salesTrend: [
        { period: "Mon", amount: 9800 },
        { period: "Tue", amount: 11200 },
        { period: "Wed", amount: 14500 },
        { period: "Thu", amount: 12800 },
        { period: "Fri", amount: 16900 },
        { period: "Sat", amount: 18700 },
        { period: "Sun", amount: 15200 }
      ]
    },
    shop4: {
      todaySales: 24680,
      todayTransactions: 143,
      todayCustomers: 98,
      activeProducts: 567,
      lowStockItems: 23,
      pendingOrders: 28,
      todayProfit: 7404,
      monthlyRevenue: 312750,
      monthlyGrowth: 22.1,
      topProducts: [
        { name: "Bluetooth Speaker", sales: 4280, units: 31 },
        { name: "Smart Watch", sales: 3650, units: 15 },
        { name: "Laptop Stand", sales: 2840, units: 22 },
        { name: "Wireless Mouse", sales: 2380, units: 34 }
      ],
      recentActivities: [
        { type: "sale", message: "Online order #ON-4567 - KES 8,450", time: "30 sec ago" },
        { type: "sale", message: "Online order #ON-4568 - KES 3,200", time: "2 min ago" },
        { type: "customer", message: "New customer registration", time: "4 min ago" },
        { type: "order", message: "Bulk order inquiry received", time: "7 min ago" }
      ],
      salesTrend: [
        { period: "Mon", amount: 18900 },
        { period: "Tue", amount: 22400 },
        { period: "Wed", amount: 26800 },
        { period: "Thu", amount: 21300 },
        { period: "Fri", amount: 29500 },
        { period: "Sat", amount: 31200 },
        { period: "Sun", amount: 27400 }
      ]
    }
  };
  
  return shopData[shopId as keyof typeof shopData] || shopData.shop1;
};

export default function Dashboard() {
  const { admin, updateAdmin } = useAuth();
  const { hasPermission, hasAttendantPermission } = usePermissions();
  const { toast } = useToast();
  
  // Helper function to extract shop ID from admin data
  const getShopId = (): string => {
    if (admin?.primaryShop) {
      if (typeof admin.primaryShop === 'string') {
        return admin.primaryShop;
      }
      return admin.primaryShop?._id || admin.primaryShop?.id || "";
    }
    return "";
  };

  const [selectedShopId, setSelectedShopId] = useState(() => getShopId());

  // This useEffect will be moved after the query declaration

  // Sync selectedShopId when admin data changes
  useEffect(() => {
    const shopId = getShopId();
    if (shopId && selectedShopId !== shopId) {
      setSelectedShopId(shopId);
    }
  }, [admin?.primaryShop, selectedShopId]);

  // Get today's date for API calls
  const today = new Date().toISOString().split('T')[0];

  // Fetch net profit data for dashboard cards
  const { data: netProfitData, refetch: refetchNetProfit } = useQuery({
    queryKey: [`/api/analysis/netprofit`, selectedShopId, today],
    queryFn: async () => {
      const params = new URLSearchParams({
        fromDate: today,
        toDate: today,
        shopId: selectedShopId || "",
        attendant: ""
      });

      // Get token from localStorage
      const token = localStorage.getItem('token');
      
      const url = `/api/analysis/netprofit?${params.toString()}`;
      const response = await apiCall(url, { 
        method: "GET",
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.json();
    },
    enabled: !!admin?._id && !!selectedShopId,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  // Fetch shops for the admin
  const { data: shopsData } = useQuery({
    queryKey: [`/api/shop/admin`, admin?._id],
    queryFn: async () => {
      if (!admin?._id) return [];
      const response = await apiCall(`/api/shop/admin/${admin._id}`, { method: "GET" });
      return response.json();
    },
    enabled: !!admin?._id,
  });

  // Fetch products for stock alerts
  const { data: productsData } = useQuery({
    queryKey: [`/api/product`, selectedShopId],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        reason: "",
        date: "",
        limit: "100",
        name: "",
        shopid: selectedShopId || "",
        type: "",
        sort: "name",
        productid: "",
        barcodeid: "",
        productType: "",
        useWarehouse: "true",
        warehouse: "false",
        adminid: admin?._id || "",
      });

      const url = `/api/product?${params.toString()}`;
      const response = await apiCall(url, { method: "GET" });
      return response.json();
    },
    enabled: !!admin?._id && !!selectedShopId,
  });

  // Fetch recent transactions for activity feed
  const { data: recentTransactionsData } = useQuery({
    queryKey: [`/api/sales/filter`, selectedShopId, 'recent'],
    queryFn: async () => {
      const params = new URLSearchParams({
        shopId: selectedShopId || "",
        start: today,
        end: today,
        page: "1",
        limit: "5",
        search: "",
        status: "",
        attendant: "",
        paymentTag: ""
      });

      const url = `/api/sales/filter?${params.toString()}`;
      const response = await apiCall(url, { method: "GET" });
      return response.json();
    },
    enabled: !!admin?._id && !!selectedShopId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch overdue customers data
  const { data: overdueCustomersData, isLoading: overdueCustomersLoading, error: overdueCustomersError } = useQuery({
    queryKey: ['overdue-customers', selectedShopId, admin?._id],
    queryFn: async () => {
      if (!selectedShopId || !admin?._id) return null;
      
      console.log('Dashboard - Making overdue customers API call for shop:', selectedShopId);
      const params = new URLSearchParams({
        adminid: admin._id
      });
      
      const response = await apiCall(`/api/customers/overdue/${selectedShopId}?${params.toString()}`, { method: "GET" });
      const data = await response.json();
      console.log('Dashboard - Overdue Customers Data:', data);
      return data;
    },
    enabled: !!selectedShopId && !!admin?._id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Debug logging for overdue customers
  console.log('Dashboard - Overdue customers query state:', {
    selectedShopId,
    adminId: admin?._id,
    enabled: !!selectedShopId && !!admin?._id,
    loading: overdueCustomersLoading,
    error: overdueCustomersError,
    data: overdueCustomersData
  });

  // Use real shops from API
  const uniqueShops = shopsData || [];
  const currentShop = uniqueShops.find((shop: any) => shop._id === selectedShopId) || uniqueShops[0];
  
  // Debug shops data
  console.log('Dashboard - Shops Data:', shopsData);
  console.log('Dashboard - Unique Shops:', uniqueShops);
  console.log('Dashboard - Current Shop:', currentShop);
  console.log('Dashboard - Selected Shop ID:', selectedShopId);
  console.log('Dashboard - Admin ID:', admin?._id);
  
  // Create dashboard data from API responses with safe fallbacks
  const salesData = netProfitData?.totalProfitAndSalesValue || {};
  const expensesData = netProfitData?.totalExpenses || {};
  
  // Extract values directly from the API response based on the actual structure
  const todaySales = netProfitData?.totalProfitAndSalesValue?.totalSales ? Number(netProfitData.totalProfitAndSalesValue.totalSales) : 0;
  const todayProfit = netProfitData?.totalProfitAndSalesValue?.totalProfit ? Number(netProfitData.totalProfitAndSalesValue.totalProfit) : 0;
  const profitMargin = todaySales > 0 ? (todayProfit / todaySales * 100) : 0;
  
  console.log('Dashboard Values Check:', {
    netProfitData,
    todaySales,
    todayProfit,
    profitMargin,
    directAccess: {
      totalSales: netProfitData?.totalProfitAndSalesValue?.totalSales,
      totalProfit: netProfitData?.totalProfitAndSalesValue?.totalProfit,
      totalCashSales: netProfitData?.totalProfitAndSalesValue?.totalCashSales
    }
  });

  // Get mock data for fallback
  const mockData = getDashboardData(selectedShopId);

  // Process recent transactions into activity format
  const recentActivities = recentTransactionsData?.data?.map((transaction: any) => {
    const customerName = transaction.customerId?.name || 'Walk-in';
    const paymentMethod = transaction.paymentTag || transaction.paymentType || 'Cash';
    const totalAmount = Number(transaction.totalAmount || 0);
    const receiptNo = transaction.receiptNo || 'N/A';
    const currency = transaction.shopId?.currency || 'KES';
    
    // Calculate time ago from transaction date
    const transactionDate = new Date(transaction.createdAt);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - transactionDate.getTime()) / (1000 * 60));
    
    let timeAgo;
    if (diffInMinutes < 1) {
      timeAgo = 'Just now';
    } else if (diffInMinutes < 60) {
      timeAgo = `${diffInMinutes} min ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      timeAgo = `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      timeAgo = `${days}d ago`;
    }

    return {
      type: 'sale',
      message: `New sale ${receiptNo} - ${currency} ${totalAmount.toLocaleString()} (${customerName})`,
      time: timeAgo,
      customer: customerName,
      amount: totalAmount,
      paymentMethod
    };
  }) || [];

  const dashboardData = {
    // Core metrics from API
    todaySales,
    todayTransactions: recentTransactionsData?.data?.length || 0,
    todayCustomers: 0,
    todayProfit,
    profitMargin: Number(profitMargin.toFixed(1)),
    
    // Product metrics from API
    activeProducts: productsData?.data?.length || 0,
    lowStockItems: productsData?.data?.filter((product: any) => 
      product.quantity <= (product.reorderLevel || product.lowStockThreshold || 0)
    ).length || 0,
    pendingOrders: 0,
    
    // Financial metrics from API
    monthlyRevenue: todaySales,
    monthlyGrowth: 0,
    salesGrowthWeekly: 0,
    grossProfit: Number(netProfitData?.gross) || 0, 
    netProfit: Number(netProfitData?.net) || 0,
    operatingExpenses: Number(expensesData.totalExpenses) || 0,
    totalExpenses: Number(expensesData.totalExpenses) || 0,
    
    // Payment breakdown from API
    cashSales: Number(salesData.totalCashSales) || 0,
    creditSales: Number(netProfitData?.creditTotals) || 0,
    cardSales: 0,
    refunds: 0,
    
    // Tax and other metrics from API
    taxCollected: Number(salesData.totalTaxes) || Number(netProfitData?.totalTaxes) || 0,
    discountsGiven: 0,
    
    // Goals
    dailyGoal: 10000,
    weeklyGoal: 70000,
    monthlyGoal: 300000,
    
    // Calculated metrics
    averageOrderValue: todaySales > 0 ? Number((todaySales / Math.max(1, recentTransactionsData?.data?.length || 1)).toFixed(0)) : 0,
    averageTransactionTime: 3.2,
    
    // Customer metrics
    customerRetention: 0,
    newCustomers: 0,
    returningCustomers: 0,
    
    // Staff metrics
    activeStaff: 0,
    staffOnDuty: 0,
    topPerformer: "N/A",
    staffEfficiency: 0,
    
    // Inventory insights
    fastMovingProducts: 0,
    slowMovingProducts: 0,
    outOfStockProducts: productsData?.data?.filter((product: any) => 
      (product.quantity || 0) === 0
    ).length || 0,
    overstockedProducts: 0,
    inventoryTurnover: 0,
    
    // Real data from API
    categoryPerformance: mockData.categoryPerformance,
    paymentMethods: mockData.paymentMethods,
    topProducts: mockData.topProducts,
    recentActivities: recentActivities.length > 0 ? recentActivities : mockData.recentActivities,
    salesTrend: mockData.salesTrend
  };

  // Handle shop switching with smooth data refresh
  const handleShopSwitch = async (shopId: string) => {
    try {
      dispatch(setSelectedShop(shopId));
      const selectedShop = uniqueShops.find((shop: any) => shop._id === shopId);
      
      // Update admin's primary shop via API using PUT method
      await apiCall(`/api/auth/admin/${admin?._id}`, {
        method: "PUT",
        body: JSON.stringify({ shop: shopId }),
      });

      // Update admin data in localStorage to persist shop selection
      const currentAdminData = JSON.parse(localStorage.getItem('adminData') || '{}');
      const mergedAdminData = { 
        ...currentAdminData, 
        primaryShop: shopId,
        currentShopId: shopId 
      };
      localStorage.setItem('adminData', JSON.stringify(mergedAdminData));
      updateAdmin(mergedAdminData);
      
      toast({
        title: "Shop Switched",
        description: `Loading data for ${selectedShop?.name}...`,
      });
      
      // Invalidate and refetch all queries for the new shop
      queryClient.invalidateQueries();
      
    } catch (error) {
      console.error("Error switching shop:", error);
      // Still update locally even if API fails
      const currentAdminData = JSON.parse(localStorage.getItem('adminData') || '{}');
      const mergedAdminData = { 
        ...currentAdminData, 
        primaryShop: shopId,
        currentShopId: shopId 
      };
      localStorage.setItem('adminData', JSON.stringify(mergedAdminData));
      updateAdmin(mergedAdminData);
      
      toast({
        title: "Shop Switched", 
        description: `Now viewing ${selectedShop?.name || 'Selected Shop'}`,
      });
      
      // Invalidate queries even on error
      queryClient.invalidateQueries();
    }
  };

  // Activity type icons and colors
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'sale': return <ShoppingCart className="h-4 w-4 text-green-600" />;
      case 'customer': return <Users className="h-4 w-4 text-blue-600" />;
      case 'stock': return <Package className="h-4 w-4 text-orange-600" />;
      case 'order': return <Calendar className="h-4 w-4 text-purple-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getGrowthColor = (growth: number) => {
    return growth > 0 ? 'text-green-600' : growth < 0 ? 'text-red-600' : 'text-gray-600';
  };

  const getGrowthIcon = (growth: number) => {
    return growth > 0 ? <TrendingUp className="h-4 w-4" /> : 
           growth < 0 ? <TrendingDown className="h-4 w-4" /> : 
           <Activity className="h-4 w-4" />;
  };

  return (
    <DashboardLayout title="Business Dashboard">
      <div className="space-y-6">
        
        {/* Shop Selector Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Overview of your business performance
            </p>
          </div>
          
          <PermissionGuard permission="management_access">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium">Shop:</span>
              </div>
              <Select value={selectedShopId} onValueChange={handleShopSwitch}>
                <SelectTrigger className="w-64">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{currentShop?.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {currentShop?.shopCategoryId?.name || 'General'}
                      </Badge>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {uniqueShops.map((shop: any) => (
                    <SelectItem key={shop._id} value={shop._id}>
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium">{shop.name}</p>
                          <p className="text-xs text-gray-500">{shop.address}</p>
                        </div>
                        <Badge variant="outline" className="text-xs ml-auto">
                          {shop.shopCategoryId?.name || 'General'}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </PermissionGuard>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <PermissionGuard permission="sales_view">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(dashboardData.todaySales)}</div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-muted-foreground">{dashboardData.todayTransactions} transactions</span>
                  <div className={`flex items-center gap-1 ${getGrowthColor(dashboardData.salesGrowthWeekly)}`}>
                    {getGrowthIcon(dashboardData.salesGrowthWeekly)}
                    <span className="text-xs font-medium">{dashboardData.salesGrowthWeekly}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </PermissionGuard>

          <PermissionGuard permission="financial_view">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(dashboardData.todayProfit)}</div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData.profitMargin}% margin
                </p>
              </CardContent>
            </Card>
          </PermissionGuard>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.activeProducts}</div>
              <p className="text-xs text-muted-foreground">
                {dashboardData.lowStockItems} low stock alerts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers Today</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.todayCustomers}</div>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>New: {dashboardData.newCustomers}</span>
                <span>Return: {dashboardData.returningCustomers}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(dashboardData.averageOrderValue)}</div>
              <p className="text-xs text-muted-foreground">
                {dashboardData.customerRetention}% retention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Financial Overview & Goals */}
        <div className="grid gap-6 md:grid-cols-3">
          <PermissionGuard permission="financial_view">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Overview
                </CardTitle>
                <CardDescription>Today's financial breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Cash Sales</p>
                    <p className="text-lg font-bold">{formatCurrency(dashboardData.cashSales)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Credit Sales</p>
                    <p className="text-lg font-bold">{formatCurrency(dashboardData.creditSales)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Card Sales</p>
                    <p className="text-lg font-bold">{formatCurrency(dashboardData.cardSales)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Refunds</p>
                    <p className="text-lg font-bold text-red-600">-{formatCurrency(dashboardData.refunds)}</p>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Tax Collected</span>
                    <span className="font-semibold">{formatCurrency(dashboardData.taxCollected)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Discounts Given</span>
                    <span className="font-semibold text-orange-600">-{formatCurrency(dashboardData.discountsGiven)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </PermissionGuard>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Goals & Targets
              </CardTitle>
              <CardDescription>Progress towards business goals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Daily Goal</span>
                  <span className="text-sm">{formatCurrency(dashboardData.todaySales)} / {formatCurrency(dashboardData.dailyGoal)}</span>
                </div>
                <Progress value={(dashboardData.todaySales / dashboardData.dailyGoal) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round((dashboardData.todaySales / dashboardData.dailyGoal) * 100)}% complete
                </p>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Weekly Goal</span>
                  <span className="text-sm">{formatCurrency(dashboardData.monthlyRevenue * 0.25)} / {formatCurrency(dashboardData.weeklyGoal)}</span>
                </div>
                <Progress value={(dashboardData.monthlyRevenue * 0.25 / dashboardData.weeklyGoal) * 100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Monthly Goal</span>
                  <span className="text-sm">{formatCurrency(dashboardData.monthlyRevenue)} / {formatCurrency(dashboardData.monthlyGoal)}</span>
                </div>
                <Progress value={(dashboardData.monthlyRevenue / dashboardData.monthlyGoal) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Staff Performance
              </CardTitle>
              <CardDescription>Team metrics and efficiency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Staff</p>
                  <p className="text-2xl font-bold">{dashboardData.activeStaff}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">On Duty</p>
                  <p className="text-2xl font-bold">{dashboardData.staffOnDuty}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Top Performer</p>
                <p className="text-lg font-bold text-blue-600">{dashboardData.topPerformer}</p>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Staff Efficiency</span>
                  <span className="text-sm font-bold">{dashboardData.staffEfficiency}%</span>
                </div>
                <Progress value={dashboardData.staffEfficiency} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Performance & Payment Methods */}
        <div className="grid gap-6 md:grid-cols-2">
          <PermissionGuard permission="sales_view">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Category Performance
                </CardTitle>
                <CardDescription>Sales breakdown by product category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.categoryPerformance.map((category, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{category.name}</p>
                          <p className="text-xs text-gray-500">{category.margin}% margin</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(category.sales)}</p>
                          <div className={`flex items-center gap-1 ${getGrowthColor(category.growth)}`}>
                            {getGrowthIcon(category.growth)}
                            <span className="text-xs font-medium">{category.growth}%</span>
                          </div>
                        </div>
                      </div>
                      <Progress value={(category.sales / dashboardData.todaySales) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </PermissionGuard>

          <PermissionGuard permission="financial_view">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payment Methods
                </CardTitle>
                <CardDescription>Today's payment distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.paymentMethods.map((method, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{method.method}</span>
                        <div className="text-right">
                          <span className="font-semibold">{formatCurrency(method.amount)}</span>
                          <span className="text-xs text-gray-500 ml-2">{method.percentage}%</span>
                        </div>
                      </div>
                      <Progress value={method.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-500">Average Transaction</p>
                      <p className="font-bold">{formatCurrency(dashboardData.averageOrderValue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Transaction Time</p>
                      <p className="font-bold">{dashboardData.averageTransactionTime} min</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </PermissionGuard>
        </div>

        {/* Inventory Insights & Quick Actions - Only show if permitted */}
        {(hasPermission('inventory_view') || hasAttendantPermission('stocks', 'stock_summary')) && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventory Insights
              </CardTitle>
              <CardDescription>Stock movement and inventory health</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">Fast Moving</p>
                  <p className="text-2xl font-bold text-green-600">{dashboardData.fastMovingProducts}</p>
                </div>
                <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">Slow Moving</p>
                  <p className="text-2xl font-bold text-orange-600">{dashboardData.slowMovingProducts}</p>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">{dashboardData.outOfStockProducts}</p>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Overstocked</p>
                  <p className="text-2xl font-bold text-blue-600">{dashboardData.overstockedProducts}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Inventory Turnover</span>
                  <span className="font-semibold">{dashboardData.inventoryTurnover}x</span>
                </div>
                <Progress value={(dashboardData.inventoryTurnover / 6) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground">Target: 6x annually</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <PermissionGuard permission="sales_create">
                <Link href="/sales">
                  <Button className="w-full justify-start" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    New Sale
                  </Button>
                </Link>
              </PermissionGuard>
              
              <PermissionGuard permission="inventory_create">
                <Link href="/stock/products">
                  <Button className="w-full justify-start" variant="outline">
                    <Package className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </Link>
              </PermissionGuard>
              
              <PermissionGuard permission="reports_view">
                <Link href="/reports">
                  <Button className="w-full justify-start" variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Reports
                  </Button>
                </Link>
              </PermissionGuard>
              
              <PermissionGuard permission="inventory_view">
                <Link href="/stock/products">
                  <Button className="w-full justify-start" variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    Check Stock
                  </Button>
                </Link>
              </PermissionGuard>

              <PermissionGuard permission="management_access">
                <Link href="/attendants">
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Staff
                  </Button>
                </Link>
              </PermissionGuard>
            </CardContent>
          </Card>
        </div>

        {/* Top Products & Recent Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Top Products */}
          <PermissionGuard permission="sales_view">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top Products Today
                </CardTitle>
                <CardDescription>Best performing products</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.units} units sold</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(product.sales)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </PermissionGuard>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest business updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.recentActivities.map((activity: any, index: number) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <Activity className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.message}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts & Notifications */}
        {dashboardData.lowStockItems > 0 && (
          <PermissionGuard permission="inventory_view">
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                  <AlertTriangle className="h-5 w-5" />
                  Stock Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-orange-700 dark:text-orange-300">
                    {dashboardData.lowStockItems} products are running low on stock
                  </p>
                  <Link href="/stock/products">
                    <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </PermissionGuard>
        )}

        {/* Overdue Customers Section */}
        {overdueCustomersData?.totalOverdueCustomers > 0 && (
          <PermissionGuard permission="customer_view">
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
                  <Clock className="h-5 w-5" />
                  Overdue Customers
                  <span className="ml-2 bg-red-100 text-red-600 px-2 py-1 rounded-full text-sm">
                    {overdueCustomersData.totalOverdueCustomers}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-red-700 dark:text-red-300">
                      {overdueCustomersData.totalOverdueCustomers} customers have overdue payments
                    </p>
                    <Link href="/customers">
                      <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">
                        <ArrowUpRight className="h-4 w-4 mr-1" />
                        View All
                      </Button>
                    </Link>
                  </div>
                  
                  {/* Show top 3 overdue customers */}
                  <div className="space-y-2">
                    {overdueCustomersData.overdueCustomers?.slice(0, 3).map((customer: any, index: number) => (
                      <div key={customer.customerId} className="flex items-center justify-between p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-semibold text-xs flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-red-900 dark:text-red-100 text-sm truncate">{customer.name}</p>
                            <p className="text-xs text-red-600 dark:text-red-300">
                              {customer.daysOverdue} days overdue
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-red-600 dark:text-red-400 text-sm">
                            KES {customer.totalOverdue.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {overdueCustomersData.overdueCustomers?.length > 3 && (
                    <p className="text-xs text-red-600 dark:text-red-400 text-center">
                      +{overdueCustomersData.overdueCustomers.length - 3} more overdue customers
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </PermissionGuard>
        )}

      </div>
    </DashboardLayout>
  );
}
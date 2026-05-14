import { useState, useEffect, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector, useDispatch } from "react-redux";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/features/auth/useAuth";
import { useShop } from "@/features/shop/useShop";
import { apiCall } from "@/lib/api-config";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
dayjs.extend(relativeTime);


const timeAgo = (date) => {
  return dayjs.utc(date).format("DD/MM/YYYY hh:mm:ss A");
};

import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Package, 
  AlertTriangle,
  ShoppingCart,
  Users,
  ChevronLeft,
  ChevronRight,
  Eye,
  Clock,
  Store,
  RefreshCw,
  UserCheck,
  Settings,
  X,
  ScanBarcode,
  BarChart3,
  Banknote,
  Truck,
  Receipt
} from "lucide-react";
import { Link } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { RootState, AppDispatch } from "@/store";
import { setSelectedShop, setSelectedShopData, setAvailableShops, initializeSelectedShop } from "@/store/shopSlice";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { formatCurrency, formatDate, formatTime, useCurrency } from "@/utils";

export default function BusinessDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const currency = useCurrency();
  const { selectedShopId, availableShops } = useSelector((state: RootState) => state.shop);
  const [currentPage, setCurrentPage] = useState(1);
  const salesPerPage = 10;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedAttendantId, setSelectedAttendantId] = useState<string>("all");

  const [showSubscriptionAlert, setShowSubscriptionAlert] = useState(true);
  const { admin, updateAdmin } = useAuth();
  const { shop } = useShop();
  const { toast } = useToast();
  const { isExpired: isSubscriptionExpired } = useSubscriptionStatus();
  const [location] = useLocation();

  // Get effective shop ID from Redux state
  const effectiveShopId = selectedShopId || 
    (admin?.primaryShop && typeof admin.primaryShop === 'string' 
      ? admin.primaryShop 
      : (admin?.primaryShop as any)?._id || (admin?.primaryShop as any)?.id);

  // Fetch attendants for the admin
  const { data: rawAttendants = [] } = useQuery({
    queryKey: ['/api/attendants/all', admin?._id],
    queryFn: async () => {
      const adminId = admin?._id || admin?.id;
      const response = await apiCall(`/api/attendants/all/${adminId}`, { method: "GET" });
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!admin?._id,
  });
  const attendants: any[] = Array.isArray(rawAttendants) ? rawAttendants : [];

  // Fetch products for stock alerts
  const { data: productsData } = useQuery({
    queryKey: [`/api/product`, effectiveShopId],
    queryFn: async ({ queryKey }) => {
      const params = new URLSearchParams({
        page: "1",
        reason: "",
        date: "",
        limit: "100",
        name: "",
        shopid: effectiveShopId || "",
        type: "",
        sort: "name",
        productid: "",
        barcodeid: "",
        productType: "",
        useWarehouse: "true",
        warehouse: shop?.warehouse?.toString() || "false",
        adminid: admin?._id || "",
      });

      const url = `/api/product?${params.toString()}`;
      const response = await apiCall(url, { method: "GET" });
      return response.json();
    },
    enabled: !!admin?._id && !!effectiveShopId,
  });

  // Get today's date for the net profit API call
  const today = new Date().toISOString().split('T')[0];

  // Fetch net profit data for dashboard cards
  const { data: netProfitData, refetch: refetchNetProfit } = useQuery({
    queryKey: [`/api/analysis/netprofit`, effectiveShopId, today],
    queryFn: async () => {
      const params = new URLSearchParams({
        fromDate: today,
        toDate: today,
        shopId: effectiveShopId || "",
        attendant: ""
      });

      const url = `/api/analysis/netprofit/?${params.toString()}`;
      const response = await apiCall(url, { method: "GET" });
      return response.json();
    },
    enabled: !!admin?._id && !!effectiveShopId,
  });

  // Fetch recent sales data for homepage - limited to 20 records
  const { data: salesData, isLoading: isSalesLoading, refetch: refetchSalesData } = useQuery({
    queryKey: [`/api/sales/filter`, effectiveShopId, today, selectedAttendantId],
    queryFn: async () => {
      const shopId = effectiveShopId || "";
      const params = new URLSearchParams({
        shopId: shopId,
        limit: "20",
        page: "1",
        production: "false"
      });

      // Add attendant filter if selected
      if (selectedAttendantId && selectedAttendantId !== "all") {
        params.append("attendantId", selectedAttendantId);
      }

      const url = `/api/sales/filter?${params.toString()}`;
      const response = await apiCall(url, { method: "GET" });
      return response.json();
    },
    enabled: !!admin?._id && !!effectiveShopId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });


  // Fetch shops for the admin
  const { data: shopsData } = useQuery({
    queryKey: ["shops", admin?._id],
    queryFn: async () => {
      if (!admin?._id) return [];
      const response = await apiCall(`/api/shop/admin/${admin._id}`, { method: "GET" });
      const data = await response.json();
      return data;
    },
    enabled: !!admin?._id,
  });

  // Update Redux state when shops data changes
  useEffect(() => {
    if (shopsData && Array.isArray(shopsData)) {
      const shops = shopsData.map((shop: any) => ({
        id: shop._id,
        name: shop.name,
        type: shop.shopCategoryId?.name || 'General',
        location: shop.address
      }));
      dispatch(setAvailableShops(shops));
    }
  }, [shopsData, dispatch]);

  // Function to refresh all dashboard data
  const refreshDashboardData = async () => {
    await Promise.all([
      refetchNetProfit(),
      refetchSalesData()
    ]);
  };

  // Fetch overdue customers data - only on business dashboard page
  const { data: overdueCustomersData, isLoading: overdueCustomersLoading, error: overdueCustomersError } = useQuery({
    queryKey: ['overdue-customers', effectiveShopId, admin?._id],
    queryFn: async () => {
      if (!effectiveShopId || !admin?._id) return null;
      
      const params = new URLSearchParams({
        adminid: admin._id
      });
      
      const response = await apiCall(`/api/customers/overdue/${effectiveShopId}?${params.toString()}`, { method: "GET" });
      const data = await response.json();
      return data;
    },
    enabled: !!admin?._id && (location === '/business-dashboard' || location === '/dashboard'),
    staleTime: 0, // 5 minutes
    refetchInterval: false, // Disable auto-refetch
  });





  const currentShopData = availableShops.find(shop => shop.id === selectedShopId) || availableShops[0];

  // Initialize selected shop from admin data - reset shop selection for new users
  useEffect(() => {
    if (availableShops.length > 0 && admin?._id) {
      // localStorage selection always wins over the API's primaryShop so
      // manual shop switches persist across page refreshes
      const storedShopId = localStorage.getItem('selectedShopId');
      const storedBelongsToAdmin = storedShopId
        ? availableShops.find(s => s.id === storedShopId)
        : null;

      const primaryShopId = typeof admin?.primaryShop === 'string'
        ? admin.primaryShop
        : admin?.primaryShop?._id || admin?.primaryShop?.id;

      const currentShopBelongsToAdmin = availableShops.find(shop => shop.id === selectedShopId);

      let resolvedShopId = selectedShopId;

      if (!selectedShopId || !currentShopBelongsToAdmin) {
        // Prefer: stored user selection → API primaryShop → first shop
        const preferredId = storedBelongsToAdmin
          ? storedShopId!
          : primaryShopId;

        if (preferredId) {
          const shopExists = availableShops.find(shop => shop.id === preferredId);
          const shopToSelect = shopExists ? preferredId : availableShops[0]?.id;
          if (shopToSelect) {
            dispatch(setSelectedShop(shopToSelect));
            resolvedShopId = shopToSelect;
          }
        } else if (availableShops[0]?.id) {
          dispatch(setSelectedShop(availableShops[0].id));
          resolvedShopId = availableShops[0].id;
        }
      }

      // Always ensure Redux + localStorage have the full shop object for the resolved shop
      // so usePrimaryShop can derive shopCategoryId (e.g. for laundry features) reactively
      if (resolvedShopId && Array.isArray(shopsData)) {
        const fullShop = (shopsData as any[]).find((s: any) => s._id === resolvedShopId);
        if (fullShop) {
          dispatch(setSelectedShopData(fullShop));

          // Also sync admin.primaryShop so pages that read it directly (without selectedShopId
          // fallback) also reflect the correct shop — especially important after page refresh
          const currentPrimaryId = typeof admin?.primaryShop === 'string'
            ? admin.primaryShop
            : (admin?.primaryShop as any)?._id;
          if (currentPrimaryId !== resolvedShopId) {
            const storedAdmin = JSON.parse(localStorage.getItem('adminData') || '{}');
            updateAdmin({ ...storedAdmin, primaryShop: fullShop });
          }
        }
      }
    }
  }, [availableShops, selectedShopId, admin?._id, admin?.primaryShop, shopsData, dispatch]);

  // Handle shop switching with smooth data refresh
  const handleShopSwitch = async (shopId: string) => {
    // Find the full shop object from the API response so localStorage retains it
    const fullShopData = Array.isArray(shopsData)
      ? shopsData.find((s: any) => s._id === shopId)
      : null;
    const selectedShopMeta = availableShops.find(shop => shop.id === shopId);

    dispatch(setSelectedShop(shopId));

    // Push full shop object into Redux so usePrimaryShop picks it up immediately
    if (fullShopData) {
      dispatch(setSelectedShopData(fullShopData));
    }

    // Also patch adminData so the current in-memory admin reflects the new shop
    const currentAdminData = JSON.parse(localStorage.getItem('adminData') || '{}');
    const mergedAdminData = {
      ...currentAdminData,
      primaryShop: fullShopData || shopId,
    };
    localStorage.setItem('adminData', JSON.stringify(mergedAdminData));
    updateAdmin(mergedAdminData);

    // Invalidate and refetch all queries for the new shop immediately
    queryClient.invalidateQueries();

    toast({
      title: "Switching Shop",
      description: `Loading data for ${selectedShopMeta?.name || 'selected shop'}...`,
    });

  };
  // Admin always has full access - no impersonation restrictions
  const canViewSales = true;
  const canViewProfit = true;
  const canViewExpenses = true;

  // Format time for display
 


  // Today's key metrics from net profit API - using correct field mappings
  const todayMetrics = {
    sales: netProfitData?.totalProfitAndSalesValue?.totalSales || 0,
    profit: netProfitData?.totalProfitAndSalesValue?.totalProfit || 0,
    expenses: netProfitData?.totalExpenses?.totalExpenses || 0,
    transactions: 0, // Would need separate endpoint for transaction count
    customers: 0 // Would need separate endpoint for customer count
  };



  // Calculate low stock and out of stock products from real data, excluding virtual products (services)
  const products = Array.isArray(productsData?.data) ? productsData.data : [];

  // Inventory insight counts for mobile dashboard
  const outOfStockCount = products.filter((p: any) => !p.virtual && (p.quantity || 0) === 0).length;
  const runningLowCount = products.filter((p: any) => {
    if (p.virtual) return false;
    const qty = p.quantity || 0;
    const reorder = p.reorderLevel || p.lowStockThreshold || 0;
    return qty > 0 && reorder > 0 && qty <= reorder;
  }).length;

  const lowStockProducts = products
    .filter((product: any) => {
      // Exclude virtual products (services) from stock alerts
      if (product.virtual) return false;
      
      const quantity = product.quantity || 0;
      const reorderLevel = product.reorderLevel || product.lowStockThreshold || 0;
      
      // Include products that are out of stock or low stock (skip if reorder level is 0)
      return quantity === 0 || (reorderLevel > 0 && quantity <= reorderLevel);
    })
    .map((product: any) => ({
      name: product.name,
      currentStock: product.quantity || 0,
      minStock: product.reorderLevel || product.lowStockThreshold || 0,
      status: (product.quantity || 0) === 0 ? "out" : "low"
    }))
    .slice(0, 10); // Limit to first 10 for display


  // Process real sales data from API
  const recentSales = Array.isArray(salesData?.data) ? salesData.data.map((sale: any) => ({
    id: sale._id, // Use _id for navigation
    receiptNo: sale.receiptNo || sale._id, // Keep receipt number for display
    customer: sale.customerName || sale.customerId?.name || sale.customer?.name || "Walk-in",
    amount: parseFloat(sale.totalWithDiscount || sale.totalAmount || sale.total || 0), // Use totalWithDiscount if available, fallback to totalAmount
    items: sale.products?.length || sale.items?.length || 1,
    time: timeAgo(sale.createdAt),
    paymentMethod: sale.paymentType || sale.paymentMethod || "Cash",
    status: sale.status || "completed"
  })) : [];

  // Pagination logic
  const totalPages = Math.ceil(recentSales.length / salesPerPage);
  const startIndex = (currentPage - 1) * salesPerPage;
  const endIndex = startIndex + salesPerPage;
  const currentSales = recentSales.slice(startIndex, endIndex);

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case "Cash":
        return <Badge variant="outline" className="bg-green-50 text-green-700">Cash</Badge>;
      case "Card":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Card</Badge>;
      case "Credit":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700">Credit</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };


  return (
    <DashboardLayout title="Business Dashboard">
      <div className="space-y-3 md:space-y-6 w-full mt-2 md:mt-6">
        
        {/* Subscription Expiration Alert */}
        {isSubscriptionExpired && showSubscriptionAlert && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                    Subscription Expired
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                    Your Pointify subscription has expired. Please renew your subscription to continue accessing all features and services.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link href="/subscription">
                      <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Subscription
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowSubscriptionAlert(false)}
                      className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        

        
        {/* Dashboard Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          
          {/* Mobile Compact Layout */}
          <div className="block md:hidden">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Current Shop</h2>
                  <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">Active</span>
                </div>
                <p className="text-sm text-purple-600 font-medium truncate">{currentShopData?.name || "—"}</p>
              </div>
              <Select value={selectedShopId || ""} onValueChange={handleShopSwitch}>
                <SelectTrigger className="h-8 w-auto border border-purple-300 text-purple-700 text-xs font-semibold px-3 rounded-full bg-white shrink-0 ml-2">
                  <span>Switch Shop</span>
                </SelectTrigger>
                <SelectContent>
                  {availableShops.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id}>
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-purple-500" />
                        <div>
                          <div className="font-medium">{shop.name}</div>
                          <div className="text-xs text-gray-500">{shop.type} · {shop.location}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex md:items-center md:justify-between gap-2 flex-row top-4">
            
            {/* Welcome Section */}
          
              
              {/* Current Shop */}
              <div className="flex flex-col gap-1 py-2 w-1/2">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Switch Shop
                </label>
                <Select value={selectedShopId || ""} onValueChange={handleShopSwitch}>
                  <SelectTrigger className=" bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2 px-2">
                      <Store className="h-6 w-4 text-purple-500" />
                      <div className="text-left">
                        <div className="font-medium text-sm">{currentShopData?.name}</div>
                      </div>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {availableShops.map((shop) => (
                      <SelectItem key={shop.id} value={shop.id}>
                        <div className="flex items-center gap-2">
                          <Store className="h-6 w-4 text-purple-500" />
                          <div>
                            <div className="font-medium">{shop.name}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">

                {/* Attendant Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Filter by Attendant
                  </label>
                  <Select value={selectedAttendantId} onValueChange={setSelectedAttendantId}>
                    <SelectTrigger className="w-[360px] bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-purple-500" />
                        <div className="text-left">
                          <div className="font-medium text-sm">
                            {selectedAttendantId !== "all" ? 
                              attendants.find((a: any) => a._id === selectedAttendantId)?.username || "Select Attendant" : 
                              "All Attendants"
                            }
                          </div>
                          <div className="text-xs text-gray-500">
                            {selectedAttendantId !== "all" ? "Filtered view" : "All data"}
                          </div>
                        </div>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-purple-500" />
                          <div>
                            <div className="font-medium">All Attendants</div>
                            <div className="text-xs text-gray-500">Show all data</div>
                          </div>
                        </div>
                      </SelectItem>
                      {attendants?.map((attendant: any) => (
                        <SelectItem key={attendant._id} value={attendant._id}>
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-purple-500" />
                            <div>
                              <div className="font-medium">{attendant.username}</div>
                              <div className="text-xs text-gray-500">PIN: {attendant.uniqueDigits}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Refresh Button */}
                <div className="flex flex-col justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={refreshDashboardData}
                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 mt-4"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

          </div>
        </div>
        
        {/* Today's Key Metrics */}
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-4 md:overflow-visible md:pb-0 w-full scrollbar-none"
             style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <Link href="/sales" className="shrink-0 w-[45vw] snap-start md:w-auto md:shrink">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-blue-100">Today's Sales</CardTitle>
                <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-200 shrink-0" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                {canViewSales ? (
                  <>
                    <div className="text-lg md:text-2xl font-bold leading-tight">{formatCurrency(todayMetrics.sales)}</div>
                    <p className="text-xs text-blue-100 mt-0.5">{todayMetrics.transactions} transactions</p>
                  </>
                ) : (
                  <>
                    <div className="text-lg md:text-2xl font-bold">•••••</div>
                    <p className="text-xs text-blue-100 mt-0.5">Restricted</p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>

          <Link href="/reports" className="shrink-0 w-[45vw] snap-start md:w-auto md:shrink">
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-all cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-green-100">Today's Profit</CardTitle>
                <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-200 shrink-0" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                {canViewProfit ? (
                  <>
                    <div className="text-lg md:text-2xl font-bold leading-tight">{formatCurrency(todayMetrics.profit)}</div>
                    <p className="text-xs text-green-100 mt-0.5">30% margin</p>
                  </>
                ) : (
                  <>
                    <div className="text-lg md:text-2xl font-bold">•••••</div>
                    <p className="text-xs text-green-100 mt-0.5">Restricted</p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>

          <Link href="/expenses" className="shrink-0 w-[45vw] snap-start md:w-auto md:shrink">
            <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-red-100">Today's Expenses</CardTitle>
                <TrendingDown className="h-3.5 w-3.5 md:h-4 md:w-4 text-red-200 shrink-0" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                {canViewExpenses ? (
                  <>
                    <div className="text-lg md:text-2xl font-bold leading-tight">{formatCurrency(todayMetrics.expenses)}</div>
                    <p className="text-xs text-red-100 mt-0.5">Operating costs</p>
                  </>
                ) : (
                  <>
                    <div className="text-lg md:text-2xl font-bold">•••••</div>
                    <p className="text-xs text-red-100 mt-0.5">Restricted</p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>

          <Link href="/stock?filter=alerts" className="shrink-0 w-[45vw] snap-start md:w-auto md:shrink">
            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 transition-all cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 md:p-6 md:pb-2">
                <CardTitle className="text-xs md:text-sm font-medium text-orange-100">Stock Alerts</CardTitle>
                <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4 text-orange-200 shrink-0" />
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-lg md:text-2xl font-bold leading-tight">{lowStockProducts.length}</div>
                <p className="text-xs text-orange-100 mt-0.5">Need attention</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* ── Mobile-only: Inventory Insights ───────────────────────────── */}
        <div className="block md:hidden bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <p className="text-sm font-bold text-purple-700 dark:text-purple-300 mb-2">Inventory Insights</p>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            <Link href="/stock/products?filter=low">
              <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2.5 py-1 cursor-pointer">
                <span className="font-bold">{runningLowCount}</span> Running low
              </span>
            </Link>
            <Link href="/stock/products?filter=out">
              <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-1 cursor-pointer">
                <span className="font-bold">{outOfStockCount}</span> Out of stock
              </span>
            </Link>
            <Link href="/stock/products">
              <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1 cursor-pointer">
                <span className="font-bold">{Math.max(0, products.length - outOfStockCount - runningLowCount)}</span> In stock
              </span>
            </Link>
          </div>
          <Link href="/stock/products">
            <p className="text-xs text-purple-600 font-medium mt-2 flex items-center gap-0.5">
              See all products <ChevronRight className="h-3 w-3" />
            </p>
          </Link>
        </div>

        {/* ── Mobile-only: Enterprise Operations grid ────────────────────── */}
        <div className="block md:hidden bg-purple-700 dark:bg-purple-900 rounded-xl p-4">
          <p className="text-sm font-bold text-white mb-4">Enterprise Operations</p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { href: "/pos",            icon: ScanBarcode, label: "POS" },
              { href: "/stock/products", icon: Package,     label: "Stock" },
              { href: "/sales",          icon: Receipt,     label: "Sales" },
              { href: "/suppliers",      icon: Truck,       label: "Suppliers" },
              { href: "/customers",      icon: Users,       label: "Customers" },
              { href: "/reports",        icon: BarChart3,   label: "Reports" },
              { href: "/cashflow",       icon: Banknote,    label: "Cashflow" },
              { href: "/expenses",       icon: TrendingDown, label: "Expenses" },
            ].map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href}>
                <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
                  <div className="w-12 h-12 bg-white/15 group-active:bg-white/25 rounded-xl flex items-center justify-center transition-colors">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-[10px] text-white/90 font-medium text-center leading-tight">{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Sales and Stock Alerts — desktop only */}
        <div className="hidden md:grid gap-3 md:gap-6 lg:grid-cols-3 w-full">
          
          {/* Recent Sales Table - Left Side (2/3 width) */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <ShoppingCart className="h-5 w-5" />
                  Recent Sales
                </CardTitle>
                <CardDescription className="text-blue-600">Latest transactions and sales activity</CardDescription>
              </CardHeader>
              <CardContent className="p-2 sm:p-4">
                {/* Sales Table */}
                {currentSales.length > 0 ? <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">Order #</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">Customer</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">Items</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">Amount</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">Payment</th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentSales.map((sale: { id: Key | null | undefined; receiptNo: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined; customer: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined; items: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined; amount: number; paymentMethod: string; time: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined; }) => (
                        <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-2">
                            <Link 
                              href={`/receipt/${sale.id}`}
                              onClick={() => {
                                // Find and store the complete sale data for the receipt page
                                const saleData = salesData?.data?.find((s: { _id: Key | null | undefined; }) => s._id === sale.id);
                                if (saleData) {
                                  console.log('Dashboard: Storing receipt data for', sale.id, saleData);
                                  (window as any).__receiptData = saleData;
                                } else {
                                  console.log('Dashboard: Could not find sale data for', sale.id);
                                }
                              }}
                            >
                              <span className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer hover:underline">#{sale.receiptNo}</span>
                            </Link>
                          </td>
                          <td className="py-3 px-2">
                            <span className="font-medium text-gray-900">{sale.customer}</span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-gray-600">{sale.items}</span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="font-bold text-gray-900">{formatCurrency(sale.amount)}</span>
                          </td>
                          <td className="py-3 px-2">
                            {getPaymentMethodBadge(sale.paymentMethod)}
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-sm text-gray-500">{sale.time}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>: (
                  <div className="text-center text-gray-600">
                    No recent sales
                  </div>
                )}

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1}-{Math.min(endIndex, recentSales.length)} of {recentSales.length}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="bg-blue-500 text-white border-0 hover:bg-blue-600 disabled:bg-gray-300"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                      {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="bg-blue-500 text-white border-0 hover:bg-blue-600 disabled:bg-gray-300"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {!isSubscriptionExpired && (
                  <div className="mt-6">
                    <Link href="/sales">
                      <Button variant="outline" className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 hover:from-blue-600 hover:to-purple-600">
                        <Eye className="h-4 w-4 mr-2" />
                        View All Sales
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stock Alerts - Right Side (1/3 width) */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-orange-800 text-lg">
                  <AlertTriangle className="h-4 w-4" />
                  Stock Alerts
                </CardTitle>
                <CardDescription className="text-orange-600 text-sm">Critical inventory status</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {lowStockProducts.slice(0, 10).map((product: { name: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined; currentStock: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined; status: string; }, index: Key | null | undefined) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{product.name}</p>
                        <p className="text-xs text-gray-600">Stock: {product.currentStock}</p>
                      </div>
                      <Badge 
                        variant={product.status === "out" ? "destructive" : "secondary"}
                        className={`${product.status === "out" ? "bg-red-500 text-white" : "bg-orange-500 text-white"} text-xs px-2 py-1`}
                      >
                        {product.status === "out" ? "Out" : "Low"}
                      </Badge>
                    </div>
                  ))}
                </div>

                {!isSubscriptionExpired && (
                  <div className="mt-4">
                    <Link href="/stock?filter=alerts">
                      <Button variant="outline" className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 hover:from-orange-600 hover:to-red-600 text-sm">
                        <AlertTriangle className="h-3 w-3 mr-2" />
                        View All Alerts
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>

        {/* Overdue Customers - Full Width Section */}
        <div className="w-full">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-red-800 text-lg">
                <Clock className="h-4 w-4" />
                Overdue Customers
                {overdueCustomersData?.totalOverdueCustomers > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {overdueCustomersData.totalOverdueCustomers}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-red-600 text-sm">
                {overdueCustomersData?.totalOverdueCustomers > 0 
                  ? `${overdueCustomersData.totalOverdueCustomers} customers with overdue payments`
                  : 'No overdue customers'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-5">
              {overdueCustomersData?.totalOverdueCustomers > 0 ? (
                <>
                  <div className="mb-6 text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">Total Overdue Amount</p>
                    <p className="text-2xl font-bold text-red-600">
                      {currency} {overdueCustomersData.totalOverdueAmount?.toLocaleString() || '0'}
                    </p>
                  </div>
                  
                  {/* Grid of overdue customers */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {overdueCustomersData.overdueCustomers?.map((customer: any, index: number) => (
                      <div key={customer.customerId || index} className="p-4 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                              {index + 1}
                            </div>
                            <p className="font-medium text-red-900 dark:text-red-100 text-sm">{customer.name}</p>
                          </div>
                          <Badge variant="destructive" className="text-xs">
                            {customer.dueCount} overdue
                          </Badge>
                        </div>
                        <p className="text-xs text-red-600 dark:text-red-300 mb-2">{customer.phonenumber}</p>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-red-600 dark:text-red-400 text-lg">
                              {currency} {customer.totalOverdue?.toLocaleString() || '0'}
                            </p>
                            <p className="text-xs text-red-500 dark:text-red-400">
                              {customer.daysOverdue} days overdue
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Latest due:</p>
                            <p className="text-xs text-red-600">
                              {customer.latestDue ? formatDate(new Date(customer.latestDue)) : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {!isSubscriptionExpired && (
                    <div className="mt-6">
                      <Link href="/customers">
                        <Button variant="outline" className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 hover:from-red-600 hover:to-pink-600">
                          <Clock className="h-4 w-4 mr-2" />
                          View All Customers
                        </Button>
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-950/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">All customers are up to date with payments</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  ShoppingCart,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useAuth } from "@/features/auth/useAuth";
import { useAttendantAuth } from "@/contexts/AttendantAuthContext";
import { useNavigationRoute } from "@/lib/navigation-utils";

interface Sale {
  _id: string;
  quantity: number;
  price: number;
  total: number;
  date: string;
  customer?: string;
  transactionId?: string;
  paymentMethod?: string;
}

interface StockMovement {
  _id?: string;
  type: string;
  description: string;
  date: string;
  performedBy: string;
  quantity: number;
}

export default function ProductHistory() {
  const { id } = useParams();
  const { admin } = useAuth();
  const { attendant, token: attendantToken } = useAttendantAuth();
  const stockProductsRoute = useNavigationRoute("products");

  // Check if user is authenticated (admin or attendant)
  const isAuthenticated = !!admin?._id || !!attendant?._id;
  const authToken = localStorage.getItem("authToken") || attendantToken;
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i,
  );

  // Pagination state
  const [salesPage, setSalesPage] = useState(1);
  const [movementsPage, setMovementsPage] = useState(1);
  const itemsPerPage = 10;
  
  // Tab state
  const [activeTab, setActiveTab] = useState("stock-in");

  // Fetch product details
  const { data: product } = useQuery({
    queryKey: [`/api/product/${id}`, admin?._id || attendant?._id],
    queryFn: async () => {
      const response = await fetch(`/api/product/${id}`, {
        headers: {
          "Content-Type": "application/json",
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch product");
      }

      return response.json();
    },
    enabled: !!id && isAuthenticated,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Fetch purchases history for Stock In tab
  const { data: purchasesData, isLoading: purchasesLoading } = useQuery({
    queryKey: [
      `/api/purchases-history`,
      id,
      monthFilter,
      yearFilter,
      movementsPage,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        productId: id!,
        month: monthFilter.toString(),
        year: yearFilter.toString(),
        page: movementsPage.toString(),
        limit: itemsPerPage.toString(),
      });

      const response = await fetch(`/api/purchases-history?${params}`, {
        headers: {
          "Content-Type": "application/json",
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch purchases history");
      }

      return response.json();
    },
    enabled: !!id && isAuthenticated && activeTab === "stock-in",
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Fetch stock out movements for Stock Out tab
  const { data: stockOutData, isLoading: stockOutLoading } = useQuery({
    queryKey: [
      `/api/stock-out-movements`,
      id,
      monthFilter,
      yearFilter,
      movementsPage,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        productId: id!,
        month: monthFilter.toString(),
        year: yearFilter.toString(),
        page: movementsPage.toString(),
        limit: itemsPerPage.toString(),
      });

      const response = await fetch(`/api/stock-out-movements?${params}`, {
        headers: {
          "Content-Type": "application/json",
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch stock out movements");
      }

      return response.json();
    },
    enabled: !!id && isAuthenticated && activeTab === "stock-out",
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Fetch bad stock movements for Bad Stock tab
  const { data: badStockData, isLoading: badStockLoading } = useQuery({
    queryKey: [
      `/api/bad-stock-movements`,
      id,
      monthFilter,
      yearFilter,
      movementsPage,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        productId: id!,
        month: monthFilter.toString(),
        year: yearFilter.toString(),
        page: movementsPage.toString(),
        limit: itemsPerPage.toString(),
      });

      const response = await fetch(`/api/bad-stock-movements?${params}`, {
        headers: {
          "Content-Type": "application/json",
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch bad stock movements");
      }

      return response.json();
    },
    enabled: !!id && isAuthenticated && activeTab === "bad-stock",
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Sales history query with filters
  const { data: salesHistoryData, isLoading: salesLoading } = useQuery({
    queryKey: [`/api/sales-history`, id, monthFilter, yearFilter, salesPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        productId: id!,
        month: monthFilter.toString(),
        year: yearFilter.toString(),
        page: salesPage.toString(),
        limit: itemsPerPage.toString(),
      });

      const response = await fetch(`/api/sales-history?${params}`, {
        headers: {
          "Content-Type": "application/json",
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch sales history");
      }

      return response.json();
    },
    enabled: !!id && isAuthenticated,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Product summary query for analytics
  const { data: summaryData } = useQuery({
    queryKey: [`/api/product-summary`, id, monthFilter, yearFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        productId: id!,
        month: monthFilter.toString(),
        year: yearFilter.toString(),
      });

      const response = await fetch(`/api/product-summary?${params}`, {
        headers: {
          "Content-Type": "application/json",
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch product summary");
      }

      return response.json();
    },
    enabled: !!id && isAuthenticated,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Extract real sales data from API response
  const sales: Sale[] = useMemo(() => {
    if (!salesHistoryData?.data) return [];

    return salesHistoryData.data.map((sale: any) => ({
      _id: sale._id || Math.random().toString(),
      quantity: sale.quantity || 1,
      price: sale.price || 0,
      total: sale.total || sale.quantity * sale.price,
      date: sale.date || new Date().toISOString(),
      customer: sale.customer || "Walk-in",
      transactionId: sale.transactionId || sale._id,
      paymentMethod: sale.paymentMethod || "Cash",
    }));
  }, [salesHistoryData]);

  // Process purchases data for Stock In tab
  const purchases = useMemo(() => {
    if (!purchasesData?.data) return [];
    
    return purchasesData.data.map((purchase: any) => ({
      _id: purchase._id || Math.random().toString(),
      type: "Purchase",
      description: purchase.description || `Purchase from ${purchase.supplierName || 'Supplier'}`,
      date: purchase.receivedDate || purchase.orderDate || new Date().toISOString(),
      performedBy: purchase.createdBy || "System",
      quantity: purchase.quantity || 0,
      unitCost: purchase.unitCost || 0,
      totalCost: purchase.totalCost || 0,
      supplierName: purchase.supplierName || "Unknown Supplier",
    }));
  }, [purchasesData]);

  // Process stock out movements for Stock Out tab
  const stockOutMovements = useMemo(() => {
    if (!stockOutData?.data) return [];
    
    return stockOutData.data.map((movement: any) => ({
      _id: movement._id || Math.random().toString(),
      type: movement.type || "Stock Out",
      description: movement.description || "Stock reduction",
      date: movement.date || new Date().toISOString(),
      performedBy: movement.performedBy || "System",
      quantity: movement.quantity || 0,
    }));
  }, [stockOutData]);

  // Process bad stock movements for Bad Stock tab
  const badStockMovements = useMemo(() => {
    if (!badStockData?.data) return [];
    
    return badStockData.data.map((movement: any) => ({
      _id: movement._id || Math.random().toString(),
      type: movement.type || "Bad Stock",
      description: movement.description || movement.reason || "Damaged/Expired stock",
      date: movement.date || new Date().toISOString(),
      performedBy: movement.performedBy || "System",
      quantity: movement.quantity || 0,
      reason: movement.reason || "Unknown",
    }));
  }, [badStockData]);

  // Use API-based pagination for sales
  const paginatedSales = sales; // Already paginated by API
  const totalSalesPages = salesHistoryData?.totalPages || 1;

  // Get pagination info for current tab
  const getCurrentPaginationInfo = () => {
    switch (activeTab) {
      case "stock-in":
        return {
          totalPages: purchasesData?.totalPages || 1,
          currentPage: purchasesData?.currentPage || 1,
        };
      case "stock-out":
        return {
          totalPages: stockOutData?.totalPages || 1,
          currentPage: stockOutData?.currentPage || 1,
        };
      case "bad-stock":
        return {
          totalPages: badStockData?.totalPages || 1,
          currentPage: badStockData?.currentPage || 1,
        };
      default:
        return { totalPages: 1, currentPage: 1 };
    }
  };

  const { totalPages: totalMovementsPages, currentPage: currentMovementsPage } = getCurrentPaginationInfo();

  // Use real analytics from summary API
  const analytics = useMemo(() => {
    return {
      totalSales: summaryData?.totalSales || 0,
      totalQuantitySold: summaryData?.totalUnitsSold || 0,
      stockIn: summaryData?.totalStockIn || 0,
      stockOut: summaryData?.totalStockOut || 0,
      netMovement: summaryData?.netMovement || 0,
    };
  }, [summaryData]);



  return (
    <DashboardLayout title="Product History">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href={stockProductsRoute}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">
                {product?.name || "Product History"}
              </h1>
              <p className="text-gray-600">Track sales and stock movements</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter by Month and Year</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Month</label>
                <Select
                  value={monthFilter.toString()}
                  onValueChange={(value) => setMonthFilter(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem
                        key={month.value}
                        value={month.value.toString()}
                      >
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Year</label>
                <Select
                  value={yearFilter.toString()}
                  onValueChange={(value) => setYearFilter(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                KES {analytics.totalSales.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.totalQuantitySold} units sold
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock In</CardTitle>
              <Package className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +{analytics.stockIn}
              </div>
              <p className="text-xs text-muted-foreground">Units received</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Out</CardTitle>
              <Package className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                -{analytics.stockOut}
              </div>
              <p className="text-xs text-muted-foreground">Units sold/used</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Net Movement
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  analytics.netMovement >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {analytics.netMovement >= 0 ? "+" : ""}
                {analytics.netMovement}
              </div>
              <p className="text-xs text-muted-foreground">Net stock change</p>
            </CardContent>
          </Card>
        </div>

        {/* Product History Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="stock-in" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Stock In
                </TabsTrigger>
                <TabsTrigger value="sales" className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Sales
                </TabsTrigger>
                <TabsTrigger value="bad-stock" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Bad Stock
                </TabsTrigger>
              </TabsList>

              <TabsContent value="stock-in" className="space-y-4">
                {purchasesLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-8 h-8 border-4 border-gray-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p>Loading purchases history...</p>
                  </div>
                ) : purchases.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No purchases found for this period</p>
                  </div>
                ) : (
                  purchases.map((purchase: any) => (
                    <div
                      key={purchase._id || Math.random().toString()}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-2 rounded-full bg-green-100 text-green-600">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">{purchase.type}</div>
                          <p className="text-sm text-gray-600">{purchase.description}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{new Date(purchase.date).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>From {purchase.supplierName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">
                          +{purchase.quantity}
                        </div>
                        <p className="text-sm text-gray-600">
                          KES {Number(purchase.unitCost || 0).toFixed(2)} each
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="sales" className="space-y-4">
                {salesLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-8 h-8 border-4 border-gray-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p>Loading sales data...</p>
                  </div>
                ) : sales.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No sales found for this period</p>
                  </div>
                ) : (
                  sales.map((sale: any) => (
                    <div
                      key={sale._id || Math.random().toString()}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                          <TrendingDown className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">Sale</div>
                          <p className="text-sm text-gray-600">Customer: {sale.customerName || 'Walk-in'}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{new Date(sale.date).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>Total: KES {Number(sale.totalWithDiscount || sale.totalAmount || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-blue-600">
                          -{sale.quantity || 1}
                        </div>
                        <p className="text-sm text-gray-600">
                          KES {Number(sale.unitPrice || sale.sellingPrice || 0).toFixed(2)} each
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="bad-stock" className="space-y-4">
                {badStockLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-8 h-8 border-4 border-gray-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p>Loading bad stock movements...</p>
                  </div>
                ) : badStockMovements.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No bad stock movements found for this period</p>
                  </div>
                ) : (
                  badStockMovements.map((movement: any) => (
                    <div
                      key={movement._id || Math.random().toString()}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-2 rounded-full bg-red-100 text-red-600">
                          <Package className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">{movement.type || 'Bad Stock'}</div>
                          <p className="text-sm text-gray-600">{movement.description || 'Stock damaged/expired'}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{new Date(movement.date).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>By {movement.performedBy || 'System'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-red-600">
                          -{movement.quantity || 1}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

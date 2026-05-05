import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Package, AlertTriangle, DollarSign, BarChart3, ArrowLeft, Download, MousePointer } from "lucide-react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { apiRequest } from "@/lib/queryClient";
import { usePermissions } from "@/hooks/usePermissions";
import { usePrimaryShop } from "@/hooks/usePrimaryShop";
import { useLocation } from "wouter";

interface StockAnalysisData {
  totalStockValue: number;
  profitEstimate: number;
  outofstock: number;
  lowstock: number;
  totalstock: number;
}

export default function StockSummary() {
  const { hasPermission, hasAttendantPermission } = usePermissions();
  const { shopId, shopData } = usePrimaryShop();
  const [, setLocation] = useLocation();

  // Fetch stock analysis data
  const { data: stockData, isLoading, error } = useQuery({
    queryKey: ["/api/analysis/stockanalysis", shopId],
    queryFn: async () => {
      // Get the appropriate token for admin or attendant
      const adminToken = localStorage.getItem("authToken");
      const attendantToken = localStorage.getItem("attendantToken");
      const token = attendantToken || adminToken;
      
      const response = await fetch(`/api/analysis/stockanalysis?shopid=${shopId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json() as StockAnalysisData;
    },
    enabled: !!shopId,
  });

  // Check if user has permission to view stock summary
  // Admins have access by default, attendants need specific permission
  const isAdmin = !!localStorage.getItem("authToken") || !!localStorage.getItem("adminData");
  const canViewStockSummary = isAdmin || hasPermission('inventory_view') || hasAttendantPermission('stocks', 'stock_summary');
  if (!canViewStockSummary) {
    return (
      <DashboardLayout>
        <div>
          <Card>
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-gray-600">
                You don't have permission to view stock summary. Contact your administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <BarChart3 className="h-8 w-8 animate-pulse mx-auto mb-2" />
              <p>Loading stock summary...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div>
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-400" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
              <p className="text-gray-600">
                Failed to load stock summary. Please try again later.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const formatCurrency = (amount: number) => {
    const currency = shopData?.currency || "KES";
    return `${currency} ${amount.toLocaleString()}`;
  };

  // Navigation functions
  const navigateToProducts = (filter: string) => {
    // Navigate to stock products page with appropriate filter
    const attendantData = localStorage.getItem('attendantData');
    const basePath = attendantData ? '/attendant' : '';
    setLocation(`${basePath}/stock/products?filter=${filter}`);
  };

  // Download functions
  const downloadStockData = async (type: 'lowstock' | 'outofstock') => {
    try {
      const adminToken = localStorage.getItem("authToken");
      const attendantToken = localStorage.getItem("attendantToken");
      const token = attendantToken || adminToken;
      
      // Call the API that returns Excel file directly
      const downloadUrl = `/api/analysis/pdf/download/?shopid=${shopId}`;
      
      const response = await fetch(downloadUrl, {
        method: "GET",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to download report: ${response.status} ${response.statusText}`);
      }

      // Get the Excel file blob
      const blob = await response.blob();

      if (blob.size === 0) {
        alert('No data available for download.');
        return;
      }

      // Download the Excel file
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      const filename = type === 'lowstock' 
        ? `low_stock_report_${new Date().toISOString().split('T')[0]}.xlsx`
        : `out_of_stock_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-3 sm:space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { const a=localStorage.getItem('attendantData'); setLocation(a?'/attendant/dashboard':'/dashboard'); }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base sm:text-xl font-bold">Stock Summary</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          {/* Total Stock Value */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
              <CardTitle className="text-xs sm:text-sm font-medium">Stock Value</CardTitle>
              <DollarSign className="h-3.5 w-3.5 text-green-600" />
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-sm sm:text-xl font-bold text-green-600 truncate">
                {formatCurrency(stockData?.totalStockValue || 0)}
              </div>
            </CardContent>
          </Card>

          {/* Profit Estimate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
              <CardTitle className="text-xs sm:text-sm font-medium">Profit Est.</CardTitle>
              <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-sm sm:text-xl font-bold text-blue-600 truncate">
                {formatCurrency(stockData?.profitEstimate || 0)}
              </div>
            </CardContent>
          </Card>

          {/* Total Products */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">
                {stockData?.totalstock || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Products in inventory
              </p>
            </CardContent>
          </Card>

          {/* Low Stock */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigateToProducts('lowstock')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1">
                Low Stock <MousePointer className="h-3 w-3 text-orange-600" />
              </CardTitle>
              <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-lg sm:text-2xl font-bold text-orange-600">
                {stockData?.lowstock || 0}
              </div>
            </CardContent>
          </Card>

          {/* Out of Stock */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigateToProducts('outofstock')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1">
                Out of Stock <MousePointer className="h-3 w-3 text-red-600" />
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); downloadStockData('outofstock'); }} className="h-6 px-2 text-xs text-red-600 border-red-200">
                  <Download className="h-3 w-3" />
                </Button>
                <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <div className="text-lg sm:text-2xl font-bold text-red-600">
                {stockData?.outofstock || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Insights */}
        {stockData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Stock Health */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Stock Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex justify-between items-center">
                  <span className="text-xs">Healthy Stock</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      {stockData.totalstock - stockData.lowstock - stockData.outofstock} products
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs">Low Stock Alert</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      {stockData.lowstock} products
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs">Critical (OOS)</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-red-600 border-red-600">
                      {stockData.outofstock} products
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Insights */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Financial Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex justify-between items-center">
                  <span className="text-xs">Investment</span>
                  <span className="font-semibold">
                    {formatCurrency(stockData.totalStockValue)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs">Expected Profit</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(stockData.profitEstimate)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs">Profit Margin</span>
                  <span className="font-semibold text-blue-600">
                    {stockData.totalStockValue > 0 
                      ? `${((stockData.profitEstimate / stockData.totalStockValue) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Average Value per Product</span>
                  <span className="font-semibold">
                    {stockData.totalstock > 0 
                      ? formatCurrency(Math.round(stockData.totalStockValue / stockData.totalstock))
                      : formatCurrency(0)
                    }
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
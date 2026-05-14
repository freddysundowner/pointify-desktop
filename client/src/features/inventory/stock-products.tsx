import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Search,
  Plus,
  Package,
  AlertTriangle,
  TrendingUp,
  Edit,
  Eye,
  MoreVertical,
  History,
  Trash2,
  X,
  ArrowLeft,
  FileText,
  Download,
  SlidersHorizontal,
  Check,
  Upload,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { apiCall } from "@/lib/api-config";
import { Link, useLocation } from "wouter";
import { useShop } from "@/features/shop/useShop";
import { useAuth } from "@/features/auth/useAuth";
import { PermissionGuard } from "@/components/PermissionGuard";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { useNavigationRoute } from "@/lib/navigation-utils";
import { useProducts } from "@/contexts/ProductsContext";

interface Product {
  _id: string;
  name: string;
  price?: number;
  sellingPrice: number;
  stock: number;
  quantity: number;
  category: string;
  sku?: string;
  lowStockThreshold: number;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  virtual?: boolean; // Services are virtual products
}

export default function StockProducts() {
  // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY CONDITIONAL RETURNS
  const queryClient = useQueryClient();
  const { hasPermission, hasAttendantPermission } = usePermissions();
  const { toast } = useToast();
  const { refreshProducts } = useProducts();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [productType, setProductType] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [stockFilter, setStockFilter] = useState<
    "all" | "outofstock" | "lowstock"
  >("all");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const { currency, shop } = useShop();
  const { admin } = useAuth();
  const { selectedShopId } = useSelector((state: RootState) => state.shop);
  const [location, setLocation] = useLocation();
  const addProductRoute = useNavigationRoute("addProduct");
  const editProductRoute = useNavigationRoute("editProduct");
  const productHistoryRoute = useNavigationRoute("productHistory");

  // Adjust Stock Dialog State
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustType, setAdjustType] = useState<"increase" | "decrease">("increase");

  const [isAdjusting, setIsAdjusting] = useState(false);

  // Bulk delete state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [singleDeleteProduct, setSingleDeleteProduct] = useState<any>(null);
  const [isSingleDeleting, setIsSingleDeleting] = useState(false);

  // Note: Adjustment history now uses standalone page instead of dialog

  // Check if user is an attendant
  const isAttendant = location.startsWith("/attendant/");

  // Handle URL parameters for filtering
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const filterParam = urlParams.get('filter');
    if (filterParam === 'lowstock' || filterParam === 'outofstock') {
      setStockFilter(filterParam);
    }
  }, [location]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory, productType, sortBy, stockFilter]);

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const toggleSelectAll = () => {
    const pageIds = filteredProducts?.map((p: any) => p._id) ?? [];
    const allSelected = pageIds.length > 0 && pageIds.every((id: string) => selectedIds.includes(id));
    setSelectedIds(allSelected ? selectedIds.filter((id) => !pageIds.includes(id)) : [...new Set([...selectedIds, ...pageIds])]);
  };

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      const resp = await apiCall("/api/product/bulk/delete", {
        method: "DELETE",
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      toast({ title: "Deleted", description: `${selectedIds.length} product${selectedIds.length !== 1 ? "s" : ""} deleted successfully.` });
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["/api/product"] });
      refreshProducts();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
    setIsBulkDeleting(false);
    setBulkDeleteConfirmOpen(false);
  };

  const handleDeleteAll = async () => {
    const shopId = selectedShopId;
    if (!shopId) {
      toast({ title: "No shop selected", description: "Please select a shop first.", variant: "destructive" });
      return;
    }
    setIsDeletingAll(true);
    try {
      const resp = await apiCall("/api/product/bulk/delete", {
        method: "DELETE",
        body: JSON.stringify({ shopId }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      toast({ title: "All products deleted", description: "All products in this shop have been deleted." });
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["/api/product"] });
      refreshProducts();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
    setIsDeletingAll(false);
    setDeleteAllConfirmOpen(false);
  };

  const handleSingleDelete = async () => {
    if (!singleDeleteProduct) return;
    setIsSingleDeleting(true);
    try {
      const resp = await apiCall(`/api/product/${singleDeleteProduct._id}`, {
        method: "DELETE",
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      toast({ title: "Product deleted", description: `"${singleDeleteProduct.name}" has been deleted.` });
      queryClient.invalidateQueries();
      refreshProducts();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
    setIsSingleDeleting(false);
    setSingleDeleteProduct(null);
  };

  // Get effective shop ID from Redux state or fallback to admin/attendant data
  const getShopId = () => {
    if (selectedShopId) return selectedShopId;

    if (isAttendant) {
      // For attendants, get shop ID from attendant data
      const attendantData = localStorage.getItem("attendantData");
      if (attendantData) {
        try {
          const parsed = JSON.parse(attendantData);
          return typeof parsed.shopId === "string"
            ? parsed.shopId
            : parsed.shopId?._id;
        } catch {
          return null;
        }
      }
      return null;
    }

    // For admins, use admin data
    return typeof admin?.primaryShop === "string"
      ? admin.primaryShop
      : (admin?.primaryShop as any)?._id || (admin?.primaryShop as any)?.id;
  };

  const effectiveShopId = getShopId();

  // Fetch products
  const {
    data: productsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      `/api/product`,
      effectiveShopId,
      page,
      itemsPerPage,
      searchQuery,
      selectedCategory,
      productType,
      sortBy,
      stockFilter,
    ],
    queryFn: async ({ queryKey }) => {
      // Determine type parameter based on stock filter
      let typeParam = selectedCategory === "all" ? "" : selectedCategory;
      if (stockFilter === "outofstock") {
        typeParam = "outofstock";
      } else if (stockFilter === "lowstock") {
        typeParam = "runninglow";
      }

      const params = new URLSearchParams({
        page: page.toString(),
        reason: "",
        date: "",
        limit: itemsPerPage.toString(),
        name: searchQuery,
        shopid: effectiveShopId || "",
        type: typeParam,
        sort: sortBy,
        productid: "",
        barcodeid: "",
        productType: productType === "all" ? "" : productType,
        useWarehouse: "true",
        warehouse: shop?.warehouse?.toString() || "false",
        // Only include adminid for admin users, not attendants
        ...(isAttendant ? {} : { adminid: admin?._id || "" }),
      });

      const url = `/api/product?${params.toString()}`;
      console.log("Making API call to:", url);

      const response = await apiCall(url, {
        method: "GET",
      });

      const data = await response.json();
      console.log("Raw API response:", data);
      
      // Debug: Check reorder levels
      console.log("=== REORDER LEVEL ANALYSIS ===");
      const productsWithReorder = data.data.filter(p => p.reorderLevel && p.reorderLevel > 0);
      console.log("Products with reorder level > 0:", productsWithReorder.length);
      productsWithReorder.forEach(p => {
        console.log(`${p.name}: quantity=${p.quantity || 0}, reorderLevel=${p.reorderLevel}, virtual=${p.virtual}`);
      });
      console.log("===============================");
      
      return data;
    },
    staleTime: 0,
    enabled:
      (isAttendant ? !!localStorage.getItem("attendantData") : !!admin?._id) &&
      !!effectiveShopId,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Fetch stock analysis data
  const { data: stockAnalysis, error: stockAnalysisError } = useQuery({
    queryKey: [`/api/analysis/stockanalysis/`, effectiveShopId, true],
    queryFn: async ({ queryKey }) => {
      const warehouse = true;
      const url = `/api/analysis/stockanalysis/?shopid=${effectiveShopId}&warehouse=${warehouse}&totalstock=true`;
      
      console.log("=== STOCK ANALYSIS QUERY TRIGGERED ===");
      console.log("Query URL:", url);
      console.log("Effective Shop ID:", effectiveShopId);
      console.log("=====================================");

      // Get auth token from localStorage
      const token = localStorage.getItem("authToken");

      const response = await fetch(url, {
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

      const stockData = await response.json();
      console.log("=== STOCK ANALYSIS API DATA ===");
      console.log("Stock Analysis Response:", stockData);
      console.log("Low Stock Count:", stockData?.lowstock);
      console.log("Out of Stock Count:", stockData?.outofstock);
      console.log("================================");
      
      return stockData;
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    enabled:
      (isAttendant ? !!localStorage.getItem("attendantData") : !!admin?._id) &&
      !!effectiveShopId,
  });

  // Check if user has permission to view products (stocks permission)
  const canViewProducts =
    hasPermission("inventory_view") ||
    hasAttendantPermission("stocks", "view_products");
  if (!canViewProducts) {
    return (
      <DashboardLayout title="Inventory">
        <div className="p-4">
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-gray-600">
                You don't have permission to view products. Contact your
                administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Extract products from the API response structure
  const products = Array.isArray(productsData?.data)
    ? productsData.data
    : Array.isArray(productsData?.products)
      ? productsData.products
      : Array.isArray(productsData)
        ? productsData
        : [];

  // Products are already filtered by the API based on stock status
  const filteredProducts = products;

  console.log("Product processing:", {
    productsData,
    extractedProducts: products,
    count: products.length,
    isLoading,
    error: error?.message,
    enabled: !!admin?._id && !!effectiveShopId,
    adminId: admin?._id,
    effectiveShopId,
  });

  // Use authentic API pagination data
  const totalProducts = productsData?.count || 0;
  const totalPages = productsData?.totalPages || 1;
  const currentPage = productsData?.currentPage || 1;
  // Use API data for accurate stats instead of filtered page data
  const lowQuantityProducts = stockAnalysis?.lowstock || 0;
  const outOfStockProducts = stockAnalysis?.outofstock || 0;
  const totalStockValue = stockAnalysis?.totalStockValue || 0;
  const profitEstimate = stockAnalysis?.profitEstimate || 0;
  const totalStockCount = stockAnalysis?.totalstock || 0;

  // Download stock data function
  const downloadStockData = async (type: 'outofstock' | 'lowstock') => {
    try {
      const token = localStorage.getItem("authToken");
      const url = `/api/analysis/pdf/download/file?shopid=${effectiveShopId}`;
      
      console.log("Downloading stock data for:", type);
      console.log("Download URL:", url);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      
      // Create blob and download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `stock-${type}-report.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Success",
        description: `Stock ${type === 'outofstock' ? 'out of stock' : 'low stock'} report downloaded successfully`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download stock report",
        variant: "destructive",
      });
    }
  };

  const getQuantityStatus = (product: any) => {
    // Services (virtual products) don't have stock status
    if (product.virtual) {
      return { label: "Service", variant: "outline" as const };
    }

    const qty = product.quantity || 0;
    const threshold = product.reorderLevel || product.lowStockThreshold || 0;
    if (qty <= 0)
      return { label: "Out of Stock", variant: "destructive" as const };
    if (qty <= threshold)
      return { label: "Low Quantity", variant: "secondary" as const };
    return { label: "In Stock", variant: "default" as const };
  };

  // Function to open adjust stock dialog
  const openAdjustDialog = (product: any) => {
    setSelectedProduct(product);
    setAdjustQuantity("");
    setAdjustType("increase");
    setAdjustDialogOpen(true);
  };

  // Function to handle stock adjustment
  const handleAdjustStock = async () => {
    if (!selectedProduct || !adjustQuantity) {
      toast({
        title: "Error",
        description: "Please enter a quantity",
        variant: "destructive",
      });
      return;
    }

    setIsAdjusting(true);
    try {
      let attendantId;
      if (isAttendant) {
        const attendantData = localStorage.getItem('attendantData');
        if (attendantData) {
          try {
            const parsed = JSON.parse(attendantData);
            attendantId = parsed._id;
          } catch {
            attendantId = null;
          }
        }
      } else {
        // For admin users, get their attendant ID
        attendantId = (admin as any)?._id || (admin as any)?.id;
      }

      const payload = {
        type: adjustType  == 'increase' ? 'add' : 'remove',
        attendant: attendantId,
        quantity: Number(adjustQuantity),
        useWarehouse: true, 
        shop: getShopId(),
        product: selectedProduct._id,
        before: selectedProduct.quantity || 0,
      };

      const token = localStorage.getItem('authToken') || localStorage.getItem('attendantToken');
      const response = await fetch(`/api/product/adjust/${selectedProduct._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to adjust stock');
      }

      const result = await response.json();
      
      toast({
        title: "Success",
        description: `Stock ${adjustType === 'increase' ? 'increased' : 'decreased'} by ${adjustQuantity}`,
      });

      // Close dialog and reset form
      setAdjustDialogOpen(false);
      setSelectedProduct(null);
      setAdjustQuantity("");
      
      // Invalidate and refetch all product-related queries
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = String(query.queryKey[0] || '');
          return key.includes('/api/product') || 
                 key.includes('/api/analysis/stockanalysis') ||
                 key.includes('products') ||
                 key.includes('stock');
        }
      });
      
      // Force immediate refetch for current products data
      queryClient.refetchQueries({
        predicate: (query) => {
          const key = String(query.queryKey[0] || '');
          return key.includes('/api/product') || 
                 key.includes('/api/analysis/stockanalysis');
        }
      });
      
      // Also refresh products context for components that depend on it
      refreshProducts();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to adjust stock",
        variant: "destructive",
      });
    } finally {
      setIsAdjusting(false);
    }
  };

  // Adjustment history is now handled in standalone page

  // Function to navigate to adjustment history page
  const openHistoryDialog = (product: any) => {
    const route = isAttendant ? `/attendant/product/adjustment-history/${product._id}` : `/product/adjustment-history/${product._id}`;
    setLocation(route);
  };

  // Shared back-navigation handler
  const handleBack = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasFilter = urlParams.has('filter');
    if (hasFilter) {
      setLocation(isAttendant ? '/attendant/stock/summary' : '/stock/summary');
    } else {
      setLocation(isAttendant ? '/attendant/dashboard' : '/dashboard');
    }
  };

  return (
    <DashboardLayout title="Stock Products">

      {/* ═══════════════════════════════════════════
          DESKTOP layout  (lg and above)
      ═══════════════════════════════════════════ */}
      <div className="hidden lg:block space-y-5">
        <PageHeader title="Stock Products" onBack={handleBack} />

        {/* Stats grid */}
        {(hasPermission('inventory_view') || hasAttendantPermission("stocks", "stock_summary")) && (
          <div className="grid grid-cols-5 gap-4">
            <Card
              className={`cursor-pointer transition-colors ${stockFilter === "lowstock" ? "ring-2 ring-orange-400 bg-orange-50" : "hover:bg-orange-50/50"}`}
              onClick={() => setStockFilter(stockFilter === "lowstock" ? "all" : "lowstock")}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">Low Qty</p>
                    <p className="text-xl font-bold text-orange-600">{lowQuantityProducts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-colors ${stockFilter === "outofstock" ? "ring-2 ring-red-400 bg-red-50" : "hover:bg-red-50/50"}`}
              onClick={() => setStockFilter(stockFilter === "outofstock" ? "all" : "outofstock")}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">Out of Stock</p>
                    <p className="text-xl font-bold text-red-600">{outOfStockProducts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">Stock Value</p>
                    <p className="text-base font-bold text-green-600 truncate">{currency} {totalStockValue.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-600 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">Profit Est.</p>
                    <p className="text-base font-bold text-purple-600 truncate">{currency} {profitEstimate.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-indigo-600 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-500">Total Products</p>
                    <p className="text-xl font-bold text-indigo-600">{totalStockCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Table card */}
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-base">Product Inventory</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Toolbar */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>
              <Select value={stockFilter} onValueChange={(value: "all" | "outofstock" | "lowstock") => setStockFilter(value)}>
                <SelectTrigger className="w-44 h-8 text-sm">
                  <SelectValue placeholder="Stock status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="outofstock">Out of Stock</SelectItem>
                  <SelectItem value="lowstock">Running Low</SelectItem>
                </SelectContent>
              </Select>
              {selectedIds.length > 0 && (hasPermission("inventory_delete") || hasAttendantPermission("products", "delete")) && (
                <Button variant="destructive" className="h-8 text-sm gap-1.5" onClick={() => setBulkDeleteConfirmOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                  Delete {selectedIds.length}
                </Button>
              )}
              {(hasPermission("inventory_delete") || hasAttendantPermission("products", "delete")) && (
                <Button variant="outline" className="h-8 text-sm gap-1.5 border-red-300 text-red-600 hover:bg-red-50" onClick={() => setDeleteAllConfirmOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                  Delete All
                </Button>
              )}
              {(hasPermission("inventory_add") || hasAttendantPermission("stocks", "add_products") || hasAttendantPermission("products", "add")) && (
                <>
                  <Link href="/stock/import-products">
                    <Button variant="outline" className="h-8 text-sm border-purple-300 text-purple-700 hover:bg-purple-50">
                      <Upload className="h-4 w-4 mr-1.5" />
                      Import
                    </Button>
                  </Link>
                  <Link href={addProductRoute}>
                    <Button className="bg-purple-600 hover:bg-purple-700 h-8 text-sm">
                      <Plus className="h-4 w-4 mr-1.5" />
                      Add Product
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="p-3 w-8">
                        <Checkbox
                          checked={filteredProducts.length > 0 && filteredProducts.every((p: any) => selectedIds.includes(p._id))}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="text-left p-3 text-sm font-medium">Product</th>
                      <th className="text-left p-3 text-sm font-medium">SKU / Barcode</th>
                      <th className="text-left p-3 text-sm font-medium">Selling Price</th>
                      {(hasPermission("inventory_view") || hasAttendantPermission("stocks", "view_buying_price")) && (
                        <th className="text-left p-3 text-sm font-medium">Buying Price</th>
                      )}
                      <th className="text-left p-3 text-sm font-medium">Qty</th>
                      <th className="text-left p-3 text-sm font-medium">Status</th>
                      <th className="text-left p-3 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan={8} className="text-center p-10 text-gray-400">Loading products…</td></tr>
                    ) : filteredProducts.length === 0 ? (
                      <tr><td colSpan={8} className="text-center p-10 text-gray-400">No products found</td></tr>
                    ) : filteredProducts.map((product: Product) => {
                      const stockStatus = getQuantityStatus(product);
                      const quantity = (product as any).quantity || 0;
                      const reorderLevel = (product as any).reorderLevel || 0;
                      const isVirtual = (product as any).virtual;
                      const isLowStock = !isVirtual && quantity > 0 && reorderLevel > 0 && quantity <= reorderLevel;
                      const isOutOfStock = !isVirtual && quantity === 0;
                      const isSelected = selectedIds.includes(product._id);
                      const rowBg = isSelected ? "bg-purple-50" : isOutOfStock ? "bg-red-50 hover:bg-red-100" : isLowStock ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-gray-50";
                      return (
                        <tr key={product._id} className={`border-b ${rowBg}`}>
                          <td className="p-3 w-8">
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(product._id)} />
                          </td>
                          <td className="p-3">
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-gray-500">{(product as any).productCategoryId?.name || product.category || "No Category"}</p>
                          </td>
                          <td className="p-3 text-xs text-gray-500">{(product as any).barcode || "—"}</td>
                          <td className="p-3 font-medium text-sm">{currency} {((product as any).sellingPrice || product.price || 0).toLocaleString()}</td>
                          {(hasPermission("inventory_view") || hasAttendantPermission("stocks", "view_buying_price")) && (
                            <td className="p-3 font-medium text-sm">{currency} {((product as any).buyingPrice || 0).toLocaleString()}</td>
                          )}
                          <td className="p-3">
                            {isVirtual ? (
                              <span className="text-gray-400 text-sm">N/A</span>
                            ) : (
                              <span className={`font-semibold text-sm ${isOutOfStock ? "text-red-600" : isLowStock ? "text-amber-600" : "text-green-600"}`}>{quantity}</span>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge variant={stockStatus.variant} className="text-xs">{stockStatus.label}</Badge>
                          </td>
                          <td className="p-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {(hasPermission("inventory_history") || hasAttendantPermission("products", "view_history")) && (
                                  <DropdownMenuItem onClick={() => setLocation(`${productHistoryRoute}/${product._id}/history`)}>
                                    <History className="h-4 w-4 mr-2" />Product History
                                  </DropdownMenuItem>
                                )}
                                {(hasPermission("inventory_edit") || hasAttendantPermission("products", "edit")) && (
                                  <DropdownMenuItem onClick={() => {
                                    (window as any).productEditData = { bundleItems: (product as any).bundleItems || (product as any).items || [], productData: product, passedBundleItems: true };
                                    setLocation(`${editProductRoute}/${product._id}`);
                                  }}>
                                    <Edit className="h-4 w-4 mr-2" />Edit
                                  </DropdownMenuItem>
                                )}
                                {!isVirtual && (hasPermission("inventory_adjust") || hasAttendantPermission("products", "adjust_stock")) && (
                                  <DropdownMenuItem onClick={() => openAdjustDialog(product)}>
                                    <TrendingUp className="h-4 w-4 mr-2" />Adjust Stock
                                  </DropdownMenuItem>
                                )}
                                {!isVirtual && (hasPermission("inventory_history") || hasAttendantPermission("products", "view_adjustment_history")) && (
                                  <DropdownMenuItem onClick={() => openHistoryDialog(product)}>
                                    <FileText className="h-4 w-4 mr-2" />Adjustment History
                                  </DropdownMenuItem>
                                )}
                                {(hasPermission("inventory_delete") || hasAttendantPermission("products", "delete")) && (
                                  <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setSingleDeleteProduct(product)}>
                                    <Trash2 className="h-4 w-4 mr-2" />Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-2 pt-3 gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Per page:</span>
                <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setPage(1); }} className="border rounded px-1.5 py-0.5 text-xs">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <span className="text-xs text-gray-400">{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalProducts)} of {totalProducts}</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>Prev</Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(i => (
                  <Button key={i} variant={currentPage === i ? "default" : "outline"} size="sm" onClick={() => setPage(i)} className="w-7 h-7 p-0 text-xs">{i}</Button>
                ))}
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════
          MOBILE layout  (below lg)
      ═══════════════════════════════════════════ */}
      <div className="lg:hidden flex flex-col">

        {/* Sticky top bar */}
        <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
          {/* Header row */}
          <div className="flex items-center gap-3 px-1 pt-3 pb-2">
            <button onClick={handleBack} className="p-1 -ml-1 rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h1 className="flex-1 text-lg font-bold text-gray-900">Products</h1>
            {selectedIds.length > 0 && (hasPermission("inventory_delete") || hasAttendantPermission("products", "delete")) && (
              <button onClick={() => setBulkDeleteConfirmOpen(true)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-medium border border-red-200">
                <Trash2 className="h-3.5 w-3.5" />
                {selectedIds.length} selected
              </button>
            )}
            {(hasPermission("inventory_add") || hasAttendantPermission("stocks", "add_products") || hasAttendantPermission("products", "add")) && (
              <Link href="/stock/import-products">
                <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                  <Upload className="h-5 w-5 text-gray-500" />
                </button>
              </Link>
            )}
          </div>

          {/* Search + filter */}
          <div className="flex items-center gap-2 px-4 pb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 text-sm border-0 outline-none focus:bg-white focus:ring-2 focus:ring-purple-400 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
            <button
              onClick={() => setFilterSheetOpen(true)}
              className={`flex items-center justify-center w-11 h-11 rounded-xl transition-colors shrink-0 ${stockFilter !== "all" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600"}`}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          {/* Stats pills */}
          {(hasPermission('inventory_view') || hasAttendantPermission("stocks", "stock_summary")) && (
            <div className="w-full overflow-x-auto">
            <div className="flex gap-2 px-3 pb-3 w-max">
              <button
                onClick={() => setStockFilter(stockFilter === "lowstock" ? "all" : "lowstock")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors shrink-0 ${stockFilter === "lowstock" ? "bg-orange-500 text-white border-orange-500" : "bg-orange-50 text-orange-700 border-orange-200"}`}
              >
                <AlertTriangle className="h-3 w-3" />
                Low Qty · {lowQuantityProducts}
              </button>
              <button
                onClick={() => setStockFilter(stockFilter === "outofstock" ? "all" : "outofstock")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors shrink-0 ${stockFilter === "outofstock" ? "bg-red-500 text-white border-red-500" : "bg-red-50 text-red-700 border-red-200"}`}
              >
                <AlertTriangle className="h-3 w-3" />
                Out of Stock · {outOfStockProducts}
              </button>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border bg-green-50 text-green-700 border-green-200 shrink-0">
                <TrendingUp className="h-3 w-3" />
                Value · {currency} {totalStockValue.toLocaleString()}
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border bg-purple-50 text-purple-700 border-purple-200 shrink-0">
                <TrendingUp className="h-3 w-3" />
                Profit · {currency} {profitEstimate.toLocaleString()}
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border bg-indigo-50 text-indigo-700 border-indigo-200 shrink-0">
                <Package className="h-3 w-3" />
                Total · {totalStockCount}
              </span>
            </div>
            </div>
          )}

          {/* Select all */}
          {filteredProducts.length > 0 && (hasPermission("inventory_delete") || hasAttendantPermission("products", "delete")) && (
            <div className="flex items-center gap-2 px-4 pb-2 border-t pt-2">
              <Checkbox
                checked={filteredProducts.length > 0 && filteredProducts.every((p: any) => selectedIds.includes(p._id))}
                onCheckedChange={toggleSelectAll}
                id="mob-select-all"
              />
              <label htmlFor="mob-select-all" className="text-xs text-gray-500 cursor-pointer">Select all on this page</label>
              <button onClick={() => setDeleteAllConfirmOpen(true)} className="ml-auto text-xs text-red-500 hover:text-red-700 transition-colors">
                Delete all products
              </button>
            </div>
          )}
        </div>

        {/* Product table — minimal rows */}
        <div className="flex-1 pb-28">
          {/* Column headers */}
          <div className="flex items-center px-3 py-1.5 bg-gray-50 border-b border-gray-200 gap-2">
            {(hasPermission("inventory_delete") || hasAttendantPermission("products", "delete")) && (
              <div className="w-5 shrink-0" />
            )}
            <div className="w-2 shrink-0" />
            <p className="flex-1 min-w-0 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Product</p>
            <p className="w-16 text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-right">Buy</p>
            <p className="w-16 text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-right">Sell</p>
            <p className="w-10 text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-right">Qty</p>
            <div className="w-7 shrink-0" />
          </div>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
              <p className="text-sm text-gray-400">Loading products…</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Package className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">No products found</p>
              {searchQuery && <button onClick={() => setSearchQuery("")} className="text-xs text-purple-600 underline">Clear search</button>}
            </div>
          ) : (
            <div className="bg-white divide-y divide-gray-100">
              {filteredProducts.map((product: Product) => {
                const quantity = (product as any).quantity || 0;
                const reorderLevel = (product as any).reorderLevel || 0;
                const isVirtual = (product as any).virtual;
                const isLowStock = !isVirtual && quantity > 0 && reorderLevel > 0 && quantity <= reorderLevel;
                const isOutOfStock = !isVirtual && quantity === 0;
                const isSelected = selectedIds.includes(product._id);
                const categoryName = (product as any).productCategoryId?.name || product.category || "";
                const qtyColor = isVirtual ? "text-gray-400" : isOutOfStock ? "text-red-500" : isLowStock ? "text-amber-500" : "text-green-600";
                const rowBg = isSelected ? "bg-purple-50" : isOutOfStock ? "bg-red-50/40" : isLowStock ? "bg-amber-50/40" : "";
                return (
                  <div key={product._id} className={`flex items-center px-3 py-2.5 gap-2 ${rowBg}`}>
                    {(hasPermission("inventory_delete") || hasAttendantPermission("products", "delete")) && (
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(product._id)} className="shrink-0" />
                    )}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isVirtual ? "bg-gray-300" : isOutOfStock ? "bg-red-500" : isLowStock ? "bg-amber-400" : "bg-green-500"}`} />
                    {/* Name + category */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate leading-tight">{product.name}</p>
                      {categoryName && <p className="text-[11px] text-gray-400 truncate leading-tight">{categoryName}</p>}
                    </div>
                    {/* Buy price */}
                    <p className="w-16 text-xs text-gray-500 text-right shrink-0 leading-tight tabular-nums">
                      {(product as any).buyingPrice ? `${currency} ${(product as any).buyingPrice.toLocaleString()}` : "—"}
                    </p>
                    {/* Sell price */}
                    <p className="w-16 text-xs font-semibold text-gray-900 text-right shrink-0 leading-tight tabular-nums">
                      {currency} {((product as any).sellingPrice || product.price || 0).toLocaleString()}
                    </p>
                    {/* Qty */}
                    <p className={`w-10 text-xs font-semibold text-right shrink-0 leading-tight ${qtyColor}`}>
                      {isVirtual ? "Svc" : quantity}
                    </p>
                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0 text-gray-400">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        {(hasPermission("inventory_history") || hasAttendantPermission("products", "view_history")) && (
                          <DropdownMenuItem onClick={() => setLocation(`${productHistoryRoute}/${product._id}/history`)}>
                            <History className="h-4 w-4 mr-2" />Product History
                          </DropdownMenuItem>
                        )}
                        {(hasPermission("inventory_edit") || hasAttendantPermission("products", "edit")) && (
                          <DropdownMenuItem onClick={() => {
                            (window as any).productEditData = { bundleItems: (product as any).bundleItems || (product as any).items || [], productData: product, passedBundleItems: true };
                            setLocation(`${editProductRoute}/${product._id}`);
                          }}>
                            <Edit className="h-4 w-4 mr-2" />Edit
                          </DropdownMenuItem>
                        )}
                        {!isVirtual && (hasPermission("inventory_adjust") || hasAttendantPermission("products", "adjust_stock")) && (
                          <DropdownMenuItem onClick={() => openAdjustDialog(product)}>
                            <TrendingUp className="h-4 w-4 mr-2" />Adjust Stock
                          </DropdownMenuItem>
                        )}
                        {!isVirtual && (hasPermission("inventory_history") || hasAttendantPermission("products", "view_adjustment_history")) && (
                          <DropdownMenuItem onClick={() => openHistoryDialog(product)}>
                            <FileText className="h-4 w-4 mr-2" />Adjustment History
                          </DropdownMenuItem>
                        )}
                        {(hasPermission("inventory_delete") || hasAttendantPermission("products", "delete")) && (
                          <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setSingleDeleteProduct(product)}>
                            <Trash2 className="h-4 w-4 mr-2" />Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="sticky bottom-0 bg-white border-t flex items-center justify-between px-4 py-2.5 shadow-sm">
            <button onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 disabled:opacity-40">Prev</button>
            <span className="text-xs text-gray-500">Page {currentPage} of {totalPages} · {totalProducts} items</span>
            <button onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages} className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 disabled:opacity-40">Next</button>
          </div>
        )}
      </div>

      {/* Filter bottom sheet (shared) */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="bottom" className="p-0 rounded-t-3xl">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1" />
          <SheetHeader className="px-5 pt-2 pb-3 border-b">
            <SheetTitle className="text-base font-semibold">Filter Products</SheetTitle>
          </SheetHeader>
          <div className="py-2">
            {([
              { value: "all", label: "All Products", icon: Package, color: "text-gray-600" },
              { value: "outofstock", label: "Out of Stock", icon: AlertTriangle, color: "text-red-600" },
              { value: "lowstock", label: "Running Low", icon: AlertTriangle, color: "text-orange-600" },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm transition-colors ${stockFilter === opt.value ? "bg-purple-50 text-purple-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
                onClick={() => { setStockFilter(opt.value); setFilterSheetOpen(false); }}
              >
                <opt.icon className={`h-4 w-4 ${stockFilter === opt.value ? "text-purple-600" : opt.color}`} />
                <span className="flex-1 text-left">{opt.label}</span>
                {stockFilter === opt.value && <Check className="h-4 w-4 text-purple-600" />}
              </button>
            ))}
          </div>
          <div className="px-5 pb-8 pt-2 border-t">
            <button className="w-full py-3 rounded-xl bg-gray-100 text-sm font-medium text-gray-700" onClick={() => setFilterSheetOpen(false)}>Close</button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Floating Add button — mobile only */}
      {(hasPermission("inventory_add") || hasAttendantPermission("stocks", "add_products") || hasAttendantPermission("products", "add")) && (
        <Link href={addProductRoute}>
          <button className="lg:hidden fixed bottom-5 right-5 z-30 flex items-center gap-2 pl-4 pr-5 py-3.5 bg-purple-600 text-white rounded-full shadow-lg shadow-purple-200 active:scale-95 transition-transform text-sm font-semibold">
            <Plus className="h-5 w-5" />
            Add Product
          </button>
        </Link>
      )}


      {/* Adjust Stock Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-2xl sm:rounded-lg">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription className="text-sm">
              {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-1 pb-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adjustType">Type</Label>
              <Select value={adjustType} onValueChange={(value: "increase" | "decrease") => setAdjustType(value)}>
                <SelectTrigger id="adjustType" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Increase Stock</SelectItem>
                  <SelectItem value="decrease">Decrease Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                className="h-11"
                placeholder="Enter quantity"
                min="1"
              />
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setAdjustDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleAdjustStock}
              disabled={isAdjusting || !adjustQuantity}
            >
              {isAdjusting ? "Adjusting..." : "Adjust Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Single Product Delete Confirmation */}
      <Dialog open={!!singleDeleteProduct} onOpenChange={(o) => { if (!isSingleDeleting && !o) setSingleDeleteProduct(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Product?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{singleDeleteProduct?.name}</strong>. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSingleDeleteProduct(null)} disabled={isSingleDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSingleDelete} disabled={isSingleDeleting}>
              {isSingleDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Confirmation */}
      <Dialog open={deleteAllConfirmOpen} onOpenChange={(o) => { if (!isDeletingAll) setDeleteAllConfirmOpen(o); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete All Products?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>every product</strong> in this shop. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteAllConfirmOpen(false)} disabled={isDeletingAll}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAll} disabled={isDeletingAll}>
              {isDeletingAll ? "Deleting…" : "Delete All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation */}
      <Dialog open={bulkDeleteConfirmOpen} onOpenChange={(o) => { if (!isBulkDeleting) setBulkDeleteConfirmOpen(o); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete {selectedIds.length} Product{selectedIds.length !== 1 ? "s" : ""}?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete the selected product{selectedIds.length !== 1 ? "s" : ""}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkDeleteConfirmOpen(false)} disabled={isBulkDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkDeleting}>
              {isBulkDeleting ? "Deleting…" : `Delete ${selectedIds.length}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  TrendingDown,
  Package,
  Truck,
  Users,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  FileText,
  Eye,
  MoreHorizontal,
  Plus,
  DollarSign,
  RefreshCw,
  ArrowLeft,
  RotateCcw,
  Download
} from "lucide-react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PermissionGuard } from "@/components/PermissionGuard";
import { usePermissions } from "@/hooks/usePermissions";
import React, { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigationRoute } from "@/lib/navigation-utils";
import { useAuth } from "@/features/auth/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Purchase, PurchaseItem } from "@shared/schema";
import PurchaseOrderDialog from "./purchase-order-dialog";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { useAttendantAuth } from "@/contexts/AttendantAuthContext";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useCurrency } from "@/utils";

// Purchases data now comes from API

export default function PurchasesList() {
  const [, navigate] = useLocation();
  const { hasPermission } = usePermissions();
  const { hasAttendantPermission } = usePermissions();
  const { admin } = useAuth();
  const { selectedShopId } = useSelector((state: RootState) => state.shop);
  const { attendant, refreshAttendantData, isRefreshing } = useAttendantAuth();

  // Determine if current user is admin (not attendant)
  const isAdmin = !!admin && !localStorage.getItem("attendantData");

  const handleBackClick = () => window.history.back();

  // Check if user has permission to view purchases - admins always have access, attendants need permission
  const canViewPurchases =
    isAdmin || hasAttendantPermission("stocks", "view_purchases");
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [attendantFilter, setAttendantFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const currency = useCurrency();
  const [, setLocation] = useLocation();
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<any>(null);
  const { toast } = useToast();
  const purchasesRoute = useNavigationRoute("purchases");
  const addPurchasesRoute = useNavigationRoute("addPurchase");

  // Get shop and admin data - use Redux state for shop ID
  const primaryShop =
    typeof admin?.primaryShop === "object" ? admin.primaryShop : null;
  const shopId = selectedShopId || (primaryShop as any)?._id;

  // Get attendant ID properly: for attendants use attendant._id, for admins use admin data
  const attendantId =
    attendant?._id ||
    (admin?.attendantId as any)?._id ||
    admin?.attendantId ||
    admin?._id;

  // Fetch suppliers data for filter dropdown
  const { data: suppliersData = [] } = useQuery({
    queryKey: ["/api/suppliers", shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const response = await fetch(`/api/suppliers?shopId=${shopId}`);
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      return response.json();
    },
    enabled: !!shopId,
  });

  // Fetch attendants data for filter dropdown (only for admins)
  const showAttendantFilter = true; // Show attendant filter for all users for now
  const { data: attendantsData = [] } = useQuery({
    queryKey: ["/api/attendants/shop/filter", shopId],
    queryFn: async () => {
      if (!shopId || !showAttendantFilter) return [];
      const response = await fetch(
        `/api/attendants/shop/filter?shopId=${shopId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch attendants");
      return response.json();
    },
    enabled: !!shopId && showAttendantFilter,
  });

  // Build query parameters for purchases filter
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (shopId) params.append("shopId", shopId);

    // For attendant filter: attendants always see only their own purchases, admins can filter by attendant
    if (!isAdmin && attendantId) {
      // Attendants always filtered by their own ID
      params.append("attendantId", attendantId);
    } else if (isAdmin && attendantFilter !== "all") {
      // Admins can filter by specific attendant
      params.append("attendantId", attendantFilter);
    }

    // Date filtering - use wider range if no dates set to catch recent purchases
    if (startDate) {
      params.append("start", startDate);
    }
    if (endDate) {
      params.append("end", endDate);
    }

    // Add payment type filter if needed
    if (statusFilter !== "all") {
      // Map status to payment type: paid -> cash, unpaid -> credit
      const paymentType = statusFilter === "paid" ? "cash" : "credit";
      params.append("paymentType", paymentType);
    }

    // Add supplier filter if needed
    if (supplierFilter !== "all") {
      params.append("supplierId", supplierFilter);
    }

    // Add search query if provided (search by purchase number only)
    if (searchQuery.trim()) {
      params.append("purchaseNo", searchQuery.trim());
    }

    return params.toString();
  };

  // Fetch purchases data from API
  const {
    data: purchasesResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "/api/purchases",
      shopId,
      attendantId,
      startDate,
      endDate,
      statusFilter,
      supplierFilter,
      searchQuery,
    ],
    queryFn: async () => {
      const queryParams = buildQueryParams();
      // Add timestamp to force cache busting
      const timestamp = Date.now();
      const response = await fetch(
        `/api/purchases?${queryParams}&_t=${timestamp}`,
        {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        },
      );
      if (!response.ok) throw new Error("Failed to fetch purchases");
      return response.json();
    },
    // enabled: !!shopId && canViewPurchases,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const purchasesData = Array.isArray(purchasesResponse)
    ? purchasesResponse
    : [];

  // Get purchases analytics for summary cards
  const { data: analyticsData } = useQuery({
    queryKey: [
      `/api/analysis/report/purchases`,
      shopId,
      startDate,
      endDate,
      supplierFilter,
      attendantFilter,
      statusFilter,
      searchQuery,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (shopId) params.append("shopid", shopId);
      if (startDate) params.append("fromDate", startDate);
      if (endDate) params.append("toDate", endDate);

      // Add supplier filter to analytics
      if (supplierFilter !== "all") {
        params.append("supplierId", supplierFilter);
      }

      // Add status filter to analytics (map to payment type)
      if (statusFilter !== "all") {
        const paymentType = statusFilter === "paid" ? "cash" : "credit";
        params.append("paymentType", paymentType);
      }

      // Only add attendant filter to analytics if no supplier filter (API doesn't support both)
      if (supplierFilter === "all") {
        if (attendantFilter !== "all" && isAdmin) {
          params.append("attendantId", attendantFilter);
        } else if (!isAdmin && attendantId) {
          params.append("attendantId", attendantId);
        }
      }

      // Add search query if provided (search by purchase number only)
      if (searchQuery.trim()) {
        params.append("purchaseNo", searchQuery.trim());
      }

      // Add timestamp to force cache busting
      const timestamp = Date.now();
      const response = await fetch(
        `/api/analysis/report/purchases?${params}&_t=${timestamp}`,
        {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        },
      );
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
    enabled: !!shopId,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Delete purchase mutation
  const deletePurchaseMutation = useMutation({
    mutationFn: async (purchaseId: string) => {
      const response = await fetch(`/api/purchases/${purchaseId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete purchase");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchases"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete purchase",
        variant: "destructive",
      });
    },
  });

  // Create supplier lookup map for ID to name mapping
  const supplierMap = suppliersData.reduce((acc: any, supplier: any) => {
    acc[supplier._id] = supplier.name;
    return acc;
  }, {});

  // Transform API data to match expected format - API already handles filtering
  const filteredPurchases = purchasesData
    .map((purchase: any) => ({
      id: purchase._id || purchase.id,
      supplierName: purchase.supplier?.name || 
                   purchase.supplierId?.name || 
                   supplierMap[purchase.supplierId] || 
                   "Direct Purchase",
      items: (purchase.items || []).map((item: any) => ({
        productName: item.product?.name || "Unknown Product",
        quantity: item.quantity || 0,
        unitCost: item.unitPrice || 0,
        totalCost: (item.quantity || 0) * (item.unitPrice || 0),
        received: item.received || item.quantity || 0,
      })),
      totalAmount: purchase.totalAmount || 0,
      orderDate: purchase.createdAt || new Date().toISOString(),
      expectedDate: purchase.expectedDate,
      receivedDate: purchase.receivedDate,
      status: (() => {
        const total = Number(purchase.totalAmount || 0);
        const paid = Number(purchase.amountPaid || 0);
        if (total > 0 && paid >= total) return "paid";
        if (paid > 0 && paid < total) return "partial";
        // Cash purchases are paid by default even when the API doesn't echo amountPaid
        if ((purchase.paymentType || "").toLowerCase() === "cash") return "paid";
        return "unpaid";
      })(),
      invoiceNumber: purchase.purchaseNo || purchase._id,
      currency: purchase.shopId?.currency || "KES",
    }));



  // Pagination calculations
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPurchases.slice(startIndex, endIndex);
  }, [filteredPurchases, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleSupplierFilter = (supplier: string) => {
    setSupplierFilter(supplier);
    setCurrentPage(1);
    // Force immediate refetch when supplier changes
    refetch();
  };

  const handleAttendantFilter = (attendant: string) => {
    setAttendantFilter(attendant);
    setCurrentPage(1);
    // Force immediate refetch when attendant changes
    refetch();
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Clear all filters function
  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSupplierFilter("all");
    setAttendantFilter("all");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const toggleRowExpansion = (purchaseId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(purchaseId)) {
      newExpanded.delete(purchaseId);
    } else {
      newExpanded.add(purchaseId);
    }
    setExpandedRows(newExpanded);
  };

  // Action handlers
  const handleViewPurchase = (purchase: any) => {
    // Find the original purchase data from API to pass complete data
    const originalPurchase = purchasesData.find(
      (p: any) => p._id === purchase.id,
    );
    setLocation(`${purchasesRoute}/view/${purchase.id}`, {
      state: { purchase: originalPurchase || purchase },
    });
  };

  const handleEditPurchase = (purchase: any) => {
    const originalPurchase = purchasesData.find(
      (p: any) => p._id === purchase.id,
    );
    setLocation(`${purchasesRoute}/edit/${purchase.id}`, {
      state: { purchase: originalPurchase || purchase },
    });
  };

  const handlePayPurchase = (purchase: any) => {
    const originalPurchase = purchasesData.find(
      (p: any) => p._id === purchase.id,
    );
    setLocation(`${purchasesRoute}/pay/${purchase.id}`, {
      state: { purchase: originalPurchase || purchase },
    });
  };

  const handleReceiveItems = (purchase: Purchase) => {
    setLocation(`${purchasesRoute}/receive/${purchase.id}`);
  };

  const handleCancelPurchase = (purchase: Purchase) => {
    setLocation(`${purchasesRoute}/cancel/${purchase.id}`);
  };

  const handleReturnPurchase = (purchase: any) => {
    // Store purchase data in window object for immediate access (same pattern as sales)
    (window as any).__purchaseReturnData = purchase;
    setLocation(`${purchasesRoute}/return/${purchase.id}`);
  };

  const handleDeletePurchase = (purchase: any) => {
    setPurchaseToDelete(purchase);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePurchase = () => {
    if (!purchaseToDelete) return;
    deletePurchaseMutation.mutate(purchaseToDelete.id);
    setDeleteDialogOpen(false);
    setPurchaseToDelete(null);
  };

  const handleCreatePurchase = () => {
    setLocation('/purchases/order');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString();
    
    // Header styling
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('PURCHASE REPORT', 105, 25, { align: 'center' });
    
    // Company info section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${currentDate}`, 20, 45);
    doc.text(`Shop: ${selectedShopId ? 'Shop One' : 'All Shops'}`, 20, 55);
    doc.text(`Report Period: ${startDate} to ${endDate}`, 20, 65);
    
    // Summary section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY', 20, 85);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Purchases: ${filteredOrdersCount}`, 20, 95);
    doc.text(`Total Amount: ${filteredPurchases[0]?.currency || 'KES'} ${filteredTotalAmount.toLocaleString()}`, 20, 105);
    doc.text(`Paid Amount: ${filteredPurchases[0]?.currency || 'KES'} ${filteredSpent.toLocaleString()}`, 20, 115);
    doc.text(`Unpaid Count: ${filteredUnpaidCount}`, 20, 125);
    doc.text(`Unique Suppliers: ${filteredSuppliers}`, 20, 135);
    
    // Prepare table data
    const tableData = filteredPurchases.map((purchase: any) => [
      purchase.invoiceNumber || 'N/A',
      purchase.supplierName || 'N/A',
      new Date(purchase.orderDate).toLocaleDateString(),
      `${purchase.currency} ${purchase.totalAmount.toLocaleString()}`,
      purchase.status.toUpperCase(),
      purchase.items.length.toString()
    ]);
    
    // Add table
    autoTable(doc, {
      startY: 150,
      head: [['PO Number', 'Supplier', 'Date', 'Amount', 'Status', 'Items']],
      body: tableData,
      styles: { 
        fontSize: 8,
        cellPadding: 3
      },
      headStyles: { 
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { left: 20, right: 20 }
    });
    
    // Save the PDF
    const filename = `Purchase_Report_${startDate}_to_${endDate}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    
    toast({
      title: "Success",
      description: "Purchase report exported successfully",
    });
  };

  // Calculate filtered stats
  const filteredSpent = filteredPurchases
    .filter((purchase: any) => purchase.status === "paid")
    .reduce((sum: number, purchase: any) => sum + purchase.totalAmount, 0);

  const filteredTotalAmount = filteredPurchases.reduce(
    (sum: number, purchase: any) => sum + purchase.totalAmount,
    0,
  );
  const filteredOrdersCount = filteredPurchases.length;
  const filteredUnpaidCount = filteredPurchases.filter(
    (p: any) => p.status === "unpaid",
  ).length;
  const filteredSuppliers = new Set(
    filteredPurchases.map((purchase: any) => purchase.supplierName),
  ).size;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "default";
      case "unpaid":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Permission check is now handled above

  if (!canViewPurchases) {
    return (
      <DashboardLayout title="Purchases">
        <div className="p-4">
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-gray-600">
                You don't have permission to view purchases. Contact your
                administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Show error state if API is down
  if (error) {
    return (
      <DashboardLayout title="Purchase Reports">
        <div className="p-0 sm:p-4 w-full">
          <div className="mb-3">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackClick}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    Purchase Reports
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Shop One
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-red-400" />
              <h3 className="text-lg font-semibold mb-2">
                Service Temporarily Unavailable
              </h3>
              <p className="text-gray-600 mb-4">
                The external API is experiencing issues. Please try again in a
                few moments.
              </p>
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Purchase Reports">
      <div className="w-full">
        <PageHeader
          title="Purchases"
          onBack={handleBackClick}
          actions={<>
            <Button 
              onClick={exportToPDF}
              variant="outline"
              size="sm"
              className="h-8 flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-sm">Export PDF</span>
              <span className="sm:hidden text-sm">PDF</span>
            </Button>
            {(isAdmin || hasAttendantPermission("stocks", "add_purchases")) && (
              <Link href={addPurchasesRoute}>
                <Button size="sm" className="h-8" onClick={handleCreatePurchase}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden sm:inline">New </span>Purchase
                </Button>
              </Link>
            )}
          </>}
        />

        {/* Filters Section */}
        <Card className="mb-3">
          <CardContent className="p-3 space-y-2">
            {/* Row 1: Search + status + supplier + attendant */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by purchase number…"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className="h-9 w-[120px] text-sm">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>

              <Select value={supplierFilter} onValueChange={handleSupplierFilter}>
                <SelectTrigger className="h-9 w-[140px] text-sm">
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {(suppliersData as any[]).map((supplier: any) => (
                    <SelectItem key={supplier._id} value={supplier._id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isAdmin && (
                <Select value={attendantFilter} onValueChange={handleAttendantFilter}>
                  <SelectTrigger className="h-9 w-[140px] text-sm">
                    <SelectValue placeholder="All Attendants" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Attendants</SelectItem>
                    {(attendantsData as any[]).map((attendant: any) => (
                      <SelectItem key={attendant._id} value={attendant._id}>
                        {attendant.username || attendant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Row 2: Date range + clear */}
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 w-[140px] text-sm"
              />
              <span className="text-xs text-muted-foreground">—</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 w-[140px] text-sm"
              />
              <div className="flex-1" />
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-8 px-2 text-xs text-muted-foreground gap-1">
                <RotateCcw className="h-3 w-3" />
                Clear
              </Button>
            </div>

            {/* Result hints */}
            {(searchQuery || startDate || endDate) && (
              <p className="text-xs text-muted-foreground">
                {filteredPurchases.length} result{filteredPurchases.length !== 1 ? 's' : ''}
                {searchQuery && <> for "<span className="font-medium">{searchQuery}</span>"</>}
                {(startDate || endDate) && <> · {startDate || '…'} to {endDate || 'now'}</>}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card className="mb-4">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading purchases data...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="mb-4">
            <CardContent className="p-8 text-center">
              <div className="text-red-500 mb-4">
                Error loading purchases data
              </div>
              <Button onClick={() => refetch()} variant="outline">
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Summary Stats */}
        {!isLoading && !error && analyticsData && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-3">
            {[
              { label: "Total", value: analyticsData.totalpurchases || 0, color: "text-blue-600" },
              { label: "Cash", value: analyticsData.cash || 0, color: "text-green-600" },
              { label: "Unpaid", value: analyticsData.credit || 0, color: "text-orange-500" },
              { label: "Paid", value: analyticsData.paid || 0, color: "text-purple-600" },
              { label: "Returns", value: analyticsData.returns || 0, color: "text-red-500" },
            ].map(({ label, value, color }) => (
              <Card key={label} className="p-3">
                <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                <p className={`text-base font-bold ${color}`}>
                  {currency} {(value).toFixed(2)}
                </p>
              </Card>
            ))}
          </div>
        )}

        {/* Purchases Table */}
        {!isLoading && !error && (
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <CardTitle className="text-lg">
                  Purchase Orders
                  {statusFilter !== "all" && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      -{" "}
                      {statusFilter.charAt(0).toUpperCase() +
                        statusFilter.slice(1)}
                    </span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2 text-sm">
                  <Label htmlFor="items-per-page" className="whitespace-nowrap">
                    Show:
                  </Label>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={handleItemsPerPageChange}
                  >
                    <SelectTrigger className="w-16 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
                      <th className="w-10 py-2 px-3" />
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">PO #</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Supplier</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                      <th className="w-10 py-2 px-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((purchase) => (
                      <React.Fragment key={purchase.id}>
                        <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td
                            className="py-2 px-3 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => toggleRowExpansion(purchase.id)}
                          >
                            {expandedRows.has(purchase.id)
                              ? <ChevronUp className="h-4 w-4" />
                              : <ChevronDown className="h-4 w-4" />}
                          </td>
                          <td className="py-2 px-3 text-sm font-mono">
                            {purchase.invoiceNumber}
                          </td>
                          <td className="py-2 px-3 text-sm">
                            {purchase.supplierName}
                          </td>
                          <td className="py-2 px-3 text-sm font-medium">
                            {purchase.currency}{" "}
                            {purchase.totalAmount.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-sm">
                            {new Date(purchase.orderDate).toLocaleString()}
                          </td>
                          <td className="py-2 px-3">
                            <Badge
                              variant={getStatusBadgeVariant(purchase.status)}
                              className="text-xs"
                            >
                              {purchase.status}
                            </Badge>
                          </td>
                          <td className="py-2 px-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleViewPurchase(purchase)}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleEditPurchase(purchase)}
                                  disabled={
                                    purchase.status === "received" ||
                                    purchase.status === "cancelled"
                                  }
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Order
                                </DropdownMenuItem>
                                {purchase.outstandingBalance &&
                                  purchase.outstandingBalance > 0 && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handlePayPurchase(purchase)
                                      }
                                    >
                                      <DollarSign className="mr-2 h-4 w-4" />
                                      Make Payment
                                    </DropdownMenuItem>
                                  )}
                                {(purchase.status === "received" || purchase.status === "paid" || purchase.status === "completed") && (
                                  <DropdownMenuItem
                                    onClick={() => handleReturnPurchase(purchase)}
                                  >
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Return Items
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {(isAdmin || hasAttendantPermission('stocks', 'delete_purchase_invoice')) && (
                                  <DropdownMenuItem
                                    onClick={() => handleDeletePurchase(purchase)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Purchase
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                        {expandedRows.has(purchase.id) && (
                          <tr className="bg-muted/30 border-l-2 border-blue-500" data-testid={`row-expanded-${purchase.id}`}>
                            <td colSpan={8} className="py-2 px-4">
                              <div className="space-y-2">
                                <div className="overflow-x-auto rounded border border-border bg-background">
                                  <table className="w-full text-xs">
                                    <thead className="bg-muted/50">
                                      <tr className="text-muted-foreground">
                                        <th className="text-left px-2 py-1.5 font-medium">Product</th>
                                        <th className="text-right px-2 py-1.5 font-medium w-16">Qty</th>
                                        <th className="text-right px-2 py-1.5 font-medium w-16">Recv</th>
                                        <th className="text-right px-2 py-1.5 font-medium w-24">Unit</th>
                                        <th className="text-right px-2 py-1.5 font-medium w-24">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {purchase.items.map((item, index) => (
                                        <tr key={index} className="border-t border-border" data-testid={`row-item-${purchase.id}-${index}`}>
                                          <td className="px-2 py-1.5">{item.productName}</td>
                                          <td className="px-2 py-1.5 text-right tabular-nums">{item.quantity}</td>
                                          <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                                            {item.received !== undefined ? item.received : "—"}
                                          </td>
                                          <td className="px-2 py-1.5 text-right tabular-nums">
                                            {purchase.currency} {item.unitCost.toFixed(2)}
                                          </td>
                                          <td className="px-2 py-1.5 text-right tabular-nums font-medium">
                                            {purchase.currency} {item.totalCost.toFixed(2)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot className="bg-muted/30">
                                      <tr className="border-t border-border">
                                        <td colSpan={4} className="px-2 py-1.5 text-right font-medium">Total</td>
                                        <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-blue-600 dark:text-blue-400" data-testid={`text-total-${purchase.id}`}>
                                          {purchase.currency} {purchase.totalAmount.toFixed(2)}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground px-1">
                                  <span><span className="font-medium text-foreground">Expected:</span> {purchase.expectedDate ? new Date(purchase.expectedDate).toLocaleDateString() : "TBD"}</span>
                                  <span><span className="font-medium text-foreground">Invoice:</span> {purchase.invoiceNumber || "Pending"}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
                {filteredPurchases.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No purchase orders found for the selected filters.
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {filteredPurchases.length > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4 pt-3 border-t">
                  <div className="text-xs text-muted-foreground">
                    {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(
                      currentPage * itemsPerPage,
                      filteredPurchases.length,
                    )}{" "}
                    of {filteredPurchases.length}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="h-8 px-2"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <Button
                              key={pageNum}
                              variant={
                                currentPage === pageNum ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-8 h-8 p-0 text-xs"
                            >
                              {pageNum}
                            </Button>
                          );
                        },
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="h-8 px-2"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Purchase Order Dialog */}
        <PurchaseOrderDialog
          isOpen={showPurchaseDialog}
          onClose={() => setShowPurchaseDialog(false)}
          onSuccess={() => {
            refetch();
            queryClient.invalidateQueries({
              queryKey: ["/api/analysis/report/purchases"],
            });
          }}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Purchase</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete purchase {purchaseToDelete?.invoiceNumber}?
                This action cannot be undone and will permanently remove this purchase from your records.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletePurchaseMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeletePurchase}
                disabled={deletePurchaseMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deletePurchaseMutation.isPending ? "Deleting..." : "Delete Purchase"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}

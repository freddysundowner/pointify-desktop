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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  ChevronDown,
  ChevronUp,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  MoreHorizontal,
  RotateCcw,
  ArrowLeft,
  FileText,
  CheckCircle,
  Receipt,
  Mail,
  Download,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { PermissionGuard } from "@/components/PermissionGuard";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/features/auth/useAuth";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useNavigationRoute } from "@/lib/navigation-utils";
import type { Sale } from "@shared/schema";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { useAttendantAuth } from "@/contexts/AttendantAuthContext";
import { usePrimaryShop } from "@/hooks/usePrimaryShop";

function SalesList() {
  const { hasPermission, user, hasAttendantPermission } = usePermissions();
  const { admin } = useAuth();
  const { selectedShopId } = useSelector((state: RootState) => state.shop);
  const [location, setLocation] = useLocation();
  const salesRoute = useNavigationRoute("sales");

  // Add attendant authentication hooks
  const { attendant, isAuthenticated: isAttendantAuth } = useAttendantAuth();
  const { userType, adminId } = usePrimaryShop();

  // Check if user is admin (has all permissions)
  const isAdmin = userType === "admin" || user?.role === "admin";

  // Back button handler
  const handleBackClick = () => {
    if (userType === "attendant") {
      setLocation("/attendant/dashboard");
    } else {
      setLocation("/dashboard");
    }
  };
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Initialize dates from URL parameters if available
  const urlParams = new URLSearchParams(window.location.search);
  const [startDate, setStartDate] = useState<string>(
    urlParams.get("startDate") || "",
  );
  const [endDate, setEndDate] = useState<string>(
    urlParams.get("endDate") || "",
  );
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState<string>("");
  // Set dateFilter based on URL params or default to "all"
  const [dateFilter, setDateFilter] = useState<string>(
    urlParams.get("startDate") && urlParams.get("endDate") ? "custom" : "all",
  );
  const [attendantFilter, setAttendantFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Complete Sale (hold → cashed) state
  const [completeSaleOpen, setCompleteSaleOpen] = useState(false);
  const [saleToComplete, setSaleToComplete] = useState<any>(null);
  const [completePaymentMethod, setCompletePaymentMethod] = useState("cash");
  const [completeAmountPaid, setCompleteAmountPaid] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);

  // Invoice (download / email) dialog state
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceSale, setInvoiceSale] = useState<any>(null);
  const [invoiceMode, setInvoiceMode] = useState<"choose" | "email">("choose");
  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);

  // Quotation (download / email) dialog state
  const [quotationDialogOpen, setQuotationDialogOpen] = useState(false);
  const [quotationSale, setQuotationSale] = useState<any>(null);
  const [quotationMode, setQuotationMode] = useState<"choose" | "email">("choose");
  const [quotationEmail, setQuotationEmail] = useState("");
  const [isSendingQuotation, setIsSendingQuotation] = useState(false);

  const { toast } = useToast();

  // Get shop and admin details using usePrimaryShop hook
  const { shopId: primaryShopId } = usePrimaryShop();
  const shopId = selectedShopId || primaryShopId;
  const primaryShop =
    typeof admin?.primaryShop === "object" ? admin.primaryShop : null;
  const primaryShopCurrency = (primaryShop as any)?.currency || "KES";

  // Function to get currency for a sale - extract from shopId object
  const getSaleCurrency = (sale: any) => {
    // Extract currency from shopId object if it exists
    if (
      sale.shopId &&
      typeof sale.shopId === "object" &&
      sale.shopId.currency
    ) {
      return sale.shopId.currency;
    }
    // Fallback to primary shop currency
    return primaryShopCurrency;
  };

  // Memoize query parameters to prevent unnecessary refetches
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (shopId) params.append("shopId", shopId);
    // For attendants, filter by their attendantId to show only their sales
    if (userType === "attendant" && attendant?._id) {
      params.append("attendantId", attendant._id);
    }
    // Only add status filter if not 'all' and map frontend values to API values
    if (statusFilter !== "all") {
      if (statusFilter === "cash") {
        // For cash filter, use both status and paymentTag
        params.append("status", "cashed");
        params.append("paymentTag", "cash");
      } else if (statusFilter === "mpesa") {
        params.append("status", "cashed");
        params.append("paymentTag", "mpesa");
      } else if (statusFilter === "credit") {
        params.append("status", "cashed");
        params.append("paymentTag", "credit");
      } else if (statusFilter === "wallet") {
        params.append("status", "cashed");
        params.append("paymentTag", "wallet");
      } else if (statusFilter === "bank") {
        params.append("status", "cashed");
        params.append("paymentTag", "bank");
      } else {
        let apiStatus = statusFilter;
        if (statusFilter === "completed") apiStatus = "cashed";
        params.append("status", apiStatus);
      }
    }
    // Only add date filters if they are set (show all sales by default)
    if (startDate) {
      params.append("start", startDate);
    }
    if (endDate) {
      params.append("end", endDate);
    }
    if (searchQuery.trim()) params.append("receiptNo", searchQuery.trim());
    if (attendantFilter !== "all")
      params.append("attendantId", attendantFilter);
    params.append("page", currentPage.toString());
    params.append("limit", itemsPerPage.toString());

    return params.toString();
  }, [
    shopId,
    userType,
    attendant?._id,
    statusFilter,
    startDate,
    endDate,
    searchQuery,
    attendantFilter,
    currentPage,
    itemsPerPage,
  ]);

  // Check if query should be enabled
  const queryEnabled = !!shopId && (userType === "admin" || (userType === "attendant" && !!attendant?._id));
  
 

  // Fetch sales data from API using default query function
  const {
    data: salesResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [`/api/sales/filter?${queryParams}`],
    enabled: queryEnabled,
  });

  // Build query parameters for sales report analysis
  const buildReportParams = () => {
    const params = new URLSearchParams();
    if (shopId) params.append("shopid", shopId);

    // For attendants, filter analytics by their attendantId
    if (userType === "attendant" && attendant?._id) {
      params.append("attendantId", attendant._id);
    }

    // For admin users, filter by selected attendant if not "all"
    if (userType === "admin" && attendantFilter !== "all") {
      params.append("attendantId", attendantFilter);
    }

    // Only add date filters if they are set (show all sales stats by default)
    if (startDate) {
      params.append("fromDate", startDate);
    }

    if (endDate) {
      params.append("toDate", endDate);
    }

    return params.toString();
  };

  // Fetch sales report analysis data
  const { data: salesReportData, isLoading: isReportLoading, refetch: refetchReport } = useQuery({
    queryKey: [`/api/analysis/report/sales?${buildReportParams()}`],
    staleTime: 0,
    refetchOnMount: "always",
    // enabled: !!shopId
  });

  // Refresh both the sales list and summary stats whenever the user navigates to this page
  useEffect(() => {
    const isSalesPage = location === "/sales" || location === "/attendant/sales";
    if (isSalesPage) {
      refetch();
      refetchReport();
    }
  }, [location]);

  // Also refresh on window focus (e.g. switching browser tabs back)
  useEffect(() => {
    const handleFocus = () => {
      if (location === "/sales" || location === "/attendant/sales") {
        refetch();
        refetchReport();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [location, refetch, refetchReport]);

  const salesData = (salesResponse as any)?.data || [];
  const totalCount = (salesResponse as any)?.count || 0;
  const apiTotalPages = (salesResponse as any)?.totalPages || 1;

  // Transform API data to match expected format
  const transformedSales = salesData.map((sale: any) => ({
    id: sale._id,
    receiptNo: sale.receiptNo || sale._id,
    customerName: sale.customerId?.name || "Walk-in",
    totalAmount: sale.totalWithDiscount || sale.totalAmount || 0, // Use totalWithDiscount if available, fallback to totalAmount
    saleDate: sale.createdAt,
    status: sale.status === "cashed" ? "completed" : sale.status,
    paymentTag: sale.paymentTag || "cash",
    saleType: sale.saleType || "Retail",
    items: sale.items || [],
    attendantName: sale.attendantId?.username || "Unknown",
    attendantId: sale.attendantId?._id || sale.attendantId,
    shopId: sale.shopId, // Preserve original shopId object
  }));

  // Fetch attendants from API - only for admin users
  const { data: attendantsResponse } = useQuery({
    queryKey: [
      `/api/attendants/shop/filter?shopId=${shopId}&adminId=${adminId}`,
    ],
    enabled: userType === "admin" && !!shopId && !!adminId,
  });

  const uniqueAttendants = attendantsResponse || [];

  const clearDateFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  const setDateRange = (days: number) => {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - days);

    setStartDate(startDate.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Use API data directly (no client-side pagination since API handles it)
  const paginatedData = transformedSales;

  // Reset to first page when filters change and refresh API data
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleAttendantFilter = (attendantId: string) => {
    setAttendantFilter(attendantId);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  // Sales action handlers - Navigate to existing pages
  const handleViewSale = (sale: any) => {
    // Pass original sale data from API, not transformed
    const originalSale = salesData.find((s: any) => s._id === sale.id);
    const saleId = sale.id;
    
    // Use dynamic routing based on user type
    const receiptRoute = userType === "attendant" ? `/attendant/receipt/${saleId}` : `/receipt/${saleId}`;
    setLocation(receiptRoute, { state: { saleData: originalSale } });
  };


  const handleReturnSale = (sale: any) => {
    // Pass original sale data from API, not transformed
    const originalSale = salesData.find((s: any) => s._id === sale.id);
    const saleId = sale.id;
    setLocation(`${salesRoute}/return/${saleId}`, {
      state: { saleData: originalSale },
    });
  };

  const handleDeleteSale = (sale: any) => {
    setSaleToDelete(sale);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSale = async () => {
    if (!saleToDelete) return;

    setIsDeleting(true);
    try {
      // Call delete sale API
      const response = await fetch(`/api/sales/${saleToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        credentials: "include",
      });

      if (response.ok) {
        // Refresh sales data
        refetch();
        toast({
          title: "Sale Deleted",
          description: `Sale #${saleToDelete.receiptNo} has been successfully deleted.`,
        });
      } else {
        const error = await response.text();
        toast({
          title: "Delete Failed",
          description: `Failed to delete sale: ${error}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting sale:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete sale. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setSaleToDelete(null);
    }
  };

  // Complete Sale handlers
  const handleCompleteSale = (sale: any) => {
    setSaleToComplete(sale);
    setCompleteAmountPaid(sale.totalAmount.toFixed(2));
    setCompletePaymentMethod("cash");
    setCompleteSaleOpen(true);
  };

  const confirmCompleteSale = async () => {
    if (!saleToComplete) return;
    setIsCompleting(true);
    try {
      const response = await fetch(`/api/sales/${saleToComplete.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        credentials: "include",
        body: JSON.stringify({
          status: "cashed",
          paymentTag: completePaymentMethod,
          amountPaid: parseFloat(completeAmountPaid) || saleToComplete.totalAmount,
        }),
      });
      if (response.ok) {
        refetch();
        toast({
          title: "Sale Completed",
          description: `Sale #${saleToComplete.receiptNo} has been marked as completed.`,
        });
        setCompleteSaleOpen(false);
        setSaleToComplete(null);
      } else {
        const err = await response.json().catch(() => ({ error: "Unknown error" }));
        toast({
          title: "Failed to Complete Sale",
          description: err.error || "An error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to Complete Sale",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  // Invoice / Quotation PDF generator (shared layout, switchable title)
  // When `mode === "base64"` the PDF is returned as a base64 string instead of being downloaded.
  const generateSalePDF = (
    sale: any,
    docType: "QUOTATION" | "INVOICE" = "QUOTATION",
    mode: "download" | "base64" = "download",
  ): string | null => {
    // Coerce any value into a plain printable string (jsPDF rejects objects)
    const asString = (v: any): string => {
      if (v === null || v === undefined) return "";
      if (typeof v === "string") return v;
      if (typeof v === "number" || typeof v === "boolean") return String(v);
      return "";
    };

    try {
      const originalSale = Array.isArray(salesData)
        ? salesData.find((s: any) => s?._id === sale?.id)
        : null;
      const shop = (originalSale && typeof originalSale.shopId === "object" ? originalSale.shopId : null) || {};
      const currency = asString(shop.currency) || primaryShopCurrency || "";
      const items: any[] = (originalSale?.items as any[]) || (sale?.items as any[]) || [];

      const doc = new jsPDF();
      let y = 20;

      // Shop header
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text((asString(shop.name) || "Shop").toUpperCase(), 20, y);
      y += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      // Prefer the shop's "Receipt Address" field; fall back to address/location (GeoJSON-safe)
      const shopAddress =
        asString(shop.address_receipt) ||
        asString(shop.address) ||
        asString(shop.location);
      if (shopAddress) {
        doc.text(shopAddress, 20, y);
        y += 6;
      }
      const shopPhone = asString(shop.contact) || asString(shop.phone);
      if (shopPhone) {
        doc.text(`Tel: ${shopPhone}`, 20, y);
        y += 6;
      }
      // Receipt-settings field is saved as `email_receipt`; legacy code uses `receiptemail`
      const shopEmail =
        asString(shop.email_receipt) ||
        asString(shop.receiptemail) ||
        asString(shop.email);
      if (shopEmail) {
        doc.text(`Email: ${shopEmail}`, 20, y);
        y += 6;
      }
      const paybillAccount = asString(shop.paybill_account);
      const paybillTill = asString(shop.paybill_till) || asString(shop.paybillTill);
      if (paybillAccount) {
        doc.text(`Paybill: ${paybillAccount}`, 20, y);
        y += 6;
        if (paybillTill) {
          doc.text(`Account: ${paybillTill}`, 20, y);
          y += 6;
        }
      } else if (paybillTill) {
        doc.text(`Buy Goods: ${paybillTill}`, 20, y);
        y += 6;
      }

      y += 4;
      // Title
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(docType, 105, y, { align: "center" });
      y += 10;

      // Date and number row
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const saleDateRaw = sale?.saleDate ? new Date(sale.saleDate) : new Date();
      const dateStr = isNaN(saleDateRaw.getTime())
        ? "—"
        : saleDateRaw.toLocaleDateString();
      doc.text(`Date: ${dateStr}`, 20, y);
      const numberLabel = docType === "INVOICE" ? "Invoice No" : "No";
      doc.text(`${numberLabel}: ${asString(sale?.receiptNo) || "—"}`, 190, y, { align: "right" });
      y += 8;

      // Customer
      const customerName = asString(sale?.customerName);
      if (customerName && customerName !== "Walk-in") {
        doc.text(`Customer: ${customerName}`, 20, y);
        y += 7;
      }

      y += 4;

      // Table header
      doc.setFillColor(240, 240, 240);
      doc.rect(20, y - 4, 170, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.text("Item", 22, y);
      doc.text("Qty", 110, y, { align: "right" });
      doc.text("Unit Price", 145, y, { align: "right" });
      doc.text("Total", 188, y, { align: "right" });
      y += 3;
      doc.line(20, y, 190, y);
      y += 7;
      doc.setFont("helvetica", "normal");

      // Items
      items.forEach((item: any) => {
        const name =
          asString(item?.productName) ||
          asString(item?.product?.name) ||
          asString(item?.name) ||
          "Unknown Product";
        const qty = Number(item?.quantity) || 1;
        const unitPrice = Number(item?.unitPrice ?? item?.sellingPrice) || 0;
        const total = Number(item?.totalPrice) || qty * unitPrice;

        const lines = doc.splitTextToSize(name, 82);
        doc.text(lines, 22, y);
        doc.text(String(qty), 110, y, { align: "right" });
        doc.text(`${currency} ${unitPrice.toFixed(2)}`, 145, y, { align: "right" });
        doc.text(`${currency} ${total.toFixed(2)}`, 188, y, { align: "right" });
        y += lines.length > 1 ? lines.length * 6 : 8;
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
      });

      y += 2;
      doc.line(20, y, 190, y);
      y += 8;

      // Subtotal
      const subtotal = Number(originalSale?.totalAmount ?? sale?.totalAmount) || 0;
      const tax = Number(originalSale?.totaltax) || 0;
      const discount = Number(originalSale?.discount) || 0;
      const grandTotal = Number(originalSale?.totalWithDiscount) || subtotal;

      doc.text("Subtotal:", 145, y, { align: "right" });
      doc.text(`${currency} ${Number(subtotal).toFixed(2)}`, 188, y, { align: "right" });
      y += 7;

      if (tax > 0) {
        doc.text("Tax:", 145, y, { align: "right" });
        doc.text(`${currency} ${Number(tax).toFixed(2)}`, 188, y, { align: "right" });
        y += 7;
      }
      if (discount > 0) {
        doc.text("Discount:", 145, y, { align: "right" });
        doc.text(`- ${currency} ${Number(discount).toFixed(2)}`, 188, y, { align: "right" });
        y += 7;
      }

      doc.setFont("helvetica", "bold");
      doc.text("TOTAL:", 145, y, { align: "right" });
      doc.text(`${currency} ${Number(grandTotal).toFixed(2)}`, 188, y, { align: "right" });

      if (docType === "INVOICE") {
        y += 12;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Status: Pending Payment", 20, y);
        y += 6;
        doc.text("Please settle this invoice at your earliest convenience.", 20, y);
      }

      y += 12;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.text("Thank you for your business!", 105, y, { align: "center" });

      const fileLabel = docType === "INVOICE" ? "invoice" : "quotation";

      if (mode === "base64") {
        const dataUri = doc.output("datauristring");
        return dataUri.split(",")[1] || null;
      }

      doc.save(`${fileLabel}-${sale.receiptNo}.pdf`);
      toast({
        title: `${docType === "INVOICE" ? "Invoice" : "Quotation"} Generated`,
        description: `${docType === "INVOICE" ? "Invoice" : "Quotation"} #${sale.receiptNo} downloaded.`,
      });
      return null;
    } catch (err: any) {
      console.error(`${docType} PDF error:`, err);
      toast({
        title: "PDF Error",
        description: `Failed to generate ${docType.toLowerCase()}: ${err?.message || String(err)}`,
        variant: "destructive",
      });
      return null;
    }
  };

  // Build a simple HTML body for invoice email
  const buildInvoiceEmailHtml = (sale: any): string => {
    const originalSale = Array.isArray(salesData)
      ? salesData.find((s: any) => s?._id === sale?.id)
      : null;
    const shop: any =
      originalSale && typeof originalSale.shopId === "object" ? originalSale.shopId : {};
    const currency = (typeof shop?.currency === "string" && shop.currency) || primaryShopCurrency || "";
    const items: any[] = (originalSale?.items as any[]) || (sale?.items as any[]) || [];
    const grandTotal =
      Number(originalSale?.totalWithDiscount) ||
      Number(originalSale?.totalAmount ?? sale?.totalAmount) ||
      0;
    const dateStr = sale?.saleDate ? new Date(sale.saleDate).toLocaleDateString() : "";
    const customerName =
      sale?.customerName && sale.customerName !== "Walk-in" ? sale.customerName : "";

    const rows = items
      .map((item: any) => {
        const name =
          item?.productName || item?.product?.name || item?.name || "Unknown Product";
        const qty = Number(item?.quantity) || 1;
        const unitPrice = Number(item?.unitPrice ?? item?.sellingPrice) || 0;
        const total = Number(item?.totalPrice) || qty * unitPrice;
        return `<tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee">${name}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${qty}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${currency} ${unitPrice.toFixed(2)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${currency} ${total.toFixed(2)}</td>
        </tr>`;
      })
      .join("");

    const shopAddress =
      (typeof shop?.address_receipt === "string" && shop.address_receipt) ||
      (typeof shop?.address === "string" && shop.address) ||
      (typeof shop?.location === "string" && shop.location) ||
      "";
    const shopPhone = shop?.contact || shop?.phone || "";
    const shopEmail =
      shop?.email_receipt || shop?.receiptemail || shop?.email || "";
    const paybillAccount = shop?.paybill_account || "";
    const paybillTill = shop?.paybill_till || shop?.paybillTill || "";
    const paybillLine = paybillAccount
      ? `Paybill: <strong>${paybillAccount}</strong>${paybillTill ? ` &nbsp;·&nbsp; Account: <strong>${paybillTill}</strong>` : ""}`
      : paybillTill
      ? `Buy Goods: <strong>${paybillTill}</strong>`
      : "";

    return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#222;max-width:640px;margin:auto;padding:16px">
      <h2 style="margin:0 0 4px 0">${shop?.name || "Your Shop"}</h2>
      ${shopAddress ? `<div style="color:#666;font-size:13px">${shopAddress}</div>` : ""}
      ${shopPhone ? `<div style="color:#666;font-size:13px">Tel: ${shopPhone}</div>` : ""}
      ${shopEmail ? `<div style="color:#666;font-size:13px">Email: ${shopEmail}</div>` : ""}
      ${paybillLine ? `<div style="color:#666;font-size:13px">${paybillLine}</div>` : ""}
      <h1 style="text-align:center;margin:24px 0 8px 0;letter-spacing:2px">INVOICE</h1>
      <div style="display:flex;justify-content:space-between;font-size:13px;color:#444">
        <div>Date: ${dateStr}</div>
        <div>Invoice No: ${sale?.receiptNo || ""}</div>
      </div>
      ${customerName ? `<div style="margin-top:8px;font-size:13px">Customer: <strong>${customerName}</strong></div>` : ""}
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px">
        <thead>
          <tr style="background:#f3f3f3">
            <th style="padding:8px;text-align:left">Item</th>
            <th style="padding:8px;text-align:right">Qty</th>
            <th style="padding:8px;text-align:right">Unit Price</th>
            <th style="padding:8px;text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding:10px 8px;text-align:right;font-weight:bold">TOTAL</td>
            <td style="padding:10px 8px;text-align:right;font-weight:bold">${currency} ${grandTotal.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      <p style="margin-top:20px;font-size:13px"><strong>Status:</strong> Pending Payment</p>
      <p style="font-size:13px">Please settle this invoice at your earliest convenience. The full PDF invoice is attached.</p>
      <p style="margin-top:24px;font-size:12px;color:#777;text-align:center">Thank you for your business!</p>
    </body></html>`;
  };

  // Email an invoice for an on-hold sale via existing /api/sales/email-receipt endpoint
  const handleEmailInvoice = async () => {
    if (!invoiceSale || !invoiceEmail.trim()) return;
    setIsSendingInvoice(true);
    try {
      let pdfBase64 = "";
      try {
        pdfBase64 = generateSalePDF(invoiceSale, "INVOICE", "base64") || "";
      } catch (pdfErr) {
        console.warn("Invoice PDF generation failed, sending HTML only:", pdfErr);
      }

      const originalSale = Array.isArray(salesData)
        ? salesData.find((s: any) => s?._id === invoiceSale?.id)
        : null;
      const shop: any =
        originalSale && typeof originalSale.shopId === "object" ? originalSale.shopId : {};

      const response = await fetch("/api/sales/email-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: invoiceEmail.trim(),
          receiptHtml: buildInvoiceEmailHtml(invoiceSale),
          receiptNo: invoiceSale.receiptNo,
          shopName: shop?.name || "",
          shopEmail: shop?.email_receipt || shop?.receiptemail || shop?.email || "",
          customerName: invoiceSale.customerName || "",
          pdfBase64,
        }),
      });
      const result = await response.json();
      if (response.ok && result?.success) {
        toast({
          title: "Invoice Sent",
          description: `Invoice #${invoiceSale.receiptNo} emailed to ${invoiceEmail.trim()}.`,
        });
        setInvoiceDialogOpen(false);
      } else {
        toast({
          title: "Failed to send invoice",
          description: result?.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Failed to send invoice",
        description: err?.message || "Network error",
        variant: "destructive",
      });
    } finally {
      setIsSendingInvoice(false);
    }
  };

  const openInvoiceDialog = (sale: any) => {
    const originalSale = Array.isArray(salesData)
      ? salesData.find((s: any) => s?._id === sale?.id)
      : null;
    const customerEmail =
      originalSale?.customerId?.email || originalSale?.customerEmail || "";
    setInvoiceSale(sale);
    setInvoiceEmail(customerEmail);
    setInvoiceMode("choose");
    setInvoiceDialogOpen(true);
  };

  // Quotation PDF generator (delegates to shared generator)
  const generateQuotationPDF = (sale: any) => generateSalePDF(sale, "QUOTATION");

  const openQuotationDialog = (sale: any) => {
    const originalSale = Array.isArray(salesData)
      ? salesData.find((s: any) => s?._id === sale?.id)
      : null;
    const customerEmail =
      originalSale?.customerId?.email || originalSale?.customerEmail || "";
    setQuotationSale(sale);
    setQuotationEmail(customerEmail);
    setQuotationMode("choose");
    setQuotationDialogOpen(true);
  };

  const handleEmailQuotation = async () => {
    if (!quotationSale || !quotationEmail.trim()) return;
    setIsSendingQuotation(true);
    try {
      let pdfBase64 = "";
      try {
        pdfBase64 = generateSalePDF(quotationSale, "QUOTATION", "base64") || "";
      } catch (pdfErr) {
        console.warn("Quotation PDF generation failed, sending HTML only:", pdfErr);
      }
      const originalSale = Array.isArray(salesData)
        ? salesData.find((s: any) => s?._id === quotationSale?.id)
        : null;
      await fetch("/api/sales/email-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: quotationEmail.trim(),
          receiptHtml: buildInvoiceEmailHtml(quotationSale),
          receiptNo: quotationSale.receiptNo,
          shopId: originalSale?.shopId?._id || originalSale?.shopId || "",
          customerName: quotationSale.customerName || "",
          pdfBase64,
          subject: `Quotation #${quotationSale.receiptNo}`,
        }),
      });
      toast({
        title: "Quotation Sent",
        description: `Quotation #${quotationSale.receiptNo} emailed to ${quotationEmail.trim()}.`,
      });
      setQuotationDialogOpen(false);
    } catch {
      toast({
        title: "Failed to send quotation",
        description: "Please check the email address and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingQuotation(false);
    }
  };

  // PDF Export function
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(20);
      doc.text("Sales Report", 20, 20);

      // Add shop and date information
      doc.setFontSize(12);
      const shopName = (primaryShop as any)?.name || "Shop";
      doc.text(`Shop: ${shopName}`, 20, 35);

      const dateRange =
        !startDate && !endDate
          ? `Date: ${new Date().toLocaleDateString()}`
          : startDate === endDate
            ? `Date: ${new Date(startDate).toLocaleDateString()}`
            : `Date Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
      doc.text(dateRange, 20, 45);

      // Add summary statistics
      const reportData = salesReportData || {};
      doc.text(
        `Total Sales: ${primaryShopCurrency} ${Number((reportData as any).totalSales || 0).toFixed(2)}`,
        20,
        60,
      );
      doc.text(`Total Transactions: ${totalCount}`, 20, 70);

      // Add transaction details manually without autoTable
      doc.setFontSize(10);
      let currentY = 90;

      // Table headers
      doc.text("#", 20, currentY);
      doc.text("Receipt No.", 35, currentY);
      doc.text("Customer", 75, currentY);
      doc.text("Date", 120, currentY);
      doc.text("Status", 155, currentY);
      doc.text("Amount", 180, currentY);

      // Draw header line
      doc.line(20, currentY + 2, 200, currentY + 2);
      currentY += 10;

      // Add transaction rows
      transformedSales.slice(0, 30).forEach((sale: any, index: number) => {
        if (currentY > 270) return; // Stop if page is full

        doc.text(String(index + 1), 20, currentY);
        doc.text(sale.receiptNo || "N/A", 35, currentY);
        doc.text(
          (sale.customerName || "Walk-in").substring(0, 15),
          75,
          currentY,
        );
        doc.text(new Date(sale.saleDate).toLocaleDateString(), 120, currentY);
        doc.text(sale.status || "N/A", 155, currentY);
        doc.text(
          `${getSaleCurrency(sale)} ${Number(sale.totalAmount).toFixed(2)}`,
          180,
          currentY,
        );

        currentY += 8;
      });

      // Add footer
      if (transformedSales.length > 30) {
        doc.text(
          `... and ${transformedSales.length - 30} more transactions`,
          20,
          currentY + 10,
        );
      }

      // Save the PDF
      const fileName = `sales-report-${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);

      toast({
        title: "PDF Generated",
        description: "Sales report has been downloaded successfully.",
      });
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredSalesCount = totalCount;



  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "cash":
        return "default";
      case "credit":
        return "secondary";
      case "wallet":
        return "outline";
      case "hold":
        return "secondary";
      case "pending":
        return "outline";
      case "cancelled":
        return "destructive";
      case "returned":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <DashboardLayout title="Sales Reports">
      <div className="w-full">
        <div className="space-y-3">
          <PageHeader
            title="Sales Reports"
            subtitle={!startDate && !endDate ? "Showing all sales transactions" : startDate === endDate ? `Transactions for ${new Date(startDate).toLocaleDateString()}` : `${new Date(startDate).toLocaleDateString()} – ${new Date(endDate).toLocaleDateString()}`}
            onBack={handleBackClick}
            actions={<>
              <PermissionGuard permission="create_sales">
                <Button size="sm" className="h-8 text-sm" onClick={() => setLocation("/pos")}>
                  <Plus className="h-4 w-4 mr-1" /><span className="hidden sm:inline">New </span>Sale
                </Button>
              </PermissionGuard>
              <PermissionGuard permission="sales_reports">
                <Button variant="outline" size="sm" className="hidden sm:flex h-8 text-sm items-center gap-1.5" onClick={exportToPDF}>
                  <TrendingUp className="h-4 w-4" />Export PDF
                </Button>
              </PermissionGuard>
            </>}
          />

          {/* ── Mobile: compact search + filter button row ── */}
          <div className="flex gap-2 sm:hidden">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by receipt..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className={`h-8 w-8 shrink-0 relative ${
                (statusFilter !== "all" || attendantFilter !== "all" || startDate || endDate)
                  ? "border-purple-500 text-purple-600"
                  : ""
              }`}
              onClick={() => setFilterSheetOpen(true)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {(statusFilter !== "all" || attendantFilter !== "all" || startDate || endDate) && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-purple-600 text-white text-[9px] flex items-center justify-center font-bold">
                  {[statusFilter !== "all", attendantFilter !== "all", !!(startDate || endDate)].filter(Boolean).length}
                </span>
              )}
            </Button>
          </div>

          {/* ── Desktop: full filter card ── */}
          <Card className="hidden sm:block">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5" />
                  <span className="text-sm font-medium">Filters</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setAttendantFilter("all");
                    setStartDate("");
                    setEndDate("");
                    setDateFilter("all");
                    setCurrentPage(1);
                  }}
                  className="h-7 px-2 text-xs"
                >
                  Clear All
                </Button>
              </div>
              <div className="space-y-3">
                {/* Search */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search by receipt number..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-9 h-8 text-sm"
                    />
                  </div>
                  {searchQuery && (
                    <Button variant="outline" size="sm" onClick={() => handleSearchChange("")} className="h-8 px-2 text-xs">
                      Clear
                    </Button>
                  )}
                </div>
                {/* Attendant + Status */}
                <div className="flex flex-wrap gap-2">
                  {userType === "admin" && (
                    <Select value={attendantFilter} onValueChange={handleAttendantFilter}>
                      <SelectTrigger className="h-8 text-xs w-44">
                        <SelectValue placeholder="All Attendants" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Attendants</SelectItem>
                        {uniqueAttendants.map((a: any) => (
                          <SelectItem key={a._id} value={a._id}>{a.username}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Select value={statusFilter} onValueChange={handleStatusFilter}>
                    <SelectTrigger className="h-8 text-xs w-44">
                      <SelectValue placeholder="All Transactions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Transactions</SelectItem>
                      <SelectItem value="hold">Hold</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                      <SelectItem value="wallet">Wallet</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Date Range */}
                <div className="flex flex-wrap gap-2 items-end">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
                    <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-xs w-36" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
                    <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 text-xs w-36" />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setDateRange(7)} className="h-8 text-xs">7d</Button>
                  <Button variant="outline" size="sm" onClick={() => setDateRange(30)} className="h-8 text-xs">30d</Button>
                  <Button variant="outline" size="sm" onClick={() => setDateRange(90)} className="h-8 text-xs">90d</Button>
                  {(startDate || endDate) && (
                    <Button variant="outline" size="sm" onClick={clearDateFilters} className="h-8 text-xs">Clear dates</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Filter Bottom Sheet (mobile) ── */}
          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetContent side="bottom" className="p-0 rounded-t-2xl max-h-[85vh] overflow-y-auto">
              <SheetHeader className="px-5 pt-5 pb-3 border-b sticky top-0 bg-background z-10">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-sm font-semibold">Filters</SheetTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setAttendantFilter("all");
                      setStartDate("");
                      setEndDate("");
                      setDateFilter("all");
                      setCurrentPage(1);
                    }}
                  >
                    Clear All
                  </Button>
                </div>
              </SheetHeader>

              <div className="px-4 py-3 space-y-4">
                {/* Payment / Status */}
                <div>
                  <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Transaction Type</Label>
                  <Select value={statusFilter} onValueChange={(v) => handleStatusFilter(v)}>
                    <SelectTrigger className="h-9 text-sm w-full">
                      <SelectValue placeholder="All Transactions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Transactions</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                      <SelectItem value="wallet">Wallet</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="hold">Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Attendant (admin only) */}
                {userType === "admin" && (
                  <div>
                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Attendant</Label>
                    <div className="divide-y divide-gray-100 border rounded-lg overflow-hidden">
                      <button
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm ${attendantFilter === "all" ? "bg-purple-50 text-purple-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                        onClick={() => handleAttendantFilter("all")}
                      >
                        <span>All Attendants</span>
                        {attendantFilter === "all" && <Check className="h-3.5 w-3.5 text-purple-600" />}
                      </button>
                      {uniqueAttendants.map((a: any) => (
                        <button
                          key={a._id}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm ${attendantFilter === a._id ? "bg-purple-50 text-purple-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                          onClick={() => handleAttendantFilter(a._id)}
                        >
                          <span>{a.username}</span>
                          {attendantFilter === a._id && <Check className="h-3.5 w-3.5 text-purple-600" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date Range */}
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Date Range</Label>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 h-9 text-sm" onClick={() => setDateRange(7)}>Last 7 Days</Button>
                      <Button variant="outline" size="sm" className="flex-1 h-9 text-sm" onClick={() => setDateRange(30)}>Last 30 Days</Button>
                      <Button variant="outline" size="sm" className="flex-1 h-9 text-sm" onClick={() => setDateRange(90)}>Last 90 Days</Button>
                    </div>
                    {(startDate || endDate) && (
                      <Button variant="outline" size="sm" className="w-full h-9 text-sm" onClick={clearDateFilters}>
                        <Calendar className="h-3.5 w-3.5 mr-1.5" />Clear Dates
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-5 pb-6 pt-2 border-t">
                <Button className="w-full h-10" onClick={() => setFilterSheetOpen(false)}>
                  Apply Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Summary Stats */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-semibold">Summary</h2>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                  {!startDate && !endDate ? "All Time" : startDate === endDate ? `${new Date(startDate).toLocaleDateString()}` : `${new Date(startDate).toLocaleDateString()} – ${new Date(endDate).toLocaleDateString()}`}
                </span>
              </div>
            </div>

            {/* Summary Stats - Permission Controlled */}
            {(isAdmin || hasAttendantPermission("sales", "view_summary")) && (
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: "Total", value: salesReportData?.totalSales },
                  { label: "Count", value: filteredSalesCount, isCount: true },
                  { label: "Cash", value: salesReportData?.cashtransactions },
                  { label: "M-Pesa", value: salesReportData?.mpesa },
                  { label: "Credit", value: salesReportData?.credit },
                  { label: "Wallet", value: salesReportData?.wallet },
                  { label: "Hold", value: salesReportData?.hold },
                  { label: "Bank", value: salesReportData?.bank },
                ].map(({ label, value, isCount }) => (
                  <Card key={label} className="p-2">
                    <p className="text-[10px] font-medium text-muted-foreground leading-tight">{label}</p>
                    <p className="text-xs sm:text-sm font-bold mt-0.5 truncate leading-tight">
                      {isCount ? value : `${primaryShopCurrency} ${Number(value || 0).toFixed(2)}`}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Sales History */}
          <Card className="flex-1">
            <CardHeader className="pb-3 px-4">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">
                  Sales History
                  {statusFilter !== "all" && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground capitalize">
                      · {statusFilter}
                    </span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Show:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
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
            <CardContent className="pt-0 px-0">

              {/* ── Loading / Empty states ── */}
              {isLoading ? (
                <div className="py-12 flex flex-col items-center gap-2 text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  <p className="text-sm">Loading sales…</p>
                </div>
              ) : paginatedData.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400 px-4">
                  No sales found for the selected filters
                </div>
              ) : (
                <>
                  {/* ── Mobile card list ── */}
                  <div className="lg:hidden divide-y divide-gray-100">
                    {paginatedData.map((sale: any) => (
                      <div key={sale.id} className="flex items-start gap-2 px-4 py-3">
                        {/* Main info — tappable */}
                        <button
                          className="flex-1 min-w-0 text-left"
                          onClick={() => handleViewSale(sale)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold font-mono text-primary truncate">
                                #{sale.receiptNo}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                                <span className="text-[11px] text-gray-500">
                                  {new Date(sale.saleDate).toLocaleDateString()}
                                </span>
                                <span className="text-[11px] text-gray-400 capitalize">
                                  {sale.paymentTag}
                                </span>
                                {sale.customerName && sale.customerName !== "Walk-in" && (
                                  <span className="text-[11px] text-gray-500 truncate max-w-[120px]">
                                    {sale.customerName}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-gray-900">
                                {getSaleCurrency(sale)} {sale.totalAmount.toFixed(2)}
                              </p>
                              <Badge
                                variant={getStatusBadgeVariant(sale.status)}
                                className="text-[10px] mt-0.5"
                              >
                                {sale.status}
                              </Badge>
                            </div>
                          </div>
                        </button>

                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 shrink-0 mt-0.5">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewSale(sale)}>
                              <Eye className="mr-2 h-4 w-4" />View Receipt
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openQuotationDialog(sale)}>
                              <FileText className="mr-2 h-4 w-4" />Quotation
                            </DropdownMenuItem>
                            {sale.status === "hold" && (
                              <DropdownMenuItem onClick={() => openInvoiceDialog(sale)}>
                                <Receipt className="mr-2 h-4 w-4" />Invoice
                              </DropdownMenuItem>
                            )}
                            {sale.status === "hold" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleCompleteSale(sale)} className="text-green-600 focus:text-green-600">
                                  <CheckCircle className="mr-2 h-4 w-4" />Complete Sale
                                </DropdownMenuItem>
                              </>
                            )}
                            {sale.status !== "hold" && (userType === 'admin' || hasAttendantPermission('sales', 'return')) && (
                              <DropdownMenuItem onClick={() => handleReturnSale(sale)}>
                                <RefreshCw className="mr-2 h-4 w-4" />Return Sale
                              </DropdownMenuItem>
                            )}
                            {(userType === 'admin' || hasAttendantPermission('sales', 'delete')) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDeleteSale(sale)} className="text-red-600 focus:text-red-600">
                                  <Trash2 className="mr-2 h-4 w-4" />Delete Sale
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>

                  {/* ── Desktop table ── */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left py-2 px-3 font-medium text-xs">Receipt</th>
                          <th className="text-left py-2 px-3 font-medium text-xs">Customer</th>
                          <th className="text-left py-2 px-3 font-medium text-xs">Amount</th>
                          <th className="text-left py-2 px-3 font-medium text-xs">Date</th>
                          <th className="text-left py-2 px-3 font-medium text-xs">Payment</th>
                          <th className="text-left py-2 px-3 font-medium text-xs">Status</th>
                          <th className="text-left py-2 px-3 font-medium text-xs">Attendant</th>
                          {(hasPermission("sales_edit") || hasPermission("sales_delete") || hasPermission("sales_return")) && (
                            <th className="text-left py-2 px-3 font-medium text-xs">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.map((sale: any) => (
                          <tr key={sale.id} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-3 text-sm font-mono">
                              <button onClick={() => handleViewSale(sale)} className="font-semibold hover:text-blue-600 hover:underline">
                                #{sale.receiptNo}
                              </button>
                            </td>
                            <td className="py-2 px-3 text-sm">{sale.customerName}</td>
                            <td className="py-2 px-3 text-sm font-medium">
                              {getSaleCurrency(sale)} {sale.totalAmount.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-sm">{new Date(sale.saleDate).toLocaleDateString()}</td>
                            <td className="py-2 px-3 text-sm capitalize">{sale.paymentTag}</td>
                            <td className="py-2 px-3">
                              <Badge variant={getStatusBadgeVariant(sale.status)} className="text-xs">
                                {sale.status}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 text-sm">{sale.attendantName}</td>
                            <td className="py-2 px-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewSale(sale)}>
                                    <Eye className="mr-2 h-4 w-4" />View Receipt
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openQuotationDialog(sale)}>
                                    <FileText className="mr-2 h-4 w-4" />Quotation
                                  </DropdownMenuItem>
                                  {sale.status === "hold" && (
                                    <DropdownMenuItem onClick={() => openInvoiceDialog(sale)}>
                                      <Receipt className="mr-2 h-4 w-4" />Invoice
                                    </DropdownMenuItem>
                                  )}
                                  {sale.status === "hold" && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleCompleteSale(sale)} className="text-green-600 focus:text-green-600">
                                        <CheckCircle className="mr-2 h-4 w-4" />Complete Sale
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {sale.status !== "hold" && (userType === 'admin' || hasAttendantPermission('sales', 'return')) && (
                                    <DropdownMenuItem onClick={() => handleReturnSale(sale)}>
                                      <RefreshCw className="mr-2 h-4 w-4" />Return Sale
                                    </DropdownMenuItem>
                                  )}
                                  {(userType === 'admin' || hasAttendantPermission('sales', 'delete')) && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => handleDeleteSale(sale)} className="text-red-600 focus:text-red-600">
                                        <Trash2 className="mr-2 h-4 w-4" />Delete Sale
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Pagination */}
              {totalCount > 0 && (
                <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t px-4">
                  <span className="text-xs text-muted-foreground">
                    {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-8 px-2"
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}>
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    {Array.from({ length: Math.min(5, apiTotalPages) }, (_, i) => {
                      let pageNum: number;
                      if (apiTotalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= apiTotalPages - 2) pageNum = apiTotalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                      return (
                        <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm" onClick={() => setCurrentPage(pageNum)} className="w-8 h-8 p-0 text-xs">
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button variant="outline" size="sm" className="h-8 px-2"
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, apiTotalPages))}
                      disabled={currentPage === apiTotalPages}>
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Complete Sale Dialog */}
      <Dialog open={completeSaleOpen} onOpenChange={setCompleteSaleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Complete Sale #{saleToComplete?.receiptNo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm font-medium text-green-800 dark:text-green-200">Total Amount Due</span>
              <span className="text-xl font-bold text-green-700 dark:text-green-300">
                {primaryShopCurrency} {Number(saleToComplete?.totalAmount || 0).toFixed(2)}
              </span>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Payment Method</Label>
              <Select value={completePaymentMethod} onValueChange={setCompletePaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="wallet">Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">Amount Paid</Label>
              <Input
                type="number"
                value={completeAmountPaid}
                onChange={(e) => setCompleteAmountPaid(e.target.value)}
                placeholder="Enter amount paid"
                min={0}
                step="0.01"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setCompleteSaleOpen(false)}
                disabled={isCompleting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={confirmCompleteSale}
                disabled={isCompleting}
              >
                {isCompleting ? "Processing..." : "Complete Sale"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog (Download / Email) */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Invoice #{invoiceSale?.receiptNo}
            </DialogTitle>
          </DialogHeader>

          {invoiceMode === "choose" ? (
            <div className="space-y-3 pt-2">
              <p className="text-sm text-muted-foreground">
                How would you like to share this invoice?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={() => {
                    if (invoiceSale) generateSalePDF(invoiceSale, "INVOICE", "download");
                    setInvoiceDialogOpen(false);
                  }}
                >
                  <Download className="h-5 w-5" />
                  <span>Download</span>
                </Button>
                <Button
                  className="h-20 flex-col gap-2"
                  onClick={() => setInvoiceMode("email")}
                >
                  <Mail className="h-5 w-5" />
                  <span>Email</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Customer Email
                </Label>
                <Input
                  type="email"
                  value={invoiceEmail}
                  onChange={(e) => setInvoiceEmail(e.target.value)}
                  placeholder="customer@example.com"
                  disabled={isSendingInvoice}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The invoice PDF will be attached to the email.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setInvoiceMode("choose")}
                  disabled={isSendingInvoice}
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleEmailInvoice}
                  disabled={isSendingInvoice || !invoiceEmail.trim()}
                >
                  {isSendingInvoice ? "Sending..." : "Send Invoice"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quotation Dialog (Download / Email) */}
      <Dialog open={quotationDialogOpen} onOpenChange={setQuotationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Quotation #{quotationSale?.receiptNo}
            </DialogTitle>
          </DialogHeader>

          {quotationMode === "choose" ? (
            <div className="space-y-3 pt-2">
              <p className="text-sm text-muted-foreground">
                How would you like to share this quotation?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-20 flex-col gap-2"
                  onClick={() => {
                    if (quotationSale) generateSalePDF(quotationSale, "QUOTATION", "download");
                    setQuotationDialogOpen(false);
                  }}
                >
                  <Download className="h-5 w-5" />
                  <span>Download</span>
                </Button>
                <Button
                  className="h-20 flex-col gap-2"
                  onClick={() => setQuotationMode("email")}
                >
                  <Mail className="h-5 w-5" />
                  <span>Email</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Customer Email
                </Label>
                <Input
                  type="email"
                  value={quotationEmail}
                  onChange={(e) => setQuotationEmail(e.target.value)}
                  placeholder="customer@example.com"
                  disabled={isSendingQuotation}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The quotation PDF will be attached to the email.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setQuotationMode("choose")}
                  disabled={isSendingQuotation}
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleEmailQuotation}
                  disabled={isSendingQuotation || !quotationEmail.trim()}
                >
                  {isSendingQuotation ? "Sending..." : "Send Quotation"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sale</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete sale #{saleToDelete?.receiptNo}?
              This action cannot be undone and will permanently remove this sale
              from your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSale}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete Sale"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

export default SalesList;

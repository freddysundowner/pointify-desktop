import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Search, Calculator, Package, Minus, Plus, Trash2, CreditCard, Wallet, Smartphone, Building, Banknote, Split, User, X, Edit3, Calendar, Clock, UserCheck, Grid3X3, Table, PlusCircle, Loader2, CheckCircle2, ArrowLeft, ShoppingCart, SlidersHorizontal, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiCall } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useProducts } from "@/contexts/ProductsContext";
import { useAttendantAuth } from "@/contexts/AttendantAuthContext";
import { useAuth } from "@/features/auth/useAuth";
import { useSelector } from "react-redux";
import { usePrimaryShop } from "@/hooks/usePrimaryShop";
import type { RootState } from "@/store";
import type { Product, CartItem, Customer, Transaction } from "@shared/schema";

interface ProductGridProps {
  activeCategory: string;
  searchQuery: string;
  onCategoryChange: (category: string) => void;
  onSearchChange: (query: string) => void;
  onAddToCart: (product: any) => void;
  onOpenCalculator: () => void;
  cartItems: CartItem[];
  totals: {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
  };
  onUpdateQuantity: (id: string | number, quantity: number, productData?: any) => void;
  onUpdatePrice: (id: string | number, newPrice: number, buyingPrice?: number) => void;
  onApplyDiscount: (id: string | number, discountAmount: number) => void;
  onClearCart: () => void;
  onCheckout: (transaction: Transaction) => void;
  taxRate: number;
  shopId?: string;
  adminId?: string;
  saleType: string;
  onSaleTypeChange: (saleType: string) => void;
  getPriceForSaleType: (product: any, saleType: string) => number;
  // POS Permission flags
  canSetSaleDate?: boolean;
  canSell?: boolean;
  canSellToDealer?: boolean;
  canDiscount?: boolean;
  canEditPrice?: boolean;
  onBack?: () => void;
  orderId?: string;
}


export default function ProductGrid({
  activeCategory,
  searchQuery,
  onCategoryChange,
  onSearchChange,
  onAddToCart,
  cartItems,
  totals,
  onUpdateQuantity,
  onUpdatePrice,
  onApplyDiscount,
  onClearCart,
  onCheckout,
  taxRate,
  shopId,
  adminId,
  saleType,
  onSaleTypeChange,
  getPriceForSaleType,
  canSetSaleDate = true,
  canSellToDealer = true,
  canDiscount = true,
  canEditPrice = true,
  orderId,
  onBack,
}: ProductGridProps) {
  const { attendant } = useAttendantAuth();
  const { admin } = useAuth();
  const { selectedShopId } = useSelector((state: RootState) => state.shop);
  const { shopData } = usePrimaryShop();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [showCardInterface, setShowCardInterface] = useState(false);
  const [isProcessingCard, setIsProcessingCard] = useState(false);
  const [showCategoriesDrawer, setShowCategoriesDrawer] = useState(false);
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [selectedPriceItem, setSelectedPriceItem] = useState<CartItem | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [selectedDiscountItem, setSelectedDiscountItem] = useState<CartItem | null>(null);
  const [discountAmount, setDiscountAmount] = useState("");
  const [extraChargeAmount, setExtraChargeAmount] = useState<number>(0);
  const [extraChargeLabel, setExtraChargeLabel] = useState<string>("Transport");
  const [showExtraChargeInput, setShowExtraChargeInput] = useState(false);
  const [extraChargeInputValue, setExtraChargeInputValue] = useState<string>("");
 
  // Payment-specific input states
  const [mpesaTransactionId, setMpesaTransactionId] = useState("");
  const [bankTransactionId, setBankTransactionId] = useState("");
  const [creditDueDate, setCreditDueDate] = useState("");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [splitAmounts, setSplitAmounts] = useState({
    cash: 0,
    mpesa: 0,
    bank: 0
  });
  
  // Date/time override states
  const [isCustomDateTime, setIsCustomDateTime] = useState(false);
  const [customDateTime, setCustomDateTime] = useState("");
  const { toast } = useToast();
  const { hasAttendantPermission } = usePermissions();
  const queryClient = useQueryClient();
  const { products: allProducts, isLoading, refreshProducts,hasMore,fetchMoreProducts } = useProducts();
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table'); // Default to restaurant grid view
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [dropdownHighlight, setDropdownHighlight] = useState(-1);

  // Custom item states
  const [showCustomItemDialog, setShowCustomItemDialog] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState("");
  const [customItemType, setCustomItemType] = useState("service");
  const [customItemBuyingPrice, setCustomItemBuyingPrice] = useState("");
  const [customItemQuantity, setCustomItemQuantity] = useState("1");
  const [showCustomItemOptions, setShowCustomItemOptions] = useState(false);
  const [isCreatingCustomItem, setIsCreatingCustomItem] = useState(false);

  // Local search function
  const searchLocally = (query: string) => {
    const searchTerm = query.toLowerCase();
    return allProducts.filter(product =>
      product.name?.toLowerCase().includes(searchTerm) ||
      product.title?.toLowerCase().includes(searchTerm) ||
      product.description?.toLowerCase().includes(searchTerm)
    );
  };

  // Server-side search function (fallback)
  const searchServer = async (query: string) => {
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "100",
        name: query,
        shopid: shopId || "",
        adminid: adminId || "",
        useWarehouse: "true",
        warehouse: "false",
        type: "all"
      });

      const response = await apiCall(`/api/product?${params.toString()}`, {
        method: 'GET'
      });

      const data = await response.json();
      
      // Handle different response structures
      let productList: any[] = [];
      if (Array.isArray(data)) {
        productList = data;
      } else if (data.data && Array.isArray(data.data)) {
        productList = data.data;
      } else if (data.products && Array.isArray(data.products)) {
        productList = data.products;
      }

      return productList;
    } catch (error) {
      console.error('Server search failed:', error);
      return [];
    }
  };

  // Combined search function - local first, then server
  const searchProducts = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    // First, search locally
    const localResults = searchLocally(query);
    
    if (localResults.length > 0) {
      // Found results locally, use them
      setSearchResults(localResults);
      setIsSearching(false);
      return;
    }

    // No local results, search server
    const serverResults = await searchServer(query);
    
    setSearchResults(serverResults);
    setIsSearching(false);
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchProducts(searchQuery);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, shopId, adminId]);

  const loaderRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  // Refs used by the keyboard shortcut handler (avoids temporal-dead-zone crash
  // because handleCompletePayment / resetPaymentDialog are defined later in the file)
  const handleCompletePaymentRef = useRef<(() => void) | null>(null);
  const resetPaymentDialogRef    = useRef<(() => void) | null>(null);
  const shortcutStateRef = useRef({
    cartItems,
    showPaymentDialog,
    selectedPaymentMethod,
    totals,
  });

  // Keep shortcut state ref current every render (no extra effect needed)
  shortcutStateRef.current = { cartItems, showPaymentDialog, selectedPaymentMethod, totals };

  // ── Keyboard shortcuts (registered once, reads state via refs) ────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      const { cartItems, showPaymentDialog, selectedPaymentMethod, totals } = shortcutStateRef.current;
      const meta = e.metaKey || e.ctrlKey;

      // F2 or Cmd/Ctrl+P → open payment dialog
      if (e.key === "F2" || (meta && e.key === "p")) {
        e.preventDefault();
        if (cartItems.length > 0 && !showPaymentDialog) setShowPaymentDialog(true);
        return;
      }

      // F3, "/" or Cmd/Ctrl+K → focus search bar
      if (e.key === "F3" || (e.key === "/" && !inInput) || (meta && e.key === "k")) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // F4 or Cmd/Ctrl+Backspace → clear cart
      if (e.key === "F4" || (meta && e.key === "Backspace")) {
        e.preventDefault();
        if (cartItems.length > 0) onClearCart();
        return;
      }

      // Escape → close payment dialog
      if (e.key === "Escape" && showPaymentDialog) {
        resetPaymentDialogRef.current?.();
        return;
      }

      // When payment dialog is open:
      if (showPaymentDialog) {
        // Enter → complete payment
        if (e.key === "Enter" && !inInput) {
          e.preventDefault();
          handleCompletePaymentRef.current?.();
          return;
        }

        // Letter shortcuts → select payment method
        if (!inInput) {
          const methodMap: Record<string, string> = {
            c: "cash", w: "wallet", s: "split",
            m: "mpesa", b: "bank", d: "card", r: "credit",
          };
          const method = methodMap[e.key.toLowerCase()];
          if (method && !meta) {
            e.preventDefault();
            setSelectedPaymentMethod(method);
            return;
          }
        }

        // 1/2/3/4 → select cash preset
        if (selectedPaymentMethod === "cash" && ["1","2","3","4"].includes(e.key) && !inInput) {
          e.preventDefault();
          const presets = [
            Math.ceil(totals.total / 50) * 50,
            Math.ceil(totals.total / 100) * 100,
            Math.ceil(totals.total / 500) * 500,
            Math.ceil(totals.total / 1000) * 1000,
          ].filter((v, i, arr) => arr.indexOf(v) === i && v >= totals.total - 0.01).slice(0, 4);
          const idx = parseInt(e.key) - 1;
          if (presets[idx] !== undefined) setCashReceived(String(presets[idx]));
          return;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClearCart]);

  // ── Dropdown arrow-key navigation ─────────────────────────────────────────
  const dropdownItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const isDropdownItemSelectable = (item: any) => {
    const isService = item?.productType === 'service' || item?.virtual === true;
    return isService || (item.quantity ?? 0) > 0;
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, dropdownItems: any[]) => {
    if (!dropdownItems.length) return;

    const findNext = (from: number, dir: 1 | -1) => {
      const len = dropdownItems.length;
      for (let i = 1; i <= len; i++) {
        const idx = (from + dir * i + len) % len;
        if (isDropdownItemSelectable(dropdownItems[idx])) return idx;
      }
      return -1; // all out of stock
    };

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDropdownHighlight(prev => {
        const next = findNext(prev === -1 ? -1 : prev, 1);
        if (next >= 0) dropdownItemRefs.current[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDropdownHighlight(prev => {
        const next = findNext(prev === -1 ? dropdownItems.length : prev, -1);
        if (next >= 0) dropdownItemRefs.current[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "Enter" && dropdownHighlight >= 0) {
      e.preventDefault();
      const item = dropdownItems[dropdownHighlight];
      if (item) {
        const isService = item?.productType === 'service' || item?.virtual === true;
        const isOutOfStock = !isService && (item.quantity ?? 0) === 0;
        if (!isOutOfStock) {
          onAddToCart(item);
          onSearchChange('');
          setDropdownHighlight(-1);
        }
      }
    } else if (e.key === "Escape") {
      onSearchChange('');
      setDropdownHighlight(-1);
    }
  };

  useEffect(() => {
    if (!loaderRef.current || !hasMore) return;
  
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchMoreProducts();
        }
      },
      {
        rootMargin: "300px",
        threshold: 0.1
      }
    );
  
    const target = loaderRef.current;
    observer.observe(target);
  
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [hasMore, fetchMoreProducts]);

  // Auto-switch back to Products tab on mobile when cart becomes empty
  useEffect(() => {
    if (showMobileCart && cartItems.length === 0) {
      setShowMobileCart(false);
    }
  }, [cartItems.length, showMobileCart]);

  // Sort helper: out-of-stock products go to the end
  const sortInStock = (list: any[]) =>
    [...list].sort((a, b) => {
      const aOut = (a.quantity ?? 0) <= 0 ? 1 : 0;
      const bOut = (b.quantity ?? 0) <= 0 ? 1 : 0;
      return aOut - bOut;
    });

  // Filter products based on category and search query
  const products = useMemo(() => {
    // If user is searching, use search results instead of local filtering
    if (searchQuery && searchResults.length > 0) {
      return sortInStock(searchResults);
    }

    // If user is searching but no results yet, show loading or empty state
    if (searchQuery && isSearching) {
      return [];
    }

    // If search query exists but no results and not searching, no matches found
    if (searchQuery && !isSearching && searchResults.length === 0) {
      return [];
    }

    // Default: use all products with category filtering
    let filteredProducts = allProducts;

    // Filter by category
    if (activeCategory !== "all") {
      filteredProducts = filteredProducts.filter(product => 
        product.category?.toLowerCase() === activeCategory.toLowerCase()
      );
    }

    return sortInStock(filteredProducts);
  }, [allProducts, activeCategory, searchQuery, searchResults, isSearching]);

  const { data: customersResponse, isLoading: customersLoading } = useQuery({
    queryKey: ["customers", adminId, shopId],
    queryFn: async () => {
      const params = new URLSearchParams({
        adminid: adminId || "",
        shopId: shopId || ""
      });
      const response = await apiCall(`/api/customers?${params.toString()}`, {
        method: "GET",
      });
      const data = await response.json();
      return data;
    },
    enabled: !!adminId && !!shopId, // Load customers when POS loads
    staleTime: 0, // No caching - always fetch fresh data
    gcTime: 0,    // No garbage collection time
    refetchOnMount: 'always' // Always refetch when component mounts
  });

  const { data: categoriesResponse } = useQuery({
    queryKey: ["categories", adminId, shopId],
    queryFn: async () => {
      const params = new URLSearchParams({
        adminid: adminId || "",
        shopId: shopId || ""
      });
      const response = await apiCall(`/api/product/category?${params.toString()}`, {
        method: "GET",
      });
      return response.json();
    },
    enabled: !!adminId && !!shopId
  });

  const categories = Array.isArray(categoriesResponse) 
    ? categoriesResponse 
    : categoriesResponse?.categories || categoriesResponse?.data || [];

  const customers = Array.isArray(customersResponse) 
    ? customersResponse 
    : customersResponse?.customers || customersResponse?.data || [];
    
  const selectedCustomer = Array.isArray(customers) 
    ? customers.find(c => {
        const customerId = c._id || c.id;
        return customerId && customerId.toString() === selectedCustomerId;
      })
    : null;

  const createTransactionMutation = useMutation({
    mutationFn: async (transactionData: any): Promise<any> => {
      const response = await apiCall('/api/sales', {
        method: "POST",
        body: JSON.stringify(transactionData),
      });
      
      const data = await response.json();
      return data;
    },
    onSuccess: (response: any, variables: any) => {
      console.log("Transaction successful:", response);
      
      // Invalidate all sales-related queries to refresh dashboard and sales lists
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = String(query.queryKey[0] || '');
          return key.includes('/api/sales') || 
                 key.includes('/api/analysis') || 
                 key.includes('/api/product') || // Add product queries
                 key.includes('recent-transactions') ||
                 key.includes('dashboard');
        }
      });
      
      // Force immediate refetch for dashboard data and products
      queryClient.refetchQueries({
        predicate: (query) => {
          const key = String(query.queryKey[0] || '');
          return key.includes('/api/sales') || 
                 key.includes('/api/analysis') ||
                 key.includes('/api/product') || // Add product queries
                 key.includes('recent-transactions');
        }
      });
      
      // Also refresh ProductsContext to update POS grid immediately
      refreshProducts();
      
      // Check if this was a hold transaction - don't show receipt for holds
      const isHoldTransaction = variables.status === "hold" || variables.salesnote === "HOLD TRANSACTION";
      
      if (!isHoldTransaction) {
        // Only show receipt for regular payments
        const realTransaction: Transaction = {
          id: response.sale?.receiptNo || response.sale?._id || Date.now(),
          items: cartItems,
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: grandTotal,
          paymentMethod: selectedPaymentMethod,
          customerName: selectedCustomer?.name,
          timestamp: response.sale?.createdAt || new Date().toISOString(),
          shopId: shopId || "",
          adminId: adminId || "",
        };
        
        onCheckout(realTransaction);
      }
      
      setShowPaymentDialog(false);
      setSelectedPaymentMethod("");
      setExtraChargeAmount(0);
      setExtraChargeInputValue("");
      setShowExtraChargeInput(false);
      onClearCart();
    },
    onError: (error: any) => {
      console.error("Transaction error:", error);
      
      // Extract meaningful error message from API error response
      let errorMessage = "Failed to process payment. Please try again.";
      
      // Handle different error formats from the API
      if (error?.message) {
        // Check if it's our standard API request error format
        if (error.message.includes("API request failed:")) {
          // Format: "API request failed: 400 Bad Request - {"error":"customer has no enough balance in the wallet"}"
          const match = error.message.match(/API request failed: \d+ .+ - (.+)$/);
          if (match) {
            try {
              const errorData = JSON.parse(match[1]);
              if (errorData.error) {
                errorMessage = errorData.error;
              }
            } catch (parseError) {
              errorMessage = match[1];
            }
          }
        } else if (error.message.match(/^(\d+):\s*(.+)$/)) {
          // Parse error message in format "status: response"
          const statusMatch = error.message.match(/^(\d+):\s*(.+)$/);
          if (statusMatch) {
            const [, statusCode, responseBody] = statusMatch;
            try {
              const errorData = JSON.parse(responseBody);
              if (errorData.error) {
                errorMessage = errorData.error;
              }
            } catch (parseError) {
              errorMessage = responseBody || `Request failed with status ${statusCode}`;
            }
          }
        } else {
          errorMessage = error.message;
        }
      }
      
      // Customize specific error messages for better user experience
      if (errorMessage.includes("customer has no enough balance in the wallet")) {
        errorMessage = "Customer doesn't have enough balance in their wallet. Please choose a different payment method or top up the wallet.";
      } else if (errorMessage.includes("Insufficient quantity of product")) {
        const productMatch = errorMessage.match(/Insufficient quantity of product (.+)/);
        const productName = productMatch ? productMatch[1] : "item";
        errorMessage = `Not enough stock for ${productName}. Please check inventory levels.`;
      }
      
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handlePaymentMethodSelect = (method: string) => {
    setSelectedPaymentMethod(method);
    
    if (method === "card") {
      setShowCardInterface(true);
      setIsProcessingCard(true);
      
      // Simulate card reading process
      setTimeout(() => {
        setIsProcessingCard(false);
      }, 3000);
    }
  };

  const handlePriceChange = (item: CartItem) => {
    if (!canEditPrice) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit prices",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedPriceItem(item);
    setNewPrice(item.price.toString());
    setShowPriceDialog(true);
  };

  const handlePriceUpdate = () => {
    if (!selectedPriceItem) return;
    
    const price = parseFloat(newPrice);
    const productData = allProducts.find(p => p._id === selectedPriceItem.id || p.id === selectedPriceItem.id);
    const buyingPrice = (productData as any)?.buyingPrice;
    
    onUpdatePrice(selectedPriceItem.id, price, buyingPrice);
    
    setShowPriceDialog(false);
    setSelectedPriceItem(null);
    setNewPrice("");
  };

  const handlePriceDialogClose = () => {
    setShowPriceDialog(false);
    setSelectedPriceItem(null);
    setNewPrice("");
  };

  const handleDiscountChange = (item: CartItem) => {
    if (!canDiscount) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to apply discounts",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedDiscountItem(item);
    setDiscountAmount((item.discount || 0).toString());
    setShowDiscountDialog(true);
  };

  const handleDiscountUpdate = () => {
    if (!selectedDiscountItem) return;
    
    const discount = parseFloat(discountAmount) || 0;
    onApplyDiscount(selectedDiscountItem.id, discount);
    
    setShowDiscountDialog(false);
    setSelectedDiscountItem(null);
    setDiscountAmount("");
  };

  const handleDiscountDialogClose = () => {
    setShowDiscountDialog(false);
    setSelectedDiscountItem(null);
    setDiscountAmount("");
  };

  const handleCreateCustomItem = async () => {
    const price = parseFloat(customItemPrice);
    if (!customItemName.trim()) {
      toast({ title: "Item name required", variant: "destructive" });
      return;
    }
    if (!customItemPrice || isNaN(price) || price <= 0) {
      toast({ title: "Enter a valid price", variant: "destructive" });
      return;
    }
    setIsCreatingCustomItem(true);
    try {
      const resolvedAttendantId = attendant?._id
        ? attendant._id
        : (typeof admin?.attendantId === 'object' && admin?.attendantId
            ? (admin.attendantId as any)._id
            : admin?.attendantId) || admin?._id;

      const buyingPrice = customItemType === "product" ? parseFloat(customItemBuyingPrice || "0") : 0;
      const quantity = customItemType === "product" ? parseInt(customItemQuantity || "1") : 0;

      const response = await apiCall("/api/product", {
        method: "POST",
        body: JSON.stringify({
          name: customItemName.trim(),
          shopId,
          attendantId: resolvedAttendantId,
          admin: adminId,
          sellingPrice: price,
          wholesalePrice: price,
          dealerPrice: price,
          buyingPrice,
          quantity,
          productType: customItemType,
        }),
      });
      const product = await response.json();
      onAddToCart(product);
      setShowCustomItemDialog(false);
      setCustomItemName("");
      setCustomItemPrice("");
      setCustomItemType("service");
      setCustomItemBuyingPrice("");
      setCustomItemQuantity("1");
      setShowCustomItemOptions(false);
      toast({ title: "Custom item added", description: `"${product.name}" added to cart` });
    } catch (err: any) {
      toast({ title: "Failed to add item", description: err.message || "Could not create custom item", variant: "destructive" });
    } finally {
      setIsCreatingCustomItem(false);
    }
  };

  const grandTotal = totals.total + extraChargeAmount;

  const processTransaction = async (isHold = false) => {
    // For hold transactions, skip payment method validations
    if (!isHold) {
      if (!selectedPaymentMethod) return;
      
      // Validate payment-specific requirements
      
      if (selectedPaymentMethod === "bank" && !bankTransactionId.trim()) {
        toast({
          title: "Transaction ID Required", 
          description: "Please enter the bank transaction ID",
          variant: "destructive",
        });
        return;
      }
      
      if (selectedPaymentMethod === "credit") {
        if (!selectedCustomerId) {
          toast({
            title: "Customer Required",
            description: "Please select a customer for credit sale",
            variant: "destructive",
          });
          return;
        }
        
        if (!creditDueDate) {
          toast({
            title: "Due Date Required",
            description: "Please select a due date for credit sale",
            variant: "destructive",
          });
          return;
        }
      }
      
      if (selectedPaymentMethod === "split") {
        const totalSplit = splitAmounts.cash + splitAmounts.mpesa + splitAmounts.bank;
        if (Math.abs(totalSplit - grandTotal) > 0.01) {
          toast({
            title: "Amount Mismatch",
            description: `Split amounts (${totalSplit.toFixed(2)}) must equal total (${grandTotal.toFixed(2)})`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    // Get attendant ID and shopId based on user type
    let attendantId: string | undefined;
    let shopId: string | undefined;

    if (attendant?._id) {
      // Attendant flow
      attendantId = attendant._id;
      shopId = typeof attendant.shopId === 'object' ? attendant.shopId._id : attendant.shopId;
    } else if (admin) {
      // Admin flow - extract string IDs properly
      const adminAttendantId = typeof admin.attendantId === 'object' && admin.attendantId ? (admin.attendantId as any)._id : admin.attendantId;
      attendantId = adminAttendantId || admin._id;
      
      // Ensure shopId is a string, not an object
      let adminShopId = selectedShopId || admin.primaryShop;
      if (typeof adminShopId === 'object' && adminShopId && (adminShopId as any)._id) {
        shopId = (adminShopId as any)._id;
      } else if (typeof adminShopId === 'string') {
        shopId = adminShopId;
      } else {
        shopId = undefined;
      }
    }
    


    // Validate required fields
    if (!shopId) {
      toast({
        title: "Shop ID Missing",
        description: "Unable to determine shop ID. Please contact administrator.",
        variant: "destructive",
      });
      return;
    }

    if (!attendantId) {
      toast({
        title: "Attendant ID Missing", 
        description: "Unable to determine attendant ID. Please re-login.",
        variant: "destructive",
      });
      return;
    }

    // Check shop batch tracking setting
    const shouldTrackBatches = Boolean(shopData?.trackbatches);

    const transactionData = {
      products: cartItems.map(item => {
        // Find the product data for logging
        const productData = allProducts.find(p => p._id === item.id || p.id === item.id);
        
        console.log(`Product ${item.name}: productId=${item.id}, inventoryId=${(productData as any)?.inventoryId}, availableQty=${(productData as any)?.quantity}`);
        
        return {
          product: item.id,
          quantity: parseFloat(item.quantity.toString()),
          unitPrice: parseFloat(item.price.toString()),
          tax: parseFloat((item.price * (taxRate / 100)).toString()),
          attendantId: attendantId,
          inventory: (productData as any)?.inventoryId || item.id, // Use inventoryId field
          lineDiscount: parseFloat(((item.discount || 0) * item.quantity).toString()),
          createdAt: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
        };
      }),
      shopId: shopId || "",
      attendantId: attendantId,
      saleType: saleType,
      createdAt: (!isHold && isCustomDateTime && customDateTime) ? customDateTime : new Date().toISOString(),
      status: isHold ? "hold" : "cashed",
      totaltax: parseFloat(totals.tax.toString()),
      salesnote: "",
      orderId: orderId,
      duedate: selectedPaymentMethod === "credit" ? creditDueDate : null,
      ready_date: readyDate || "",
      batchTrack: shouldTrackBatches,
      allownegativeselling: false,
      mpesaTransId: !isHold && selectedPaymentMethod === "mpesa" ? mpesaTransactionId : 
                   !isHold && selectedPaymentMethod === "split" && splitAmounts.mpesa > 0 ? `SPLIT_${Date.now()}` : "",
      mpesaTotal: !isHold && selectedPaymentMethod === "mpesa" ? parseFloat(grandTotal.toString()) :
                 !isHold && selectedPaymentMethod === "split" ? splitAmounts.mpesa : 0.0,
      bankTotal: !isHold && selectedPaymentMethod === "bank" ? parseFloat(grandTotal.toString()) :
                !isHold && selectedPaymentMethod === "split" ? splitAmounts.bank : 0.0,
      bankTransId: !isHold && selectedPaymentMethod === "bank" ? bankTransactionId : 
                  !isHold && selectedPaymentMethod === "split" && splitAmounts.bank > 0 ? `BANK_${Date.now()}` : "",
      amountPaid: isHold || selectedPaymentMethod === "credit" ? 0.0 : 
                 selectedPaymentMethod === "split" ? splitAmounts.cash : parseFloat(grandTotal.toString()),
      outstandingBalance: isHold || selectedPaymentMethod === "credit" ? parseFloat(grandTotal.toString()) : 0.0,
      paymentType: isHold ? "cash" : selectedPaymentMethod,
      paymentTag: isHold ? "cash" : selectedPaymentMethod,
      totalDiscount: parseFloat(totals.discount.toString()),
      customerId: selectedCustomerId || null,
      saleDiscount: 0.0,
      salesnote: extraChargeAmount > 0 ? `${extraChargeLabel}: Ksh ${extraChargeAmount.toFixed(2)}` : "",
    };

    try {
      await createTransactionMutation.mutateAsync(transactionData);
      if (isHold) {
        setShowHoldSuccessDialog(true);
      } else if (selectedPaymentMethod === "credit") {
        toast({
          title: "Credit Sale Created",
          description: `Credit sale created for ${selectedCustomer?.name || 'customer'} due ${creditDueDate}`,
        });
      }
      // Receipt handling and cleanup is now done in mutation's onSuccess callback
    } catch (error: any) {
      console.error(`${isHold ? 'Hold' : 'Payment'} transaction failed:`, error);
      toast({
        title: `${isHold ? 'Hold' : 'Payment'} Failed`,
        description: error.message || `Failed to ${isHold ? 'hold' : 'process'} transaction`,
        variant: "destructive",
      });
    }
  };

  const handleCompletePayment = () => {
    processTransaction(false);
  };
  handleCompletePaymentRef.current = handleCompletePayment;

  const isLaundryShop = (shopData?.shopCategoryId?.name || '').toLowerCase().includes('laundry');
  const [mainCustomerSearch, setMainCustomerSearch] = useState('');
  const [showMainCustomerDropdown, setShowMainCustomerDropdown] = useState(false);
  const [showHoldCustomerDialog, setShowHoldCustomerDialog] = useState(false);
  const [showHoldReadyDateDialog, setShowHoldReadyDateDialog] = useState(false);
  const [holdCustomerSearch, setHoldCustomerSearch] = useState('');
  const [readyDate, setReadyDate] = useState('');
  const [isHoldProcessing, setIsHoldProcessing] = useState(false);
  const [showHoldSuccessDialog, setShowHoldSuccessDialog] = useState(false);
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', email: '', address: '' });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: typeof newCustomerForm) => {
      const response = await apiCall('/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name.trim(),
          phonenumber: data.phone,
          email: data.email,
          address: data.address,
          wallet: 0,
          shopId: shopId,
          adminid: adminId,
        }),
      });
      return response.json();
    },
    onSuccess: (createdCustomer: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      const newId = createdCustomer._id || createdCustomer.id || createdCustomer?.customer?._id;
      if (newId) setSelectedCustomerId(newId);
      setNewCustomerForm({ name: '', phone: '', email: '', address: '' });
      setShowAddCustomerDialog(false);
      toast({ title: 'Customer created', description: `${variables.name} was added successfully.` });
    },
    onError: () => {
      toast({ title: 'Failed to create customer', variant: 'destructive' });
    },
  });

  const handleHoldTransaction = async () => {
    if (cartItems.length === 0) return;
    if (!selectedCustomerId) {
      setShowHoldCustomerDialog(true);
      return;
    }
    // For laundry shops, always show ready date dialog even when customer is pre-selected
    if (isLaundryShop) {
      setShowHoldReadyDateDialog(true);
      return;
    }
    await processTransaction(true);
  };

  const handleConfirmHoldWithCustomer = async () => {
    if (!selectedCustomerId) {
      toast({
        title: "Customer Required",
        description: "Please select a customer to place this sale on hold.",
        variant: "destructive",
      });
      return;
    }
    setIsHoldProcessing(true);
    await processTransaction(true);
    setIsHoldProcessing(false);
    setShowHoldCustomerDialog(false);
  };

  const resetPaymentDialog = () => {
    setShowPaymentDialog(false);
    setSelectedPaymentMethod("");
    setShowCardInterface(false);
    setIsProcessingCard(false);
    setMpesaTransactionId("");
    setBankTransactionId("");
    setCreditDueDate("");
    setSplitAmounts({ cash: 0, mpesa: 0, bank: 0 });
    setCashReceived("");
    setIsCustomDateTime(false);
    setCustomDateTime("");
  };
  resetPaymentDialogRef.current = resetPaymentDialog;

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Mobile App Header */}
      <div className="lg:hidden bg-purple-600 text-white">
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <button
            onClick={showMobileCart ? () => setShowMobileCart(false) : onBack}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 active:bg-white/25"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="text-center">
            <p className="font-bold text-base leading-tight">
              {showMobileCart ? 'My Cart' : 'Pointify POS'}
            </p>
            {showMobileCart && (
              <p className="text-purple-200 text-xs">
                {cartItems.length > 0 ? `${cartItems.length} item${cartItems.length !== 1 ? 's' : ''}` : 'Empty'}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {showMobileCart ? (
              <button
                onClick={() => cartItems.length > 0 && setShowPaymentDialog(true)}
                disabled={cartItems.length === 0}
                className="bg-white text-purple-700 text-xs font-bold px-4 py-2 rounded-full disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
              >
                Pay
              </button>
            ) : viewMode === 'grid' ? (
              <button
                onClick={() => setShowCategoriesDrawer(true)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 active:bg-white/25"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => cartItems.length > 0 && setShowPaymentDialog(true)}
                disabled={cartItems.length === 0}
                className="bg-white text-purple-700 text-xs font-bold px-4 py-2 rounded-full disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
              >
                {cartItems.length > 0 ? `Pay · ${cartItems.length}` : 'Pay'}
              </button>
            )}
          </div>
        </div>

        {/* Mobile search bar — shown only on products tab in grid mode */}
        {!showMobileCart && viewMode !== 'table' && (
          <div className="px-3 pb-3 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-300 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => { onSearchChange(e.target.value); setDropdownHighlight(-1); }}
                onKeyDown={(e) => handleSearchKeyDown(e, products.slice(0, 8))}
                className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/15 text-white placeholder-purple-300 text-sm focus:outline-none focus:bg-white/25 border border-white/20"
              />
              {searchQuery && (
                <button
                  onClick={() => { onSearchChange(''); setDropdownHighlight(-1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-white/60" />
                </button>
              )}
            </div>
            {/* Search results dropdown */}
            {searchQuery && (
              <div className="absolute left-3 right-3 top-full mt-0.5 bg-white rounded-2xl shadow-2xl z-50 max-h-72 overflow-y-auto border border-gray-100">
                {isSearching ? (
                  <div className="py-5 text-center text-sm text-gray-400">Searching…</div>
                ) : products.length === 0 ? (
                  <div className="py-5 text-center text-sm text-gray-400">No products found</div>
                ) : (
                  products.slice(0, 8).map((product: any, idx: number) => {
                    const isService = product?.productType === 'service' || product?.virtual === true;
                    const isOutOfStock = !isService && (product.quantity === 0);
                    const isHighlighted = idx === dropdownHighlight;
                    return (
                      <div
                        key={product._id || product.id}
                        ref={el => { dropdownItemRefs.current[idx] = el; }}
                        onClick={isOutOfStock ? undefined : () => {
                          onAddToCart(product);
                          onSearchChange('');
                          setDropdownHighlight(-1);
                        }}
                        className={`flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-b-0 ${
                          isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:bg-purple-50'
                        } ${isHighlighted ? 'bg-purple-50' : ''}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{product.name || product.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {isService ? 'Service' : isOutOfStock ? 'Out of stock' : `In stock: ${product.quantity}`}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-purple-600 ml-3 shrink-0">
                          Ksh {getPriceForSaleType(product, saleType).toFixed(2)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop Header Bar - No search on mobile */}
      <div className="hidden lg:block bg-white shadow-sm border-b border-gray-200">
        <div className="px-3 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            {/* Keyboard shortcut hints — offset to clear the absolute Back button */}
            {(() => {
              const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
              const hints = isMac
                ? [
                    { key: "⌘P", label: "Pay" },
                    { key: "⌘K", label: "Search" },
                    { key: "⌘⌫", label: "Clear cart" },
                    { key: "Esc", label: "Close" },
                    { key: "↩", label: "Confirm" },
                  ]
                : [
                    { key: "F2", label: "Pay" },
                    { key: "F3", label: "Search" },
                    { key: "F4", label: "Clear cart" },
                    { key: "Esc", label: "Close" },
                    { key: "Enter", label: "Confirm" },
                  ];
              return (
                <div className="hidden lg:flex items-center gap-3 text-xs text-gray-400 pl-48">
                  {hints.map(({ key, label }) => (
                    <span key={key} className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-600">{key}</kbd>
                      <span>{label}</span>
                    </span>
                  ))}
                </div>
              );
            })()}
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-7 px-2"
                >
                  <Grid3X3 className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Cards</span>
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="h-7 px-2"
                >
                  <Table className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Table</span>
                </Button>
              </div>
              
              {viewMode === 'grid' ? <Button
                onClick={() => setShowCategoriesDrawer(true)}
                className="bg-red-600 hover:bg-red-700 text-white h-8 px-3 text-sm whitespace-nowrap"
              >
                Category
              </Button> : <></>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Left Panel - Transaction Form */}
        <div className={`w-full lg:w-2/3 p-2 lg:p-6 bg-white ${showMobileCart ? 'flex flex-col flex-1 overflow-y-auto' : viewMode === 'table' ? 'flex flex-col flex-1 overflow-hidden' : 'hidden lg:block'}`}>
          {/* Transaction ID + Date — desktop only */}
          <div className="hidden lg:grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Txn ID</label>
              <Input value="S-01154" className="h-8 bg-gray-50 text-xs" readOnly />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Date</label>
              <Input 
                type="date" 
                defaultValue={new Date().toISOString().split('T')[0]} 
                className="h-8 text-xs" 
                disabled={!canSetSaleDate}
                readOnly={!canSetSaleDate}
              />
            </div>
          </div>

          {/* Customer + Sale Type */}
          <div className="grid grid-cols-2 gap-2 lg:gap-6 mb-1.5 lg:mb-6">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Customer</label>
              <div className="flex gap-1 lg:gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <Input
                    className="h-8 pl-7 pr-2 text-xs"
                    placeholder="Walk-in"
                    value={showMainCustomerDropdown ? mainCustomerSearch : (selectedCustomer ? selectedCustomer.name : '')}
                    onFocus={() => {
                      setMainCustomerSearch('');
                      setShowMainCustomerDropdown(true);
                    }}
                    onChange={(e) => {
                      setMainCustomerSearch(e.target.value);
                      setShowMainCustomerDropdown(true);
                    }}
                    onBlur={() => setTimeout(() => setShowMainCustomerDropdown(false), 150)}
                  />
                  {showMainCustomerDropdown && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      {/* Walk-in option */}
                      <div
                        className={`px-3 py-2 text-xs lg:text-sm cursor-pointer hover:bg-gray-50 ${!selectedCustomerId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                        onMouseDown={() => { setSelectedCustomerId(''); setMainCustomerSearch(''); setShowMainCustomerDropdown(false); }}
                      >
                        Walk-in
                      </div>
                      {/* Filtered customers */}
                      {customers
                        .filter((c: any) => {
                          if (!mainCustomerSearch) return true;
                          const term = mainCustomerSearch.toLowerCase();
                          return (
                            (c.name || '').toLowerCase().includes(term) ||
                            (c.phone || '').toLowerCase().includes(term) ||
                            (c.phonenumber || '').toLowerCase().includes(term)
                          );
                        })
                        .map((customer: any) => {
                          const cId = customer._id || customer.id;
                          return (
                            <div
                              key={cId}
                              className={`px-3 py-2 text-xs lg:text-sm cursor-pointer hover:bg-gray-50 ${selectedCustomerId === cId ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                              onMouseDown={() => { setSelectedCustomerId(cId); setMainCustomerSearch(''); setShowMainCustomerDropdown(false); }}
                            >
                              <div className="font-medium">{customer.name}</div>
                              {(customer.phone || customer.phonenumber) && (
                                <div className="text-xs text-gray-400">{customer.phone || customer.phonenumber}</div>
                              )}
                            </div>
                          );
                        })}
                      {mainCustomerSearch && customers.filter((c: any) => {
                        const term = mainCustomerSearch.toLowerCase();
                        return (c.name || '').toLowerCase().includes(term) || (c.phone || '').toLowerCase().includes(term) || (c.phonenumber || '').toLowerCase().includes(term);
                      }).length === 0 && (
                        <div className="px-3 py-3 text-xs text-gray-400 text-center">No customers found</div>
                      )}
                    </div>
                  )}
                </div>
                {/* Add Customer Button - Only show if attendant has customers manage permission */}
                {hasAttendantPermission('customers', 'manage') && (
                  <Button 
                    onClick={() => window.open('/customers', '_blank')}
                    className="bg-red-600 hover:bg-red-700 text-white h-8 lg:h-10 px-2 lg:px-4"
                  >
                    <Plus className="h-3 w-3 lg:h-4 lg:w-4" />
                  </Button>
                )}
              </div>
              
              {/* Customer Balance Display */}
              {selectedCustomer && (
                <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600">
                      Bal: <span className={`font-bold ${parseFloat(selectedCustomer.wallet || '0') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Ksh {parseFloat(selectedCustomer.wallet || '0').toFixed(2)}
                      </span>
                    </span>
                    <span className="text-xs text-gray-400">
                      Limit: Ksh {parseFloat(selectedCustomer.creditLimit || '0').toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Sale Type</label>
              <select 
                value={saleType}
                onChange={(e) => onSaleTypeChange(e.target.value)}
                className="w-full h-8 px-2 border border-gray-300 rounded text-xs bg-white cursor-pointer"
              >
                <option value="Retail">Retail</option>
                {canSellToDealer && <option value="Wholesale">Wholesale</option>}
                {canSellToDealer && <option value="Dealer">Dealer</option>}
              </select>
            </div>
          </div>

          {/* Table Mode - Product Search Bar */}
          {viewMode === 'table' && (
            <div className="mb-2 lg:mb-4">
              <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Scan barcode or search products..."
                  value={searchQuery}
                  onChange={(e) => { onSearchChange(e.target.value); setDropdownHighlight(-1); }}
                  onKeyDown={(e) => handleSearchKeyDown(e, products.slice(0, 8))}
                  className="pl-8 h-8 text-xs border-gray-300 bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  autoFocus
                />
                
                {/* Search Results Dropdown */}
                {searchQuery && viewMode === 'table' && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {isLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-500">Searching...</p>
                      </div>
                    ) : isSearching ? (
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-sm">Searching...</p>
                      </div>
                    ) : products.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-sm">No products found</p>
                      </div>
                    ) : (
                      products.slice(0, 8).map((product: any, idx: number) => {
                        const isService = product?.productType === 'service' || product?.virtual === true;
                        const isOutOfStock = !isService && (product.quantity === 0);
                        const isHighlighted = idx === dropdownHighlight;
                        return (
                        <div
                          key={product._id}
                          ref={el => { dropdownItemRefs.current[idx] = el; }}
                          onClick={isOutOfStock ? undefined : () => {
                            onAddToCart(product);
                            onSearchChange('');
                            setDropdownHighlight(-1);
                          }}
                          className={`flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0 ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isHighlighted ? 'bg-purple-50 ring-1 ring-inset ring-purple-200' : 'hover:bg-gray-50'}`}
                        >
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {product.name}
                            </h4>
                            <div className="flex items-center space-x-3 mt-1">
                              {isService ? (
                                <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Service</span>
                              ) : isOutOfStock ? (
                                <span className="text-xs text-red-600">Out of stock</span>
                              ) : (
                                <span className="text-xs text-gray-500">Stock: {product.quantity || 0}</span>
                              )}
                              {product.barcode && (
                                <span className="text-xs text-purple-600 font-mono">
                                  {product.barcode}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-3">
                            <span className="text-sm font-semibold text-green-600">
                              Ksh {getPriceForSaleType(product, saleType).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCustomItemDialog(true)}
                className="h-8 px-2 border-dashed border-purple-400 text-purple-600 hover:bg-purple-50 whitespace-nowrap shrink-0 text-xs"
              >
                <PlusCircle className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Custom Item</span>
                <span className="sm:hidden">Custom</span>
              </Button>
              </div>
            </div>
          )}

          {/* Items Table */}
          <div className={`border border-gray-200 rounded-lg overflow-hidden shadow-sm ${viewMode === 'table' ? 'flex-1 flex flex-col mb-0 lg:mb-6' : 'mb-2 lg:mb-6'}`}>
            <div className="bg-gray-50 px-3 py-1.5 lg:px-6 lg:py-3 border-b border-gray-200">
              <h3 className="text-xs font-semibold text-gray-600">
                Cart {cartItems.length > 0 && <span className="text-purple-600">({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})</span>}
              </h3>
            </div>

            {/* Desktop Table Header */}
            <div className="bg-gray-100 hidden lg:grid grid-cols-6 gap-2 lg:gap-4 px-3 lg:px-6 py-3 text-xs lg:text-sm font-medium text-gray-700 border-b border-gray-200">
              <div className="col-span-1">Item Name</div>
              <div className="text-right">Unit Price</div>
              <div className="text-center">Qty</div>
              <div className="text-right">Tax</div>
              <div className="text-right">Subtotal</div>
              <div className="text-center">Remove</div>
            </div>
            <div className={`bg-white ${viewMode === 'table' ? 'flex-1 overflow-y-auto' : 'min-h-[80px] lg:min-h-[200px]'}`}>
              {cartItems.length === 0 ? (
                <div className="p-3 lg:p-12 text-center text-gray-500">
                  <Package className="h-6 w-6 lg:h-16 lg:w-16 mx-auto mb-1 lg:mb-6 text-gray-300" />
                  <p className="font-semibold text-xs lg:text-lg text-gray-600 mb-0.5 lg:mb-2">No items added</p>
                  <p className="text-xs lg:text-base text-gray-400 hidden lg:block">Add products to start the transaction</p>
                </div>
              ) : (
                <div>
                  {cartItems.map((item, index) => {
                    const itemTax = item.total * (taxRate / 100);
                    return (
                      <div key={item.id}>
                        {/* Mobile Layout */}
                        <div className="lg:hidden px-4 py-3.5 border-b border-gray-100 bg-white active:bg-gray-50">
                          <div className="flex items-start gap-3">
                            {/* Product icon */}
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 mt-0.5">
                              <Package className="h-5 w-5 text-purple-300" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <p className="font-semibold text-gray-900 text-sm truncate pr-2">{item.name}</p>
                                <p className="font-bold text-gray-900 text-sm shrink-0">Ksh {item.total.toFixed(2)}</p>
                              </div>
                              <p className="text-gray-400 text-xs mt-0.5">
                                Ksh {item.price.toFixed(2)} each
                                {item.discount > 0 && (
                                  <span className="text-green-500 ml-1">−Ksh {item.discount.toFixed(2)}</span>
                                )}
                              </p>
                              {/* Qty controls + actions */}
                              <div className="flex items-center justify-between mt-2.5">
                                <div className="flex items-center bg-gray-100 rounded-xl overflow-hidden">
                                  <button
                                    onClick={() => {
                                      const productData = allProducts.find(p => p._id === item.id || p.id === item.id);
                                      onUpdateQuantity(item.id, Math.max(1, item.quantity - 1), productData);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center text-purple-600 active:bg-gray-200"
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </button>
                                  <span className="w-8 text-center text-sm font-bold text-gray-800">{item.quantity}</span>
                                  <button
                                    onClick={() => {
                                      const productData = allProducts.find(p => p._id === item.id || p.id === item.id);
                                      onUpdateQuantity(item.id, item.quantity + 1, productData);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center text-purple-600 active:bg-gray-200"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                <div className="flex items-center gap-2">
                              {canEditPrice && (
                                <button 
                                  onClick={() => handlePriceChange(item)}
                                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  Change price
                                </button>
                              )}
                              {canDiscount && (item.maxDiscount || 0) > 0 && (
                                <button 
                                  onClick={() => handleDiscountChange(item)}
                                  className="text-xs text-green-600 hover:text-green-800 underline"
                                >
                                  Add discount
                                </button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onUpdateQuantity(item.id, 0)}
                                className="w-6 h-6 p-0 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Desktop Layout */}
                        <div className={`hidden lg:grid grid-cols-6 gap-2 lg:gap-4 px-3 lg:px-6 py-4 border-b border-gray-100 text-sm items-center hover:bg-gray-50 transition-colors ${index % 2 === 1 ? 'bg-gray-25' : 'bg-white'}`}>
                          {/* Column 1: Item Name */}
                          <div className="text-left">
                            <p className="font-semibold text-gray-800 truncate">{item.name}</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {canEditPrice && (
                                <button 
                                  onClick={() => handlePriceChange(item)}
                                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  Change price
                                </button>
                              )}
                              {canDiscount && (item.maxDiscount || 0) > 0 && (
                                <button 
                                  onClick={() => handleDiscountChange(item)}
                                  className="text-xs text-green-600 hover:text-green-800 underline"
                                >
                                  Add discount
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {/* Column 2: Unit Price */}
                          <div className="text-right">
                            <p className="font-semibold text-gray-800">Ksh {item.price.toFixed(2)}</p>
                            {item.discount > 0 && (
                              <p className="text-xs text-green-600">-Ksh {item.discount.toFixed(2)}</p>
                            )}
                          </div>
                          
                          {/* Column 3: Quantity */}
                          <div className="text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const productData = allProducts.find(p => p._id === item.id || p.id === item.id);
                                  onUpdateQuantity(item.id, Math.max(1, item.quantity - 1), productData);
                                }}
                                className="w-7 h-7 p-0 rounded border-gray-300"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                key={item.quantity}
                                type="number"
                                defaultValue={item.quantity}
                                onBlur={(e) => {
                                  const newQuantity = Math.max(1, parseInt(e.target.value) || 1);
                                  if (newQuantity !== item.quantity) {
                                    const productData = allProducts.find(p => p._id === item.id || p.id === item.id);
                                    onUpdateQuantity(item.id, newQuantity, productData);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const newQuantity = Math.max(1, parseInt((e.target as HTMLInputElement).value) || 1);
                                    const productData = allProducts.find(p => p._id === item.id || p.id === item.id);
                                    onUpdateQuantity(item.id, newQuantity, productData);
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                                className="w-14 h-7 p-1 text-center text-sm font-semibold border-purple-300 focus:border-purple-500 rounded"
                                min="1"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const productData = allProducts.find(p => p._id === item.id || p.id === item.id);
                                  onUpdateQuantity(item.id, item.quantity + 1, productData);
                                }}
                                className="w-7 h-7 p-0 rounded border-gray-300"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Column 4: Tax */}
                          <div className="text-right">
                            <p className="font-semibold text-orange-600">Ksh {itemTax.toFixed(2)}</p>
                          </div>
                          
                          {/* Column 5: Subtotal */}
                          <div className="text-right">
                            <p className="font-bold text-primary">Ksh {item.total.toFixed(2)}</p>
                          </div>
                          
                          {/* Column 6: Remove */}
                          <div className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onUpdateQuantity(item.id, 0)}
                              className="w-7 h-7 p-0 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Table Mode - Mobile Totals (pinned at bottom of left panel) */}
          {viewMode === 'table' && (
            <div className="lg:hidden shrink-0 bg-white border-t border-gray-100">
              <div className="bg-gray-50 px-3 pt-2 pb-1">
                <div className="space-y-0">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs font-medium text-gray-600">Discount</span>
                    <span className="text-red-500 font-medium text-xs">- Ksh {totals.discount.toFixed(2)}</span>
                  </div>
                  {totals.tax > 0 && (
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs font-medium text-gray-600">Tax</span>
                    <span className="font-medium text-gray-900 text-xs">Ksh {totals.tax.toFixed(2)}</span>
                  </div>
                  )}
                  <div className="flex justify-between items-center py-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-medium text-gray-600">{extraChargeAmount > 0 ? extraChargeLabel : "Extra Charges"}</span>
                      <button
                        className="w-4 h-4 rounded border border-gray-400 text-gray-600 flex items-center justify-center"
                        onClick={() => setShowExtraChargeInput(!showExtraChargeInput)}
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                      {extraChargeAmount > 0 && (
                        <button
                          className="w-4 h-4 rounded border border-red-300 text-red-500 flex items-center justify-center hover:bg-red-50"
                          onClick={() => { setExtraChargeAmount(0); setExtraChargeInputValue(""); setShowExtraChargeInput(false); }}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                    <span className="font-medium text-xs text-gray-900">Ksh {extraChargeAmount.toFixed(2)}</span>
                  </div>
                  {showExtraChargeInput && (
                    <div className="bg-gray-100 rounded-lg p-2 space-y-1.5 mt-1">
                      <Input
                        placeholder="Label (e.g. Transport)"
                        value={extraChargeLabel}
                        onChange={(e) => setExtraChargeLabel(e.target.value)}
                        className="h-7 text-xs border-gray-300"
                      />
                      <div className="flex items-center space-x-1">
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={extraChargeInputValue}
                          onChange={(e) => setExtraChargeInputValue(e.target.value)}
                          className="h-7 text-xs border-gray-300"
                          min="0"
                        />
                        <Button size="sm" className="h-7 px-2 text-xs bg-purple-600 hover:bg-purple-700 text-white" onClick={() => { setExtraChargeAmount(parseFloat(extraChargeInputValue) || 0); setShowExtraChargeInput(false); }}>Add</Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { setExtraChargeAmount(0); setExtraChargeInputValue(""); setShowExtraChargeInput(false); }}>Clear</Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-purple-600 text-white px-3 py-2 rounded-lg mt-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Grand Total:</span>
                    <span className="text-base font-bold">Ksh {grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="px-3 pt-2 pb-3 space-y-2">
                <Button
                  onClick={() => setShowPaymentDialog(true)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 text-sm font-semibold rounded-lg"
                  disabled={cartItems.length === 0}
                >
                  Cash-In
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={onClearCart} variant="outline" className="border-red-400 text-red-600 hover:bg-red-50 py-1.5 text-xs font-semibold rounded-lg" disabled={cartItems.length === 0}>Clear</Button>
                  <Button onClick={handleHoldTransaction} variant="outline" className="border-gray-400 text-gray-700 hover:bg-gray-50 py-1.5 text-xs font-semibold rounded-lg" disabled={cartItems.length === 0}>Hold</Button>
                </div>
              </div>
            </div>
          )}

          {/* Grid Mode - Sticky Payment Summary Section */}
          {viewMode === 'grid' && (
            <div className="sticky bottom-0 bg-white mt-2 lg:mt-6 rounded-t-2xl shadow-lg">
            {/* Summary Section */}
            <div className="bg-gray-50 p-2 lg:p-4">
              <div className="space-y-1 lg:space-y-2">
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs lg:text-sm font-medium text-gray-700">Discount</span>
                  <span className="text-red-500 font-medium text-xs lg:text-sm">- Ksh {totals.discount.toFixed(2)}</span>
                </div>
                
                {totals.tax > 0 && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs lg:text-sm font-medium text-gray-700">Tax</span>
                  <span className="font-medium text-gray-900 text-xs lg:text-sm">Ksh {totals.tax.toFixed(2)}</span>
                </div>
                )}

                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center space-x-1 lg:space-x-2">
                    <span className="text-xs lg:text-sm font-medium text-gray-700">{extraChargeAmount > 0 ? extraChargeLabel : "Extra Charges"}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-4 h-4 lg:w-6 lg:h-6 p-0 rounded border-gray-400 text-gray-600 hover:bg-gray-100"
                      onClick={() => setShowExtraChargeInput(!showExtraChargeInput)}
                    >
                      <Plus className="h-2 w-2 lg:h-3 lg:w-3" />
                    </Button>
                    {extraChargeAmount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-4 h-4 lg:w-6 lg:h-6 p-0 rounded border-red-300 text-red-500 hover:bg-red-50"
                        onClick={() => { setExtraChargeAmount(0); setExtraChargeInputValue(""); setShowExtraChargeInput(false); }}
                      >
                        <X className="h-2 w-2 lg:h-3 lg:w-3" />
                      </Button>
                    )}
                  </div>
                  <span className="font-medium text-gray-900 text-xs lg:text-sm">Ksh {extraChargeAmount.toFixed(2)}</span>
                </div>
                {showExtraChargeInput && (
                  <div className="bg-gray-100 rounded-lg p-2 space-y-1.5 mt-1">
                    <Input
                      placeholder="Label (e.g. Transport)"
                      value={extraChargeLabel}
                      onChange={(e) => setExtraChargeLabel(e.target.value)}
                      className="h-7 text-xs border-gray-300"
                    />
                    <div className="flex items-center space-x-1">
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={extraChargeInputValue}
                        onChange={(e) => setExtraChargeInputValue(e.target.value)}
                        className="h-7 text-xs border-gray-300"
                        min="0"
                      />
                      <Button size="sm" className="h-7 px-2 text-xs bg-purple-600 hover:bg-purple-700 text-white" onClick={() => { setExtraChargeAmount(parseFloat(extraChargeInputValue) || 0); setShowExtraChargeInput(false); }}>Add</Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { setExtraChargeAmount(0); setExtraChargeInputValue(""); setShowExtraChargeInput(false); }}>Clear</Button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Grand Total */}
              <div className="bg-purple-600 text-white p-2 lg:p-4 rounded-lg mt-2 lg:mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm lg:text-lg font-semibold">Grand Total:</span>
                  <span className="text-lg lg:text-xl font-bold">Ksh {grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="p-3 lg:p-4 bg-white">
              <div className="grid grid-cols-3 gap-2 lg:gap-3">
                <Button 
                  onClick={() => setShowPaymentDialog(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white py-2 lg:py-3 text-sm lg:text-base font-semibold rounded-lg"
                  disabled={cartItems.length === 0}
                >
                  Cash-In
                </Button>
                <Button 
                  onClick={onClearCart}
                  variant="outline"
                  className="border-red-400 text-red-600 hover:bg-red-50 py-2 lg:py-3 text-sm lg:text-base font-semibold rounded-lg"
                  disabled={cartItems.length === 0}
                >
                  Clear
                </Button>
                <Button 
                  onClick={handleHoldTransaction}
                  variant="outline"
                  className="border-gray-400 text-gray-700 hover:bg-gray-50 py-2 lg:py-3 text-sm lg:text-base font-semibold rounded-lg"
                  disabled={cartItems.length === 0}
                >
                  Hold
                </Button>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Right Panel - Products */}
        {viewMode === 'grid' && (
          <div className={`w-full lg:w-1/3 bg-gray-50 p-2 lg:p-6 flex-col lg:h-full lg:overflow-hidden pb-2 lg:pb-6 ${!showMobileCart ? 'flex' : 'hidden lg:flex'}`}>

          {/* Product Grid — shown on all sizes */}
          <div className="flex flex-col bg-white rounded-xl lg:rounded-2xl p-2 lg:p-4 shadow-sm lg:shadow-lg lg:flex-1 lg:min-h-0 lg:overflow-hidden">
            {viewMode === 'grid' && (
              /* Desktop Search Bar — mobile uses the bar above */
              <div className="hidden lg:block mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    ref={searchInputRef}
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            )}
            
            {/* Product Display - Grid or Table View */}
            <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:max-h-[calc(100vh-200px)]">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Loading...</p>
                </div>
              ) : viewMode === 'grid' ? (
                /* Grid View - Restaurant Style Cards */
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 lg:gap-3 pb-4">
                  {products.map((product: any) => {
                    const price = getPriceForSaleType(product, saleType);
                    const productId = product._id || product.id;
                    const productName = product.name || product.title;
                    const quantity = product.quantity || 0;
                    const reorderLevel = product.reorderLevel || product.lowStockThreshold || 0;
                    const isVirtual = product.virtual || product?.productType == "service";
                    const isOutOfStock = !isVirtual && quantity === 0;
                    const isLowStock = !isVirtual && quantity > 0 && quantity <= reorderLevel;
                    
                    return (
                      <div
                        key={productId}
                        className={`rounded-xl lg:rounded-xl cursor-pointer transition-all duration-150 overflow-hidden border active:scale-[0.97] select-none ${
                          isOutOfStock
                            ? "bg-gray-50 border-gray-200 opacity-50 pointer-events-none"
                            : isLowStock
                            ? "bg-amber-50 border-amber-200 active:border-amber-400 active:shadow-md"
                            : "bg-white border-gray-100 active:border-purple-300 active:shadow-md shadow-sm"
                        }`}
                        onClick={() => !isOutOfStock && onAddToCart(product)}
                      >
                        {/* Image area */}
                        <div className="h-20 lg:h-24 bg-gradient-to-br from-purple-50 to-gray-100 flex items-center justify-center">
                          <Package className="h-7 w-7 lg:h-8 lg:w-8 text-purple-200" />
                        </div>
                        {/* Content */}
                        <div className="p-2.5 lg:p-2.5">
                          <p className="text-xs lg:text-sm font-semibold text-gray-800 truncate leading-tight">{productName}</p>
                          <p className="text-sm lg:text-sm font-bold text-purple-600 mt-0.5">Ksh {price.toFixed(2)}</p>
                          <div className="mt-1.5">
                            {isVirtual ? (
                              <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full font-medium">Service</span>
                            ) : isOutOfStock ? (
                              <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full font-medium">Out of stock</span>
                            ) : isLowStock ? (
                              <span className="text-[10px] text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full font-medium">Low: {quantity}</span>
                            ) : (
                              <span className="text-[10px] text-gray-400">In stock: {quantity}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                      {isLoading && <p>Loading...</p>}
                      {hasMore && <div ref={loaderRef} style={{ height: "30px" }} />}
                </div>
              ) : (
                /* Table View - Supermarket Style (Scanner/Search Only) */
                <div className="flex flex-col items-center justify-center h-full bg-white rounded-lg">
                  <div className="text-center space-y-6 max-w-md mx-auto p-8">
                    {/* Scanner Icon */}
                    <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M4 4h4m12 0h2M4 20h4m12 0h2" />
                      </svg>
                    </div>
                    
                    {/* Instructions */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold text-gray-900">Supermarket Mode</h3>
                      <div className="space-y-3 text-sm text-gray-600">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                          <p>Use search bar above to find products by name</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                          <p>Scan product barcode with scanner device</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                          <p>Items will automatically be added to cart</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-1">Products Available</p>
                        <p className="text-2xl font-bold text-gray-900">{products.length}</p>
                      </div>
                    </div>
                    
                    {/* Switch Suggestion */}
                    <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                      <p>💡 Want to browse products visually? Switch to <strong>Cards View</strong> using the toggle above</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        )}

        {/* Table Mode - Right Panel for Totals (desktop only) */}
        {viewMode === 'table' && (
          <div className="hidden lg:flex w-full lg:w-1/3 bg-white p-2 lg:p-6 flex-col pb-4 lg:pb-6">
            <div className="lg:flex-1 flex flex-col">
              {/* Summary Section */}
              <div className="bg-gray-50 p-2 lg:p-6 rounded-lg">
                <div className="space-y-0 lg:space-y-4">
                  <div className="flex justify-between items-center py-1 lg:py-2">
                    <span className="text-xs lg:text-base font-medium text-gray-700">Discount</span>
                    <span className="text-red-500 font-medium text-xs lg:text-base">- Ksh {totals.discount.toFixed(2)}</span>
                  </div>
                  
                  {totals.tax > 0 && (
                  <div className="flex justify-between items-center py-1 lg:py-2">
                    <span className="text-xs lg:text-base font-medium text-gray-700">Tax</span>
                    <span className="font-medium text-gray-900 text-xs lg:text-base">Ksh {totals.tax.toFixed(2)}</span>
                  </div>
                  )}

                  <div className="flex justify-between items-center py-1 lg:py-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs lg:text-base font-medium text-gray-700">{extraChargeAmount > 0 ? extraChargeLabel : "Extra Charges"}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-5 h-5 lg:w-6 lg:h-6 p-0 rounded border-gray-400 text-gray-600 hover:bg-gray-100"
                        onClick={() => setShowExtraChargeInput(!showExtraChargeInput)}
                      >
                        <Plus className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
                      </Button>
                      {extraChargeAmount > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-5 h-5 lg:w-6 lg:h-6 p-0 rounded border-red-300 text-red-500 hover:bg-red-50"
                          onClick={() => { setExtraChargeAmount(0); setExtraChargeInputValue(""); setShowExtraChargeInput(false); }}
                        >
                          <X className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
                        </Button>
                      )}
                    </div>
                    <span className="font-medium text-gray-900 text-xs lg:text-base">Ksh {extraChargeAmount.toFixed(2)}</span>
                  </div>
                  {showExtraChargeInput && (
                    <div className="bg-gray-100 rounded-lg p-2 lg:p-3 space-y-2 mt-1">
                      <Input
                        placeholder="Label (e.g. Transport)"
                        value={extraChargeLabel}
                        onChange={(e) => setExtraChargeLabel(e.target.value)}
                        className="h-8 text-xs lg:text-sm border-gray-300"
                      />
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={extraChargeInputValue}
                          onChange={(e) => setExtraChargeInputValue(e.target.value)}
                          className="h-8 text-xs lg:text-sm border-gray-300"
                          min="0"
                        />
                        <Button size="sm" className="h-8 px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white" onClick={() => { setExtraChargeAmount(parseFloat(extraChargeInputValue) || 0); setShowExtraChargeInput(false); }}>Add</Button>
                        <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => { setExtraChargeAmount(0); setExtraChargeInputValue(""); setShowExtraChargeInput(false); }}>Clear</Button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Grand Total */}
                <div className="bg-purple-600 text-white p-2.5 lg:p-6 rounded-lg mt-2 lg:mt-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm lg:text-xl font-semibold">Grand Total:</span>
                    <span className="text-base lg:text-2xl font-bold">Ksh {grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="mt-2 lg:mt-6">
                <div className="space-y-2 lg:space-y-3">
                  <Button 
                    onClick={() => setShowPaymentDialog(true)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 lg:py-4 text-sm lg:text-lg font-semibold rounded-lg"
                    disabled={cartItems.length === 0}
                  >
                    Cash-In
                  </Button>
                  <div className="grid grid-cols-2 gap-2 lg:gap-3">
                    <Button 
                      onClick={onClearCart}
                      variant="outline"
                      className="border-red-400 text-red-600 hover:bg-red-50 py-1.5 lg:py-3 text-xs lg:text-base font-semibold rounded-lg"
                      disabled={cartItems.length === 0}
                    >
                      Clear
                    </Button>
                    <Button 
                      onClick={handleHoldTransaction}
                      variant="outline"
                      className="border-gray-400 text-gray-700 hover:bg-gray-50 py-1.5 lg:py-3 text-xs lg:text-base font-semibold rounded-lg"
                      disabled={cartItems.length === 0}
                    >
                      Hold
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Tab Bar — hidden in table mode (layout already shows everything) */}
      <div className={`lg:hidden bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] flex ${viewMode === 'table' ? 'hidden' : ''}`}>
        {/* Products Tab */}
        <button
          onClick={() => { setShowMobileCart(false); setViewMode('grid'); }}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors active:bg-gray-50 ${
            !showMobileCart ? 'text-purple-600' : 'text-gray-400'
          }`}
        >
          <LayoutGrid className="h-5 w-5" />
          <span className="text-xs font-medium">Products</span>
        </button>

        {/* Cart Tab */}
        <button
          onClick={() => setShowMobileCart(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors active:bg-gray-50 relative ${
            showMobileCart ? 'text-purple-600' : 'text-gray-400'
          }`}
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            {cartItems.length > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-purple-600 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                {cartItems.length > 99 ? '99+' : cartItems.length}
              </span>
            )}
          </div>
          <span className="text-xs font-medium">
            {cartItems.length > 0 ? `Cart · Ksh ${totals.total.toFixed(0)}` : 'Cart'}
          </span>
        </button>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={resetPaymentDialog}>
        <DialogContent className="p-0 gap-0 w-full sm:max-w-xl border-0 shadow-2xl overflow-hidden
          fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0
          rounded-t-2xl sm:rounded-2xl
          sm:fixed sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:right-auto sm:-translate-x-1/2 sm:-translate-y-1/2
          max-h-[92dvh] sm:max-h-[88dvh] overflow-y-auto
          [&>button]:hidden">

          {/* Drag handle (mobile) */}
          <div className="flex justify-center pt-2 pb-1 sm:hidden">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          <div className="px-4 pt-2 pb-4 sm:px-5 sm:pt-4 sm:pb-5 space-y-3">

            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-purple-600">Payment</h2>
              <button
                onClick={resetPaymentDialog}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="h-3.5 w-3.5 text-gray-500" />
              </button>
            </div>

            {/* Keyboard shortcut hints */}
            <div className="hidden sm:flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
              {[
                { key: "C", label: "Cash" },
                { key: "W", label: "Wallet" },
                { key: "S", label: "Split" },
                { key: "M", label: "M-Pesa" },
                { key: "B", label: "Bank" },
                { key: "D", label: "Card" },
                { key: "R", label: "Credit" },
                { key: "↩", label: "Confirm" },
                { key: "Esc", label: "Close" },
              ].map(({ key, label }) => (
                <span key={key} className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono text-gray-500 shadow-sm">{key}</kbd>
                  <span>{label}</span>
                </span>
              ))}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-gray-600">Total Amount:</span>
              <span className="text-xl font-extrabold text-purple-600">Ksh {totals.total.toFixed(2)}</span>
            </div>

            {showCardInterface ? (
              /* Card interface */
              <div className="space-y-4 py-2">
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-16 h-16 border-4 border-primary rounded-xl flex items-center justify-center">
                    <CreditCard className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-800">Card Payment</p>
                    {isProcessingCard ? (
                      <p className="text-sm text-gray-500 mt-1">Insert, tap, or swipe your card…</p>
                    ) : (
                      <p className="text-sm text-purple-600 font-medium mt-1">✓ Card detected</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={resetPaymentDialog} className="flex-1">Cancel</Button>
                  <Button
                    onClick={handleCompletePayment}
                    disabled={isProcessingCard || createTransactionMutation.isPending}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {createTransactionMutation.isPending ? "Processing…" : "Complete Payment"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Payment method pills */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500">Select Payment Method:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "cash",   label: "Cash",   shortcut: "C", icon: <Banknote className="h-4 w-4" /> },
                      { id: "wallet", label: "Wallet", shortcut: "W", icon: <Wallet className="h-4 w-4" /> },
                      { id: "split",  label: "Split",  shortcut: "S", icon: <Split className="h-4 w-4" /> },
                      { id: "mpesa",  label: "M-Pesa", shortcut: "M", icon: <Smartphone className="h-4 w-4" /> },
                      { id: "bank",   label: "Bank",   shortcut: "B", icon: <Building className="h-4 w-4" /> },
                      { id: "card",   label: "Card",   shortcut: "D", icon: <CreditCard className="h-4 w-4" /> },
                      { id: "credit", label: "Credit", shortcut: "R", icon: <UserCheck className="h-4 w-4" />, accent: true },
                    ].map(({ id, label, shortcut, icon, accent }) => {
                      const selected = selectedPaymentMethod === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handlePaymentMethodSelect(id)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                            selected
                              ? accent ? "bg-orange-500 border-orange-500 text-white" : "bg-purple-600 border-purple-600 text-white"
                              : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                          }`}
                        >
                          {icon}{label}
                          <kbd className={`hidden sm:inline-block ml-0.5 px-1 py-0 rounded text-[10px] font-mono leading-4 ${
                            selected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400 border border-gray-200"
                          }`}>{shortcut}</kbd>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cash panel */}
                {selectedPaymentMethod === "cash" && (
                  <div className="space-y-2 bg-gray-50 rounded-xl p-3">
                    <label className="text-xs font-semibold text-gray-600 block">Cash Received</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold pointer-events-none">Ksh</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        className="h-11 rounded-lg text-lg font-bold pl-12 border-gray-200 focus:border-purple-400 bg-white"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      {[
                        Math.ceil(totals.total / 50) * 50,
                        Math.ceil(totals.total / 100) * 100,
                        Math.ceil(totals.total / 500) * 500,
                        Math.ceil(totals.total / 1000) * 1000,
                      ]
                        .filter((v, i, arr) => arr.indexOf(v) === i && v >= totals.total - 0.01)
                        .slice(0, 4)
                        .map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => setCashReceived(String(amount))}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                              parseFloat(cashReceived) === amount
                                ? "border-purple-400 bg-purple-50 text-purple-700"
                                : "border-gray-200 bg-white text-gray-600 hover:border-purple-300"
                            }`}
                          >
                            {amount}
                          </button>
                        ))}
                    </div>
                    <div className={`flex justify-between items-center rounded-lg px-3 py-2 border transition-colors ${
                      parseFloat(cashReceived) >= totals.total ? "bg-purple-50 border-purple-300" : "bg-white border-gray-200"
                    }`}>
                      <span className="text-sm font-semibold text-gray-700">Change Due:</span>
                      <span className={`text-xl font-extrabold ${
                        parseFloat(cashReceived) >= totals.total ? "text-purple-600" : "text-gray-300"
                      }`}>
                        Ksh {Math.max(0, (parseFloat(cashReceived) || 0) - totals.total).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* M-Pesa panel */}
                {selectedPaymentMethod === "mpesa" && (
                  <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">M-Pesa Transaction ID <span className="text-gray-400 font-normal">(optional)</span></span>
                    </div>
                    <Input
                      type="text"
                      placeholder="e.g. RI704H61SX"
                      value={mpesaTransactionId}
                      onChange={(e) => setMpesaTransactionId(e.target.value)}
                      className="h-9 text-sm bg-white"
                    />
                  </div>
                )}

                {/* Bank panel */}
                {selectedPaymentMethod === "bank" && (
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Bank Transaction ID *</span>
                    </div>
                    <Input
                      type="text"
                      placeholder="e.g. TXN123456789"
                      value={bankTransactionId}
                      onChange={(e) => setBankTransactionId(e.target.value)}
                      className="h-9 text-sm bg-white"
                    />
                  </div>
                )}

                {/* Credit panel */}
                {selectedPaymentMethod === "credit" && (
                  <div className="bg-orange-50 p-3 rounded-xl border border-orange-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-800">Credit Sale</span>
                    </div>
                    <select
                      className="w-full h-9 px-3 border border-orange-200 rounded-lg text-sm bg-white focus:border-orange-400 focus:outline-none"
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                    >
                      <option value="">Select a customer…</option>
                      {customers.map((customer: any) => {
                        const customerId = customer._id || customer.id;
                        return (
                          <option key={customerId} value={customerId}>
                            {customer.name}{customer.phone ? ` (${customer.phone})` : ""}
                          </option>
                        );
                      })}
                    </select>
                    <Input
                      type="date"
                      value={creditDueDate}
                      onChange={(e) => setCreditDueDate(e.target.value)}
                      className="h-9 text-sm border-orange-200 bg-white focus:border-orange-400"
                      min={new Date().toISOString().split("T")[0]}
                    />
                    {selectedCustomer && (
                      <div className="bg-white p-2 rounded-lg border border-orange-200 text-xs">
                        <p className="font-semibold text-gray-900">{selectedCustomer.name}</p>
                        <p className="text-gray-500">Outstanding: Ksh {Math.abs(selectedCustomer.totalOutstanding || selectedCustomer.balance || 0).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Split panel */}
                {selectedPaymentMethod === "split" && (
                  <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <Split className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">Split Payment</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: "cash" as const, label: "Cash" },
                        { key: "mpesa" as const, label: "M-Pesa" },
                        { key: "bank" as const, label: "Bank" },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={splitAmounts[key] || ""}
                            onChange={(e) => setSplitAmounts(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                            className="h-9 text-sm bg-white"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-gray-600">Total: Ksh {(splitAmounts.cash + splitAmounts.mpesa + splitAmounts.bank).toFixed(2)}</span>
                      <span className="text-purple-600">Required: Ksh {totals.total.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Custom date/time */}
                {canSetSaleDate && (
                  <div className="bg-purple-50 p-3 rounded-xl border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-800">Custom Date/Time</span>
                      </div>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isCustomDateTime}
                          onChange={(e) => setIsCustomDateTime(e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-xs text-purple-700">Override</span>
                      </label>
                    </div>
                    {isCustomDateTime && (
                      <div className="mt-2 space-y-1">
                        <Input
                          type="datetime-local"
                          value={customDateTime ? new Date(customDateTime).toISOString().slice(0, 16) : ""}
                          onChange={(e) => {
                            if (e.target.value) {
                              setCustomDateTime(new Date(e.target.value).toISOString());
                            } else {
                              setCustomDateTime("");
                            }
                          }}
                          className="h-9 text-sm w-full bg-white"
                        />
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Current: {new Date().toISOString().slice(0, 19)}Z
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3 pt-1">
                  <Button variant="outline" onClick={resetPaymentDialog} className="flex-1 h-11 rounded-xl">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCompletePayment}
                    disabled={!selectedPaymentMethod || createTransactionMutation.isPending ||
                      (selectedPaymentMethod === "credit" && (!selectedCustomerId || !creditDueDate))}
                    className="flex-1 h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                  >
                    {createTransactionMutation.isPending ? "Processing…" :
                      selectedPaymentMethod === "credit" ? "Create Credit Sale" : "Complete Payment"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Categories Drawer */}
      <Sheet open={showCategoriesDrawer} onOpenChange={setShowCategoriesDrawer}>
        <SheetContent side="right" className="w-96">
          <SheetHeader>
            <SheetTitle>Product Categories</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            <div 
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                activeCategory === "all" ? "bg-red-100 border-red-200 text-red-800" : "bg-gray-50 hover:bg-gray-100"
              }`}
              onClick={() => {
                onCategoryChange("all");
                setShowCategoriesDrawer(false);
              }}
            >
              <div className="font-medium">All Categories</div>
              <div className="text-sm text-gray-500">Show all products</div>
            </div>
            {categories.map((category: any) => (
              <div 
                key={category.id || category._id || category.name}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  activeCategory === (category.id || category._id || category.name) 
                    ? "bg-red-100 border-red-200 text-red-800" 
                    : "bg-gray-50 hover:bg-gray-100"
                }`}
                onClick={() => {
                  onCategoryChange(category.id || category._id || category.name);
                  setShowCategoriesDrawer(false);
                }}
              >
                <div className="font-medium">{category.name || category.title}</div>
                {category.description && (
                  <div className="text-sm text-gray-500">{category.description}</div>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Price Change Dialog */}
      <Dialog open={showPriceDialog} onOpenChange={handlePriceDialogClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Price</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedPriceItem && (
              <div className="text-center">
                <p className="text-lg font-semibold">{selectedPriceItem.name}</p>
                <p className="text-sm text-gray-500">Current price: Ksh {selectedPriceItem.price.toFixed(2)}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="newPrice" className="text-sm font-medium">New Price (Ksh)</label>
              <Input
                id="newPrice"
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Enter new price"
                className="text-lg"
                autoFocus
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handlePriceDialogClose}>
              Cancel
            </Button>
            <Button onClick={handlePriceUpdate}>
              Update Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discount Dialog */}
      <Dialog open={showDiscountDialog} onOpenChange={handleDiscountDialogClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Discount</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedDiscountItem && (
              <div className="text-center">
                <p className="text-lg font-semibold">{selectedDiscountItem.name}</p>
                <p className="text-sm text-gray-500">Current price: Ksh {selectedDiscountItem.price.toFixed(2)}</p>
                <p className="text-sm text-gray-500">
                  Max discount: Ksh {(selectedDiscountItem.maxDiscount || 0).toFixed(2)}
                </p>
                {selectedDiscountItem.discount && selectedDiscountItem.discount > 0 && (
                  <p className="text-sm text-green-600">
                    Current discount: Ksh {selectedDiscountItem.discount.toFixed(2)}
                  </p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="discountAmount" className="text-sm font-medium">Discount Amount (Ksh)</label>
              <Input
                id="discountAmount"
                type="number"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="Enter discount amount"
                className="text-lg"
                max={selectedDiscountItem?.maxDiscount || 0}
                min="0"
                step="0.01"
                autoFocus
              />
              <p className="text-xs text-gray-500">
                Maximum allowed: Ksh {(selectedDiscountItem?.maxDiscount || 0).toFixed(2)}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleDiscountDialogClose}>
              Cancel
            </Button>
            <Button onClick={handleDiscountUpdate}>
              Apply Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hold Transaction - Customer Required Dialog */}
      <Dialog open={showHoldCustomerDialog} onOpenChange={(open) => { if (!open) { setShowHoldCustomerDialog(false); setSelectedCustomerId(""); setHoldCustomerSearch(""); setReadyDate(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center space-x-2">
              <UserCheck className="h-5 w-5 text-orange-500" />
              <span>Select Customer for Hold</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              A customer must be selected to place this sale on hold.
            </p>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Customer *</label>
                <button
                  type="button"
                  onClick={() => setShowAddCustomerDialog(true)}
                  className="flex items-center space-x-1 text-xs text-purple-600 hover:text-purple-800 font-medium"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add new customer</span>
                </button>
              </div>

              {/* Search input */}
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or phone..."
                  value={holdCustomerSearch}
                  onChange={(e) => { setHoldCustomerSearch(e.target.value); setSelectedCustomerId(''); }}
                  className="pl-9 text-sm"
                  autoFocus
                />
              </div>

              {/* Selected customer pill */}
              {selectedCustomer && !holdCustomerSearch && (
                <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedCustomer.name}</p>
                    {(selectedCustomer.phone || selectedCustomer.phonenumber) && (
                      <p className="text-xs text-gray-500">{selectedCustomer.phone || selectedCustomer.phonenumber}</p>
                    )}
                  </div>
                  <button type="button" onClick={() => setSelectedCustomerId('')} className="text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Filtered results list */}
              {holdCustomerSearch && (
                <div className="border border-gray-200 rounded-lg max-h-44 overflow-y-auto">
                  {customers
                    .filter((c: any) => {
                      const term = holdCustomerSearch.toLowerCase();
                      return (
                        (c.name || '').toLowerCase().includes(term) ||
                        (c.phone || '').toLowerCase().includes(term) ||
                        (c.phonenumber || '').toLowerCase().includes(term)
                      );
                    })
                    .map((customer: any) => {
                      const customerId = customer._id || customer.id;
                      return (
                        <div
                          key={customerId}
                          onClick={() => { setSelectedCustomerId(customerId); setHoldCustomerSearch(''); }}
                          className="flex items-center justify-between px-3 py-2 hover:bg-purple-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                            {(customer.phone || customer.phonenumber) && (
                              <p className="text-xs text-gray-500">{customer.phone || customer.phonenumber}</p>
                            )}
                          </div>
                          <User className="h-4 w-4 text-gray-300" />
                        </div>
                      );
                    })}
                  {customers.filter((c: any) => {
                    const term = holdCustomerSearch.toLowerCase();
                    return (c.name || '').toLowerCase().includes(term) || (c.phone || '').toLowerCase().includes(term) || (c.phonenumber || '').toLowerCase().includes(term);
                  }).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No customers found</p>
                  )}
                </div>
              )}
            </div>

            {/* Ready Date - Laundry shops only */}
            {isLaundryShop && (
              <div className="mt-3">
                <label className="text-sm font-medium text-gray-700 mb-1 flex items-center space-x-1">
                  <Calendar className="h-3.5 w-3.5 text-gray-500" />
                  <span>Ready Date</span>
                </label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="date"
                    value={readyDate ? readyDate.split('T')[0] : ''}
                    onChange={(e) => {
                      const datePart = e.target.value;
                      const timePart = readyDate ? (readyDate.split('T')[1] || '00:00') : '00:00';
                      setReadyDate(datePart ? `${datePart}T${timePart}` : '');
                    }}
                    className="text-sm flex-1"
                    min={new Date().toISOString().slice(0, 10)}
                  />
                  <Input
                    type="time"
                    value={readyDate ? (readyDate.split('T')[1] || '00:00') : ''}
                    onChange={(e) => {
                      const datePart = readyDate ? readyDate.split('T')[0] : new Date().toISOString().slice(0, 10);
                      setReadyDate(`${datePart}T${e.target.value}`);
                    }}
                    className="text-sm w-28"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowHoldCustomerDialog(false); setSelectedCustomerId(""); setHoldCustomerSearch(""); setReadyDate(""); }}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmHoldWithCustomer}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={!selectedCustomerId || isHoldProcessing}
            >
              {isHoldProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : "Hold Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Hold Ready Date Dialog - shown when customer already selected in laundry shop */}
      <Dialog open={showHoldReadyDateDialog} onOpenChange={(open) => { if (!open) { setShowHoldReadyDateDialog(false); setReadyDate(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <span>Set Ready Date</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              When will this order be ready for pickup?
            </p>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 flex items-center space-x-1">
                <Calendar className="h-3.5 w-3.5 text-gray-500" />
                <span>Ready Date</span>
              </label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="date"
                  value={readyDate ? readyDate.split('T')[0] : ''}
                  onChange={(e) => {
                    const datePart = e.target.value;
                    const timePart = readyDate ? (readyDate.split('T')[1] || '00:00') : '00:00';
                    setReadyDate(datePart ? `${datePart}T${timePart}` : '');
                  }}
                  className="text-sm flex-1"
                  min={new Date().toISOString().slice(0, 10)}
                />
                <Input
                  type="time"
                  value={readyDate ? (readyDate.split('T')[1] || '00:00') : ''}
                  onChange={(e) => {
                    const datePart = readyDate ? readyDate.split('T')[0] : new Date().toISOString().slice(0, 10);
                    setReadyDate(`${datePart}T${e.target.value}`);
                  }}
                  className="text-sm w-28"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowHoldReadyDateDialog(false); setReadyDate(""); }}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setIsHoldProcessing(true);
                await processTransaction(true);
                setIsHoldProcessing(false);
                setShowHoldReadyDateDialog(false);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={isHoldProcessing}
            >
              {isHoldProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : "Hold Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hold Sale Success Dialog */}
      <Dialog open={showHoldSuccessDialog} onOpenChange={(open) => { if (!open) setShowHoldSuccessDialog(false); }}>
        <DialogContent className="max-w-xs text-center">
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="rounded-full bg-green-100 p-4">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Sale On Hold</h2>
              <p className="text-sm text-gray-500 mt-1">The transaction has been saved and placed on hold.</p>
            </div>
            <Button
              className="mt-2 w-full bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => { setShowHoldSuccessDialog(false); setReadyDate(""); setSelectedCustomerId(""); setHoldCustomerSearch(""); }}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add New Customer Dialog */}
      <Dialog open={showAddCustomerDialog} onOpenChange={(open) => { if (!open) { setShowAddCustomerDialog(false); setNewCustomerForm({ name: '', phone: '', email: '', address: '' }); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center space-x-2">
              <User className="h-5 w-5 text-purple-500" />
              <span>Add New Customer</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Name *</label>
              <Input
                placeholder="Customer name"
                value={newCustomerForm.name}
                onChange={(e) => setNewCustomerForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Phone</label>
              <Input
                placeholder="Phone number"
                value={newCustomerForm.phone}
                onChange={(e) => setNewCustomerForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
              <Input
                placeholder="Email address"
                type="email"
                value={newCustomerForm.email}
                onChange={(e) => setNewCustomerForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Address</label>
              <Input
                placeholder="Address"
                value={newCustomerForm.address}
                onChange={(e) => setNewCustomerForm(f => ({ ...f, address: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddCustomerDialog(false); setNewCustomerForm({ name: '', phone: '', email: '', address: '' }); }}>
              Cancel
            </Button>
            <Button
              onClick={() => createCustomerMutation.mutate(newCustomerForm)}
              disabled={!newCustomerForm.name.trim() || createCustomerMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {createCustomerMutation.isPending ? 'Creating...' : 'Create Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Item Dialog */}
      <Dialog open={showCustomItemDialog} onOpenChange={(open) => { setShowCustomItemDialog(open); if (!open) { setCustomItemName(""); setCustomItemPrice(""); setCustomItemType("service"); setCustomItemBuyingPrice(""); setCustomItemQuantity("1"); setShowCustomItemOptions(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="relative">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Item Name</label>
              <Input
                placeholder="Type to search or create new..."
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCustomItem()}
                autoFocus
              />
              {/* Live product suggestions */}
              {customItemName.trim().length >= 1 && (() => {
                const term = customItemName.toLowerCase();
                const suggestions = allProducts
                  .filter((p: any) => p.name?.toLowerCase().includes(term))
                  .slice(0, 6);
                if (suggestions.length === 0) return null;
                return (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {suggestions.map((p: any) => {
                      const isService = p.productType === 'service' || p.virtual;
                      const outOfStock = !isService && (p.quantity ?? 0) <= 0;
                      return (
                        <div
                          key={p._id}
                          className={`flex items-center justify-between px-3 py-2 text-sm border-b border-gray-100 last:border-b-0 ${outOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-purple-50'}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            if (outOfStock) return;
                            onAddToCart(p);
                            setShowCustomItemDialog(false);
                            setCustomItemName("");
                            setCustomItemPrice("");
                            setCustomItemType("service");
                            setCustomItemBuyingPrice("");
                            setCustomItemQuantity("1");
                            setShowCustomItemOptions(false);
                            toast({ title: "Added to cart", description: `"${p.name}" added` });
                          }}
                        >
                          <div>
                            <span className="font-medium text-gray-900">{p.name}</span>
                            {isService && <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-1 rounded">Service</span>}
                            {outOfStock && <span className="ml-2 text-xs text-red-500">Out of stock</span>}
                          </div>
                          <span className="text-purple-600 font-semibold ml-3 shrink-0">
                            Ksh {getPriceForSaleType(p, saleType).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Price (Ksh)</label>
              <Input
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={customItemPrice}
                onChange={(e) => setCustomItemPrice(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCustomItem()}
              />
            </div>

            {/* Options toggle */}
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              onClick={() => setShowCustomItemOptions(v => !v)}
            >
              <span className={`transition-transform ${showCustomItemOptions ? 'rotate-90' : ''}`}>▶</span>
              {showCustomItemOptions ? 'Hide options' : 'More options'}
            </button>

            {showCustomItemOptions && (
              <div className="space-y-3 border-t pt-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Product Type</label>
                  <select
                    className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={customItemType}
                    onChange={(e) => setCustomItemType(e.target.value)}
                  >
                    <option value="service">Service</option>
                    <option value="product">Product</option>
                  </select>
                </div>

                {customItemType === "product" && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Buying Price (Ksh)</label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        value={customItemBuyingPrice}
                        onChange={(e) => setCustomItemBuyingPrice(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Quantity</label>
                      <Input
                        type="number"
                        placeholder="1"
                        min="1"
                        step="1"
                        value={customItemQuantity}
                        onChange={(e) => setCustomItemQuantity(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCustomItemDialog(false); setCustomItemName(""); setCustomItemPrice(""); setCustomItemType("service"); setCustomItemBuyingPrice(""); setCustomItemQuantity("1"); setShowCustomItemOptions(false); }}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateCustomItem}
              disabled={isCreatingCustomItem || !customItemName.trim() || !customItemPrice}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isCreatingCustomItem ? 'Adding...' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

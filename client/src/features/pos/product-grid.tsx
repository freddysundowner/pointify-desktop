import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { MoreVertical, Search, Calculator, Package, Minus, Plus, Trash2, CreditCard, Wallet, Smartphone, Building, Banknote, Split, User, UserPlus, X, Edit3, Calendar, Clock, UserCheck, Grid3X3, Table, PlusCircle, Loader2, CheckCircle2, ArrowLeft, ShoppingCart, SlidersHorizontal, LayoutGrid, RefreshCw, Lock, Utensils } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCartContext } from "@/contexts/CartContext";
import { apiCall, API_ENDPOINTS, isNetworkError, rawApiFetch } from "@/lib/api-config";
import { offlineStorage } from "@/lib/offline-storage";
import { usbPrinter } from "@/lib/usb-printer";
import { tryAgentPrintKitchen } from "@/lib/print-agent";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useProducts } from "@/contexts/ProductsContext";
import { useAttendantAuth } from "@/contexts/AttendantAuthContext";
import { useAuth } from "@/features/auth/useAuth";
import { useSelector } from "react-redux";
import { usePrimaryShop } from "@/hooks/usePrimaryShop";
import type { RootState } from "@/store";
import type { Product, CartItem, Customer, Transaction } from "@shared/schema";
import type { AccompanimentGroup, AccompanimentSelection } from "@/types/accompaniments";
import AccompanimentSelectorDialog from "@/components/ui/accompaniment-selector-dialog";

type MpesaCandidate = {
  mpesaRef: string;
  payerName?: string | null;
  amount?: number | null;
  time?: string | null;
  allocated?: boolean;
};

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
  const { attendant, lockScreen } = useAttendantAuth();
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
  // M-Pesa STK push (SunPay) flow
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [mpesaStkStatus, setMpesaStkStatus] = useState<"idle" | "sending" | "waiting" | "success" | "failed" | "timeout">("idle");
  const [mpesaStkError, setMpesaStkError] = useState<string | null>(null);
  const [mpesaPayerName, setMpesaPayerName] = useState<string | null>(null);
  // Flow B: verify a payment the customer already made directly (Till/paybill, no STK)
  const [mpesaVerifyStatus, setMpesaVerifyStatus] = useState<"idle" | "verified">("idle");
  const [mpesaVerifyAmount, setMpesaVerifyAmount] = useState<number | null>(null);
  // Flow B "already paid" browser lives in its own dialog, toggled by this flag.
  const [mpesaLookupOpen, setMpesaLookupOpen] = useState(false);
  // Flow B: browse recent unallocated Till payments. C2B has no usable phone (it
  // arrives SHA-256 hashed) so the cashier picks from the list by name/amount/time.
  const [mpesaResults, setMpesaResults] = useState<MpesaCandidate[]>([]);
  const [mpesaListLoading, setMpesaListLoading] = useState(false);
  const [mpesaListError, setMpesaListError] = useState<string | null>(null);
  const [mpesaFilter, setMpesaFilter] = useState("");
  const mpesaPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mpesaPollStopAtRef = useRef<number>(0);
  // Increments on every reset/close so in-flight async callbacks bail instead of
  // resurrecting a cancelled flow.
  const mpesaFlowIdRef = useRef<number>(0);
  // Separate race token for the Flow B "browse recent" fetch. Kept distinct from
  // mpesaFlowIdRef so opening/refreshing the browser never cancels in-flight STK
  // polling (which would otherwise strand Flow A at "waiting").
  const mpesaListFlowIdRef = useRef<number>(0);
  const [bankTransactionId, setBankTransactionId] = useState("");
  const [creditDueDate, setCreditDueDate] = useState("");
  useEffect(() => {
    if (selectedPaymentMethod === "credit" && !creditDueDate) {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setCreditDueDate(d.toISOString().split("T")[0]);
    }
  }, [selectedPaymentMethod, creditDueDate]);
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

  // Live connectivity flag — M-Pesa requires the server to confirm payment, so
  // it must be disabled while offline.
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  // If connectivity drops while M-Pesa is the chosen method, clear the selection
  // so the cashier is forced to pick an offline-capable method.
  useEffect(() => {
    if (!isOnline && selectedPaymentMethod === "mpesa") {
      setSelectedPaymentMethod("");
    }
  }, [isOnline, selectedPaymentMethod]);

  const { products: allProducts, isLoading, refreshProducts,hasMore,fetchMoreProducts } = useProducts();
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // Remember the user's last-selected view (Cards/Table) across visits.
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    const saved = localStorage.getItem('pos-view-mode');
    return saved === 'grid' || saved === 'table' ? saved : 'table';
  });

  useEffect(() => {
    localStorage.setItem('pos-view-mode', viewMode);
  }, [viewMode]);
  const [showMobileCart, setShowMobileCart] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches
  );
  const [showProductDrawer, setShowProductDrawer] = useState(false);
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

  // Accompaniment selector — holds the product awaiting accompaniment selection
  const [accompanimentPendingProduct, setAccompanimentPendingProduct] = useState<any>(null);
  const [accompanimentDialogOpen, setAccompanimentDialogOpen] = useState(false);
  const [accompanimentEditCartItemId, setAccompanimentEditCartItemId] = useState<string | number | null>(null);
  const { setCartItems } = useCartContext();

  // Pre-load all accompaniment configs for this shop (restaurant mode only)
  const { data: shopAccompaniments } = useQuery({
    queryKey: ["accompaniment-shop", shopId],
    queryFn: async () => {
      const res = await rawApiFetch(`/api/accompaniment/shop/${shopId}`, {
        auth: "admin-first",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!(shopId && shopData?.isRestaurant),
    staleTime: 0,
    refetchOnMount: "always",
  });

  /** Return accompaniment groups configured for a product, or [] if none. */
  const getProductGroups = (product: any): AccompanimentGroup[] => {
    // Prefer the config populated directly on the product by the backend
    // (product.accompaniment.groups); fall back to the shop-wide lookup for
    // backends that don't populate it yet.
    if (product?.accompaniment?.groups) {
      return product.accompaniment.groups;
    }
    if (!shopAccompaniments?.length) return [];
    const pid = product._id || product.id;
    const config = (shopAccompaniments as any[]).find(
      (c) => c.productId === pid || c.productId?._id === pid
    );
    return config?.groups ?? [];
  };

  /**
   * Gate for adding a product to the cart.
   * In restaurant mode, products with accompaniment groups trigger the
   * selector dialog first; all other products go directly into the cart.
   */
  const handleProductTap = (product: any) => {
    if (!shopData?.isRestaurant) {
      onAddToCart(product);
      return;
    }
    const groups = getProductGroups(product);
    if (groups.length === 0) {
      onAddToCart(product);
      return;
    }
    setAccompanimentPendingProduct(product);
    setAccompanimentDialogOpen(true);
  };

  /** Called when the waiter confirms their accompaniment choices. */
  const handleAccompanimentConfirm = (selections: AccompanimentSelection[]) => {
    if (!accompanimentPendingProduct) return;
    const parts = selections
      .filter((s) => s.chosen.length > 0)
      .map((s) => `${s.groupName}: ${s.chosen.join(", ")}`);
    const note = parts.join(" | ");

    if (accompanimentEditCartItemId !== null) {
      // Editing an existing cart item — update accompaniments in place
      setCartItems((prev) =>
        prev.map((ci) =>
          ci.id === accompanimentEditCartItemId
            ? { ...ci, ...(note ? { accompaniments: note } : { accompaniments: undefined }) } as any
            : ci
        )
      );
      setAccompanimentEditCartItemId(null);
    } else {
      onAddToCart({ ...accompanimentPendingProduct, accompaniments: note || undefined });
    }

    setAccompanimentDialogOpen(false);
    setAccompanimentPendingProduct(null);
  };

  /** Open the accompaniment dialog to edit an existing cart item. */
  const handleAccompanimentEdit = (cartItem: any) => {
    const product = allProducts.find((p: any) => p._id === cartItem.id || p.id === cartItem.id);
    if (!product) return;
    const groups = getProductGroups(product);
    if (!groups.length) return;
    setAccompanimentPendingProduct(product);
    setAccompanimentEditCartItemId(cartItem.id);
    setAccompanimentDialogOpen(true);
  };

  // Local search function
  const searchLocally = (query: string) => {
    const searchTerm = query.trim().toLowerCase();
    return allProducts.filter(product =>
      product.name?.toLowerCase().includes(searchTerm) ||
      product.title?.toLowerCase().includes(searchTerm) ||
      product.description?.toLowerCase().includes(searchTerm) ||
      String(product.barcode || "").toLowerCase() === searchTerm ||
      String(product.barcode || "").toLowerCase().includes(searchTerm)
    );
  };

  // Server-side search function (fallback)
  const searchServer = async (query: string) => {
    try {
      // The upstream list endpoint ANDs `name` and `barcodeid`, so sending the
      // same text in both makes a name search also require a matching barcode —
      // which returns nothing for normal product searches. Send the query as a
      // barcode lookup only when it looks like a scanned code (digits); otherwise
      // search by name (mirrors the inventory page, which only sends `name`).
      const q = query.trim();
      const isBarcodeLike = /^\d{6,}$/.test(q);
      const params = new URLSearchParams({
        page: "1",
        limit: "100",
        name: isBarcodeLike ? "" : q,
        barcodeid: isBarcodeLike ? q : "",
        shop: shopId || "",
        adminid: adminId || "",
        useWarehouse: "true",
        warehouse: "false",
        type: "",
        stockMode: ""
      });

      const response = await apiCall(`/api/v2/products/list?${params.toString()}`, {
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

    // Always query the server so results stay fresh on every search
    const serverResults = await searchServer(query);

    if (serverResults.length > 0) {
      setSearchResults(serverResults);
    } else {
      // Fall back to locally-loaded products if the server returns nothing
      setSearchResults(searchLocally(query));
    }
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
  const isFinalizingRef          = useRef(false);
  const shortcutStateRef = useRef({
    cartItems,
    showPaymentDialog,
    selectedPaymentMethod,
    totals,
    mpesaLookupOpen,
  });

  // Keep shortcut state ref current every render (no extra effect needed)
  shortcutStateRef.current = { cartItems, showPaymentDialog, selectedPaymentMethod, totals, mpesaLookupOpen };

  // ── Keyboard shortcuts (registered once, reads state via refs) ────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      const { cartItems, showPaymentDialog, selectedPaymentMethod, totals, mpesaLookupOpen } = shortcutStateRef.current;
      const meta = e.metaKey || e.ctrlKey;

      // F2 or Cmd/Ctrl+P → open payment dialog
      if (e.key === "F2" || (meta && e.key === "p")) {
        e.preventDefault();
        if (cartItems.length > 0 && !showPaymentDialog) openPaymentDialog();
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

      // Escape → close payment dialog (but not when the M-Pesa lookup dialog is
      // open on top — let Radix close that one first without tearing down the sale)
      if (e.key === "Escape" && showPaymentDialog) {
        if (mpesaLookupOpen) return;
        resetPaymentDialogRef.current?.();
        return;
      }

      // When payment dialog is open (and the lookup dialog isn't capturing input):
      if (showPaymentDialog && !mpesaLookupOpen) {
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
            // M-Pesa requires connectivity — ignore the shortcut while offline.
            if (method === "mpesa" && !navigator.onLine) return;
            setSelectedPaymentMethod(method);
            return;
          }
        }

        // 1/2/3/4 → select cash preset
        if (selectedPaymentMethod === "cash" && ["1","2","3","4"].includes(e.key) && !inInput) {
          e.preventDefault();
          const presets = [
            Math.ceil(grandTotal / 50) * 50,
            Math.ceil(grandTotal / 100) * 100,
            Math.ceil(grandTotal / 500) * 500,
            Math.ceil(grandTotal / 1000) * 1000,
          ].filter((v, i, arr) => arr.indexOf(v) === i && v >= grandTotal - 0.01).slice(0, 4);
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

  // Add an item to the cart, respecting stock/service rules, then clear the box.
  const addScannedItem = (item: any) => {
    const isService = item?.productType === 'service' || item?.virtual === true;
    const isOutOfStock = !isService && (item.quantity ?? 0) === 0;
    if (isOutOfStock) {
      toast({
        title: "Out of stock",
        description: `${item?.name || 'This item'} is out of stock`,
        variant: "destructive",
      });
      return;
    }
    onAddToCart(item);
    onSearchChange('');
    setDropdownHighlight(-1);
  };

  // Handle the Enter a USB barcode scanner sends after "typing" the code.
  // A scanner does not move the dropdown highlight, so resolve the product by
  // its exact barcode (then fall back to a single search result).
  const handleScanEnter = async (rawQuery: string, dropdownItems: any[]) => {
    const code = (rawQuery || "").trim();
    if (!code) return;

    const matchesBarcode = (p: any) => String(p?.barcode || "").trim() === code;

    // 1) Exact barcode match in the current search results
    let match = dropdownItems.find(matchesBarcode);
    // 2) Exact barcode match anywhere in the loaded catalogue
    if (!match) match = allProducts.find(matchesBarcode);
    // 3) Offline barcode index (covers items not currently loaded / offline use)
    if (!match) {
      try { match = await offlineStorage.getProductByBarcode(code); } catch { /* ignore */ }
    }
    // 4) No barcode match, but a single search result -> use it (typed-name
    //    convenience only). Never do this for barcode-like input: a scanned
    //    code that didn't match exactly must NOT silently add an unrelated item.
    const isBarcodeLike = /^\d{6,}$/.test(code);
    if (!match && !isBarcodeLike && dropdownItems.length === 1) match = dropdownItems[0];

    if (!match) {
      toast({
        title: "No match found",
        description: `No product found for "${code}"`,
        variant: "destructive",
      });
      return;
    }

    addScannedItem(match);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, dropdownItems: any[]) => {
    // Enter is handled first (before the empty-list guard) because a scanner's
    // Enter can arrive before async search results have loaded.
    if (e.key === "Enter") {
      e.preventDefault();
      if (dropdownHighlight >= 0) {
        const item = dropdownItems[dropdownHighlight];
        if (item) addScannedItem(item);
        return;
      }
      // Read the live input value (not the propagated state, which can lag
      // behind a fast scanner's key stream) as the source of truth.
      const liveValue = e.currentTarget.value;
      void handleScanEnter(liveValue, dropdownItems);
      return;
    }

    if (e.key === "Escape") {
      onSearchChange('');
      setDropdownHighlight(-1);
      return;
    }

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

  // Sort helper: out-of-stock products go to the end
  const sortInStock = (list: any[]) =>
    [...list].sort((a, b) => {
      const aOut = (a.quantity ?? 0) <= 0 ? 1 : 0;
      const bOut = (b.quantity ?? 0) <= 0 ? 1 : 0;
      return aOut - bOut;
    });

  // When a category is selected, fetch that category's products from the
  // server (the locally-loaded pages may not contain all of them).
  const { data: categoryProductsData, isLoading: categoryProductsLoading } = useQuery({
    queryKey: ["pos-products-by-category", shopId, adminId, activeCategory],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "200",
        name: "",
        shop: shopId || "",
        adminid: adminId || "",
        categoryId: activeCategory,
        useWarehouse: "true",
        warehouse: "false",
        type: "",
        stockMode: "",
      });
      const response = await apiCall(`/api/v2/products/list?${params.toString()}`, {
        method: "GET",
      });
      const data = await response.json();
      if (Array.isArray(data)) return data;
      return data?.data || data?.products || [];
    },
    enabled: !!shopId && activeCategory !== "all",
    staleTime: 60 * 1000,
  });

  // Filter products based on category and search query
  const products = useMemo(() => {
    // If user is searching, use search results instead of local filtering
    if (searchQuery && searchResults.length > 0) {
      let results = searchResults;
      if (activeCategory !== "all") {
        // activeCategory holds the category ID — match on productCategoryId
        // (string or populated object), with the legacy name field as fallback.
        results = results.filter((product: any) => {
          const catId =
            typeof product.productCategoryId === "string"
              ? product.productCategoryId
              : product.productCategoryId?._id;
          return (
            catId === activeCategory ||
            product.category?.toLowerCase() === activeCategory.toLowerCase()
          );
        });
      }
      return sortInStock(results);
    }

    // If user is searching but no results yet, show loading or empty state
    if (searchQuery && isSearching) {
      return [];
    }

    // If search query exists but no results and not searching, no matches found
    if (searchQuery && !isSearching && searchResults.length === 0) {
      return [];
    }

    // Category selected: prefer the server-fetched list for that category
    if (activeCategory !== "all") {
      if (Array.isArray(categoryProductsData)) {
        return sortInStock(categoryProductsData);
      }
      // While the category fetch is loading, fall back to filtering the
      // locally-loaded products so the grid doesn't flash empty.
      const local = allProducts.filter((product: any) => {
        const catId =
          typeof product.productCategoryId === "string"
            ? product.productCategoryId
            : product.productCategoryId?._id;
        return (
          catId === activeCategory ||
          product.category?.toLowerCase() === activeCategory.toLowerCase()
        );
      });
      return sortInStock(local);
    }

    return sortInStock(allProducts);
  }, [allProducts, activeCategory, searchQuery, searchResults, isSearching, categoryProductsData]);

  const { data: customersResponse, isLoading: customersLoading } = useQuery({
    queryKey: ["customers", adminId, shopId],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          adminid: adminId || "",
          shopId: shopId || ""
        });
        const response = await apiCall(`/api/customers?${params.toString()}`, {
          method: "GET",
        });
        const data = await response.json();

        // Cache customers (with balances) for offline use.
        const list: any[] = Array.isArray(data) ? data : data?.customers || data?.data || [];
        if (list.length > 0) {
          offlineStorage.saveCustomers(list).catch(console.error);
        }
        return data;
      } catch (err) {
        // Offline fallback: serve the last-cached customer list + balances.
        console.warn('Customer fetch failed, using offline cache:', err);
        const cached = await offlineStorage.getCustomers().catch(() => []);
        if (cached.length > 0) return cached;
        throw err;
      }
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
        admin: adminId || "",
        shop: shopId || ""
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

      // apiCall throws on a non-2xx status, but the server proxy's graceful
      // fallback can still answer with HTTP 200 and a body that is NOT a created
      // sale (an empty array, or { success:false }) when the upstream actually
      // rejected the write. In that case the sale did NOT go through, so we must
      // surface it as an error instead of letting onSuccess pop the receipt as if
      // the item had been sold.
      const saleCreated =
        data && !Array.isArray(data) && data.success !== false && !!data.sale;
      if (!saleCreated) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Sale could not be completed. Please try again.",
        );
      }

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

      // Restaurant mode: a held order is the "send to kitchen" action. Print
      // the kitchen ticket (items/qty only, no prices) instead of a receipt.
      if (isHoldTransaction && shopData?.isRestaurant) {
        printKitchenOrder(response.sale?.receiptNo || response.sale?._id || "");
      }

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
          ...(variables.extraCharges ? { extraCharges: variables.extraCharges } : {}),
          ...(variables.salesnote ? { salesnote: variables.salesnote } : {}),
          ...(variables.mpesaTransId ? { mpesaTransId: variables.mpesaTransId } : {}),
          ...(variables.mpesaTotal ? { mpesaTotal: variables.mpesaTotal } : {}),
        };
        
        onCheckout(realTransaction);
      }
      
      setShowPaymentDialog(false);
      setSelectedPaymentMethod("");
      setMpesaTransactionId("");
      setBankTransactionId("");
      setExtraChargeAmount(0);
      setExtraChargeInputValue("");
      setShowExtraChargeInput(false);
      onClearCart();
    },
    onError: (error: any, variables: any) => {
      console.error("Transaction error:", error);

      // Use the shared transport-failure detector so a real server rejection
      // (e.g. 400 "insufficient balance") is never misread as offline and
      // silently queued as a completed sale.
      if (isNetworkError(error)) {
        // forceQueue=true: the request failed at the transport layer, which can
        // happen even while navigator.onLine is still true, so the sale MUST be
        // added to the sync queue regardless of the reported online state.
        offlineStorage.saveTransaction({
          ...variables,
          items: cartItems,
          total: grandTotal,
          paymentMethod: selectedPaymentMethod,
          shopId,
          adminId,
          savedOfflineAt: new Date().toISOString(),
        }, true).catch(console.error);

        toast({
          title: "Sale Saved Offline",
          description: "No internet connection. This sale is queued and will sync automatically when you're back online.",
        });

        setShowPaymentDialog(false);
        setSelectedPaymentMethod("");
        setExtraChargeAmount(0);
        setExtraChargeInputValue("");
        setShowExtraChargeInput(false);
        onClearCart();
        return;
      }
      
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

    const resolvedAttendantId = attendant?._id
      ? attendant._id
      : (typeof admin?.attendantId === 'object' && admin?.attendantId
          ? (admin.attendantId as any)._id
          : admin?.attendantId) || admin?._id;

    const buyingPrice = customItemType === "product" ? parseFloat(customItemBuyingPrice || "0") : 0;
    const quantity = customItemType === "product" ? parseInt(customItemQuantity || "1") : 0;

    const payload = {
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
    };

    const resetCustomItemForm = () => {
      setShowCustomItemDialog(false);
      setCustomItemName("");
      setCustomItemPrice("");
      setCustomItemType("service");
      setCustomItemBuyingPrice("");
      setCustomItemQuantity("1");
      setShowCustomItemOptions(false);
    };

    // Offline: create the item locally with a placeholder id, queue it, and add
    // it to the cart. On reconnect the sync engine creates it on the server first
    // and remaps the sale line to the real product id.
    const saveCustomItemOffline = () => {
      const tempId = `temp_prod_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const product = {
        _id: tempId,
        tempId,
        ...payload,
        quantity: customItemType === "product" ? quantity : 1,
        virtual: customItemType !== "product",
        createdOffline: true,
      };
      offlineStorage.saveProducts([product]).catch(console.error);
      offlineStorage.addToSyncQueue("product", { ...payload, tempId }).catch(console.error);
      onAddToCart(product);
      resetCustomItemForm();
      toast({
        title: "Custom item added (offline)",
        description: `"${product.name}" added to cart and will sync when you're back online.`,
      });
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      saveCustomItemOffline();
      setIsCreatingCustomItem(false);
      return;
    }

    try {
      const response = await apiCall("/api/product", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const product = await response.json();
      onAddToCart(product);
      resetCustomItemForm();
      toast({ title: "Custom item added", description: `"${product.name}" added to cart` });
    } catch (err: any) {
      if (isNetworkError(err)) {
        saveCustomItemOffline();
      } else {
        toast({ title: "Failed to add item", description: err.message || "Could not create custom item", variant: "destructive" });
      }
    } finally {
      setIsCreatingCustomItem(false);
    }
  };

  const grandTotal = totals.total + extraChargeAmount;
  // STK push is only possible once the shop is linked to a SunPay merchant.
  const mpesaLinked = Boolean(shopData?.sunpay_merchant_ref);
  // Shop-level setting: when true (default), every M-Pesa code must be validated
  // (STK confirmed or verified) before a sale can complete. When the shop turns it
  // off, codes are treated as reference-only — saved on the sale but not validated
  // or consumed from the payment pool. Defaults to true unless explicitly false.
  const mpesaRequireValidation = shopData?.mpesa_require_validation !== false;
  // Validation gating only applies to linked shops that require validation.
  const mpesaValidationEnforced = mpesaLinked && mpesaRequireValidation;
  // Flow B: a verified Till payment below the sale total must not be accepted as paid.
  const mpesaUnderpaid =
    mpesaVerifyStatus === "verified" &&
    mpesaVerifyAmount != null &&
    mpesaVerifyAmount < grandTotal - 0.01;

  // Client-side narrowing of the browsed Till payments by payer name or M-Pesa code.
  const filteredMpesaResults = useMemo(() => {
    const q = mpesaFilter.trim().toLowerCase();
    if (!q) return mpesaResults;
    return mpesaResults.filter(
      (c) =>
        (c.payerName || "").toLowerCase().includes(q) ||
        (c.mpesaRef || "").toLowerCase().includes(q),
    );
  }, [mpesaResults, mpesaFilter]);

  const processTransaction = async (isHold = false) => {
    // Re-entrancy guard: auto-finalize (poll) + manual click/Enter must not double-submit
    if (isFinalizingRef.current) return;
    // For hold transactions, skip payment method validations
    if (!isHold) {
      if (!selectedPaymentMethod) return;

      // Hard offline block: M-Pesa needs the server to confirm payment, so it can
      // never be finalized offline — even if it was selected while still online.
      if (selectedPaymentMethod === "mpesa" && !navigator.onLine) {
        toast({
          title: "M-Pesa Unavailable Offline",
          description: "You're offline. Choose Cash, Wallet, Credit or Bank to complete this sale — it will sync when you reconnect.",
          variant: "destructive",
        });
        return;
      }

      // M-Pesa (linked shop): never save an unpaid sale. Require STK confirmation
      // or a manually entered code. Enforced here so the Enter-key shortcut and
      // auto-finalize path can't bypass the disabled-button gate.
      if (selectedPaymentMethod === "mpesa" && mpesaValidationEnforced &&
          mpesaStkStatus !== "success" && mpesaVerifyStatus !== "verified") {
        toast({
          title: "Payment Not Confirmed",
          description: "Wait for the STK payment to confirm, or verify the M-Pesa code the customer already paid.",
          variant: "destructive",
        });
        return;
      }

      // M-Pesa (linked shop): block an underpaid Till payment from finalizing.
      if (selectedPaymentMethod === "mpesa" && mpesaValidationEnforced && mpesaUnderpaid) {
        toast({
          title: "Payment Too Low",
          description: `Verified payment (Ksh ${mpesaVerifyAmount!.toFixed(2)}) is less than the sale total (Ksh ${grandTotal.toFixed(2)}).`,
          variant: "destructive",
        });
        return;
      }

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
          createdAt: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
          salesnote: (item as any).accompaniments || '',  // accompaniment choices per item
        };
      }),
      shopId: shopId || "",
      attendantId: attendantId,
      saleType: saleType,
      // Stable client-generated idempotency key. The same payload is what gets
      // POSTed online and, on a network failure, queued and replayed by the sync
      // engine — so this key stays constant across retries. If the upstream
      // honours it, a sale committed before the response was lost won't be
      // duplicated when the queued copy is replayed.
      clientRef:
        (typeof crypto !== "undefined" && "randomUUID" in crypto)
          ? crypto.randomUUID()
          : `${shopId || "shop"}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      createdAt: (!isHold && isCustomDateTime && customDateTime) ? customDateTime : new Date().toISOString(),
      status: isHold ? "hold" : "cashed",
      totaltax: parseFloat(totals.tax.toString()),
      orderId: orderId,
      duedate: selectedPaymentMethod === "credit" ? creditDueDate : null,
      batchTrack: shouldTrackBatches,
      allownegativeselling: false,
      mpesaTransId: !isHold && selectedPaymentMethod === "mpesa" ? mpesaTransactionId : 
                   !isHold && selectedPaymentMethod === "split" && splitAmounts.mpesa > 0 ? `SPLIT_${Date.now()}` : "",
      // Shop-level intent flag, always sent: tells the upstream sale-commit whether
      // to validate/consume the M-Pesa code (true) or store it as a reference (false).
      // True only when the shop is SunPay-linked AND the setting is on — an unlinked
      // shop has no payment pool to validate against, so it sends false (reference).
      // NOTE: this is only a hint. The upstream createSale must re-derive this from
      // the persisted shop record (it must NOT trust this client field).
      mpesaValidate: mpesaValidationEnforced,
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
      extraCharges: extraChargeAmount > 0 ? [{ name: extraChargeLabel, amount: extraChargeAmount }] : [],
      extraChargesTotal: extraChargeAmount,
      salesnote: extraChargeAmount > 0 ? extraChargeLabel : "",
    };

    try {
      isFinalizingRef.current = true;
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
      // The mutation's onError already shows the right toast (a parsed
      // "Payment Failed" for a real rejection, or "Sale Saved Offline" when the
      // request failed at the transport layer and was queued). mutateAsync still
      // rejects after onError runs, so we only swallow/log here — showing another
      // toast would double up (and, offline, contradict the "Saved Offline" one).
      console.error(`${isHold ? 'Hold' : 'Payment'} transaction failed:`, error);
    } finally {
      isFinalizingRef.current = false;
    }
  };

  const handleCompletePayment = () => {
    processTransaction(false);
  };
  handleCompletePaymentRef.current = handleCompletePayment;

  const [mainCustomerSearch, setMainCustomerSearch] = useState('');
  const [showMainCustomerDropdown, setShowMainCustomerDropdown] = useState(false);
  const [showHoldCustomerDialog, setShowHoldCustomerDialog] = useState(false);
  const [showHoldAskCustomerDialog, setShowHoldAskCustomerDialog] = useState(false);
  const [holdCustomerSearch, setHoldCustomerSearch] = useState('');
  const [isHoldProcessing, setIsHoldProcessing] = useState(false);
  const [showHoldSuccessDialog, setShowHoldSuccessDialog] = useState(false);
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', email: '', address: '' });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: typeof newCustomerForm) => {
      const payload = {
        name: data.name.trim(),
        phonenumber: data.phone,
        email: data.email,
        address: data.address,
        wallet: 0,
        shopId: shopId,
        adminid: adminId,
      };

      // Offline: store the customer locally with a placeholder id and queue it so
      // it's created on the server (before any sale that references it) on
      // reconnect. The sale's customerId is remapped to the real id during sync.
      const saveOffline = async () => {
        const tempId = `temp_cust_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const tempCustomer = { _id: tempId, tempId, ...payload, phone: data.phone, createdOffline: true };
        await offlineStorage.saveCustomers([tempCustomer]);
        await offlineStorage.addToSyncQueue('customer', { ...payload, tempId });
        return { ...tempCustomer, _offline: true };
      };

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return await saveOffline();
      }
      try {
        const response = await apiCall('/api/customers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return response.json();
      } catch (err) {
        if (isNetworkError(err)) return await saveOffline();
        throw err;
      }
    },
    onSuccess: (createdCustomer: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      const newId = createdCustomer._id || createdCustomer.id || createdCustomer?.customer?._id;
      if (newId) setSelectedCustomerId(newId);
      setNewCustomerForm({ name: '', phone: '', email: '', address: '' });
      setShowAddCustomerDialog(false);
      toast({
        title: createdCustomer?._offline ? 'Customer saved offline' : 'Customer created',
        description: createdCustomer?._offline
          ? `${variables.name} will sync when you're back online.`
          : `${variables.name} was added successfully.`,
      });
    },
    onError: () => {
      toast({ title: 'Failed to create customer', variant: 'destructive' });
    },
  });

  // Restaurant mode: print the kitchen order ticket for the current cart.
  // Items/quantities only — no prices, this goes to the kitchen not the customer.
  const printKitchenOrder = async (orderNumber: string) => {
    const attendantName = attendant?.username || admin?.username || 'Staff';
    const ticket = {
      shopName: shopData?.name || 'Kitchen',
      orderNumber: String(orderNumber || Date.now()),
      date: new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      }),
      customerName: selectedCustomer?.name,
      attendant: attendantName,
      note: extraChargeAmount > 0 ? extraChargeLabel : undefined,
      items: cartItems.map(item => ({ name: item.name, quantity: item.quantity, note: (item as any).accompaniments || '' })),
    };

    try {
      const statusRes = await rawApiFetch('/api/printer/status', { auth: 'none' });
      const status = statusRes.ok ? await statusRes.json() : null;
      if (!status?.initialized) return;

      // Network (TCP) kitchen printer: print through the local print agent.
      // Falls through to browser print if the agent isn't running.
      if (status?.config?.type === 'TCP') {
        try {
          const handled = await tryAgentPrintKitchen(status.config, ticket);
          if (handled) {
            toast({ title: "Order Sent to Kitchen", description: `Order #${ticket.orderNumber} printed.` });
            return;
          }
        } catch (agentErr: any) {
          toast({ title: "Kitchen Print Failed", description: agentErr?.message || "Could not reach the kitchen printer. Opening browser print instead.", variant: "destructive" });
        }
      }

      if (status?.config?.type === 'WEBUSB') {
        if (!usbPrinter.isConnected()) await usbPrinter.reconnect();
        if (!usbPrinter.isConnected()) {
          toast({ title: "Kitchen Printer Not Connected", description: "Connect the USB kitchen printer to print orders.", variant: "destructive" });
          return;
        }
        try {
          await usbPrinter.printKitchenTicket(ticket);
          toast({ title: "Order Sent to Kitchen", description: `Order #${ticket.orderNumber} printed.` });
        } catch (usbErr: any) {
          toast({ title: "Kitchen Print Failed", description: usbErr.message, variant: "destructive" });
        }
        return;
      }

      // BROWSER (or any other configured type without a dedicated kitchen
      // route): fall back to a plain browser print of the ticket.
      const html = `<!DOCTYPE html><html><head><title>Kitchen Order</title>
<style>
  body{font-family:monospace;font-size:14px;width:280px;margin:0 auto;padding:8px}
  .center{text-align:center}
  .bold{font-weight:bold}
  hr{border:none;border-top:1px dashed #000}
  .item{font-size:18px;font-weight:bold;margin:6px 0}
</style></head><body>
<div class="center bold" style="font-size:18px">KITCHEN ORDER</div>
<div class="center">${ticket.shopName}</div>
<hr/>
<div class="bold" style="font-size:18px">Order #: ${ticket.orderNumber}</div>
<div>Time: ${ticket.date}</div>
${ticket.customerName ? `<div>Customer: ${ticket.customerName}</div>` : ''}
<div>Waiter: ${ticket.attendant}</div>
<hr/>
${ticket.items.map(i => `<div class="item">${i.quantity}x ${i.name}${i.note ? `<div style="font-size:13px;font-weight:normal;padding-left:10px;color:#555;margin-top:2px">${i.note}</div>` : ''}</div>`).join('')}
${ticket.note ? `<hr/><div>Note: ${ticket.note}</div>` : ''}
</body></html>`;
      const w = window.open('', '_blank', 'width=400,height=600');
      if (!w) return;
      w.document.write(html);
      w.document.close();
      setTimeout(() => { w.focus(); w.print(); }, 400);
    } catch (err) {
      console.error('Kitchen ticket print failed:', err);
    }
  };

  const handleHoldTransaction = async () => {
    if (cartItems.length === 0) return;
    if (!selectedCustomerId) {
      setShowHoldAskCustomerDialog(true);
      return;
    }
    await processTransaction(true);
  };

  // User answered "No" to attaching a customer - proceed without one.
  const handleHoldWithoutCustomer = async () => {
    setShowHoldAskCustomerDialog(false);
    setIsHoldProcessing(true);
    await processTransaction(true);
    setIsHoldProcessing(false);
  };

  // User answered "Yes" - open the existing customer selection dialog.
  const handleHoldWithCustomerChoice = () => {
    setShowHoldAskCustomerDialog(false);
    setShowHoldCustomerDialog(true);
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

  // ---------- M-Pesa STK push (SunPay) helpers ----------
  const normalizeKePhone = (raw: string) => {
    const d = (raw || "").replace(/\D/g, "");
    if (d.startsWith("254")) return d;
    if (d.startsWith("0")) return "254" + d.slice(1);
    if (d.startsWith("7") || d.startsWith("1")) return "254" + d;
    return d;
  };

  const stopMpesaPolling = () => {
    if (mpesaPollRef.current) {
      clearInterval(mpesaPollRef.current);
      mpesaPollRef.current = null;
    }
  };

  const resetMpesaStk = () => {
    stopMpesaPolling();
    mpesaFlowIdRef.current += 1; // invalidate any in-flight async callbacks
    setMpesaPhone("");
    setMpesaStkStatus("idle");
    setMpesaStkError(null);
    setMpesaPayerName(null);
    setMpesaVerifyStatus("idle");
    setMpesaVerifyAmount(null);
    setMpesaLookupOpen(false);
    setMpesaResults([]);
    setMpesaListLoading(false);
    setMpesaListError(null);
    setMpesaFilter("");
  };

  // Flow B: customer paid the Till directly (no STK). The cashier rings up items, then
  // browses recent unallocated payments, eyeballs the match by name/amount/time, and
  // selects it to reconcile against the sale total before finalizing.
  const formatMpesaTime = (raw: string) => {
    // Accept ISO strings and Safaricom's "YYYYMMDDHHmmss" transaction-time format.
    let d = new Date(raw);
    if (isNaN(d.getTime()) && /^\d{14}$/.test(raw)) {
      const s = raw;
      d = new Date(
        `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}`,
      );
    }
    return isNaN(d.getTime())
      ? raw
      : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  // The upstream proxy may answer a lookup as a single object or a list; normalise
  // both shapes (and common field aliases) into one candidate array.
  const normalizeLookupResults = (data: any): MpesaCandidate[] => {
    if (!data) return [];
    const raw = Array.isArray(data)
      ? data
      : Array.isArray(data.payments)
      ? data.payments
      : Array.isArray(data.results)
      ? data.results
      : data.found || data.status === "paid" || data.mpesaRef || data.code
      ? [data]
      : [];
    return raw
      .map((p: any) => {
        const amount = typeof p.amount === "number" ? p.amount : p.amount != null ? parseFloat(p.amount) : null;
        return {
          mpesaRef: (p.mpesaRef || p.code || p.transID || "").toString().toUpperCase(),
          payerName: p.payerName ?? p.name ?? null,
          amount: amount != null && !isNaN(amount) ? amount : null,
          time: p.time || p.createdAt || p.transTime || null,
          allocated: Boolean(p.allocated),
        } as MpesaCandidate;
      })
      .filter((p: MpesaCandidate) => p.mpesaRef);
  };

  const selectMpesaPayment = (c: MpesaCandidate) => {
    setMpesaTransactionId(c.mpesaRef);
    setMpesaPayerName(c.payerName || null);
    setMpesaVerifyAmount(typeof c.amount === "number" ? c.amount : null);
    setMpesaVerifyStatus("verified");
    setMpesaResults([]);
    setMpesaLookupOpen(false); // selecting confirms — close the search dialog
  };

  // Open the "already paid" browser and load recent Till payments. Any prior
  // verified match is preserved behind the dialog — "Change" keeps the existing
  // selection until a new one is picked, so dismissing the dialog can't lose it.
  const openMpesaLookup = () => {
    setMpesaFilter("");
    setMpesaListError(null);
    setMpesaLookupOpen(true);
    fetchRecentMpesaPayments();
  };

  // Close the dialog; if nothing was confirmed, discard the in-flight browse.
  const closeMpesaLookup = () => {
    setMpesaLookupOpen(false);
    if (mpesaVerifyStatus !== "verified") cancelMpesaLookup();
  };

  // Invalidate any in-flight lookup and clear Flow B verification state. Called when
  // the dialog is dismissed without a confirmed pick, and on "Change", so a late
  // response can't resurrect a stale match or silently re-enable Complete.
  const cancelMpesaLookup = () => {
    mpesaFlowIdRef.current += 1;
    setMpesaVerifyStatus("idle");
    setMpesaVerifyAmount(null);
    setMpesaResults([]);
    setMpesaListError(null);
    setMpesaFilter("");
  };

  // Load recent unallocated Till payments for this shop. Browsing does NOT touch
  // mpesaVerifyStatus, so a prior verified selection survives behind the dialog.
  const fetchRecentMpesaPayments = async () => {
    // Own race token — must NOT touch mpesaFlowIdRef, or browsing would cancel STK polling.
    mpesaListFlowIdRef.current += 1;
    const listId = mpesaListFlowIdRef.current;
    setMpesaListLoading(true);
    setMpesaListError(null);
    try {
      const params = new URLSearchParams({ shopId: shopId || "", recent: "1" });
      const res = await apiCall(`${API_ENDPOINTS.mpesa.lookup}?${params.toString()}`);
      const data = await res.json();
      if (mpesaListFlowIdRef.current !== listId) return; // superseded
      const usable = normalizeLookupResults(data).filter((c) => !c.allocated);
      setMpesaResults(usable);
      setMpesaListLoading(false);
    } catch (err: any) {
      if (mpesaListFlowIdRef.current !== listId) return;
      setMpesaListLoading(false);
      setMpesaListError(err?.message || "Couldn't load recent payments. Tap refresh to retry.");
    }
  };

  // Serialized polling: each tick is scheduled only after the previous one
  // resolves, so overlapping /mpesa/status requests can never stack up.
  const startMpesaPolling = (txnId: string, timeoutMs: number, flowId: number) => {
    stopMpesaPolling();
    mpesaPollStopAtRef.current = Date.now() + timeoutMs;
    const tick = async () => {
      if (mpesaFlowIdRef.current !== flowId) return;
      if (Date.now() > mpesaPollStopAtRef.current) {
        if (mpesaFlowIdRef.current === flowId) setMpesaStkStatus("timeout");
        return;
      }
      try {
        const res = await apiCall(API_ENDPOINTS.mpesa.status(txnId));
        const data = await res.json();
        if (mpesaFlowIdRef.current !== flowId) return; // flow was reset/cancelled
        if (data.status === "paid" || data.status === "completed" || data.status === "success") {
          setMpesaTransactionId(data.mpesaRef || data.settlementRef || txnId);
          setMpesaPayerName(data.payerName || null);
          setMpesaStkStatus("success");
          // Payment confirmed — auto-finalize the sale and show the receipt.
          setTimeout(() => {
            if (mpesaFlowIdRef.current === flowId) handleCompletePaymentRef.current?.();
          }, 700);
          return;
        }
        if (data.status === "failed" || data.status === "cancelled") {
          setMpesaStkError(data.resultDesc || "Payment was cancelled or failed");
          setMpesaStkStatus("failed");
          return;
        }
      } catch (err: any) {
        // transient errors during polling — keep trying until timeout
        console.warn("M-Pesa poll error:", err?.message);
      }
      if (mpesaFlowIdRef.current !== flowId) return;
      mpesaPollRef.current = setTimeout(tick, 3000);
    };
    mpesaPollRef.current = setTimeout(tick, 3000);
  };

  const stkPushMutation = useMutation({
    mutationFn: async (flowId: number) => {
      const phone = normalizeKePhone(mpesaPhone);
      if (!phone || phone.length < 12) throw new Error("Enter a valid phone number");
      const res = await apiCall(API_ENDPOINTS.mpesa.stkPush, {
        method: "POST",
        body: JSON.stringify({
          shopId: shopId || "",
          phone,
          amount: grandTotal,
          saleRef: `sale-${Date.now()}`,
        }),
      });
      const data = await res.json();
      return { data, flowId };
    },
    onSuccess: ({ data, flowId }) => {
      if (mpesaFlowIdRef.current !== flowId) return;
      if (!data?.transactionId) {
        setMpesaStkStatus("failed");
        setMpesaStkError(data?.message || "Proxy returned no transaction id");
        return;
      }
      setMpesaStkStatus("waiting");
      startMpesaPolling(data.transactionId, 90_000, flowId);
    },
    onError: (err: any, flowId: number) => {
      if (mpesaFlowIdRef.current !== flowId) return; // flow was reset/cancelled
      setMpesaStkStatus("failed");
      setMpesaStkError(err?.message || "Could not send STK push");
    },
  });

  // Start a fresh, cancellable STK flow: invalidate any prior flow, then fire.
  const sendStkPush = () => {
    stopMpesaPolling();
    mpesaFlowIdRef.current += 1;
    const flowId = mpesaFlowIdRef.current;
    setMpesaStkError(null);
    setMpesaPayerName(null);
    setMpesaStkStatus("sending");
    stkPushMutation.mutate(flowId);
  };

  // Prefill phone from selected customer when M-Pesa is chosen; tear down the
  // STK flow (and any polling) whenever the method moves away from M-Pesa.
  useEffect(() => {
    if (selectedPaymentMethod === "mpesa") {
      if (selectedCustomer && !mpesaPhone) {
        const p = selectedCustomer.phonenumber || selectedCustomer.phone;
        if (p) setMpesaPhone(p);
      }
    } else {
      resetMpesaStk();
    }
  }, [selectedPaymentMethod, selectedCustomer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop polling on unmount
  useEffect(() => () => stopMpesaPolling(), []);

  const openPaymentDialog = () => {
    onCategoryChange("all");
    setShowPaymentDialog(true);
  };

  const resetPaymentDialog = () => {
    setShowPaymentDialog(false);
    setSelectedPaymentMethod("");
    setShowCardInterface(false);
    setIsProcessingCard(false);
    setMpesaTransactionId("");
    resetMpesaStk();
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
            onClick={showMobileCart ? onBack : () => setShowMobileCart(true)}
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
                onClick={() => setShowProductDrawer(true)}
                className="bg-white text-purple-700 text-xs font-bold px-3 py-2 rounded-full active:scale-95 transition-transform flex items-center gap-1"
                data-testid="button-header-add-products"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Products
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                {!!shopData?.isRestaurant && (
                  <button
                    onClick={lockScreen}
                    title="Lock screen"
                    className="w-9 h-9 flex items-center justify-center rounded-full transition-colors bg-white/15 active:bg-white/25"
                  >
                    <Lock className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setShowCategoriesDrawer(true)}
                  title="Browse categories"
                  className="relative w-9 h-9 flex items-center justify-center rounded-full transition-colors bg-white/15 active:bg-white/25"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  {activeCategory !== "all" && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-300 border border-purple-700" />
                  )}
                </button>
                <button
                  onClick={() => cartItems.length > 0 && openPaymentDialog()}
                  disabled={cartItems.length === 0}
                  className="bg-white text-purple-700 text-xs font-bold px-4 py-2 rounded-full disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
                >
                  {cartItems.length > 0 ? `Pay · ${cartItems.length}` : 'Pay'}
                </button>
              </div>
            )}
          </div>
        </div>


        {/* Mobile active-category chip */}
        {!showMobileCart && activeCategory !== "all" && (
          <div className="px-3 pb-1.5 flex items-center gap-2">
            <span className="flex items-center gap-1.5 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/30">
              {categories.find((c: any) => (c.id || c._id || c.name) === activeCategory)?.name || activeCategory}
              <button onClick={() => onCategoryChange("all")} className="ml-0.5 opacity-70 hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}

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
                style={{ fontSize: '16px' }}
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
                          handleProductTap(product);
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
              
              <Button
                onClick={() => setShowCategoriesDrawer(true)}
                variant="outline"
                size="sm"
                title="Browse categories"
                className={`h-8 px-3 text-sm whitespace-nowrap max-w-[160px] truncate ${activeCategory !== "all" ? "bg-purple-50 border-purple-400 text-purple-700" : ""}`}
              >
                <SlidersHorizontal className="h-4 w-4 mr-1.5 shrink-0" />
                {activeCategory === "all"
                  ? "Categories"
                  : (categories.find((c: any) => (c.id || c._id || c.name) === activeCategory)?.name || "Category")}
              </Button>
            </div>
          </div>
        </div>

      </div>

      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Left Panel - Transaction Form */}
        <div className={`w-full lg:w-2/3 p-2 lg:p-6 bg-white ${showMobileCart ? 'flex flex-col flex-1 min-h-0 overflow-hidden lg:overflow-visible' : viewMode === 'table' ? 'flex flex-col flex-1 overflow-hidden' : 'hidden lg:block'}`}>
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
                  style={{ fontSize: '16px' }}
                  className="pl-8 h-8 text-xs border-gray-300 bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                            handleProductTap(product);
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
          <div className={`border border-gray-200 rounded-lg overflow-hidden shadow-sm ${viewMode === 'table' ? 'flex-1 flex flex-col mb-0 lg:mb-6' : 'flex-1 min-h-0 flex flex-col lg:flex-none lg:block mb-2 lg:mb-6'}`}>
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
            <div className={`bg-white ${viewMode === 'table' ? 'flex-1 overflow-y-auto' : 'flex-1 min-h-[80px] overflow-y-auto lg:flex-none lg:overflow-visible lg:min-h-[200px]'}`}>
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
                        <div className="lg:hidden px-3 py-2 border-b border-gray-100 bg-white active:bg-gray-50">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-[15px] truncate">{item.name}</p>
                              {(item as any).accompaniments && (
                                <p className="text-xs text-purple-600 leading-snug truncate">{(item as any).accompaniments}</p>
                              )}
                              <p className="text-gray-400 text-xs">
                                Ksh {item.price.toFixed(2)} each
                                {(item.maxDiscount || 0) > 0 && (
                                  <span className="text-green-500 ml-1">−Ksh {(item.discount || 0).toFixed(2)}</span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center bg-gray-100 rounded-lg overflow-hidden shrink-0">
                              <button
                                onClick={() => {
                                  const productData = allProducts.find(p => p._id === item.id || p.id === item.id);
                                  onUpdateQuantity(item.id, Math.max(1, item.quantity - 1), productData);
                                }}
                                className="w-7 h-7 flex items-center justify-center text-purple-600 active:bg-gray-200"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-6 text-center text-[15px] font-bold text-gray-800">{item.quantity}</span>
                              <button
                                onClick={() => {
                                  const productData = allProducts.find(p => p._id === item.id || p.id === item.id);
                                  onUpdateQuantity(item.id, item.quantity + 1, productData);
                                }}
                                className="w-7 h-7 flex items-center justify-center text-purple-600 active:bg-gray-200"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="font-bold text-gray-900 text-[15px] shrink-0 min-w-[72px] whitespace-nowrap text-right tabular-nums">
                              <span className="text-[11px] font-medium text-gray-400 mr-0.5">Ksh</span>
                              {item.total.toFixed(2)}
                            </p>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 active:bg-gray-100 shrink-0"
                                  data-testid={`button-item-menu-${item.id}`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                {canEditPrice && (
                                  <DropdownMenuItem onClick={() => handlePriceChange(item)}>
                                    <Edit3 className="h-4 w-4 mr-2 text-blue-500" />
                                    Change price
                                  </DropdownMenuItem>
                                )}
                                {canDiscount && (item.maxDiscount || 0) > 0 && (
                                  <DropdownMenuItem onClick={() => handleDiscountChange(item)}>
                                    <Banknote className="h-4 w-4 mr-2 text-green-600" />
                                    Add discount
                                  </DropdownMenuItem>
                                )}
                                {shopData?.isRestaurant && getProductGroups(allProducts.find((p: any) => p._id === item.id || p.id === item.id) || {}).length > 0 && (
                                  <DropdownMenuItem onClick={() => handleAccompanimentEdit(item)}>
                                    <Utensils className="h-4 w-4 mr-2 text-purple-500" />
                                    Accompaniments
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => onUpdateQuantity(item.id, 0)} className="text-red-600 focus:text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        {/* Desktop Layout */}
                        <div className="hidden lg:grid grid-cols-6 gap-2 lg:gap-4 px-3 lg:px-6 py-3 border-b border-gray-100 text-sm items-center bg-white hover:bg-purple-50/40 transition-colors group">
                          {/* Column 1: Item Name */}
                          <div className="text-left">
                            <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                            {(item as any).accompaniments && (
                              <p className="text-xs text-purple-600 mt-0.5 leading-snug">{(item as any).accompaniments}</p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {canEditPrice && (
                                <button 
                                  onClick={() => handlePriceChange(item)}
                                  className="text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-full"
                                >
                                  Change price
                                </button>
                              )}
                              {canDiscount && (item.maxDiscount || 0) > 0 && (
                                <button 
                                  onClick={() => handleDiscountChange(item)}
                                  className="text-[11px] font-medium text-green-700 bg-green-50 hover:bg-green-100 px-2 py-0.5 rounded-full"
                                >
                                  Add discount
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {/* Column 2: Unit Price */}
                          <div className="text-right">
                            <p className="font-semibold text-gray-800">Ksh {item.price.toFixed(2)}</p>
                            {(item.maxDiscount || 0) > 0 && (
                              <p className="text-xs text-green-600">-Ksh {(item.discount || 0).toFixed(2)}</p>
                            )}
                          </div>
                          
                          {/* Column 3: Quantity */}
                          <div className="text-center">
                            <div className="inline-flex items-center bg-gray-100 rounded-lg p-0.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const productData = allProducts.find(p => p._id === item.id || p.id === item.id);
                                  onUpdateQuantity(item.id, Math.max(1, item.quantity - 1), productData);
                                }}
                                className="w-7 h-7 p-0 rounded-md text-purple-600 hover:bg-white hover:shadow-sm"
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
                                className="w-12 h-7 p-1 text-center text-sm font-semibold border-0 bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-purple-400 rounded-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                min="1"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const productData = allProducts.find(p => p._id === item.id || p.id === item.id);
                                  onUpdateQuantity(item.id, item.quantity + 1, productData);
                                }}
                                className="w-7 h-7 p-0 rounded-md text-purple-600 hover:bg-white hover:shadow-sm"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Column 4: Tax */}
                          <div className="text-right">
                            <p className="text-gray-500 tabular-nums">Ksh {itemTax.toFixed(2)}</p>
                          </div>
                          
                          {/* Column 5: Subtotal */}
                          <div className="text-right">
                            <p className="font-bold text-gray-900 tabular-nums">Ksh {item.total.toFixed(2)}</p>
                          </div>
                          
                          {/* Column 6: Remove */}
                          <div className="flex items-center justify-center gap-1">
                            {shopData?.isRestaurant && getProductGroups(allProducts.find((p: any) => p._id === item.id || p.id === item.id) || {}).length > 0 && (
                              <Button variant="ghost" size="sm" onClick={() => handleAccompanimentEdit(item)} title="Edit accompaniment" className="w-7 h-7 p-0 rounded-full text-purple-500 hover:text-purple-700 hover:bg-purple-50">
                                <Utensils className="h-3.5 w-3.5" />
                              </Button>
                            )}
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
                  onClick={() => openPaymentDialog()}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 text-sm font-semibold rounded-lg"
                  disabled={cartItems.length === 0}
                >
                  Cash-In
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={onClearCart} variant="outline" className="border-red-400 text-red-600 hover:bg-red-50 py-1.5 text-xs font-semibold rounded-lg" disabled={cartItems.length === 0}>Clear</Button>
                  <Button onClick={handleHoldTransaction} variant="outline" className="border-gray-400 text-gray-700 hover:bg-gray-50 py-1.5 text-xs font-semibold rounded-lg" disabled={cartItems.length === 0}>{shopData?.isRestaurant ? "Print Order" : "Hold"}</Button>
                </div>
              </div>
            </div>
          )}

          {/* Grid Mode - Sticky Payment Summary Section */}
          {viewMode === 'grid' && (
            <div className="shrink-0 sticky bottom-0 bg-white mt-2 lg:mt-6 rounded-t-2xl shadow-lg">
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
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3">
                <Button 
                  onClick={() => openPaymentDialog()}
                  className="bg-purple-600 hover:bg-purple-700 text-white py-2 lg:py-3 text-sm lg:text-base font-semibold rounded-lg"
                  disabled={cartItems.length === 0}
                >
                  Cash-In
                </Button>
                <Button 
                  onClick={onClearCart}
                  variant="outline"
                  className="hidden lg:inline-flex border-red-400 text-red-600 hover:bg-red-50 py-2 lg:py-3 text-sm lg:text-base font-semibold rounded-lg"
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
                  {shopData?.isRestaurant ? "Print Order" : "Hold"}
                </Button>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Right Panel - Products */}
        {viewMode === 'grid' && (
          <div className={`w-full lg:w-1/3 bg-gray-50 p-2 lg:p-6 flex-col flex-1 min-h-0 overflow-y-auto lg:h-full lg:overflow-hidden pb-2 lg:pb-6 ${!showMobileCart ? 'flex' : 'hidden lg:flex'}`}>

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
            
            {/* Desktop active-category chip */}
            {activeCategory !== "all" && (
              <div className="hidden lg:flex items-center gap-2 mb-3">
                <span className="flex items-center gap-1.5 bg-purple-50 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full border border-purple-200">
                  {categories.find((c: any) => (c.id || c._id || c.name) === activeCategory)?.name || activeCategory}
                  <button onClick={() => onCategoryChange("all")} className="ml-0.5 opacity-60 hover:opacity-100">
                    <X className="h-3 w-3" />
                  </button>
                </span>
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
                <div className={`grid grid-cols-2 xl:grid-cols-3 gap-2 lg:gap-3 ${cartItems.length > 0 ? 'pb-28' : 'pb-4'} lg:pb-4`}>
                  {products.map((product: any) => {
                    const price = getPriceForSaleType(product, saleType);
                    const productId = product._id || product.id;
                    const productName = product.name || product.title;
                    const quantity = product.quantity || 0;
                    const reorderLevel = product.reorderLevel || product.lowStockThreshold || 0;
                    const isVirtual = product.virtual || product?.productType == "service";
                    const isOutOfStock = !isVirtual && quantity === 0;
                    const isLowStock = !isVirtual && quantity > 0 && quantity <= reorderLevel;
                    const imageUrl = product.images?.[0] || product.image;
                    
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
                        onClick={() => !isOutOfStock && handleProductTap(product)}
                      >
                        {/* Image area */}
                        <div className="h-20 lg:h-24 bg-gradient-to-br from-purple-50 to-gray-100 flex items-center justify-center overflow-hidden">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={productName}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <Package className="h-7 w-7 lg:h-8 lg:w-8 text-purple-200" />
                          )}
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
                    onClick={() => openPaymentDialog()}
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
                      {shopData?.isRestaurant ? "Print Order" : "Hold"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile bottom bar — full-width "View cart" button once items are
          picked; tapping it opens the cart to preview and proceed to payment.
          Hidden in table mode (layout already shows everything). */}
      {!showMobileCart && cartItems.length > 0 && viewMode !== 'table' && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => setShowMobileCart(true)}
            className="w-full h-12 rounded-xl bg-purple-600 active:bg-purple-700 text-white font-semibold flex items-center justify-between px-4 transition-colors"
            data-testid="button-view-cart"
          >
            <span className="flex items-center gap-2">
              <span className="relative">
                <ShoppingCart className="h-5 w-5" />
              </span>
              <span className="bg-white/20 rounded-full min-w-[22px] h-[22px] px-1.5 inline-flex items-center justify-center text-xs font-bold" data-testid="text-cart-count">
                {cartItems.reduce((n, it) => n + (Number(it.quantity) || 0), 0)}
              </span>
              <span className="text-sm">View cart</span>
            </span>
            <span className="text-base font-bold" data-testid="text-cart-total">
              Ksh {grandTotal.toFixed(0)}
            </span>
          </button>
        </div>
      )}

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

            {/* Total */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2">
              <span className="text-sm font-semibold text-gray-600">Total Amount:</span>
              <span className="text-xl font-extrabold text-purple-600">Ksh {grandTotal.toFixed(2)}</span>
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
                      // M-Pesa needs the server to confirm payment — block it offline.
                      const disabledOffline = id === "mpesa" && !isOnline;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => !disabledOffline && handlePaymentMethodSelect(id)}
                          disabled={disabledOffline}
                          title={disabledOffline ? "M-Pesa is unavailable while offline" : undefined}
                          data-testid={`button-payment-${id}`}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                            disabledOffline
                              ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                              : selected
                              ? accent ? "bg-orange-500 border-orange-500 text-white" : "bg-purple-600 border-purple-600 text-white"
                              : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
                          }`}
                        >
                          {icon}{label}
                        </button>
                      );
                    })}
                  </div>
                  {!isOnline && (
                    <p className="text-xs text-amber-600" data-testid="text-offline-payment-note">
                      You're offline — M-Pesa is unavailable. Cash, wallet, credit and bank sales will sync when you reconnect.
                    </p>
                  )}
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
                        Math.ceil(grandTotal / 50) * 50,
                        Math.ceil(grandTotal / 100) * 100,
                        Math.ceil(grandTotal / 500) * 500,
                        Math.ceil(grandTotal / 1000) * 1000,
                      ]
                        .filter((v, i, arr) => arr.indexOf(v) === i && v >= grandTotal - 0.01)
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
                      parseFloat(cashReceived) >= grandTotal ? "bg-purple-50 border-purple-300" : "bg-white border-gray-200"
                    }`}>
                      <span className="text-sm font-semibold text-gray-700">Change Due:</span>
                      <span className={`text-xl font-extrabold ${
                        parseFloat(cashReceived) >= grandTotal ? "text-purple-600" : "text-gray-300"
                      }`}>
                        Ksh {Math.max(0, (parseFloat(cashReceived) || 0) - grandTotal).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* M-Pesa panel */}
                {selectedPaymentMethod === "mpesa" && (
                  <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 space-y-3">
                    {/* Header with running total */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-800">M-Pesa Payment</span>
                      </div>
                      <span className="text-sm font-bold text-purple-700">Ksh {grandTotal.toFixed(2)}</span>
                    </div>

                    {/* Flow A — STK push to the customer's phone */}
                    {mpesaLinked && mpesaStkStatus !== "success" && mpesaVerifyStatus !== "verified" && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-purple-700">Customer's phone</label>
                        <div className="flex gap-2">
                          <Input
                            type="tel"
                            inputMode="numeric"
                            placeholder="e.g. 0712345678"
                            value={mpesaPhone}
                            onChange={(e) => setMpesaPhone(e.target.value)}
                            disabled={mpesaStkStatus === "sending" || mpesaStkStatus === "waiting"}
                            className="h-9 text-sm bg-white flex-1"
                            data-testid="input-mpesa-phone"
                          />
                          <Button
                            type="button"
                            onClick={sendStkPush}
                            disabled={
                              normalizeKePhone(mpesaPhone).length < 12 ||
                              mpesaStkStatus === "sending" ||
                              mpesaStkStatus === "waiting"
                            }
                            className="h-9 px-3 bg-purple-600 hover:bg-purple-700 text-white text-sm whitespace-nowrap"
                            data-testid="button-send-stk-push"
                          >
                            {mpesaStkStatus === "sending" || mpesaStkStatus === "waiting" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Send STK"
                            )}
                          </Button>
                        </div>

                        {mpesaStkStatus === "waiting" && (
                          <div className="flex items-center gap-2 text-xs text-purple-700" data-testid="status-mpesa-waiting">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Waiting for customer to enter M-Pesa PIN…
                          </div>
                        )}
                        {mpesaStkStatus === "timeout" && (
                          <p className="text-xs text-orange-600" data-testid="status-mpesa-timeout">
                            Timed out waiting for payment. Try again, or use “Customer already paid”.
                          </p>
                        )}
                        {mpesaStkStatus === "failed" && mpesaStkError && (
                          <p className="text-xs text-red-600" data-testid="status-mpesa-failed">{mpesaStkError}</p>
                        )}
                      </div>
                    )}

                    {/* "Already paid" entry point — opens the search dialog */}
                    {mpesaLinked && mpesaStkStatus !== "success" && mpesaVerifyStatus !== "verified" && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={openMpesaLookup}
                        className="w-full h-9 text-sm border-purple-300 text-purple-700 bg-white hover:bg-purple-100"
                        data-testid="button-open-mpesa-lookup"
                      >
                        <Search className="h-4 w-4 mr-1.5" />
                        Customer already paid? Find payment
                      </Button>
                    )}

                    {/* Success (STK push) */}
                    {mpesaStkStatus === "success" && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 space-y-1" data-testid="status-mpesa-success">
                        <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                          <CheckCircle2 className="h-4 w-4" />
                          Payment received
                        </div>
                        {mpesaPayerName && (
                          <p className="text-xs text-green-700">From: {mpesaPayerName}</p>
                        )}
                        {mpesaTransactionId && (
                          <p className="text-xs text-green-700 font-mono">Ref: {mpesaTransactionId}</p>
                        )}
                      </div>
                    )}

                    {/* Confirmed Till payment card (from the search dialog) */}
                    {mpesaLinked && mpesaVerifyStatus === "verified" && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 space-y-1" data-testid="status-mpesa-verified">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                            <CheckCircle2 className="h-4 w-4" />
                            Payment found
                          </div>
                          <button
                            type="button"
                            onClick={openMpesaLookup}
                            className="text-xs text-purple-600 hover:underline"
                            data-testid="button-mpesa-search-again"
                          >
                            Change
                          </button>
                        </div>
                        {mpesaPayerName && (
                          <p className="text-xs text-green-700">From: {mpesaPayerName}</p>
                        )}
                        {mpesaTransactionId && (
                          <p className="text-xs text-green-700 font-mono">Ref: {mpesaTransactionId}</p>
                        )}
                        {mpesaVerifyAmount != null && (
                          <p className="text-xs text-green-700">Paid: Ksh {mpesaVerifyAmount.toFixed(2)}</p>
                        )}
                        {mpesaVerifyAmount != null && mpesaVerifyAmount < grandTotal - 0.01 && (
                          <p className="text-xs text-red-600 font-medium" data-testid="text-mpesa-underpaid">
                            Underpaid: Ksh {mpesaVerifyAmount.toFixed(2)} received, but this sale totals Ksh {grandTotal.toFixed(2)}. Cannot complete.
                          </p>
                        )}
                        {mpesaVerifyAmount != null && mpesaVerifyAmount > grandTotal + 0.01 && (
                          <p className="text-xs text-orange-600 font-medium" data-testid="text-mpesa-overpaid">
                            Overpaid: Ksh {mpesaVerifyAmount.toFixed(2)} received, sale totals Ksh {grandTotal.toFixed(2)}.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Unlinked shop: no verification available, just an optional note */}
                    {!mpesaLinked && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-purple-700">
                          Enter M-Pesa code <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g. RI704H61SX"
                          value={mpesaTransactionId}
                          onChange={(e) => setMpesaTransactionId(e.target.value)}
                          className="h-9 text-sm bg-white"
                          data-testid="input-mpesa-code"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* M-Pesa "Customer already paid" — browse recent Till payments */}
                <Dialog open={mpesaLookupOpen} onOpenChange={(o) => (o ? setMpesaLookupOpen(true) : closeMpesaLookup())}>
                  <DialogContent className="sm:max-w-md" data-testid="dialog-mpesa-lookup">
                    <DialogHeader>
                      <DialogTitle>Recent M-Pesa payments</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      {/* Filter + refresh */}
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Filter by name or code"
                          value={mpesaFilter}
                          onChange={(e) => setMpesaFilter(e.target.value)}
                          autoFocus
                          className="h-10 text-sm flex-1"
                          data-testid="input-mpesa-filter"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={fetchRecentMpesaPayments}
                          disabled={mpesaListLoading}
                          className="h-10 px-3 whitespace-nowrap"
                          data-testid="button-refresh-mpesa"
                        >
                          {mpesaListLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {/* Loading */}
                      {mpesaListLoading && (
                        <div
                          className="flex items-center justify-center gap-2 text-xs text-gray-500 py-6"
                          data-testid="status-mpesa-loading"
                        >
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading recent payments…
                        </div>
                      )}

                      {/* Error */}
                      {!mpesaListLoading && mpesaListError && (
                        <p className="text-xs text-red-600" data-testid="status-mpesa-list-error">{mpesaListError}</p>
                      )}

                      {/* List — cashier taps the customer's payment */}
                      {!mpesaListLoading && !mpesaListError && filteredMpesaResults.length > 0 && (
                        <div className="space-y-1.5 max-h-80 overflow-y-auto" data-testid="list-mpesa-results">
                          {filteredMpesaResults.map((c) => (
                            <button
                              key={c.mpesaRef}
                              type="button"
                              onClick={() => selectMpesaPayment(c)}
                              className="w-full text-left bg-white border border-gray-200 rounded-lg p-2.5 hover:border-purple-400 hover:bg-purple-50 transition-colors"
                              data-testid={`result-mpesa-${c.mpesaRef}`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-gray-800">{c.payerName || "Unknown"}</span>
                                {c.amount != null && (
                                  <span className="text-sm font-bold text-purple-700">Ksh {c.amount.toFixed(2)}</span>
                                )}
                              </div>
                              <div className="flex justify-between items-center mt-0.5">
                                <span className="text-[11px] font-mono text-gray-500">{c.mpesaRef}</span>
                                {c.time && <span className="text-[11px] text-gray-400">{formatMpesaTime(c.time)}</span>}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Nothing returned at all */}
                      {!mpesaListLoading && !mpesaListError && mpesaResults.length === 0 && (
                        <p className="text-xs text-gray-400 py-2" data-testid="status-mpesa-empty">
                          No recent payments yet. Ask the customer to confirm they paid, then tap refresh.
                        </p>
                      )}

                      {/* Filter excluded everything */}
                      {!mpesaListLoading && !mpesaListError && mpesaResults.length > 0 && filteredMpesaResults.length === 0 && (
                        <p className="text-xs text-gray-400 py-2" data-testid="status-mpesa-nofilter">
                          No payment matches “{mpesaFilter.trim()}”.
                        </p>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

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
                            {customer.name}{customer.phonenumber || customer.phone ? ` (${customer.phonenumber || customer.phone})` : ""}
                          </option>
                        );
                      })}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomerDialog(true)}
                      className="w-full flex items-center justify-center gap-2 h-8 rounded-lg border-2 border-dashed border-orange-300 text-orange-500 hover:bg-orange-100 text-xs font-medium transition-colors"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      New customer
                    </button>
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
                      <span className="text-purple-600">Required: Ksh {grandTotal.toFixed(2)}</span>
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
                      (selectedPaymentMethod === "credit" && (!selectedCustomerId || !creditDueDate)) ||
                      (selectedPaymentMethod === "mpesa" && mpesaValidationEnforced && mpesaStkStatus !== "success" && mpesaVerifyStatus !== "verified") ||
                      (selectedPaymentMethod === "mpesa" && mpesaValidationEnforced && mpesaUnderpaid)}
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
                activeCategory === "all" ? "bg-purple-100 border-purple-200 text-purple-800" : "bg-gray-50 hover:bg-gray-100"
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
                    ? "bg-purple-100 border-purple-200 text-purple-800" 
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

      {/* Mobile Product Picker Drawer */}
      <Sheet open={showProductDrawer} onOpenChange={setShowProductDrawer}>
        <SheetContent side="bottom" className="h-[88dvh] p-0 flex flex-col rounded-t-2xl">
          <SheetHeader className="px-3 pt-3 pb-0 shrink-0">
            <SheetTitle className="text-base">Add Products</SheetTitle>
          </SheetHeader>
          <div className="px-3 pt-2 shrink-0 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-10 text-sm"
                data-testid="input-drawer-search"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3">
              <button
                onClick={() => onCategoryChange("all")}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  activeCategory === "all"
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white text-gray-600 border-gray-300"
                }`}
                data-testid="chip-category-all"
              >
                All
              </button>
              {categories.map((category: any) => {
                const catId = category.id || category._id || category.name;
                return (
                  <button
                    key={catId}
                    onClick={() => onCategoryChange(catId)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      activeCategory === catId
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-gray-600 border-gray-300"
                    }`}
                    data-testid={`chip-category-${catId}`}
                  >
                    {category.name || category.title}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-2 pb-3">
            {isLoading && products.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Loading...</p>
            ) : products.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No products found</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {products.map((product: any) => {
                  const price = getPriceForSaleType(product, saleType);
                  const productId = product._id || product.id;
                  const productName = product.name || product.title;
                  const quantity = product.quantity || 0;
                  const isVirtual = product.virtual || product?.productType == "service";
                  const isOutOfStock = !isVirtual && quantity === 0;
                  const imageUrl = product.images?.[0] || product.image;
                  const inCartQty = cartItems
                    .filter((ci: any) => ci.id === productId || ci.productId === productId)
                    .reduce((sum: number, ci: any) => sum + (ci.quantity || 0), 0);
                  return (
                    <div
                      key={productId}
                      onClick={() => !isOutOfStock && handleProductTap(product)}
                      className={`relative rounded-xl border overflow-hidden select-none active:scale-[0.97] transition-all ${
                        isOutOfStock
                          ? "bg-gray-50 border-gray-200 opacity-50 pointer-events-none"
                          : inCartQty > 0
                          ? "bg-purple-50 border-purple-300"
                          : "bg-white border-gray-200 active:border-purple-300"
                      }`}
                      data-testid={`drawer-product-${productId}`}
                    >
                      {inCartQty > 0 && (
                        <span className="absolute top-1.5 right-1.5 z-10 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-purple-600 text-white text-[11px] font-bold">
                          {inCartQty}
                        </span>
                      )}
                      <div className="h-16 bg-gradient-to-br from-purple-50 to-gray-100 flex items-center justify-center overflow-hidden">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={productName}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <Package className="h-6 w-6 text-purple-200" />
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{productName}</p>
                        <p className="text-sm font-bold text-purple-600 mt-0.5">Ksh {price.toFixed(2)}</p>
                        {isOutOfStock && (
                          <span className="text-[10px] text-red-500 font-medium">Out of stock</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {hasMore && !isLoading && (
              <Button
                variant="outline"
                className="w-full mt-3 text-sm"
                onClick={() => fetchMoreProducts()}
                data-testid="button-load-more-products"
              >
                Load more
              </Button>
            )}
            {isLoading && products.length > 0 && (
              <p className="text-xs text-gray-400 text-center py-2">Loading...</p>
            )}
          </div>
          <div className="shrink-0 border-t border-gray-200 p-3 bg-white">
            <Button
              onClick={() => setShowProductDrawer(false)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-sm font-bold rounded-xl"
              data-testid="button-drawer-done"
            >
              {cartItems.length > 0
                ? `Done · ${cartItems.length} item${cartItems.length !== 1 ? "s" : ""} · Ksh ${grandTotal.toFixed(2)}`
                : "Done"}
            </Button>
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

      {/* Hold Transaction - Ask whether to attach a customer */}
      <Dialog open={showHoldAskCustomerDialog} onOpenChange={(open) => { if (!open) setShowHoldAskCustomerDialog(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center space-x-2">
              <UserCheck className="h-5 w-5 text-orange-500" />
              <span>Attach a Customer?</span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-gray-600">
              Do you want to attach a customer to this hold order?
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={handleHoldWithoutCustomer}
              disabled={isHoldProcessing}
            >
              {isHoldProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : "No"}
            </Button>
            <Button
              onClick={handleHoldWithCustomerChoice}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={isHoldProcessing}
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hold Transaction - Customer Required Dialog */}
      <Dialog open={showHoldCustomerDialog} onOpenChange={(open) => { if (!open) { setShowHoldCustomerDialog(false); setSelectedCustomerId(""); setHoldCustomerSearch(""); } }}>
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

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowHoldCustomerDialog(false); setSelectedCustomerId(""); setHoldCustomerSearch(""); }}>
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
              onClick={() => { setShowHoldSuccessDialog(false); setSelectedCustomerId(""); setHoldCustomerSearch(""); }}
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
                            handleProductTap(p);
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

      {/* Accompaniment selector dialog — shown when a restaurant product with groups is tapped */}
      {accompanimentPendingProduct && (
        <AccompanimentSelectorDialog
          open={accompanimentDialogOpen}
          productName={accompanimentPendingProduct.name || accompanimentPendingProduct.title || ""}
          groups={getProductGroups(accompanimentPendingProduct)}
          onConfirm={handleAccompanimentConfirm}
          onCancel={() => {
            setAccompanimentDialogOpen(false);
            setAccompanimentPendingProduct(null);
          }}
        />
      )}
    </div>
  );
}

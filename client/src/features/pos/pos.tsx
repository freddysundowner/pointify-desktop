import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import ProductGrid from "./product-grid";
import ReceiptModal from "./receipt-modal";
import CalculatorModal from "./calculator-modal";
import { API_ENDPOINTS, apiCall } from "@/lib/api-config";
import { useAuth } from "@/features/auth/useAuth"; // Admin auth for POS access
import { usePermissions } from "@/hooks/usePermissions";
import { useAttendantAuth } from "@/contexts/AttendantAuthContext";
import { useToast } from "@/hooks/use-toast";
import { useProducts } from "@/contexts/ProductsContext";
import { usePrimaryShop } from "@/hooks/usePrimaryShop";
import type { CartItem, Product, Transaction } from "@shared/schema";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

export default function POS() {
  console.log('=== POS COMPONENT LOADED ===');
  console.log('Window location:', window.location.pathname);
  console.log('POS component rendering...');
  
  const { admin } = useAuth(); // Admin auth for POS access
  const { attendant } = useAttendantAuth();
  const { selectedShopId } = useSelector((state: RootState) => state.shop);
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const { products, refreshProducts } = useProducts();
  const { shopData: primaryShopData } = usePrimaryShop();
  const [, setLocation] = useLocation();

  // Load products when POS page loads (only if not already loaded)
  useEffect(() => {
    if (products.length === 0) {
      console.log('POS page loaded - loading products');
      refreshProducts();
    }
  }, []); // Remove refreshProducts dependency to prevent loops
  
  // Add refresh button for debugging
  const handleRefreshProducts = () => {
    console.log('Manual refresh triggered from POS');
    refreshProducts();
  };

  // POS Permission checks based on attendant permissions
  const hasSpecificPOSPermission = (permissionValue: string) => {
    return attendant?.permissions?.some(p => 
      p.key === 'pos' && p.value.includes(permissionValue)
    ) || false;
  };

  const canSetSaleDate = hasSpecificPOSPermission('set_sale_date');
  const canSell = hasSpecificPOSPermission('can_sell');
  const canSellToDealer = hasSpecificPOSPermission('can_sell_to_dealer_&_wholesaler');
  const canDiscount = hasSpecificPOSPermission('discount');
  const canEditPrice = hasSpecificPOSPermission('edit_price');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [saleType, setSaleType] = useState<string>("Retail");

  // Get shop data from attendant context or Redux store
  const effectiveShopId = selectedShopId || 
    (typeof attendant?.shopId === 'object' ? attendant.shopId._id : attendant?.shopId);

  // Get tax rate from primary shop data, fallback to 0 if not available
  const taxRate = primaryShopData?.tax || 0;
  


  // Function to get price based on sale type
  const getPriceForSaleType = (product: any, saleType: string) => {
    const sellingPrice = product.sellingPrice || product.price || 0;
    const wholesalePrice = product.wholesalePrice || 0;
    const dealerPrice = product.dealerPrice || 0;

    switch (saleType) {
      case "Wholesale":
        return wholesalePrice > 0 ? wholesalePrice : sellingPrice;
      case "Dealer":
        return dealerPrice > 0 ? dealerPrice : sellingPrice;
      case "Retail":
      default:
        return sellingPrice;
    }
  };

  // Function to update all cart item prices when sale type changes
  const updateCartPricesForSaleType = (newSaleType: string) => {
    setCartItems(prev => 
      prev.map(item => {
        // Find the original product data to get the correct price
        const product = products.find((p: any) => (p._id || p.id) === item.id);
        
        if (product) {
          const newPrice = getPriceForSaleType(product, newSaleType);
          return {
            ...item,
            price: newPrice,
            total: item.quantity * newPrice
          };
        }
        return item;
      })
    );
  };

  // Handler for sale type change that updates both state and cart prices
  const handleSaleTypeChange = (newSaleType: string) => {
    setSaleType(newSaleType);
    updateCartPricesForSaleType(newSaleType);
  };

  // useEffect to trigger cart price updates when sale type changes
  useEffect(() => {
    if (cartItems.length > 0) {
      updateCartPricesForSaleType(saleType);
    }
  }, [saleType, products]);

  // Helper function to check attendant permissions
  const hasAttendantPermission = (permission: string) => {
    if (!attendant) return false;
    return attendant.permissions.some(perm => 
      perm.value && perm.value.includes(permission)
    );
  };

  const addToCart = (product: any) => {
    // Removed permission check - allow all attendants to add items to cart

    // Services (virtual products) don't need stock validation
    if (!product.virtual) {
      // Check if negative selling is allowed for physical products only
      const quantity = product.quantity || 0;
      if (quantity <= 0) { // Simplified check for attendant POS
        toast({
          title: "Out of Stock",
          description: `${product.name} is out of stock and negative selling is not allowed`,
          variant: "destructive",
        });
        return;
      }
    }

    setCartItems(prev => {
      const existingItemIndex = prev.findIndex(item => 
        (typeof item.id === 'string' && typeof product.id === 'string' && item.id === product.id) ||
        (typeof item.id === 'number' && typeof product.id === 'number' && item.id === product.id) ||
        (item.id === product._id) ||
        (item.id === product.id)
      );

      if (existingItemIndex >= 0) {
        // Check stock availability for existing physical products only
        if (!product.virtual) {
          const quantity = product.quantity || 0;
          const newQuantity = prev[existingItemIndex].quantity + 1;
          if (quantity < newQuantity) { // Simplified stock check for attendant POS
            toast({
              title: "Insufficient Stock", 
              description: `Only ${quantity} ${product.name} available in stock`,
              variant: "destructive",
            });
            return prev;
          }
        }

        const updatedQuantity = prev[existingItemIndex].quantity + 1;
        return prev.map((item, index) => 
          index === existingItemIndex 
            ? { ...item, quantity: updatedQuantity, total: (item.price - (item.discount || 0)) * updatedQuantity }
            : item
        );
      } else {
        const priceForSaleType = getPriceForSaleType(product, saleType);
        const maxDiscountValue = product.maxDiscount || 0;
        console.log(`Adding ${product.name} to cart with maxDiscount:`, maxDiscountValue);
        return [...prev, {
          id: product.id || product._id,
          name: product.name || product.title || "Unknown Product",
          price: priceForSaleType,
          serialnumber: product?.serialnumber,
          quantity: 1,
          total: priceForSaleType,
          discount: 0,
          originalPrice: priceForSaleType,
          maxDiscount: maxDiscountValue
        }];
      }
    });
  };

  const applyDiscount = (id: string | number, discountAmount: number) => {
    // Check if attendant has discount permission
    const canApplyDiscount = hasAttendantPermission('discount');
    
    if (!canApplyDiscount) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to apply discounts",
        variant: "destructive",
      });
      return;
    }

    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const maxAllowedDiscount = item.maxDiscount || 0;
        const validDiscountAmount = Math.min(discountAmount, maxAllowedDiscount);
        
        if (discountAmount > maxAllowedDiscount) {
          toast({
            title: "Discount Limit Exceeded",
            description: `Maximum discount for ${item.name} is ${maxAllowedDiscount.toFixed(2)}`,
            variant: "destructive",
          });
        }

        const finalDiscount = Math.max(0, validDiscountAmount);
        return { 
          ...item, 
          discount: finalDiscount, 
          total: (item.price - finalDiscount) * item.quantity 
        };
      }
      return item;
    }));
  };

  const updateCartItemQuantity = (id: string | number, quantity: number, productData?: any) => {
    if (quantity <= 0) {
      setCartItems(prev => prev.filter(item => item.id !== id));
      return;
    }

    // Services (virtual products) don't need stock validation
    if (productData && !productData.virtual) {
      // Check stock availability for physical products only
      const availableQuantity = productData.quantity || 0;
      if (quantity > availableQuantity) { // Simplified stock check for attendant POS
        toast({
          title: "Insufficient Stock",
          description: `Only ${availableQuantity} ${productData.name} available in stock`,
          variant: "destructive",
        });
        return;
      }
    }

    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity, total: (item.price - (item.discount || 0)) * quantity };
      }
      return item;
    }));
  };

  const updateCartItemPrice = (itemId: string | number, newPrice: number, buyingPrice?: number) => {
    if (!canEditPrice) {
      toast({
        title: "Access Denied", 
        description: "You don't have permission to edit prices",
        variant: "destructive",
      });
      return;
    }

    // Validate price is positive
    if (newPrice <= 0) {
      toast({
        title: "Invalid Price",
        description: "Price must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    setCartItems(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          return { ...item, price: newPrice, total: item.quantity * newPrice };
        }
        return item;
      })
    );

    toast({
      title: "Price Updated",
      description: "Item price has been updated successfully",
    });
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0);
    const discount = cartItems.reduce((sum, item) => sum + (item.discount || 0) * item.quantity, 0);
    const tax = subtotal * (taxRate / 100); // Use shop tax rate
    const total = subtotal + tax;
    return { subtotal, discount, tax, total };
  };

  const handleCheckoutComplete = (transaction: Transaction) => {
    setLastTransaction(transaction);
    setCartItems([]);
    setShowReceipt(true);
  };

  // Navigate back to appropriate dashboard
  const handleBackToDashboard = () => {
    // Check if attendant is logged in, go to attendant dashboard
    // Otherwise go to admin dashboard
    if (attendant) {
      setLocation('/attendant/dashboard');
    } else {
      setLocation('/dashboard');
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Back to Dashboard Button - Fixed position */}
      <div className="absolute top-4 left-4 z-50">
        <Button
          onClick={handleBackToDashboard}
          variant="outline"
          size="sm"
          className="bg-white/90 backdrop-blur-sm border-gray-200 hover:bg-white hover:border-gray-300 shadow-lg"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
      
      <div className="flex-1 flex flex-col min-w-0">
        <ProductGrid
          activeCategory={activeCategory}
          searchQuery={searchQuery}
          onCategoryChange={setActiveCategory}
          onSearchChange={setSearchQuery}
          onAddToCart={addToCart}
          onOpenCalculator={() => setShowCalculator(true)}
          cartItems={cartItems}
          totals={getCartTotals()}
          onUpdateQuantity={updateCartItemQuantity}
          onUpdatePrice={updateCartItemPrice}
          onApplyDiscount={applyDiscount}
          onClearCart={clearCart}
          onCheckout={handleCheckoutComplete}
          taxRate={taxRate}
          shopId={effectiveShopId}
          adminId={attendant?.adminId || admin?._id}
          saleType={saleType}
          onSaleTypeChange={handleSaleTypeChange}
          getPriceForSaleType={getPriceForSaleType}
          // Pass permission flags to ProductGrid
          canSetSaleDate={canSetSaleDate}
          canSell={canSell}
          canSellToDealer={canSellToDealer}
          canDiscount={canDiscount}
          canEditPrice={canEditPrice}
        />
      </div>

      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        transaction={lastTransaction}
        onNewTransaction={() => setShowReceipt(false)}
      />

      <CalculatorModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
      />
    </div>
  );
}
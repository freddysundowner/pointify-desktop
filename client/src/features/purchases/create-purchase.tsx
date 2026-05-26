import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Plus, Trash2, Package, Search } from "lucide-react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/useAuth";
import { useProducts } from "@/contexts/ProductsContext";
import type { PurchaseItem } from "@shared/schema";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { usePrimaryShop } from "../../hooks/usePrimaryShop";

export default function CreatePurchase() {
  const [location, setLocation] = useLocation();
  const { admin, isAuthenticated } = useAuth();
  const { currency } = useSelector((state: RootState) => state.currency);
  const { attendantId,shopId } = usePrimaryShop();

  // Suppliers API integration
  const { data: suppliersResponse, isLoading: suppliersLoading } = useQuery({
    queryKey: ['/api/suppliers', shopId],
    queryFn: async () => {
      const response = await fetch(`/api/suppliers?shopId=${shopId}`);
      if (!response.ok) throw new Error('Failed to fetch suppliers');
      return response.json();
    },
    enabled: !!admin?._id && !!shopId,
  });

  // Use existing ProductsContext with cached data
  const { products: contextProducts, isLoading: productsLoading, error: productsError, refreshProducts } = useProducts();

  const suppliers = Array.isArray(suppliersResponse)
    ? suppliersResponse
    : ((suppliersResponse as any)?.data || []);
  const products = contextProducts || [];

  // Generate auto invoice number
  const generateInvoiceNumber = () => {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PT${timestamp}${randomSuffix}`;
  };

  const [supplierName, setSupplierName] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [trackBatches, setTrackBatches] = useState(false);

  // Auto-generate invoice number on component mount
  useEffect(() => {
    setInvoiceNumber(generateInvoiceNumber());
  }, []);

  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);


  const addProductToOrder = (product: any) => {
    // Check if product already exists in the order
    const existingIndex = items.findIndex(item => item.productName === (product.name || product.title));
    
    if (existingIndex >= 0) {
      // If product exists, increase quantity
      const newItems = [...items];
      newItems[existingIndex].quantity += 1;
      newItems[existingIndex].totalCost = newItems[existingIndex].quantity * newItems[existingIndex].unitCost;
      setItems(newItems);
    } else {
      // Add new product to order  
      const newItem: PurchaseItem & { sellingPrice?: number } = {
        productName: product.name || product.title,
        quantity: 1,
        unitCost: product.buyingPrice || 0,
        totalCost: product.buyingPrice || 0,
        sellingPrice: product.sellingPrice || 0
      };
      setItems([...items, newItem]);
    }
    
    // Clear search and close dialog
    setSearchTerm("");
    setProductSearchOpen(false);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PurchaseItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate total cost when quantity or unit cost changes
    if (field === 'quantity' || field === 'unitCost') {
      newItems[index].totalCost = newItems[index].quantity * newItems[index].unitCost;
    }
    
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.totalCost, 0);
  };

  const handleSave = async () => {
    const validItems = items.filter(item => item.productName && item.quantity > 0);
    
    if (validItems.length === 0) {
      alert("Please add at least one item to the purchase order.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Find supplier ID if supplier is selected
      const selectedSupplier = suppliers.find((s: any) => s.name === supplierName);
      
      // Extract attendant ID properly
      // const attendantId = (admin?.attendantId as any)?._id || admin?.attendantId || admin?._id || null;

      // Map items to Pointify format
      const purchaseItems = validItems.map(item => {
        // Find the product to get its ID
        const product = products.find((p: any) => (p.name || p.title) === item.productName);
        return {
          product: product?._id || null,
          quantity: item.quantity,
          unitPrice: item.unitCost,
          sellingPrice: (item as any).sellingPrice || product?.sellingPrice || item.unitCost * 1.5, // Use custom selling price or default
          lineDiscount: 0,
          attendantId
        };
      });

      const payload = {
        purchase: {
          shopId: shopId,
          supplierId: selectedSupplier?._id || null,
          attendantId: attendantId,
          paymentType: "cash"
        },
        purchaseItems: purchaseItems,
        amountpaid: calculateTotal(),
        trackBatches: trackBatches,
        useWarehouse: true
      };
      
      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        if(isAttendant) {
          setLocation("/attendant/purchases");
        }else{
          setLocation("/purchases");
        }
      } else {
        const error = await response.text();
        alert(`Failed to create purchase order: ${error}`);
      }
    } catch (error) {
      console.error("Error creating purchase order:", error);
      alert("Failed to create purchase order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const isAttendant = location.startsWith("/attendant/");

  const currencyLabel = (currency || '').toString().trim();
  const fmt = (n: number) => `${currencyLabel ? currencyLabel + ' ' : ''}${n.toFixed(2)}`;

  return (
    <DashboardLayout title="Create Purchase Order">
      <div className="space-y-3">
        <PageHeader
          title="Create Purchase Order"
          onBack={() => window.history.back()}
        />

        {/* Basic Information */}
        <Card>
          <CardHeader className="py-2.5 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" />
              Purchase Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label htmlFor="supplier" className="text-xs">Supplier</Label>
                <Select value={supplierName} onValueChange={setSupplierName}>
                  <SelectTrigger className="h-8 text-sm" data-testid="select-supplier">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliersLoading ? (
                      <SelectItem value="loading">Loading suppliers...</SelectItem>
                    ) : suppliers.length > 0 ? (
                      suppliers.map((supplier: any) => (
                        <SelectItem key={supplier._id} value={supplier.name}>
                          {supplier.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none">No suppliers found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="invoiceNumber" className="text-xs">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Invoice #"
                  className="h-8 text-sm"
                  data-testid="input-invoice-number"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="orderDate" className="text-xs">Order Date *</Label>
                <Input
                  id="orderDate"
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="h-8 text-sm"
                  data-testid="input-order-date"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="expectedDate" className="text-xs">Expected Delivery</Label>
                <Input
                  id="expectedDate"
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="h-8 text-sm"
                  data-testid="input-expected-date"
                />
              </div>
            </div>

            <div className="mt-3 pt-2 border-t flex items-center gap-2">
              <Checkbox
                id="trackBatches"
                checked={trackBatches}
                onCheckedChange={(checked) => setTrackBatches(checked === true)}
                data-testid="checkbox-track-batches"
              />
              <Label htmlFor="trackBatches" className="text-xs font-medium leading-none cursor-pointer">
                Enable batch tracking
              </Label>
              <span className="text-[11px] text-muted-foreground">— track batches for expiry &amp; inventory control</span>
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader className="py-2.5 px-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                Order Items {items.length > 0 && <span className="text-xs font-normal text-muted-foreground">({items.length})</span>}
              </CardTitle>
              <Dialog open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                <DialogTrigger asChild>
                  <div className="relative cursor-pointer flex-1 max-w-md">
                    <Input
                      placeholder="Search products to add..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 h-8 text-sm cursor-pointer"
                      readOnly
                      data-testid="input-search-products"
                    />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Select Products to Add</DialogTitle>
                  </DialogHeader>
                  <Command>
                    <CommandInput
                      placeholder="Search products..."
                      value={searchTerm}
                      onValueChange={setSearchTerm}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {productsLoading ? "Loading products..." : "No products found."}
                      </CommandEmpty>
                      <CommandGroup>
                        {products
                          .filter((product: any) =>
                            !searchTerm ||
                            (product.name || product.title || '').toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((product: any) => (
                            <CommandItem
                              key={product._id}
                              onSelect={() => addProductToOrder(product)}
                              className="cursor-pointer"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              <div className="flex flex-col">
                                <span className="font-medium">{product.name || product.title}</span>
                                <span className="text-sm text-muted-foreground">
                                  {product.shopId?.currency || 'KES'} {(product.buyingPrice || 0).toFixed(2)} per unit
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            {items.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No products added yet. Search above to add items.</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] text-muted-foreground uppercase border-b">
                      <th className="text-left font-medium py-1.5 px-2">Product</th>
                      <th className="text-left font-medium py-1.5 px-2 w-20">Qty</th>
                      <th className="text-left font-medium py-1.5 px-2 w-28">Buying</th>
                      <th className="text-left font-medium py-1.5 px-2 w-28">Selling</th>
                      <th className="text-right font-medium py-1.5 px-2 w-28">Total</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="py-1.5 px-2 font-medium truncate max-w-[200px]" title={item.productName} data-testid={`text-product-${index}`}>
                          {item.productName}
                        </td>
                        <td className="py-1.5 px-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="h-7 text-sm px-2"
                            data-testid={`input-qty-${index}`}
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitCost}
                            onChange={(e) => updateItem(index, 'unitCost', parseFloat(e.target.value) || 0)}
                            className="h-7 text-sm px-2"
                            data-testid={`input-buying-${index}`}
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={(item as any).sellingPrice || 0}
                            onChange={(e) => updateItem(index, 'sellingPrice' as keyof PurchaseItem, parseFloat(e.target.value) || 0)}
                            className="h-7 text-sm px-2"
                            data-testid={`input-selling-${index}`}
                          />
                        </td>
                        <td className="py-1.5 px-2 text-right font-medium tabular-nums" data-testid={`text-total-${index}`}>
                          {fmt(item.totalCost)}
                        </td>
                        <td className="py-1.5 px-1 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            data-testid={`button-remove-${index}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2">
                      <td colSpan={4} className="py-2 px-2 text-xs text-muted-foreground">
                        Total Items: <span className="font-medium text-foreground">{items.reduce((sum, item) => sum + item.quantity, 0)} units</span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="text-[11px] text-muted-foreground uppercase">Total</div>
                        <div className="text-base font-bold text-blue-600 dark:text-blue-400 tabular-nums" data-testid="text-grand-total">
                          {fmt(calculateTotal())}
                        </div>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(isAttendant ? "/attendant/purchases" : "/purchases")}
            data-testid="button-cancel"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSubmitting || items.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-create-purchase"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {isSubmitting ? "Creating..." : "Create Purchase Order"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
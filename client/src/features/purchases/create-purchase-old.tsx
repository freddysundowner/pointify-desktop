import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ArrowLeft, Save, Plus, Trash2, Package, Search } from "lucide-react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/useAuth";
import { useProducts } from "@/contexts/ProductsContext";
import { useNavigationRoute } from "@/lib/navigation-utils";
import type { PurchaseItem } from "@shared/schema";

const mockSuppliers = [
  "Tech Supply Co",
  "Global Parts Ltd",
  "Quality Materials Inc",
  "Express Supplies",
  "Bulk Distributors"
];

const mockProducts = [
  { name: "Premium Widget", cost: 75.00 },
  { name: "Basic Component", cost: 15.50 },
  { name: "Advanced Module", cost: 120.00 },
  { name: "Raw Material A", cost: 8.75 },
  { name: "Raw Material B", cost: 12.25 },
  { name: "Emergency Stock", cost: 22.50 },
  { name: "Office Supplies", cost: 3.25 },
  { name: "Packaging Materials", cost: 2.80 }
];

export default function CreatePurchase() {
  const [, setLocation] = useLocation();
  const { admin } = useAuth();
  
  // Get shop data for API calls
  const primaryShop = typeof admin?.primaryShop === 'object' ? admin.primaryShop : null;
  const shopId = (primaryShop as any)?._id;

  // Fetch suppliers from API
  const { data: suppliersResponse, isLoading: suppliersLoading } = useQuery({
    queryKey: [`/api/suppliers?shopId=${shopId}`],
    enabled: !!shopId
  });

  // Use existing ProductsContext with cached data
  const { products: contextProducts, isLoading: productsLoading, error: productsError, refreshProducts } = useProducts();

  const suppliers = (suppliersResponse as any)?.data || [];
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

  // Auto-generate invoice number on component mount
  useEffect(() => {
    setInvoiceNumber(generateInvoiceNumber());
  }, []);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Get currency from selected products or default to shop currency
  const getDisplayCurrency = () => {
    // Find first item with a product name and get currency from matching product
    const firstSelectedItem = items.find(item => item.productName);
    if (firstSelectedItem) {
      const matchingProduct = products.find((p: any) => 
        (p.name || p.title) === firstSelectedItem.productName
      );
      if (matchingProduct?.shopId?.currency) {
        return matchingProduct.shopId.currency;
      }
    }
    // Fallback to first product's currency or default
    return products.length > 0 ? (products[0] as any)?.shopId?.currency || 'KES' : 'KES';
  };

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
      const newItem: PurchaseItem = {
        productName: product.name || product.title,
        quantity: 1,
        unitCost: product.buyingPrice || 0,
        totalCost: product.buyingPrice || 0
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

  const selectProduct = (index: number, productName: string, cost: number = 0) => {
    const newItems = [...items];
    newItems[index] = { 
      ...newItems[index], 
      productName: productName,
      unitCost: cost,
      totalCost: newItems[index].quantity * cost
    };
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.totalCost, 0);
  };

  const handleSave = () => {
    const validItems = items.filter(item => item.productName && item.quantity > 0);
    
    console.log("Creating new purchase order:", {
      supplierName,
      orderDate,
      expectedDate,
      invoiceNumber,
      items: validItems,
      totalAmount: calculateTotal(),
      status: "pending"
    });
    
    setLocation("/purchases");
  };

  const handleCancel = () => {
    setLocation("/purchases");
  };

  const canSave = supplierName.trim() && items.some(item => item.productName && item.quantity > 0);

  return (
    <DashboardLayout title="Create Purchase Order">
      <div className="p-6 w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create Purchase Order
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Create a new purchase order for supplier inventory
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!canSave}>
              <Save className="mr-2 h-4 w-4" />
              Create Order
            </Button>
          </div>
        </div>

        {/* Purchase Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Purchase Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplier">Supplier *</Label>
                <Select value={supplierName} onValueChange={setSupplierName}>
                  <SelectTrigger>
                    <SelectValue placeholder={suppliersLoading ? "Loading suppliers..." : "Select supplier"} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.length > 0 ? suppliers.map((supplier: any) => (
                      <SelectItem key={supplier._id || supplier.id} value={supplier.name || supplier.supplierName}>
                        {supplier.name || supplier.supplierName}
                      </SelectItem>
                    )) : (
                      <SelectItem value="no-suppliers" disabled>
                        {suppliersLoading ? "Loading..." : "No suppliers found"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="invoice">Invoice Number</Label>
                <Input
                  id="invoice"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Auto-generated PT number"
                />
              </div>
              <div>
                <Label htmlFor="order-date">Order Date *</Label>
                <Input
                  id="order-date"
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="expected-date">Expected Date</Label>
                <Input
                  id="expected-date"
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5" />
              Purchase Order Items
            </CardTitle>
            <div className="space-y-3">
              <Dialog open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                <DialogTrigger asChild>
                  <div className="relative cursor-pointer">
                    <Input
                      placeholder="Search products to add to purchase order..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 cursor-pointer"
                      readOnly
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No products added yet. Use the search above to add products to your purchase order.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">{item.productName}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-xs">Quantity</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Unit Cost</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitCost}
                              onChange={(e) => updateItem(index, 'unitCost', parseFloat(e.target.value) || 0)}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Total</Label>
                            <Input
                              value={`${getDisplayCurrency()} ${item.totalCost.toFixed(2)}`}
                              readOnly
                              className="h-8 bg-gray-50 dark:bg-gray-800"
                            />
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="ml-4 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

              {/* Total */}
              <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Total Amount:
                  </span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {getDisplayCurrency()} {calculateTotal().toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>Total Items:</span>
                  <span>{items.reduce((sum, item) => sum + item.quantity, 0)} units</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => setLocation("/purchases")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Purchases
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSubmitting || items.length === 0 || !supplierName}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Creating..." : "Create Purchase Order"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
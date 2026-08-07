import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { useRoute } from "wouter";
import { useState, useEffect } from "react";
import { useCurrency } from "@/utils";
import { rawApiFetch } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function EditSale() {
  // Try both admin and attendant routes
  const [adminMatch, adminParams] = useRoute("/sales/edit/:id");
  const [attendantMatch, attendantParams] = useRoute("/attendant/sales/edit/:id");
  
  // Extract sale ID from whichever route matched
  const match = adminMatch || attendantMatch;
  const params = adminParams || attendantParams;
  
  const [originalSale, setOriginalSale] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const currency = useCurrency();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Navigation state is only trusted when it is the SAME sale the route
    // identifies — stale or manipulated history state must never let this
    // screen display (or later overwrite) a different sale.
    const navigationState = (window.history.state?.saleData as any);
    const navStateId = navigationState?._id || navigationState?.id;
    if (navigationState && params?.id && String(navStateId) === String(params.id)) {
      setOriginalSale(navigationState);
      setIsLoading(false);
      return;
    }

    // Fallback to API call if no navigation state
    const fetchSaleData = async () => {
      if (!params?.id) {
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await rawApiFetch(`/api/sales/single/receipt/${params.id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          auth: 'attendant-first',
        });
        
        if (response.ok) {
          const data = await response.json();
          setOriginalSale(data);
        } else {
          toast({
            title: "Could not load sale",
            description: `The sale could not be retrieved (${response.status}).`,
            variant: "destructive",
          });
        }
      } catch (error: any) {
        toast({
          title: "Could not load sale",
          description: error?.message || "Check your connection and try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSaleData();
  }, [params?.id]);
  
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [saleDate, setSaleDate] = useState("");

  // Update state when originalSale changes
  useEffect(() => {
    if (originalSale) {
      setCustomerName(originalSale.customerId?.name || 'Walk-in');
      setItems(originalSale.items || []);
      setStatus(originalSale.status || 'completed');
      setSaleDate(originalSale.createdAt?.split('T')[0] || '');
    }
  }, [originalSale]);

  if (isLoading) {
    return (
      <DashboardLayout title="Loading Sale...">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Loading sale data...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!originalSale) {
    return (
      <DashboardLayout title="Sale Not Found">
        <div className="p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Sale Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            The requested sale could not be found.
          </p>
          <Button className="mt-4" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const newItems = [...items];
    newItems[index].quantity = quantity;
    newItems[index].totalPrice = quantity * newItems[index].unitPrice;
    setItems(newItems);
  };

  const updateItemPrice = (index: number, price: number) => {
    const newItems = [...items];
    newItems[index].unitPrice = price;
    newItems[index].totalPrice = price * newItems[index].quantity;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (isSaving) return;

    if (items.length === 0) {
      toast({
        title: "Nothing to save",
        description: "A sale must have at least one item.",
        variant: "destructive",
      });
      return;
    }

    // The upstream update endpoint edits items by product ID and re-validates
    // stock/prices — free-text items that don't reference an existing product
    // cannot be persisted through this screen.
    const invalidItem = items.find((item) => !(item.product?._id || item.product));
    if (invalidItem) {
      toast({
        title: "Cannot save new items here",
        description:
          "Only items already on the sale can be edited. To add a new product to a sale, create it through the POS.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const asId = (v: any) => (typeof v === "object" && v !== null ? v._id : v);
      const payload = {
        products: items.map((item) => ({
          product: item.product?._id || item.product,
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          lineDiscount: Number(item.lineDiscount) || 0,
        })),
        shopId: asId(originalSale.shopId),
        customerId: asId(originalSale.customerId),
        attendantId: asId(originalSale.attendantId),
        paymentType: originalSale.paymentType,
        totalDiscount: originalSale.totalDiscount || 0,
        payments: originalSale.payments,
        status,
        amountPaid: originalSale.amountPaid,
      };

      // The route param is the authoritative target; fall back to whichever id
      // shape the sale object carries (navigation state may pass `id`, the
      // API returns `_id`).
      const saleId = params?.id || originalSale._id || originalSale.id;
      const response = await rawApiFetch(`/api/sales/${saleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        auth: "attendant-first",
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        /* non-JSON body */
      }

      // Reject both HTTP errors and upstream-rejection envelopes — a write must
      // never be reported as successful unless upstream accepted it.
      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.error || data?.message || `Failed to update sale (${response.status})`,
        );
      }

      toast({
        title: "Sale updated",
        description: data?.message || "The sale was updated successfully.",
      });

      // Sales list/report queries use dynamic query-string keys — invalidate by prefix.
      queryClient.invalidateQueries({
        predicate: (q) =>
          String(q.queryKey[0] ?? "").startsWith("/api/sales") ||
          String(q.queryKey[0] ?? "").startsWith("/api/analysis/report/sales"),
      });

      window.history.back();
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error?.message || "Could not update the sale. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout title={`Edit Sale #${originalSale.receiptNo || originalSale._id || originalSale.id}`}>
      <div className="p-6 w-full">
        <PageHeader
          title={`Edit Sale #${originalSale.receiptNo || originalSale._id || originalSale.id}`}
          subtitle="Modify sale details and items"
          onBack={() => window.history.back()}
          actions={<>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </>}
        />

        <div className="grid gap-6">
          {/* Sale Information */}
          <Card>
            <CardHeader>
              <CardTitle>Sale Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Customer and date are shown for context only — the sales
                    update endpoint does not support changing them, so they are
                    read-only to avoid edits that would silently not persist. */}
                <div>
                  <Label htmlFor="customer">Customer</Label>
                  <Input id="customer" value={customerName} readOnly disabled />
                </div>

                <div>
                  <Label htmlFor="date">Sale Date</Label>
                  <Input id="date" type="date" value={saleDate} readOnly disabled />
                </div>
                
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="hold">Hold</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              {/* Adding new items is not supported by the update endpoint —
                  new products must be sold through the POS. */}
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                      <div className="md:col-span-2">
                        <Label htmlFor={`product-${index}`}>Product</Label>
                        {/* Read-only: the update endpoint identifies items by
                            product ID — renaming here could not persist. */}
                        <Input
                          id={`product-${index}`}
                          value={item.product?.name || item.productName || ''}
                          readOnly
                          disabled
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                        <Input
                          id={`quantity-${index}`}
                          type="number"
                          min="1"
                          value={item.quantity || 0}
                          onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`price-${index}`}>Unit Price</Label>
                        <Input
                          id={`price-${index}`}
                          type="number"
                          step="0.01"
                          value={item.unitPrice || 0}
                          onChange={(e) => updateItemPrice(index, parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Total</Label>
                          <p className="font-medium">{currency} {((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {items.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    This sale has no items.
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div className="flex justify-end">
                    <div className="text-right">
                      <p className="text-lg font-semibold">
                        Total: ${calculateTotal().toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {items.length} item{items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
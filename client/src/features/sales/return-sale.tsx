import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowLeft, RotateCcw, Loader2, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { useRoute, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useAttendantAuth } from "@/contexts/AttendantAuthContext";
import { queryClient } from "@/lib/queryClient";
import type { Sale, SaleItem } from "@shared/schema";



interface ReturnItem extends SaleItem {
  returnQuantity: number;
  returnReason: string;
  shouldReturn: boolean;
}

export default function ReturnSale() {
  const [adminMatch, adminParams] = useRoute("/sales/return/:id");
  const [attendantMatch, attendantParams] = useRoute("/attendant/sales/return/:id");
  const [, setLocation] = useLocation();
  const { attendant } = useAttendantAuth();
  
  const match = adminMatch || attendantMatch;
  const params = adminParams || attendantParams;
  const saleId = params?.id;
  
  const isAttendant = attendantMatch && attendant;
  
  const [originalSale, setOriginalSale] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    description: string;
    type: 'success' | 'error';
  }>({ title: '', description: '', type: 'success' });

  useEffect(() => {
    if (!saleId) {
      setIsLoading(false);
      return;
    }
    const navigationState = (window.history.state?.saleData as any);
    if (navigationState) {
      setOriginalSale(navigationState);
      setIsLoading(false);
      return;
    }
    setIsLoading(false);
  }, [saleId]);
  
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);

  useEffect(() => {
    if (originalSale?.items) {
      setReturnItems(
        originalSale.items.map((item: any) => ({
          ...item,
          productName: item.product?.name || item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice || (item.quantity * item.unitPrice),
          returnQuantity: item.quantity,
          returnReason: "",
          shouldReturn: false
        }))
      );
    }
  }, [originalSale]);
  
  const [returnNotes, setReturnNotes] = useState("");
  const [refundMethod, setRefundMethod] = useState("original");

  if (isLoading) {
    return (
      <DashboardLayout title="Loading Return Data...">
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
          <p className="text-sm text-gray-500">Loading sale data...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!originalSale) {
    return (
      <DashboardLayout title="Sale Not Found">
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
          <AlertCircle className="h-12 w-12 text-gray-300" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Sale Not Found</h1>
            <p className="text-sm text-gray-500 mt-1">The requested sale could not be found.</p>
          </div>
          <Button size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (originalSale.status === "returned") {
    return (
      <DashboardLayout title="Return Not Available">
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
          <AlertCircle className="h-12 w-12 text-yellow-400" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Already Returned</h1>
            <p className="text-sm text-gray-500 mt-1">This sale has already been processed as a return.</p>
          </div>
          <Button size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const updateReturnItem = (index: number, field: keyof ReturnItem, value: any) => {
    const newItems = [...returnItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setReturnItems(newItems);
  };

  const calculateRefundAmount = () => {
    return returnItems
      .filter(item => item.shouldReturn)
      .reduce((sum, item) => sum + (item.unitPrice * item.returnQuantity), 0);
  };

  const handleProcessReturn = async () => {
    const itemsToReturn = returnItems.filter(item => item.shouldReturn);
    
    if (itemsToReturn.length === 0) {
      setAlertConfig({ title: "No Items Selected", description: "Please select at least one item to return.", type: 'error' });
      setShowAlert(true);
      return;
    }

    setIsProcessing(true);

    const attendantIdRaw = originalSale.attendantId || originalSale.items?.[0]?.attendantId;
    const attendantId = typeof attendantIdRaw === 'string' ? attendantIdRaw : attendantIdRaw?._id;
    const shopId = originalSale.shopId?._id || originalSale.shopId || originalSale.items?.[0]?.shopId;

    const formattedItems = itemsToReturn.map((item: any) => ({
      product: item.product?._id || item._id,
      quantity: parseFloat(item.returnQuantity.toString())
    }));

    const returnPayload = {
      saleid: originalSale._id,
      attendantId,
      shopId,
      items: formattedItems,
      reason: returnNotes || "Return processed",
      deleteReceipt: false
    };

    try {
      console.log("Processing return with payload:", returnPayload);
      const authToken = localStorage.getItem('authToken');
      const attendantToken = localStorage.getItem('attendantToken');
      const token = authToken || attendantToken;
      
      const response = await fetch('/api/salereturns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify(returnPayload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Return processed successfully:', result);
        queryClient.invalidateQueries({ queryKey: ['/api/sales/filter'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analysis/report/sales'] });
        setAlertConfig({ title: "Return Successful", description: "The return has been processed successfully.", type: 'success' });
        setShowAlert(true);
        const salesRoute = isAttendant ? '/attendant/sales' : '/sales';
        setLocation(salesRoute);
      } else {
        const error = await response.text();
        console.error('Return processing failed:', error);
        setAlertConfig({ title: "Return Failed", description: `Failed to process return: ${error}`, type: 'error' });
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Error processing return:', error);
      setAlertConfig({ title: "Return Error", description: "An error occurred while processing the return. Please try again.", type: 'error' });
      setShowAlert(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedItemsCount = returnItems.filter(item => item.shouldReturn).length;
  const currency = originalSale.shopId?.currency || originalSale.shop?.currency || 'KES';

  return (
    <DashboardLayout title={`Return Sale #${originalSale.receiptNo || originalSale.id}`}>
      <PageHeader
        title={`Return #${originalSale.receiptNo || originalSale.id}`}
        subtitle="Select items to return"
        onBack={() => window.history.back()}
        actions={
          <Button
            size="sm"
            onClick={handleProcessReturn}
            disabled={selectedItemsCount === 0 || isProcessing}
          >
            {isProcessing ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /><span className="hidden sm:inline">Processing...</span><span className="sm:hidden">...</span></>
            ) : (
              <><RotateCcw className="mr-1.5 h-4 w-4" /><span className="hidden sm:inline">Process Return</span><span className="sm:hidden">Return</span></>
            )}
          </Button>
        }
      />

      <div className="space-y-4">
        {/* Original Sale Info */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-gray-700">Original Sale</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="font-medium truncate">{originalSale.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-medium">{new Date(originalSale.saleDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-medium">{currency} {originalSale.totalAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="default" className="text-xs px-1.5 py-0">{originalSale.status}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Return Items */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-gray-700">Items to Return</CardTitle>
            <p className="text-xs text-muted-foreground">Select items and specify quantities</p>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-3">
              {returnItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-3">
                  {/* Item header row */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={item.shouldReturn}
                      onCheckedChange={(checked) => updateReturnItem(index, 'shouldReturn', checked)}
                      className="mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{item.productName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.quantity} × {currency} {item.unitPrice.toFixed(2)} = {currency} {item.totalPrice.toFixed(2)}
                      </p>
                    </div>
                    {item.shouldReturn && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground">Refund</p>
                        <p className="text-sm font-semibold text-green-600">
                          {currency} {(item.unitPrice * item.returnQuantity).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Expanded fields when selected */}
                  {item.shouldReturn && (
                    <div className="mt-3 pl-7 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor={`quantity-${index}`} className="text-xs">Return Qty</Label>
                          <Input
                            id={`quantity-${index}`}
                            type="number"
                            min="1"
                            max={item.quantity}
                            value={item.returnQuantity}
                            onChange={(e) => updateReturnItem(index, 'returnQuantity', parseInt(e.target.value) || 1)}
                            className="h-8 text-sm mt-0.5"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Max Qty</Label>
                          <div className="h-8 mt-0.5 flex items-center">
                            <span className="text-sm text-muted-foreground">{item.quantity}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor={`reason-${index}`} className="text-xs">Reason</Label>
                        <Input
                          id={`reason-${index}`}
                          value={item.returnReason}
                          onChange={(e) => updateReturnItem(index, 'returnReason', e.target.value)}
                          placeholder="e.g. Defective, Wrong size..."
                          className="h-8 text-sm mt-0.5"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Return Summary */}
        {selectedItemsCount > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-gray-700">Return Summary</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {/* Refund amount prominently */}
              <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2.5">
                <span className="text-sm text-gray-600">Total Refund</span>
                <span className="text-xl font-bold text-green-600">
                  {currency} {calculateRefundAmount().toFixed(2)}
                </span>
              </div>

              <div>
                <Label htmlFor="refund-method" className="text-xs">Refund Method</Label>
                <select
                  id="refund-method"
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  className="w-full mt-1 h-9 px-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="original">Original Payment Method</option>
                  <option value="cash">Cash</option>
                  <option value="store-credit">Store Credit</option>
                </select>
              </div>

              <div>
                <Label htmlFor="return-notes" className="text-xs">Additional Notes</Label>
                <Textarea
                  id="return-notes"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Any additional notes about this return..."
                  className="mt-1 text-sm min-h-[72px]"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Warning */}
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-xs text-amber-700">
            Processing a return will update inventory and create a refund record. This action cannot be undone.
          </AlertDescription>
        </Alert>

        {/* Mobile sticky submit */}
        <div className="lg:hidden pb-2">
          <Button
            className="w-full h-11"
            onClick={handleProcessReturn}
            disabled={selectedItemsCount === 0 || isProcessing}
          >
            {isProcessing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
            ) : (
              <><RotateCcw className="mr-2 h-4 w-4" />Process Return ({selectedItemsCount} item{selectedItemsCount !== 1 ? 's' : ''})</>
            )}
          </Button>
        </div>
      </div>

      {/* Alert Dialog */}
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent className="w-[calc(100%-1.5rem)] max-w-sm rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              {alertConfig.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              {alertConfig.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {alertConfig.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              setShowAlert(false);
              if (alertConfig.type === 'success') window.history.back();
            }}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

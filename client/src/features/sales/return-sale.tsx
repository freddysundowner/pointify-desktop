import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DateTime } from "@/components/date-time";
import { AlertCircle, ArrowLeft, RotateCcw, Loader2, CheckCircle, Minus, Plus } from "lucide-react";
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
                <p className="font-medium"><DateTime value={originalSale.saleDate} /></p>
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
          <CardHeader className="pb-0 pt-3 px-4">
            <CardTitle className="text-sm font-semibold text-gray-700">Select Items to Return</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="divide-y divide-gray-100">
              {returnItems.map((item, index) => (
                <div key={index} className="flex items-center gap-3 px-4 py-2.5">
                  <Checkbox
                    checked={item.shouldReturn}
                    onCheckedChange={(checked) => {
                      updateReturnItem(index, 'shouldReturn', checked);
                    }}
                    className="flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {currency} {item.unitPrice.toFixed(2)} · max {item.quantity}
                    </p>
                  </div>
                  {/* +/- stepper with editable qty */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      disabled={!item.shouldReturn || item.returnQuantity <= 1}
                      onClick={() => updateReturnItem(index, 'returnQuantity', Math.max(1, item.returnQuantity - 1))}
                      className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-600 disabled:opacity-30 hover:bg-gray-50 active:bg-gray-100"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={item.quantity}
                      disabled={!item.shouldReturn}
                      value={item.shouldReturn ? item.returnQuantity : 0}
                      onChange={(e) => {
                        const v = parseInt(e.target.value) || 1;
                        updateReturnItem(index, 'returnQuantity', Math.min(item.quantity, Math.max(1, v)));
                      }}
                      className="w-10 h-7 text-center text-sm font-semibold tabular-nums border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-30 disabled:bg-gray-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      disabled={!item.shouldReturn || item.returnQuantity >= item.quantity}
                      onClick={() => updateReturnItem(index, 'returnQuantity', Math.min(item.quantity, item.returnQuantity + 1))}
                      className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center text-gray-600 disabled:opacity-30 hover:bg-gray-50 active:bg-gray-100"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  {/* Line refund */}
                  <div className="w-20 text-right flex-shrink-0">
                    <span className={`text-sm font-semibold ${item.shouldReturn ? 'text-green-600' : 'text-gray-300'}`}>
                      {currency} {item.shouldReturn ? (item.unitPrice * item.returnQuantity).toFixed(2) : '0.00'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total refund + reason inside same card */}
            {selectedItemsCount > 0 && (
              <div className="border-t mx-4 mt-1 pt-3 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Refund</span>
                  <span className="text-base font-bold text-green-600">{currency} {calculateRefundAmount().toFixed(2)}</span>
                </div>
                <div>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                    className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="original">Original Payment Method</option>
                    <option value="cash">Cash</option>
                    <option value="store-credit">Store Credit</option>
                  </select>
                </div>
                <Textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Return reason (optional)..."
                  className="text-sm min-h-[60px] resize-none"
                />
              </div>
            )}
          </CardContent>
        </Card>

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

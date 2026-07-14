import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChefHat, Clock, CheckCircle, RefreshCw, Eye, User as UserIcon } from "lucide-react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { usePrimaryShop } from "@/hooks/usePrimaryShop";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { DateTime } from "@/components/date-time";

// Restaurant-mode cashier queue: lists sales that a waiter sent to the
// kitchen (status = "hold") and are waiting for the cashier to take
// payment. Reuses the existing hold-sale / complete-sale mechanism —
// no new backend endpoints or storage needed.
export default function PendingOrders() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { shopId, userType, attendantId, shopData } = usePrimaryShop();
  const { hasAttendantPermission, isAdmin } = usePermissions();

  const isRestaurant = !!shopData?.isRestaurant;
  const canAccess =
    isAdmin || userType === "admin" || hasAttendantPermission("pos", "cashier");

  useEffect(() => {
    if (!isRestaurant || !canAccess) {
      setLocation(userType === "attendant" ? "/attendant/dashboard" : "/dashboard");
    }
  }, [isRestaurant, canAccess]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["pending-orders", shopId],
    queryFn: async () => {
      const res = await fetch(
        `/api/sales/filter?shopId=${shopId}&status=hold&limit=100`,
        {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("attendantToken") || localStorage.getItem("authToken")}`,
          },
        },
      );
      if (!res.ok) throw new Error("Failed to load pending orders");
      return res.json();
    },
    enabled: !!shopId,
    staleTime: 0,
    refetchInterval: 10000,
  });

  const orders = ((data?.data || []) as any[]).map((sale) => {
    const subtotal = Number(sale.totalAmount) || 0;
    const tax = Number(sale.totaltax) || 0;
    const discount = Number(sale.discount) || 0;
    const totalAmount = Number(sale.totalWithDiscount) || subtotal;
    return {
      id: sale._id,
      receiptNo: sale.receiptNo || sale._id,
      customerName: sale.customerId?.name || "Walk-in",
      customerPhone: sale.customerId?.phone || "",
      subtotal,
      tax,
      discount,
      totalAmount,
      createdAt: sale.createdAt,
      attendantName: sale.attendantId?.username || "Unknown",
      notes: sale.notes || sale.orderNotes || "",
      items: (sale.items || []).map((item: any) => {
        const unitPrice = Number(item?.unitPrice ?? item?.sellingPrice ?? item?.product?.sellingPrice) || 0;
        const quantity = Number(item.quantity) || 0;
        const lineTotal = Number(item?.totalPrice) || unitPrice * quantity;
        return {
          name: item.product?.name || item.name || "Item",
          quantity,
          unitPrice,
          lineTotal,
        };
      }),
    };
  });

  // Complete Sale dialog state
  const [completeOpen, setCompleteOpen] = useState(false);
  const [orderToComplete, setOrderToComplete] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);

  // Order preview dialog state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [orderToPreview, setOrderToPreview] = useState<any>(null);

  const openPreview = (order: any) => {
    setOrderToPreview(order);
    setPreviewOpen(true);
  };

  const openComplete = (order: any) => {
    setOrderToComplete(order);
    setAmountPaid(order.totalAmount.toFixed(2));
    setPaymentMethod("cash");
    setCompleteOpen(true);
    setPreviewOpen(false);
  };

  const confirmComplete = async () => {
    if (!orderToComplete) return;
    setIsCompleting(true);
    try {
      const res = await fetch(`/api/sales/${orderToComplete.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("attendantToken") || localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({
          status: "cashed",
          paymentTag: paymentMethod,
          amountPaid: parseFloat(amountPaid) || orderToComplete.totalAmount,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to complete order");
      }
      toast({
        title: "Order Paid",
        description: `Order #${orderToComplete.receiptNo} has been marked as paid.`,
      });
      setCompleteOpen(false);
      setOrderToComplete(null);
      queryClient.invalidateQueries({ queryKey: ["pending-orders", shopId] });
      queryClient.invalidateQueries({
        predicate: (query) => String(query.queryKey[0] || "").includes("/api/sales"),
      });
    } catch (error: any) {
      toast({
        title: "Failed to Complete Order",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  if (!isRestaurant || !canAccess) return null;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <PageHeader
          title="Pending Orders"
          subtitle="Orders sent from the kitchen, waiting for payment"
          backHref={userType === "attendant" ? "/attendant/dashboard" : "/dashboard"}
          actions={
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          }
        />

        {isLoading ? (
          <div className="text-center py-16 text-gray-500">Loading pending orders...</div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-gray-500">
              <ChefHat className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No pending orders</p>
              <p className="text-sm">Orders printed from the POS will show up here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <Card
                key={order.id}
                className="border-purple-100 cursor-pointer hover:border-purple-300 hover:shadow-sm transition-all"
                onClick={() => openPreview(order)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">#{order.receiptNo}</p>
                        <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <DateTime value={order.createdAt} />
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <UserIcon className="h-3 w-3" /> {order.customerName}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {order.items.map((item: any) => `${item.name} x${item.quantity}`).join(", ")}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">Waiter: {order.attendantName}</p>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="font-bold text-purple-700 whitespace-nowrap">
                        Ksh {order.totalAmount.toFixed(2)}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPreview(order);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            openComplete(order);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Take Payment
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Order Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-purple-600" />
              Order #{orderToPreview?.receiptNo}
            </DialogTitle>
          </DialogHeader>
          {orderToPreview && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <UserIcon className="h-3.5 w-3.5" /> {orderToPreview.customerName}
                  {orderToPreview.customerPhone ? ` • ${orderToPreview.customerPhone}` : ""}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <DateTime value={orderToPreview.createdAt} />
                </span>
              </div>
              <p className="text-xs text-gray-400">Waiter: {orderToPreview.attendantName}</p>

              <div className="border rounded-lg divide-y">
                {orderToPreview.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">
                        {item.quantity} x Ksh {item.unitPrice.toFixed(2)}
                      </p>
                    </div>
                    <span className="font-medium text-gray-700 whitespace-nowrap">
                      Ksh {item.lineTotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {orderToPreview.notes && (
                <div className="text-xs bg-amber-50 border border-amber-100 text-amber-800 rounded-lg px-3 py-2">
                  <span className="font-medium">Note: </span>
                  {orderToPreview.notes}
                </div>
              )}

              <div className="space-y-1 text-sm border-t pt-2">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>Ksh {orderToPreview.subtotal.toFixed(2)}</span>
                </div>
                {orderToPreview.tax > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Tax</span>
                    <span>Ksh {orderToPreview.tax.toFixed(2)}</span>
                  </div>
                )}
                {orderToPreview.discount > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Discount</span>
                    <span>- Ksh {orderToPreview.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-purple-700 text-base">
                  <span>Total</span>
                  <span>Ksh {orderToPreview.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <Button
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={() => openComplete(orderToPreview)}
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Take Payment
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Complete Order #{orderToComplete?.receiptNo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount Paid</Label>
              <Input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
              />
            </div>
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700"
              onClick={confirmComplete}
              disabled={isCompleting}
            >
              {isCompleting ? "Processing..." : "Confirm Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

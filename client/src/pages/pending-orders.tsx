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
import { ChefHat, Clock, CheckCircle, RefreshCw, Eye, User as UserIcon, Flame, UtensilsCrossed, Receipt } from "lucide-react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { usePrimaryShop } from "@/hooks/usePrimaryShop";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { DateTime } from "@/components/date-time";

// Elapsed-time badge: green while fresh, amber once it's been waiting a
// while, red once it's been sitting long enough to need attention.
function useElapsedMinutes(createdAt: string) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);
  const created = new Date(createdAt).getTime();
  if (!created || Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / 60000));
}

function formatElapsed(minutes: number, createdAt: string) {
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remMinutes = minutes % 60;
    return remMinutes > 0 ? `${hours}h ${remMinutes}m ago` : `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  // Beyond a week, a relative count stops being useful — show the actual date.
  return new Date(createdAt).toLocaleDateString();
}

function ElapsedBadge({ createdAt }: { createdAt: string }) {
  const minutes = useElapsedMinutes(createdAt);
  const urgent = minutes >= 15;
  const warm = minutes >= 5 && minutes < 15;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
        urgent
          ? "bg-red-100 text-red-700"
          : warm
          ? "bg-amber-100 text-amber-700"
          : "bg-emerald-100 text-emerald-700"
      }`}
    >
      {urgent ? <Flame className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {formatElapsed(minutes, createdAt)}
    </span>
  );
}

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
      <div className="space-y-4 -mx-3 lg:-mx-6 -mt-0">
        {/* Restaurant-style orders board header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 lg:px-6 py-5 text-white">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
                <UtensilsCrossed className="h-5 w-5 text-purple-300" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Kitchen Orders</h1>
                <p className="text-xs text-slate-400">Sent from the kitchen &middot; waiting for payment</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-semibold">{orders.length}</span>
                <span className="text-xs text-slate-400">{orders.length === 1 ? "order" : "orders"} waiting</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="bg-white/5 border-white/15 text-white hover:bg-white/10 hover:text-white"
              >
                <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <div className="px-4 lg:px-6 pb-2">
          <button
            onClick={() => setLocation(userType === "attendant" ? "/attendant/dashboard" : "/dashboard")}
            className="text-sm text-purple-700 hover:text-purple-800 font-medium flex items-center gap-1"
          >
            &larr; Back
          </button>
        </div>

        <div className="px-4 lg:px-6">
        {isLoading ? (
          <div className="text-center py-16 text-gray-500">Loading pending orders...</div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-gray-500">
              <ChefHat className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">All caught up</p>
              <p className="text-sm">Orders sent from the kitchen will show up here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {orders.map((order) => (
              <div
                key={order.id}
                onClick={() => openPreview(order)}
                className="relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer overflow-hidden"
              >
                {/* Ticket header strip */}
                <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-dashed border-slate-200">
                  <div className="flex items-center gap-2">
                    <ChefHat className="h-4 w-4 text-purple-500" />
                    <span className="font-mono font-bold text-sm text-slate-800">#{order.receiptNo}</span>
                  </div>
                  <ElapsedBadge createdAt={order.createdAt} />
                </div>

                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 truncate">
                      <UserIcon className="h-3 w-3 shrink-0" /> {order.customerName}
                    </span>
                    <span className="shrink-0">Waiter: {order.attendantName}</span>
                  </div>

                  <div className="space-y-1">
                    {order.items.slice(0, 3).map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-slate-700 truncate pr-2">{item.name}</span>
                        <span className="font-medium text-slate-400 shrink-0">x{item.quantity}</span>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-xs text-slate-400">+{order.items.length - 3} more item(s)</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-200">
                    <span className="text-xs text-slate-400">{order.items.length} item{order.items.length === 1 ? "" : "s"}</span>
                    <span className="font-bold text-purple-700">Ksh {order.totalAmount.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
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
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        openComplete(order);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Pay
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Order Preview Dialog — styled like a printed receipt */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-xs p-0 overflow-hidden bg-transparent border-none shadow-none">
          {orderToPreview && (
            <div className="bg-white mx-auto w-full rounded-sm shadow-xl font-mono text-[13px] text-slate-800"
                 style={{
                   backgroundImage:
                     "repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.015) 3px, rgba(0,0,0,0.015) 6px)",
                 }}>
              {/* Serrated top edge */}
              <div
                className="h-2 w-full"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, white 50%, transparent 50%), linear-gradient(-135deg, white 50%, transparent 50%)",
                  backgroundSize: "10px 10px",
                  backgroundPosition: "top",
                  backgroundRepeat: "repeat-x",
                }}
              />

              <div className="px-5 pt-1 pb-4 space-y-3">
                {/* Shop header */}
                <div className="text-center space-y-0.5 pb-2">
                  <p className="font-bold text-sm tracking-wide uppercase">{shopData?.name || "Restaurant"}</p>
                  <p className="text-[11px] text-slate-500">Kitchen Order Receipt</p>
                </div>

                <div className="border-t border-dashed border-slate-300" />

                <div className="space-y-0.5 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order #</span>
                    <span className="font-bold">{orderToPreview.receiptNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date</span>
                    <span><DateTime value={orderToPreview.createdAt} /></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer</span>
                    <span className="truncate max-w-[60%] text-right">{orderToPreview.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Waiter</span>
                    <span>{orderToPreview.attendantName}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-300" />

                {/* Items */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-slate-400 uppercase tracking-wide">
                    <span>Item</span>
                    <span>Total</span>
                  </div>
                  {orderToPreview.items.map((item: any, idx: number) => (
                    <div key={idx} className="text-[12.5px]">
                      <div className="flex justify-between">
                        <span className="pr-2">{item.name}</span>
                        <span className="whitespace-nowrap">{item.lineTotal.toFixed(2)}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.quantity} x {item.unitPrice.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                {orderToPreview.notes && (
                  <>
                    <div className="border-t border-dashed border-slate-300" />
                    <p className="text-[11px] text-slate-600">
                      <span className="font-semibold">Note: </span>
                      {orderToPreview.notes}
                    </p>
                  </>
                )}

                <div className="border-t border-dashed border-slate-300" />

                <div className="space-y-1 text-[12.5px]">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span>Ksh {orderToPreview.subtotal.toFixed(2)}</span>
                  </div>
                  {orderToPreview.tax > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Tax</span>
                      <span>Ksh {orderToPreview.tax.toFixed(2)}</span>
                    </div>
                  )}
                  {orderToPreview.discount > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Discount</span>
                      <span>- Ksh {orderToPreview.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-dashed border-slate-300 my-1" />
                  <div className="flex justify-between font-bold text-base">
                    <span>TOTAL</span>
                    <span>Ksh {orderToPreview.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-300" />
                <p className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <Receipt className="h-3 w-3" /> Awaiting Payment
                </p>

                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 font-sans mt-2"
                  onClick={() => openComplete(orderToPreview)}
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Take Payment
                </Button>
              </div>

              {/* Serrated bottom edge */}
              <div
                className="h-2 w-full"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg, white 50%, transparent 50%), linear-gradient(-45deg, white 50%, transparent 50%)",
                  backgroundSize: "10px 10px",
                  backgroundPosition: "bottom",
                  backgroundRepeat: "repeat-x",
                }}
              />
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

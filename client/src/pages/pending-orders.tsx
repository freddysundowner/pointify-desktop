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
import { ChefHat, Clock, CheckCircle, RefreshCw } from "lucide-react";
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

  const orders = ((data?.data || []) as any[]).map((sale) => ({
    id: sale._id,
    receiptNo: sale.receiptNo || sale._id,
    customerName: sale.customerId?.name || "Walk-in",
    totalAmount: sale.totalWithDiscount || sale.totalAmount || 0,
    createdAt: sale.createdAt,
    attendantName: sale.attendantId?.username || "Unknown",
    items: (sale.items || []).map((item: any) => ({
      name: item.product?.name || item.name || "Item",
      quantity: item.quantity,
    })),
  }));

  // Complete Sale dialog state
  const [completeOpen, setCompleteOpen] = useState(false);
  const [orderToComplete, setOrderToComplete] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);

  const openComplete = (order: any) => {
    setOrderToComplete(order);
    setAmountPaid(order.totalAmount.toFixed(2));
    setPaymentMethod("cash");
    setCompleteOpen(true);
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {orders.map((order) => (
              <Card key={order.id} className="border-purple-100">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">#{order.receiptNo}</p>
                      <p className="text-xs text-gray-500">{order.customerName}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <DateTime value={order.createdAt} />
                    </Badge>
                  </div>

                  <div className="space-y-1 border-t border-b py-2">
                    {order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-700">{item.name}</span>
                        <span className="font-medium text-gray-500">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Waiter: {order.attendantName}</span>
                    <span className="font-bold text-purple-700">Ksh {order.totalAmount.toFixed(2)}</span>
                  </div>

                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={() => openComplete(order)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    Take Payment
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

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

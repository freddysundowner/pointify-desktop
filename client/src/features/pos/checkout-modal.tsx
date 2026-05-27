import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  X, CreditCard, Banknote, UserX, User, Wallet,
  Smartphone, Building2, SplitSquareHorizontal, Check,
  UserPlus, ChevronDown, Send, Copy, AlertCircle, ArrowLeft
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS, apiCall } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/features/auth/useAuth";
import type { CartItem, Transaction } from "@shared/schema";

type PaymentMethod = "cash" | "wallet" | "split" | "mpesa" | "bank" | "card" | "credit" | null;

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  totals: {
    subtotal: number;
    tax: number;
    total: number;
  };
  onComplete: (transaction: Transaction) => void;
}

const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  icon: React.ReactNode;
  accent?: string;
}[] = [
  { id: "cash",   label: "Cash",   icon: <Banknote className="h-6 w-6" /> },
  { id: "wallet", label: "Wallet", icon: <Wallet className="h-6 w-6" /> },
  { id: "split",  label: "Split",  icon: <SplitSquareHorizontal className="h-6 w-6" /> },
  { id: "mpesa",  label: "M-Pesa", icon: <Smartphone className="h-6 w-6" /> },
  { id: "bank",   label: "Bank",   icon: <Building2 className="h-6 w-6" /> },
  { id: "card",   label: "Card",   icon: <CreditCard className="h-6 w-6" /> },
  { id: "credit", label: "Credit", icon: <UserX className="h-6 w-6" />, accent: "orange" },
];

export default function CheckoutModal({
  isOpen,
  onClose,
  cartItems,
  totals,
  onComplete,
}: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [cashReceived, setCashReceived] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  // M-Pesa flow state
  type MpesaPath = null | "stk" | "direct" | "manual";
  type MpesaStatus = "idle" | "sending" | "waiting" | "success" | "failed" | "timeout";
  const [mpesaPath, setMpesaPath] = useState<MpesaPath>(null);
  const [mpesaPhone, setMpesaPhone] = useState<string>("");
  const [mpesaStatus, setMpesaStatus] = useState<MpesaStatus>("idle");
  const [mpesaTxnId, setMpesaTxnId] = useState<string | null>(null);
  const [mpesaRef, setMpesaRef] = useState<string | null>(null);
  const [mpesaPayerName, setMpesaPayerName] = useState<string | null>(null);
  const [mpesaError, setMpesaError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStopAtRef = useRef<number>(0);
  // Increments every reset/close. Every async callback captures this and
  // bails if it changed — prevents stale results from resurrecting a cancelled flow.
  const flowIdRef = useRef<number>(0);

  const SUNPAY_PAYBILL = import.meta.env.VITE_SUNPAY_PAYBILL || "247247";

  const { toast } = useToast();
  const { admin, token } = useAuth();
  const queryClient = useQueryClient();
  const shopId = admin?.shopId || admin?.shop || admin?.primaryShop;

  const { data: shop } = useQuery<any>({
    queryKey: ["shop", shopId],
    queryFn: async () => {
      const res = await apiCall(API_ENDPOINTS.shop.getShopById(shopId as string));
      return res.json();
    },
    enabled: !!shopId && !!token,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const adminid = admin?._id || admin?.id;
      const params = new URLSearchParams({ adminid: adminid || "" });
      const response = await apiRequest("GET", `/api/customers?${params.toString()}`);
      const data = await response.json();
      return Array.isArray(data) ? data : data?.customers || data?.data || [];
    },
    enabled: !!admin && !!token,
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (transactionData: any) => {
      return await apiCall(API_ENDPOINTS.sales.create, {
        method: "POST",
        body: JSON.stringify(transactionData),
      });
    },
    onSuccess: (transaction: Transaction) => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      onComplete(transaction);
      resetModal();
      toast({ title: "Payment Successful", description: "Transaction completed successfully" });
    },
    onError: () => {
      toast({
        title: "Payment Failed",
        description: "There was an error processing the payment",
        variant: "destructive",
      });
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (payload: { name: string; phonenumber: string }) => {
      const adminid = admin?._id || admin?.id;
      const shopId = admin?.shopId || admin?.shop;
      const response = await apiRequest("POST", "/api/customers", {
        name: payload.name,
        phonenumber: payload.phonenumber,
        email: "",
        address: "",
        wallet: 0,
        shopId,
        adminid,
      });
      return response.json();
    },
    onSuccess: (newCustomer: any) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setSelectedCustomer(newCustomer);
      setShowAddCustomer(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      toast({ title: "Customer Added", description: `${newCustomer.name} was created and selected.` });
    },
    onError: () => {
      toast({ title: "Failed to create customer", variant: "destructive" });
    },
  });

  const handleCreateCustomer = () => {
    const name = newCustomerName.trim();
    if (!name) return;
    createCustomerMutation.mutate({ name, phonenumber: newCustomerPhone.trim() });
  };

  // ---------- M-Pesa helpers ----------
  const normalizeKePhone = (raw: string) => {
    const d = (raw || "").replace(/\D/g, "");
    if (d.startsWith("254")) return d;
    if (d.startsWith("0")) return "254" + d.slice(1);
    if (d.startsWith("7") || d.startsWith("1")) return "254" + d;
    return d;
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const resetMpesa = () => {
    stopPolling();
    flowIdRef.current += 1; // invalidate any in-flight async callbacks
    setMpesaPath(null);
    setMpesaPhone("");
    setMpesaStatus("idle");
    setMpesaTxnId(null);
    setMpesaRef(null);
    setMpesaPayerName(null);
    setMpesaError(null);
    setManualCode("");
  };

  const startPolling = (txnId: string, timeoutMs: number, flowId: number) => {
    stopPolling();
    pollStopAtRef.current = Date.now() + timeoutMs;
    pollRef.current = setInterval(async () => {
      if (flowIdRef.current !== flowId) { stopPolling(); return; }
      if (Date.now() > pollStopAtRef.current) {
        stopPolling();
        if (flowIdRef.current === flowId) setMpesaStatus("timeout");
        return;
      }
      try {
        const res = await apiCall(API_ENDPOINTS.mpesa.status(txnId));
        const data = await res.json();
        if (flowIdRef.current !== flowId) return; // flow was reset/cancelled
        if (data.status === "paid" || data.status === "completed" || data.status === "success") {
          stopPolling();
          setMpesaRef(data.mpesaRef || data.settlementRef || null);
          setMpesaPayerName(data.payerName || null);
          if (data.payerPhone && !mpesaPhone) setMpesaPhone(data.payerPhone);
          setMpesaStatus("success");
        } else if (data.status === "failed" || data.status === "cancelled") {
          stopPolling();
          setMpesaError(data.resultDesc || "Payment was cancelled or failed");
          setMpesaStatus("failed");
        }
      } catch (err: any) {
        // transient errors during polling — keep trying until timeout
        console.warn("M-Pesa poll error:", err?.message);
      }
    }, 3000);
  };

  const stkPushMutation = useMutation({
    mutationFn: async () => {
      const phone = normalizeKePhone(mpesaPhone);
      if (!phone || phone.length < 12) throw new Error("Enter a valid phone number");
      const flowId = flowIdRef.current;
      const res = await apiCall(API_ENDPOINTS.mpesa.stkPush, {
        method: "POST",
        body: JSON.stringify({
          shopId,
          phone,
          amount: totals.total,
          saleRef: `sale-${Date.now()}`,
        }),
      });
      const data = await res.json();
      return { data, flowId };
    },
    onSuccess: ({ data, flowId }) => {
      if (flowIdRef.current !== flowId) return;
      if (!data?.transactionId) {
        setMpesaStatus("failed");
        setMpesaError("Proxy returned no transaction id");
        return;
      }
      setMpesaTxnId(data.transactionId);
      setMpesaStatus("waiting");
      startPolling(data.transactionId, 90_000, flowId);
    },
    onError: (err: any) => {
      setMpesaStatus("failed");
      setMpesaError(err?.message || "Could not send STK push");
    },
  });

  const expectMutation = useMutation({
    mutationFn: async () => {
      const flowId = flowIdRef.current;
      const res = await apiCall(API_ENDPOINTS.mpesa.expect, {
        method: "POST",
        body: JSON.stringify({
          shopId,
          amount: totals.total,
          saleRef: `sale-${Date.now()}`,
        }),
      });
      const data = await res.json();
      return { data, flowId };
    },
    onSuccess: ({ data, flowId }) => {
      if (flowIdRef.current !== flowId) return;
      if (!data?.transactionId) {
        setMpesaStatus("failed");
        setMpesaError("Proxy returned no transaction id");
        return;
      }
      setMpesaTxnId(data.transactionId);
      setMpesaStatus("waiting");
      startPolling(data.transactionId, 180_000, flowId);
    },
    onError: (err: any) => {
      setMpesaStatus("failed");
      setMpesaError(err?.message || "Could not register payment");
    },
  });

  const lookupMutation = useMutation({
    mutationFn: async () => {
      const code = manualCode.trim().toUpperCase();
      if (!code) throw new Error("Enter the M-Pesa code");
      const flowId = flowIdRef.current;
      const params = new URLSearchParams({ code, shopId: shopId || "" });
      const res = await apiCall(`${API_ENDPOINTS.mpesa.lookup}?${params.toString()}`);
      const data = await res.json();
      return { data, flowId, code };
    },
    onSuccess: ({ data, flowId, code }) => {
      if (flowIdRef.current !== flowId) return;
      if (data && (data.status === "paid" || data.found)) {
        setMpesaRef(data.mpesaRef || code);
        setMpesaPayerName(data.payerName || null);
        if (data.payerPhone) setMpesaPhone(data.payerPhone);
        setMpesaStatus("success");
      } else {
        setMpesaError("Code not found yet. Wait a few seconds and try again.");
      }
    },
    onError: (err: any) => setMpesaError(err?.message || "Lookup failed"),
  });

  const copy = (value: string) => {
    navigator.clipboard?.writeText(value);
    toast({ title: "Copied", description: value });
  };

  // Prefill phone from selected customer
  useEffect(() => {
    if (paymentMethod === "mpesa" && selectedCustomer && !mpesaPhone) {
      const p = selectedCustomer.phonenumber || selectedCustomer.phone;
      if (p) setMpesaPhone(p);
    }
  }, [paymentMethod, selectedCustomer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop polling on unmount / close
  useEffect(() => () => stopPolling(), []);

  const resetModal = () => {
    setPaymentMethod(null);
    setCashReceived("");
    setSelectedCustomer(null);
    setShowAddCustomer(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
    resetMpesa();
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const calculateChange = () => {
    const received = parseFloat(cashReceived) || 0;
    return Math.max(0, received - totals.total);
  };

  const canComplete = () => {
    if (!paymentMethod) return false;
    if (paymentMethod === "cash") {
      const received = parseFloat(cashReceived) || 0;
      return received >= totals.total;
    }
    if (paymentMethod === "credit") return selectedCustomer !== null;
    if (paymentMethod === "mpesa") return Boolean(mpesaRef);
    return true;
  };

  const handleComplete = () => {
    if (!canComplete()) return;
    createTransactionMutation.mutate({
      subtotal: totals.subtotal.toFixed(2),
      tax: totals.tax.toFixed(2),
      totalTax: totals.tax.toFixed(2),
      total: totals.total.toFixed(2),
      paymentMethod: paymentMethod!,
      cashReceived: paymentMethod === "cash" ? parseFloat(cashReceived).toFixed(2) : null,
      change: paymentMethod === "cash" ? calculateChange().toFixed(2) : null,
      customerId: paymentMethod === "credit" ? selectedCustomer?._id : null,
      customerName: paymentMethod === "credit" ? selectedCustomer?.name : null,
      mpesaRef: paymentMethod === "mpesa" ? mpesaRef : null,
      mpesaTransactionId: paymentMethod === "mpesa" ? mpesaTxnId : null,
      payerPhone: paymentMethod === "mpesa" ? normalizeKePhone(mpesaPhone) : null,
      payerName: paymentMethod === "mpesa" ? mpesaPayerName : null,
      items: cartItems,
      cashierId: 1,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 overflow-y-auto max-h-[90vh] rounded-3xl border-0 shadow-2xl bg-white gap-0">

        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 text-center">
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
          <h2 className="text-xl font-bold text-green-500 tracking-wide">Payment</h2>
        </div>

        <div className="px-6 pb-6 space-y-5">

          {/* Total Amount */}
          <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-5 py-4">
            <span className="text-base font-semibold text-gray-700">Total Amount:</span>
            <span className="text-2xl font-extrabold text-green-500">
              Ksh {totals.total.toFixed(2)}
            </span>
          </div>

          {/* Payment Methods */}
          <div>
            <p className="text-sm font-medium text-gray-500 mb-3">Select Payment Method:</p>
            <div className="grid grid-cols-3 gap-3">
              {PAYMENT_METHODS.map(({ id, label, icon, accent }) => {
                const isSelected = paymentMethod === id;
                const isOrange = accent === "orange";
                return (
                  <button
                    key={id}
                    onClick={() => {
                      if (paymentMethod === "mpesa" && id !== "mpesa") resetMpesa();
                      setPaymentMethod(id);
                    }}
                    className={`
                      flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-2xl border-2
                      transition-all duration-150 text-sm font-medium
                      ${isSelected
                        ? isOrange
                          ? "border-orange-400 bg-orange-50 text-orange-600"
                          : "border-green-400 bg-green-50 text-green-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                      }
                    `}
                  >
                    <span className={isSelected ? (isOrange ? "text-orange-500" : "text-green-600") : "text-gray-400"}>
                      {icon}
                    </span>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash panel */}
          {paymentMethod === "cash" && (
            <div className="space-y-3 bg-gray-50 rounded-2xl p-4">
              <div>
                <Label htmlFor="cashReceived" className="text-sm font-semibold text-gray-700 mb-2 block">
                  Cash Received
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-lg">Ksh</span>
                  <Input
                    id="cashReceived"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    className="h-14 rounded-xl text-xl font-bold pl-14 border-gray-200 focus:border-green-400 bg-white"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick amount presets */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  Math.ceil(totals.total / 50) * 50,
                  Math.ceil(totals.total / 100) * 100,
                  Math.ceil(totals.total / 500) * 500,
                  Math.ceil(totals.total / 1000) * 1000,
                ].filter((v, i, arr) => arr.indexOf(v) === i && v > totals.total - 0.01)
                  .slice(0, 4)
                  .map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setCashReceived(String(amount))}
                      className={`py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
                        parseFloat(cashReceived) === amount
                          ? "border-green-400 bg-green-50 text-green-700"
                          : "border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:bg-green-50"
                      }`}
                    >
                      {amount}
                    </button>
                  ))}
              </div>

              {/* Change */}
              <div className={`flex justify-between items-center rounded-xl px-4 py-3 border-2 transition-colors ${
                parseFloat(cashReceived) >= totals.total
                  ? "bg-green-50 border-green-200"
                  : "bg-white border-gray-200"
              }`}>
                <span className="font-semibold text-gray-700">Change Due:</span>
                <span className={`text-2xl font-extrabold ${
                  parseFloat(cashReceived) >= totals.total ? "text-green-600" : "text-gray-300"
                }`}>
                  Ksh {calculateChange().toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Card panel */}
          {paymentMethod === "card" && (
            <div className="flex flex-col items-center py-6 bg-gray-50 rounded-2xl gap-3">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow">
                <CreditCard className="h-8 w-8 text-white" />
              </div>
              <p className="font-semibold text-gray-700">Ready for card payment</p>
              <p className="text-sm text-gray-500">Insert, tap, or swipe your card</p>
              <div className="w-6 h-6 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
            </div>
          )}

          {/* M-Pesa panel */}
          {paymentMethod === "mpesa" && (
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">

              {/* Shop not linked — block flow */}
              {shop && !shop.sunpay_merchant_ref && (
                <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>This shop isn't linked to SunPay yet. Set the till/paybill in Shop Details to enable M-Pesa.</span>
                </div>
              )}

              {/* Choose path */}
              {!mpesaPath && shop?.sunpay_merchant_ref && (
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => setMpesaPath("stk")}
                    data-testid="button-mpesa-stk"
                    className="flex items-center gap-3 p-3 rounded-xl border-2 border-green-200 bg-white hover:border-green-400 hover:bg-green-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center">
                      <Send className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 text-sm">Send STK Push</div>
                      <div className="text-xs text-gray-500">Prompt the customer's phone</div>
                    </div>
                  </button>
                  <button
                    onClick={() => { setMpesaPath("direct"); expectMutation.mutate(); }}
                    data-testid="button-mpesa-direct"
                    className="flex items-center gap-3 p-3 rounded-xl border-2 border-green-200 bg-white hover:border-green-400 hover:bg-green-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 text-sm">Customer Pays Direct</div>
                      <div className="text-xs text-gray-500">Show paybill, wait for payment</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setMpesaPath("manual")}
                    data-testid="button-mpesa-manual"
                    className="text-xs text-gray-500 hover:text-green-600 underline mt-1 self-center"
                  >
                    Already paid? Look up M-Pesa code
                  </button>
                </div>
              )}

              {/* Back link */}
              {mpesaPath && mpesaStatus !== "success" && (
                <button
                  onClick={resetMpesa}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="h-3 w-3" /> Choose another method
                </button>
              )}

              {/* STK PUSH PATH */}
              {mpesaPath === "stk" && mpesaStatus !== "success" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1 block">Customer Phone</Label>
                    <Input
                      type="tel"
                      placeholder="07XX XXX XXX"
                      value={mpesaPhone}
                      onChange={(e) => setMpesaPhone(e.target.value)}
                      disabled={mpesaStatus === "waiting" || mpesaStatus === "sending"}
                      className="h-11 rounded-xl border-gray-200 focus:border-green-400 bg-white"
                      autoFocus
                      data-testid="input-mpesa-phone"
                    />
                  </div>

                  {mpesaStatus === "idle" || mpesaStatus === "failed" ? (
                    <Button
                      onClick={() => { setMpesaError(null); setMpesaStatus("sending"); stkPushMutation.mutate(); }}
                      disabled={!mpesaPhone || stkPushMutation.isPending}
                      className="w-full h-11 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold"
                      data-testid="button-send-stk"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {stkPushMutation.isPending ? "Sending..." : "Send STK Push"}
                    </Button>
                  ) : null}

                  {mpesaStatus === "waiting" && (
                    <div className="flex flex-col items-center py-4 gap-2">
                      <div className="w-10 h-10 rounded-full border-3 border-green-500 border-t-transparent animate-spin" />
                      <p className="text-sm font-medium text-gray-700">Waiting for customer...</p>
                      <p className="text-xs text-gray-500">They should enter their M-Pesa PIN on their phone</p>
                    </div>
                  )}

                  {mpesaError && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">
                      {mpesaError}
                    </div>
                  )}

                  {mpesaStatus === "timeout" && (
                    <button
                      onClick={() => setMpesaPath("manual")}
                      className="text-xs text-green-600 hover:underline w-full text-center"
                    >
                      Timed out — enter M-Pesa code manually
                    </button>
                  )}
                </div>
              )}

              {/* DIRECT PAY PATH */}
              {mpesaPath === "direct" && mpesaStatus !== "success" && (
                <div className="space-y-3">
                  <div className="bg-white rounded-xl border-2 border-green-200 p-4 space-y-3">
                    <p className="text-xs text-gray-500 text-center font-medium">Ask the customer to pay via M-Pesa:</p>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2.5">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-green-700 font-semibold">Paybill</div>
                          <div className="text-xl font-extrabold text-green-700 tracking-wide" data-testid="text-paybill">{SUNPAY_PAYBILL}</div>
                        </div>
                        <button onClick={() => copy(String(SUNPAY_PAYBILL))} className="p-2 rounded-lg hover:bg-green-100">
                          <Copy className="h-4 w-4 text-green-600" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2.5">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-green-700 font-semibold">Account Number</div>
                          <div className="text-xl font-extrabold text-green-700 tracking-wide" data-testid="text-account">
                            {shop?.sunpay_merchant_ref || shop?.paybill_till || "—"}
                          </div>
                        </div>
                        <button
                          onClick={() => copy(String(shop?.sunpay_merchant_ref || shop?.paybill_till || ""))}
                          className="p-2 rounded-lg hover:bg-green-100"
                        >
                          <Copy className="h-4 w-4 text-green-600" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2.5">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-green-700 font-semibold">Amount</div>
                          <div className="text-xl font-extrabold text-green-700 tracking-wide">Ksh {totals.total.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {mpesaStatus === "waiting" && (
                    <div className="flex flex-col items-center py-2 gap-2">
                      <div className="w-8 h-8 rounded-full border-3 border-green-500 border-t-transparent animate-spin" />
                      <p className="text-sm font-medium text-gray-700">Waiting for payment...</p>
                      <p className="text-xs text-gray-500">We'll detect it automatically</p>
                    </div>
                  )}

                  {mpesaError && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">
                      {mpesaError}
                    </div>
                  )}

                  {(mpesaStatus === "timeout" || mpesaStatus === "failed") && (
                    <button
                      onClick={() => setMpesaPath("manual")}
                      className="text-xs text-green-600 hover:underline w-full text-center"
                    >
                      Not detected — enter M-Pesa code manually
                    </button>
                  )}
                </div>
              )}

              {/* MANUAL LOOKUP PATH */}
              {mpesaPath === "manual" && mpesaStatus !== "success" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1 block">M-Pesa Confirmation Code</Label>
                    <Input
                      placeholder="e.g. QJG7A5BKLN"
                      value={manualCode}
                      onChange={(e) => { setManualCode(e.target.value.toUpperCase()); setMpesaError(null); }}
                      className="h-11 rounded-xl border-gray-200 focus:border-green-400 bg-white font-mono uppercase tracking-wider"
                      autoFocus
                      data-testid="input-mpesa-code"
                    />
                  </div>
                  <Button
                    onClick={() => lookupMutation.mutate()}
                    disabled={!manualCode.trim() || lookupMutation.isPending}
                    className="w-full h-11 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold"
                    data-testid="button-lookup-code"
                  >
                    {lookupMutation.isPending ? "Looking up..." : "Verify Code"}
                  </Button>
                  {mpesaError && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">
                      {mpesaError}
                    </div>
                  )}
                </div>
              )}

              {/* SUCCESS — same for all paths */}
              {mpesaStatus === "success" && (
                <div className="flex flex-col items-center bg-green-50 border-2 border-green-200 rounded-xl py-4 px-3 gap-2">
                  <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="h-7 w-7 text-white" strokeWidth={3} />
                  </div>
                  <p className="font-bold text-green-700">Payment Received</p>
                  {mpesaRef && (
                    <div className="text-xs font-mono bg-white px-3 py-1 rounded-md border border-green-200 text-green-700" data-testid="text-mpesa-ref">
                      {mpesaRef}
                    </div>
                  )}
                  {mpesaPayerName && (
                    <p className="text-xs text-gray-600">From {mpesaPayerName}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Wallet / Bank / Split placeholders */}
          {(paymentMethod === "wallet" || paymentMethod === "bank" || paymentMethod === "split") && (
            <div className="flex flex-col items-center py-6 bg-gray-50 rounded-2xl gap-3">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow text-white">
                {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.icon}
              </div>
              <p className="font-semibold text-gray-700">
                {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label} Payment
              </p>
              <p className="text-sm text-gray-500">Confirm to complete the transaction</p>
            </div>
          )}

          {/* Credit panel */}
          {paymentMethod === "credit" && (
            <div className="space-y-3 bg-orange-50 rounded-2xl p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-1">
                <UserX className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-semibold text-orange-700">Credit Sale</span>
              </div>

              {/* Customer selector — hidden when add-customer form is open */}
              {!showAddCustomer && (
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">Select Customer *</Label>
                  <Select
                    value={selectedCustomer?._id ?? ""}
                    onValueChange={(value) => {
                      setSelectedCustomer(customers.find((c: any) => c._id === value));
                    }}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-orange-200 focus:border-orange-400 bg-white">
                      <SelectValue placeholder="Choose a customer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer: any) => (
                        <SelectItem key={customer._id} value={customer._id}>
                          <span className="font-medium">{customer.name}</span>
                          {(customer.phonenumber || customer.phone) && (
                            <span className="text-sm text-gray-500 ml-2">
                              ({customer.phonenumber || customer.phone})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Selected customer badge */}
              {!showAddCustomer && selectedCustomer && (
                <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-orange-200">
                  <div>
                    <p className="font-semibold text-gray-900">{selectedCustomer.name}</p>
                    <p className="text-xs text-gray-500">
                      Balance: Ksh {Math.abs(selectedCustomer.balance || 0).toFixed(2)}
                      {selectedCustomer.balance > 0 ? " (Credit)" : selectedCustomer.balance < 0 ? " (Owes)" : ""}
                    </p>
                  </div>
                  <User className="h-7 w-7 text-orange-400" />
                </div>
              )}

              {/* Add new customer inline form */}
              {showAddCustomer ? (
                <div className="bg-white rounded-xl border border-orange-200 p-3 space-y-2">
                  <p className="text-xs font-semibold text-orange-700 mb-1">New Customer</p>
                  <Input
                    placeholder="Full name *"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="h-10 rounded-lg border-orange-200 focus:border-orange-400 text-sm"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleCreateCustomer()}
                  />
                  <Input
                    placeholder="Phone (optional)"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="h-10 rounded-lg border-orange-200 focus:border-orange-400 text-sm"
                    type="tel"
                    onKeyDown={(e) => e.key === "Enter" && handleCreateCustomer()}
                  />
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-lg border-gray-200 text-gray-600 text-xs"
                      onClick={() => { setShowAddCustomer(false); setNewCustomerName(""); setNewCustomerPhone(""); }}
                      disabled={createCustomerMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs"
                      onClick={handleCreateCustomer}
                      disabled={!newCustomerName.trim() || createCustomerMutation.isPending}
                    >
                      {createCustomerMutation.isPending ? (
                        <><span className="inline-block h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin mr-1" />Saving…</>
                      ) : "Add & Select"}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-dashed border-orange-300 text-orange-500 hover:bg-orange-100 text-sm font-medium transition-colors"
                  onClick={() => setShowAddCustomer(true)}
                >
                  <UserPlus className="h-4 w-4" />
                  New customer
                </button>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 h-13 rounded-2xl border-gray-200 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={!canComplete() || createTransactionMutation.isPending}
              className="flex-1 h-13 rounded-2xl bg-green-500 hover:bg-green-600 font-bold text-white shadow disabled:opacity-50"
            >
              <Check className="mr-2 h-4 w-4" />
              {createTransactionMutation.isPending ? "Processing..." : "Complete Payment"}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}

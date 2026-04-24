import { useState, useEffect } from "react";
import { MessageSquare, BadgeCheck, Info, RefreshCw, Zap, Phone, DollarSign, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/features/auth/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";

const DEFAULT_TEMPLATE =
  "Hi {name}, thank you for your purchase at {shop}. Amount: {amount}. Receipt #{receipt}. View: {receipt_url}";

const SAMPLE_DATA = {
  name: "John",
  shop: "Pointify Store",
  amount: "KES 2,500",
  receipt: "A102",
  receipt_url: "https://ptfy.link/A102",
};

const PRICE_PER_SMS = 0.5; // KES per SMS credit

function buildPreview(template: string): string {
  return template
    .replace("{name}", SAMPLE_DATA.name)
    .replace("{shop}", SAMPLE_DATA.shop)
    .replace("{amount}", SAMPLE_DATA.amount)
    .replace("{receipt}", SAMPLE_DATA.receipt)
    .replace("{receipt_url}", SAMPLE_DATA.receipt_url);
}

export default function SmsSettingsPage() {
  const { toast } = useToast();
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const { selectedShopId, selectedShopData } = useSelector((state: RootState) => state.shop);

  const [smsEnabled, setSmsEnabled] = useState(false);
  const [senderName, setSenderName] = useState("POINTIFY");
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);

  // Top-up dialog state
  const [showTopUpDialog, setShowTopUpDialog] = useState(false);
  const [showStkDialog, setShowStkDialog] = useState(false);
  const [topUpPhone, setTopUpPhone] = useState("");
  const [topUpAmount, setTopUpAmount] = useState("");
  const [stkPhone, setStkPhone] = useState("");

  const shopId = selectedShopId || (selectedShopData?._id ?? "");

  const { data: shopData, isLoading, refetch: refetchShop } = useQuery({
    queryKey: ["shop-sms", shopId],
    queryFn: async () => {
      if (!shopId) return null;
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/shop/${shopId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch shop");
      return res.json();
    },
    enabled: !!shopId,
  });

  useEffect(() => {
    if (shopData) {
      const adminData = shopData.adminId;
      setSmsEnabled(shopData.saleSmsEnabled ?? adminData?.saleSmsEnabled ?? false);
      setSenderName(shopData.saleSmsSender || adminData?.saleSmsSender || "POINTIFY");
      setTemplate(shopData.saleSmsTemplate || adminData?.saleSmsTemplate || DEFAULT_TEMPLATE);
    }
  }, [shopData]);

  // Pre-fill phone from admin data when opening top-up
  useEffect(() => {
    if (showTopUpDialog) {
      const phone = shopData?.adminId?.phone || admin?.phone || "";
      setTopUpPhone(phone);
      setTopUpAmount("");
    }
  }, [showTopUpDialog, shopData, admin]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/shop/${shopId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          saleSmsEnabled: smsEnabled,
          saleSmsSender: senderName.trim(),
          saleSmsTemplate: template.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to save SMS settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-sms", shopId] });
      queryClient.invalidateQueries({ queryKey: ["shop", shopId] });
      toast({ title: "SMS settings saved", description: "Your SMS configuration has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save SMS settings.", variant: "destructive" });
    },
  });

  const topUpMutation = useMutation({
    mutationFn: async ({ phone, amount }: { phone: string; amount: number }) => {
      const token = localStorage.getItem("token");
      const userId = shopData?.adminId?._id || admin?._id;
      const res = await fetch("/api/sms/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone, amount, userid: userId }),
      });
      const data = await res.json();
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, vars) => {
      setShowTopUpDialog(false);
      setStkPhone(vars.phone);
      setShowStkDialog(true);
    },
    onError: (err: any) => {
      toast({ title: "Top-up failed", description: err.message || "Could not initiate top-up.", variant: "destructive" });
    },
  });

  const handleTopUpSubmit = () => {
    const phone = topUpPhone.trim();
    const amount = parseFloat(topUpAmount);
    if (!phone) {
      toast({ title: "Enter phone number", variant: "destructive" });
      return;
    }
    if (!amount || amount <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    topUpMutation.mutate({ phone, amount });
  };

  const handleStkDismiss = () => {
    setShowStkDialog(false);
    refetchShop();
  };

  const smsCredits: number = shopData?.adminId?.smscredit ?? shopData?.smscredit ?? 0;
  const parsedAmount = parseFloat(topUpAmount) || 0;
  const estimatedCredits = parsedAmount > 0 ? Math.floor(parsedAmount / PRICE_PER_SMS) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-4 pb-6">
        {/* Page header + save */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900">SMS Settings</h1>
            <p className="text-xs text-gray-500">Configure automatic SMS notifications sent after a sale</p>
          </div>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !shopId}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm"
          >
            {saveMutation.isPending ? (
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </span>
            ) : "Save Settings"}
          </Button>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left col — credits + config */}
          <div className="lg:col-span-2 space-y-4">
            {/* Credits card */}
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">SMS Credits</p>
                  <p className="text-xl font-bold text-gray-900 leading-none mt-0.5">
                    {isLoading ? "—" : smsCredits.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Info className="w-3 h-3" /> 1 credit per SMS
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700 font-semibold"
                  onClick={() => setShowTopUpDialog(true)}
                >
                  <Zap className="w-3.5 h-3.5 mr-1" />
                  Top Up
                </Button>
              </div>
            </div>

            {/* Config card */}
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4 space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Configuration</p>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-800">Enable SMS after sale</p>
                  <p className="text-xs text-gray-400">Send SMS to customer when a sale is completed</p>
                </div>
                <Switch
                  checked={smsEnabled}
                  onCheckedChange={setSmsEnabled}
                  className="data-[state=checked]:bg-orange-500 shrink-0"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3 text-gray-400" /> Sender Name
                  </label>
                  <Input
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    disabled={!smsEnabled}
                    placeholder="e.g. POINTIFY"
                    maxLength={11}
                    className="text-sm h-8 disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Max 11 characters</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">SMS Template</label>
                <Textarea
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  disabled={!smsEnabled}
                  rows={3}
                  placeholder={DEFAULT_TEMPLATE}
                  className="text-sm resize-none disabled:opacity-50"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Placeholders:{" "}
                  {["{name}", "{shop}", "{amount}", "{receipt}", "{receipt_url}"].map((p) => (
                    <code key={p} className="text-orange-600 mr-1">{p}</code>
                  ))}
                </p>
              </div>
            </div>
          </div>

          {/* Right col — preview */}
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4 h-fit">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Preview</p>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {buildPreview(template || DEFAULT_TEMPLATE)}
              </p>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
              <RefreshCw className="w-3 h-3" />
              <span>Updates as you edit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top-up dialog */}
      <Dialog open={showTopUpDialog} onOpenChange={(open) => { if (!open) setShowTopUpDialog(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">Top Up SMS Credits</DialogTitle>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Enter the phone number to receive the M-Pesa STK push and the amount to spend.
            </p>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Phone number */}
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                Phone Number
              </label>
              <Input
                value={topUpPhone}
                onChange={(e) => setTopUpPhone(e.target.value)}
                placeholder="e.g. 254712345678"
                className="text-sm"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                Amount (KES)
              </label>
              <Input
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="e.g. 500"
                min={1}
                className="text-sm"
              />
            </div>

            {/* Preview card */}
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-3.5 space-y-2">
              <p className="text-xs font-semibold text-gray-500">Preview</p>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Amount</span>
                <span className="font-semibold text-gray-900">
                  {parsedAmount > 0 ? `KES ${parsedAmount.toLocaleString()}` : "—"}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Estimated SMS Credits</span>
                <span className="font-semibold text-gray-900">
                  {estimatedCredits > 0 ? estimatedCredits.toLocaleString() : "—"}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">STK Push To</span>
                <span className="font-semibold text-gray-900 truncate max-w-[120px]">
                  {topUpPhone.trim() || "—"}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 flex-row">
            <Button
              variant="outline"
              className="flex-1"
              disabled={topUpMutation.isPending}
              onClick={() => setShowTopUpDialog(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
              disabled={topUpMutation.isPending}
              onClick={handleTopUpSubmit}
            >
              {topUpMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Processing...
                </span>
              ) : (
                "Buy Credits"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* STK Push instruction dialog */}
      <Dialog open={showStkDialog} onOpenChange={() => {}}>
        <DialogContent className="max-w-xs text-center [&>button:last-child]:hidden" onInteractOutside={(e) => e.preventDefault()}>
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center">
              <Smartphone className="w-7 h-7 text-orange-500" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Complete Payment</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Check your phone <span className="font-semibold text-gray-900">({stkPhone})</span> and
              enter your M-Pesa PIN to complete the payment.
            </p>
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold mt-1"
              onClick={handleStkDismiss}
            >
              OK, I've Completed Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

import { useState, useEffect } from "react";
import { MessageSquare, BadgeCheck, ToggleLeft, Info, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

  const shopId = selectedShopId || (selectedShopData?._id ?? "");

  const { data: shopData, isLoading } = useQuery({
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
      setSmsEnabled(shopData.saleSmsEnabled ?? false);
      setSenderName(shopData.saleSmsSender || "POINTIFY");
      setTemplate(shopData.saleSmsTemplate || DEFAULT_TEMPLATE);
    }
  }, [shopData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/shop/${shopId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

  const smsCredits: number = shopData?.smsCredits ?? 0;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6 pb-10">
        {/* Page header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">SMS Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure automatic SMS notifications sent after a sale
          </p>
        </div>

        {/* Credits summary card */}
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">SMS Credits</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? "—" : smsCredits.toLocaleString()}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700 font-semibold"
              onClick={() =>
                toast({ title: "Top Up", description: "SMS top-up is managed via your Pointify account." })
              }
            >
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Top Up
            </Button>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Each SMS sent deducts 1 credit from your balance.</span>
          </div>
        </div>

        {/* Configuration section */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Configuration
          </p>
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 space-y-5">
            {/* Toggle */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">Enable SMS after sale</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Automatically send an SMS to the customer when a sale is completed
                </p>
              </div>
              <Switch
                checked={smsEnabled}
                onCheckedChange={setSmsEnabled}
                className="data-[state=checked]:bg-orange-500 mt-0.5 shrink-0"
              />
            </div>

            {/* Sender name */}
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5 text-gray-400" />
                Sender Name
              </label>
              <Input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                disabled={!smsEnabled}
                placeholder="e.g. POINTIFY"
                maxLength={11}
                className="text-sm disabled:opacity-50"
              />
              <p className="text-xs text-gray-400 mt-1">
                Maximum 11 characters. Shown as the message sender on the recipient's phone.
              </p>
            </div>

            {/* Template */}
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                Sale SMS Template
              </label>
              <Textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                disabled={!smsEnabled}
                rows={5}
                placeholder={DEFAULT_TEMPLATE}
                className="text-sm resize-none disabled:opacity-50"
              />
              <div className="mt-2 rounded-xl bg-orange-50 border border-orange-200 px-3.5 py-2.5">
                <p className="text-xs text-gray-700 leading-relaxed">
                  <span className="font-semibold text-orange-700">Available placeholders:</span>{" "}
                  <code className="text-orange-600">{"{name}"}</code>,{" "}
                  <code className="text-orange-600">{"{shop}"}</code>,{" "}
                  <code className="text-orange-600">{"{amount}"}</code>,{" "}
                  <code className="text-orange-600">{"{receipt}"}</code>,{" "}
                  <code className="text-orange-600">{"{receipt_url}"}</code>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Preview section */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Preview
          </p>
          <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 mb-3">Sample message</p>
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {buildPreview(template || DEFAULT_TEMPLATE)}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
              <RefreshCw className="w-3 h-3" />
              <span>Preview updates as you edit the template above</span>
            </div>
          </div>
        </div>

        {/* Save button */}
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !shopId}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-6 rounded-xl text-sm"
        >
          {saveMutation.isPending ? (
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Saving...
            </span>
          ) : (
            "Save SMS Settings"
          )}
        </Button>
      </div>
    </DashboardLayout>
  );
}

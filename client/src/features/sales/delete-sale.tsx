import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DateTime } from "@/components/date-time";
import { AlertTriangle, ArrowLeft, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { useRoute } from "wouter";
import { useEffect, useState } from "react";
import { rawApiFetch } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrency } from "@/utils";

// Resolve the logged-in identity (attendant session wins on shared tills,
// matching the transport's attendant-first token precedence).
const getCurrentUser = (): { name: string; role: string } => {
  try {
    const attendantData = localStorage.getItem("attendantData");
    if (attendantData) {
      const attendant = JSON.parse(attendantData);
      const name = attendant?.username || attendant?.name;
      if (name) return { name, role: "attendant" };
    }
  } catch { /* fall through to admin */ }
  try {
    const adminData = localStorage.getItem("adminData");
    if (adminData) {
      const admin = JSON.parse(adminData);
      const name =
        admin?.username ||
        [admin?.firstName, admin?.lastName].filter(Boolean).join(" ") ||
        admin?.email;
      if (name) return { name, role: "admin" };
    }
  } catch { /* no admin session either */ }
  return { name: "Unknown user", role: "unknown" };
};

export default function DeleteSale() {
  // Support both the admin and attendant routes.
  const [, adminParams] = useRoute("/sales/delete/:id");
  const [, attendantParams] = useRoute("/attendant/sales/delete/:id");
  const params = adminParams || attendantParams;

  const [sale, setSale] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [acknowledgeConsequences, setAcknowledgeConsequences] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currency = useCurrency();
  const currentUser = getCurrentUser();

  useEffect(() => {
    // Navigation state is only trusted when it is the SAME sale the route
    // identifies — stale or manipulated history state must never let this
    // screen display (or void) a different sale.
    const navigationState = window.history.state?.saleData as any;
    const navStateId = navigationState?._id || navigationState?.id;
    if (navigationState && params?.id && String(navStateId) === String(params.id)) {
      setSale(navigationState);
      setIsLoading(false);
      return;
    }

    const fetchSale = async () => {
      if (!params?.id) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await rawApiFetch(`/api/sales/single/receipt/${params.id}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          auth: "attendant-first",
        });
        if (response.ok) {
          setSale(await response.json());
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

    fetchSale();
  }, [params?.id]);

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

  if (!sale) {
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

  // The route param is the authoritative deletion target.
  const saleId: string = params?.id || sale._id || sale.id;
  const saleLabel: string = sale.receiptNo || String(saleId).slice(-6);
  const items: any[] = sale.items || [];
  const customerName = sale.customerId?.name || sale.customerName || "Walk-in";
  const totalAmount = Number(sale.totalAmount) || 0;
  const saleDate = sale.createdAt || sale.saleDate;

  const isValidConfirmation = confirmationText === `DELETE-${saleLabel}`;
  const canDelete =
    isValidConfirmation &&
    acknowledgeConsequences &&
    deleteReason.trim().length > 0 &&
    !isDeleting;

  const handleDelete = async () => {
    if (!canDelete) return;

    setIsDeleting(true);
    try {
      // Voids the sale upstream: restores stock, reverses credit and removes
      // the record. Runs under the logged-in user's own token.
      const response = await rawApiFetch(`/api/sales/${saleId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: deleteReason.trim(),
          deletedBy: currentUser.name,
          deletedByRole: currentUser.role,
        }),
        auth: "attendant-first",
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch { /* non-JSON body */ }

      // Reject both HTTP errors and upstream-rejection envelopes — a void must
      // never be reported as successful unless upstream accepted it.
      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.error || data?.message || `Failed to delete sale (${response.status})`,
        );
      }

      toast({
        title: "Sale deleted",
        description: `Sale #${saleLabel} was voided by ${currentUser.name}.`,
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
        title: "Delete failed",
        description: error?.message || "Could not delete the sale. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout title={`Delete Sale #${saleLabel}`}>
      <div className="p-6 w-full">
        <PageHeader
          title={`Delete Sale #${saleLabel}`}
          onBack={() => window.history.back()}
        />
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Delete Sale #{saleLabel}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            This action cannot be undone. Please review carefully before proceeding.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            You are deleting this sale as <span className="font-medium">{currentUser.name}</span>.
          </p>
        </div>

        <div className="space-y-6">
          {/* Sale Information */}
          <Card>
            <CardHeader>
              <CardTitle>Sale Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Customer:</p>
                  <p>{customerName}</p>
                </div>
                <div>
                  <p className="font-medium">Sale Date:</p>
                  <p>{saleDate ? <DateTime value={saleDate} /> : "—"}</p>
                </div>
                <div>
                  <p className="font-medium">Total Amount:</p>
                  <p className="font-bold">{currency} {totalAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="font-medium">Status:</p>
                  <Badge variant={sale.status === "completed" || sale.status === "cashed" ? "default" : "secondary"}>
                    {sale.status}
                  </Badge>
                </div>
              </div>

              <Separator className="my-4" />

              <div>
                <p className="font-medium mb-2">Items ({items.length}):</p>
                <ul className="space-y-1 text-sm">
                  {items.map((item, index) => {
                    const name = item.product?.name || item.productName || "Item";
                    const qty = Number(item.quantity) || 0;
                    const unit = Number(item.unitPrice ?? item.sellingPrice) || 0;
                    const lineTotal = Number(item.totalPrice) || qty * unit;
                    return (
                      <li key={index} className="flex justify-between">
                        <span>{name} × {qty}</span>
                        <span>{currency} {lineTotal.toFixed(2)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Consequences Warning */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Deleting this sale will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Permanently remove the sale record from the system</li>
                <li>Restore sold quantities back into stock</li>
                <li>Reverse any credit charged to the customer</li>
                <li>Affect your sales reports and analytics</li>
                <li>Cannot be recovered once deleted</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Delete Form */}
          <Card>
            <CardHeader>
              <CardTitle>Deletion Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="reason">Reason for Deletion *</Label>
                <Textarea
                  id="reason"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Please provide a detailed reason for deleting this sale..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="confirmation">
                  Type <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">DELETE-{saleLabel}</code> to confirm
                </Label>
                <Input
                  id="confirmation"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder={`DELETE-${saleLabel}`}
                  className="mt-1 font-mono"
                />
              </div>

              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="acknowledge"
                  checked={acknowledgeConsequences}
                  onChange={(e) => setAcknowledgeConsequences(e.target.checked)}
                  className="mt-1"
                />
                <Label htmlFor="acknowledge" className="text-sm leading-5">
                  I understand the consequences of deleting this sale and acknowledge that this action cannot be undone.
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!canDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete Sale Permanently"}
            </Button>
          </div>

          {!canDelete && !isDeleting && (
            <p className="text-center text-sm text-muted-foreground">
              Complete all requirements above to enable deletion.
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

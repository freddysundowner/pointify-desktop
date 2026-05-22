import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PurchaseReturnItem {
  product: { _id: string; name: string };
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
}

interface PurchaseReturnDetails {
  _id: string;
  purchaseId: string;
  paymentType?: string;
  supplierId?: any;
  attendantId: { _id: string; username: string };
  shopId: { _id: string; name: string; currency: string };
  items: PurchaseReturnItem[];
  refundAmount?: number;
  totalAmount?: number;
  reason?: string;
  createdAt?: string;
  returnDate?: string;
  purchaseReturnNo?: string;
  status?: string;
}

export default function PurchaseReturnDetails() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [returnData, setReturnData] = useState<PurchaseReturnDetails | null>(null);
  const currentPath = window.location.pathname;
  const isAttendantRoute = currentPath.startsWith("/attendant/");
  const purchaseReturnsRoute = isAttendantRoute ? "/attendant/dashboard" : "/purchase-returns";

  useEffect(() => {
    const passedData = (window as any).__returnData;
    if (passedData) {
      setReturnData(passedData);
      delete (window as any).__returnData;
    }
  }, [id]);

  if (!returnData) {
    return (
      <DashboardLayout title="Return Details">
        <div className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation(purchaseReturnsRoute)}
            className="h-8 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            {isAttendantRoute ? "Back to Dashboard" : "Back to Returns"}
          </Button>
          <Card>
            <CardContent className="pt-4 pb-4 text-center text-sm text-muted-foreground">
              Return details not found. Please go back and try again.
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const currency = returnData.shopId?.currency || "";
  const formatCurrency = (amount: number) =>
    `${currency} ${Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const formatDate = (s: string) =>
    !s ? "N/A" : `${new Date(s).toLocaleDateString()} ${new Date(s).toLocaleTimeString()}`;

  const totalReturnAmount = returnData.refundAmount || returnData.totalAmount || 0;
  const totalItems = returnData.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const Pill = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-baseline gap-1.5 bg-card border rounded-md px-2.5 py-1">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-xs font-bold">{value}</span>
    </div>
  );

  return (
    <DashboardLayout title="Purchase Return Details">
      <div className="space-y-3">
        <PageHeader
          title="Return Details"
          subtitle={returnData.purchaseReturnNo || returnData._id.slice(-8)}
          onBack={() => window.history.back()}
        />

        {/* Compact summary row */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill label="Purchase" value={<span className="font-mono">{returnData.purchaseId?.slice(-8) || "N/A"}</span>} />
          <Pill label="Refund" value={formatCurrency(totalReturnAmount)} />
          <Pill label="Items" value={totalItems} />
          <Pill label="Date" value={formatDate(returnData.createdAt || returnData.returnDate || "")} />
          <Pill label="Attendant" value={returnData.attendantId?.username || "Unknown"} />
          <Pill label="Shop" value={returnData.shopId?.name || "Unknown"} />
          {returnData.paymentType && <Pill label="Payment" value={returnData.paymentType} />}
        </div>

        {returnData.reason && (
          <Card>
            <CardContent className="py-2 px-3">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Reason</div>
              <div className="text-sm">{returnData.reason}</div>
            </CardContent>
          </Card>
        )}

        {/* Returned Items */}
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-2 px-3 py-2 border-b">
              <Package className="h-4 w-4" />
              <span className="text-sm font-semibold">Returned Items</span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="h-8 text-xs">Product</TableHead>
                    <TableHead className="h-8 text-xs text-right">Qty</TableHead>
                    <TableHead className="h-8 text-xs text-right">Unit Price</TableHead>
                    <TableHead className="h-8 text-xs text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnData.items?.length ? (
                    returnData.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="py-2 text-sm font-medium">
                          {item.product?.name || "Unknown Product"}
                        </TableCell>
                        <TableCell className="py-2 text-sm text-right">{item.quantity}</TableCell>
                        <TableCell className="py-2 text-sm text-right">{formatCurrency(item.unitPrice || 0)}</TableCell>
                        <TableCell className="py-2 text-sm text-right font-semibold">
                          {formatCurrency((item.unitPrice || 0) * item.quantity)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-4">
                        No items found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="text-[10px] text-muted-foreground font-mono">Return ID: {returnData._id}</div>
      </div>
    </DashboardLayout>
  );
}

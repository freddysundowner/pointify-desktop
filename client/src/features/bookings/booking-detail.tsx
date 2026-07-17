import { useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiCall } from "@/lib/api-config";
import { usePrimaryShop } from "@/hooks/usePrimaryShop";
import { usePermissions } from "@/hooks/usePermissions";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { goBack } from "@/lib/navigation-utils";
import {
  BedDouble, ArrowLeft, Loader2, User, Phone, CalendarDays,
  Banknote, Smartphone, StickyNote, IdCard, Users, Receipt, Sparkles,
  LogIn, LogOut, XCircle,
} from "lucide-react";

interface Booking {
  _id?: string;
  id?: string | number;
  shop: string;
  roomId: string;
  roomName: string;
  guestName: string;
  guestPhone?: string;
  guestIdNumber?: string;
  guestsCount?: number;
  checkIn: string;
  checkOut: string;
  nightlyRate: number;
  totalAmount: number;
  status: "booked" | "checked_in" | "checked_out" | "cancelled";
  notes?: string;
  paymentMethod?: "cash" | "mpesa" | "none";
  amountPaid?: number;
  mpesaCode?: string;
  paidAt?: string;
  createdAt?: string;
  createAt?: string;
}

const bid = (b: Booking) => String(b._id ?? b.id);

const STATUS_META: Record<string, { label: string; cls: string }> = {
  booked: { label: "Booked", cls: "bg-blue-100 text-blue-700" },
  checked_in: { label: "Checked in", cls: "bg-green-100 text-green-700" },
  checked_out: { label: "Checked out", cls: "bg-gray-100 text-gray-600" },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-600" },
};

const nightsBetween = (a: string, b: string) =>
  Math.max(0, Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000));

const fmtDate = (s?: string) => {
  if (!s) return "—";
  const d = new Date(s.includes("T") ? s : s + "T00:00:00");
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

const fmtDateTime = (s?: string) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export default function BookingDetail() {
  const [, params] = useRoute("/bookings/:id");
  const bookingId = params?.id || "";
  const [, navigate] = useLocation();
  const { shopId } = usePrimaryShop();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Attendants need a Room Bookings permission to view booking details.
  const { hasAttendantPermission, isAdmin } = usePermissions();
  const isAdminUser = isAdmin || localStorage.getItem("userType") === "admin";
  const canViewBookings =
    isAdminUser ||
    hasAttendantPermission("bookings", "view_bookings") ||
    hasAttendantPermission("bookings", "create_bookings") ||
    hasAttendantPermission("bookings", "manage_bookings") ||
    hasAttendantPermission("bookings", "manage_rooms");
  const canManageBookings = isAdminUser || hasAttendantPermission("bookings", "manage_bookings");

  // Booking actions (check-in / check-out / cancel / change dates)
  const [pendingAction, setPendingAction] = useState<"checked_in" | "checked_out" | "cancelled" | null>(null);
  const [payMethod, setPayMethod] = useState<"cash" | "mpesa" | "none">("cash");
  const [payMpesaCode, setPayMpesaCode] = useState("");
  const [isActing, setIsActing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editDates, setEditDates] = useState({ checkIn: "", checkOut: "" });
  const [isSavingDates, setIsSavingDates] = useState(false);

  const { data: bookings = [], isLoading, isError } = useQuery<Booking[]>({
    queryKey: ["bookings", shopId],
    queryFn: async () => {
      const res = await apiCall(`/api/booking?shop=${shopId}`, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? data?.bookings ?? [];
      if (!Array.isArray(list)) throw new Error("Bookings endpoint not available");
      return list;
    },
    enabled: !!shopId,
    retry: 1,
  });

  const { data: rooms = [] } = useQuery<any[]>({
    queryKey: ["rooms", shopId],
    queryFn: async () => {
      const res = await apiCall(`/api/rooms?shop=${shopId}`, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? data?.rooms ?? [];
      return Array.isArray(list) ? list : [];
    },
    enabled: !!shopId,
    retry: 1,
  });

  const booking = useMemo(
    () => bookings.find((b) => bid(b) === bookingId),
    [bookings, bookingId],
  );
  const room = useMemo(
    () => rooms.find((r: any) => String(r._id) === String(booking?.roomId)),
    [rooms, booking],
  );

  const nights = booking ? Math.max(1, nightsBetween(booking.checkIn, booking.checkOut)) : 0;
  const rate = Number(booking?.nightlyRate) || 0;
  const total = Number(booking?.totalAmount) || nights * rate;
  const meta = booking ? STATUS_META[booking.status] || STATUS_META.booked : STATUS_META.booked;
  const paid = booking?.status === "checked_out" && booking.paymentMethod && booking.paymentMethod !== "none";
  const amenities: string[] = Array.isArray(room?.amenities)
    ? Array.from(new Set(room.amenities.map((a: any) => String(a ?? "").trim()).filter(Boolean)))
    : [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["bookings", shopId] });
    queryClient.invalidateQueries({ queryKey: ["booking-stats", shopId] });
  };

  const handleAction = async () => {
    if (!booking || !pendingAction) return;
    setIsActing(true);
    try {
      let resp: Response;
      if (pendingAction === "checked_out") {
        // Atomic check-out: records the payment on the booking AND flips the
        // status in ONE call. Payments stay completely separate from POS sales.
        resp = await apiCall(`/api/booking/${bid(booking)}/checkout`, {
          method: "POST",
          body: JSON.stringify({
            paymentMethod: payMethod,
            amountPaid: payMethod === "none" ? 0 : total,
            mpesaCode: payMethod === "mpesa" ? payMpesaCode.trim() : "",
          }),
        });
      } else {
        resp = await apiCall(`/api/booking/${bid(booking)}`, {
          method: "PUT",
          body: JSON.stringify({ status: pendingAction }),
        });
      }
      const data = await resp.json().catch(() => null);
      if (!resp.ok || (data && data.success === false)) {
        throw new Error(data?.error || data?.message || `HTTP ${resp.status}`);
      }
      const updated = data?.data ?? data?.booking ?? data;
      if (!updated || Array.isArray(updated) || typeof updated !== "object") {
        throw new Error("The server did not confirm the update.");
      }
      const labels = { checked_in: "checked in", checked_out: "checked out", cancelled: "cancelled" };
      const paidMsg =
        pendingAction === "checked_out" && payMethod !== "none"
          ? " Payment recorded on the booking."
          : "";
      toast({ title: "Booking updated", description: `${booking.guestName} ${labels[pendingAction]}.${paidMsg}` });
      refresh();
      setPendingAction(null);
    } catch (err: any) {
      // Keep the dialog open so the user can fix the problem and retry. The
      // check-out call is atomic upstream, so a retry can never double-charge.
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
    setIsActing(false);
  };

  // Change dates — block saving if the new stay overlaps another active
  // booking for the same room.
  const editNights = editDates.checkIn && editDates.checkOut ? nightsBetween(editDates.checkIn, editDates.checkOut) : 0;
  const editConflict = useMemo(() => {
    if (!booking || editNights <= 0) return false;
    return bookings.some(
      (b) =>
        bid(b) !== bid(booking) &&
        (b.status === "booked" || b.status === "checked_in") &&
        b.roomId === booking.roomId &&
        b.checkIn < editDates.checkOut &&
        b.checkOut > editDates.checkIn
    );
  }, [booking, bookings, editDates, editNights]);

  const handleSaveDates = async () => {
    if (!booking || editNights <= 0 || editConflict) return;
    setIsSavingDates(true);
    try {
      const resp = await apiCall(`/api/booking/${bid(booking)}`, {
        method: "PUT",
        body: JSON.stringify({
          checkIn: editDates.checkIn,
          checkOut: editDates.checkOut,
          totalAmount: Math.max(1, editNights) * rate,
        }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || (data && data.success === false)) {
        throw new Error(data?.error || data?.message || `HTTP ${resp.status}`);
      }
      toast({
        title: "Dates updated",
        description: `${booking.guestName}: ${editDates.checkIn} → ${editDates.checkOut} (${editNights} night${editNights !== 1 ? "s" : ""}).`,
      });
      refresh();
      setEditOpen(false);
    } catch (err: any) {
      toast({ title: "Could not update dates", description: err.message, variant: "destructive" });
    }
    setIsSavingDates(false);
  };

  if (!canViewBookings) {
    return (
      <DashboardLayout title="Booking details">
        <div className="p-6 max-w-lg mx-auto text-center">
          <BedDouble className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-gray-800 mb-1">No access to Room Bookings</h1>
          <p className="text-sm text-gray-500" data-testid="text-detail-no-access">
            Ask your shop owner to give you the Room Bookings permission.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Booking details">
      <div className="px-2 py-4 sm:px-3 lg:px-4 lg:py-6 w-full">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => goBack(navigate, "/bookings")} data-testid="button-back-bookings">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Booking details</h1>
        </div>

        {isLoading ? (
          <div className="p-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-purple-500" /></div>
        ) : isError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Could not load this booking. Please check your connection and try again.
          </div>
        ) : !booking ? (
          <div className="rounded-md border p-6 text-center text-sm text-gray-500" data-testid="text-booking-not-found">
            Booking not found. It may have been removed.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Hero card */}
            <div className="rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-600 to-purple-700 p-4 sm:p-5 text-white shadow-md">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-xs text-purple-200 uppercase tracking-wide mb-1">Room</p>
                  <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 truncate" data-testid="text-detail-room">
                    <span className="bg-white/15 rounded-xl p-2"><BedDouble className="h-5 w-5" /></span>
                    {booking.roomName || room?.name || "Room"}
                  </h2>
                </div>
                <Badge className={`${meta.cls} shrink-0`} data-testid="badge-detail-status">{meta.label}</Badge>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-purple-100 flex-wrap">
                <CalendarDays className="h-4 w-4" />
                <span data-testid="text-detail-stay">
                  {fmtDate(booking.checkIn)} → {fmtDate(booking.checkOut)}
                </span>
                <span className="text-purple-200">· {nights} night{nights === 1 ? "" : "s"}</span>
              </div>
              {amenities.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5" data-testid="detail-amenities">
                  <Sparkles className="h-3.5 w-3.5 text-purple-200" />
                  {amenities.map((a) => (
                    <span key={a} className="text-[11px] bg-white/15 rounded-full px-2 py-0.5">{a}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Guest */}
            <section className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Guest</p>
              <div className="space-y-2.5 text-sm">
                <p className="flex items-center gap-2 font-medium text-gray-900" data-testid="text-detail-guest">
                  <User className="h-4 w-4 text-gray-400" /> {booking.guestName || "—"}
                </p>
                {booking.guestPhone && (
                  <p className="flex items-center gap-2 text-gray-700" data-testid="text-detail-phone">
                    <Phone className="h-4 w-4 text-gray-400" /> {booking.guestPhone}
                  </p>
                )}
                {booking.guestIdNumber && (
                  <p className="flex items-center gap-2 text-gray-700" data-testid="text-detail-idnumber">
                    <IdCard className="h-4 w-4 text-gray-400" /> ID: {booking.guestIdNumber}
                  </p>
                )}
                <p className="flex items-center gap-2 text-gray-700" data-testid="text-detail-guests-count">
                  <Users className="h-4 w-4 text-gray-400" /> {Math.max(1, Number(booking.guestsCount) || 1)} guest{(Number(booking.guestsCount) || 1) > 1 ? "s" : ""}
                </p>
              </div>
            </section>

            {/* Charges */}
            <section className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5" /> Charges
              </p>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Rate per night</dt>
                  <dd className="text-gray-900" data-testid="text-detail-rate">{rate.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Nights</dt>
                  <dd className="text-gray-900">{nights}</dd>
                </div>
                <div className="border-t pt-2 flex justify-between gap-2">
                  <dt className="font-semibold text-gray-800">Total</dt>
                  <dd className="font-bold text-purple-700" data-testid="text-detail-total">{total.toLocaleString()}</dd>
                </div>
              </dl>
            </section>

            {/* Payment */}
            <section className="rounded-2xl border bg-white p-4 shadow-sm" data-testid="section-detail-payment">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Payment</p>
              {booking.status === "cancelled" ? (
                <p className="text-sm text-gray-500">This booking was cancelled — no payment recorded.</p>
              ) : booking.status !== "checked_out" ? (
                <p className="text-sm text-gray-500">
                  Payment is collected at check-out. This guest has not checked out yet.
                </p>
              ) : !paid ? (
                <p className="text-sm text-gray-500" data-testid="text-detail-no-payment">
                  Checked out without recording a payment in the app.
                </p>
              ) : (
                <div className="space-y-2.5 text-sm">
                  <p className="flex items-center gap-2 text-gray-900 font-medium" data-testid="text-detail-payment-method">
                    {booking.paymentMethod === "mpesa"
                      ? <Smartphone className="h-4 w-4 text-green-600" />
                      : <Banknote className="h-4 w-4 text-green-600" />}
                    {booking.paymentMethod === "mpesa" ? "M-Pesa" : "Cash"} ·{" "}
                    <span className="font-bold text-green-700">{(Number(booking.amountPaid) || 0).toLocaleString()}</span>
                  </p>
                  {booking.mpesaCode && (
                    <p className="text-gray-700" data-testid="text-detail-mpesa-code">
                      M-Pesa code: <span className="font-mono">{booking.mpesaCode}</span>
                    </p>
                  )}
                  <p className="text-gray-500" data-testid="text-detail-paid-at">Paid: {fmtDateTime(booking.paidAt)}</p>
                </div>
              )}
            </section>

            {/* Notes */}
            {booking.notes && (
              <section className="rounded-2xl border bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <StickyNote className="h-3.5 w-3.5" /> Notes
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap" data-testid="text-detail-notes">{booking.notes}</p>
              </section>
            )}

            {/* Actions */}
            {canManageBookings && (booking.status === "booked" || booking.status === "checked_in") && (
              <section className="rounded-2xl border bg-white p-4 shadow-sm" data-testid="section-detail-actions">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Actions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {booking.status === "booked" && (
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => setPendingAction("checked_in")}
                      data-testid="button-detail-checkin"
                    >
                      <LogIn className="h-4 w-4 mr-1.5" /> Check in
                    </Button>
                  )}
                  <Button
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => { setPayMethod("cash"); setPayMpesaCode(""); setPendingAction("checked_out"); }}
                    data-testid="button-detail-checkout"
                  >
                    <LogOut className="h-4 w-4 mr-1.5" /> Check out
                  </Button>
                  <Button
                    variant="outline"
                    className="text-purple-700 border-purple-200"
                    onClick={() => { setEditDates({ checkIn: booking.checkIn, checkOut: booking.checkOut }); setEditOpen(true); }}
                    data-testid="button-detail-edit-dates"
                  >
                    <CalendarDays className="h-4 w-4 mr-1.5" /> Change dates
                  </Button>
                  {booking.status === "booked" && (
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setPendingAction("cancelled")}
                      data-testid="button-detail-cancel"
                    >
                      <XCircle className="h-4 w-4 mr-1.5" /> Cancel booking
                    </Button>
                  )}
                </div>
              </section>
            )}

            <p className="text-xs text-gray-400 text-center" data-testid="text-detail-created">
              Booking created {fmtDateTime(booking.createdAt || booking.createAt)}
            </p>
          </div>
        )}
      </div>

      {/* Confirm check-in / check-out / cancel */}
      <Dialog open={!!pendingAction} onOpenChange={(o) => { if (!isActing && !o) setPendingAction(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {pendingAction === "checked_in" && "Check in guest?"}
              {pendingAction === "checked_out" && "Check out guest?"}
              {pendingAction === "cancelled" && "Cancel booking?"}
            </DialogTitle>
            <DialogDescription>
              {booking?.guestName} — {booking?.roomName}, {booking?.checkIn} → {booking?.checkOut}
            </DialogDescription>
          </DialogHeader>
          {pendingAction === "checked_out" && booking && (
            <div className="space-y-3">
              <div className="rounded-lg bg-purple-50 border border-purple-100 px-3 py-2 text-sm flex items-center justify-between">
                <span className="text-gray-600">
                  {nights} night{nights !== 1 ? "s" : ""} × {rate.toLocaleString()}
                </span>
                <span className="font-semibold text-purple-700" data-testid="text-detail-checkout-total">
                  Total: {total.toLocaleString()}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Payment</label>
                <Select value={payMethod} onValueChange={(v) => setPayMethod(v as any)} disabled={isActing}>
                  <SelectTrigger data-testid="select-detail-checkout-payment"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash — record payment</SelectItem>
                    <SelectItem value="mpesa">M-Pesa — record payment</SelectItem>
                    <SelectItem value="none">Don't record a payment (already paid / no charge)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {payMethod === "mpesa" && (
                <div>
                  <label className="text-sm font-medium text-gray-700">M-Pesa code (optional)</label>
                  <Input
                    value={payMpesaCode}
                    onChange={(e) => setPayMpesaCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SGH4X2K9QT"
                    disabled={isActing}
                    data-testid="input-detail-checkout-mpesa-code"
                  />
                </div>
              )}
              {payMethod !== "none" && (
                <p className="text-xs text-gray-500">
                  The payment is saved on the booking and counts toward your bookings revenue — it is kept separate from shop sales.
                </p>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPendingAction(null)} disabled={isActing}>Back</Button>
            <Button
              className={pendingAction === "cancelled" ? "" : "bg-purple-600 hover:bg-purple-700"}
              variant={pendingAction === "cancelled" ? "destructive" : "default"}
              onClick={handleAction}
              disabled={isActing}
              data-testid="button-detail-confirm-action"
            >
              {isActing ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change dates */}
      <Dialog open={editOpen} onOpenChange={(o) => { if (!isSavingDates && !o) setEditOpen(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change dates</DialogTitle>
            <DialogDescription>
              {booking?.guestName} — {booking?.roomName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Check-in</label>
              <Input
                type="date"
                value={editDates.checkIn}
                onChange={(e) => setEditDates((d) => ({ ...d, checkIn: e.target.value }))}
                disabled={isSavingDates}
                data-testid="input-detail-edit-checkin"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Check-out</label>
              <Input
                type="date"
                value={editDates.checkOut}
                onChange={(e) => setEditDates((d) => ({ ...d, checkOut: e.target.value }))}
                disabled={isSavingDates}
                data-testid="input-detail-edit-checkout"
              />
            </div>
            {editNights > 0 && !editConflict && (
              <p className="text-sm text-gray-600" data-testid="text-detail-edit-total">
                {editNights} night{editNights !== 1 ? "s" : ""} × {rate.toLocaleString()} ={" "}
                <span className="font-semibold text-purple-700">{(editNights * rate).toLocaleString()}</span>
              </p>
            )}
            {editNights <= 0 && (editDates.checkIn && editDates.checkOut) && (
              <p className="text-sm text-red-600">Check-out must be after check-in.</p>
            )}
            {editConflict && (
              <p className="text-sm text-red-600" data-testid="text-detail-edit-conflict">
                Those dates clash with another booking for this room.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isSavingDates}>Back</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={handleSaveDates}
              disabled={isSavingDates || editNights <= 0 || editConflict}
              data-testid="button-detail-save-dates"
            >
              {isSavingDates ? "Saving…" : "Save dates"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

import { useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiCall } from "@/lib/api-config";
import { usePrimaryShop } from "@/hooks/usePrimaryShop";
import { usePermissions } from "@/hooks/usePermissions";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
  BedDouble, ArrowLeft, Loader2, User, Phone, CalendarDays,
  Banknote, Smartphone, StickyNote, IdCard, Users, Receipt, Sparkles,
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

  // Attendants need a Room Bookings permission to view booking details.
  const { hasAttendantPermission, isAdmin } = usePermissions();
  const canViewBookings =
    isAdmin || localStorage.getItem("userType") === "admin" ||
    hasAttendantPermission("bookings", "view_bookings") ||
    hasAttendantPermission("bookings", "create_bookings") ||
    hasAttendantPermission("bookings", "manage_bookings") ||
    hasAttendantPermission("bookings", "manage_rooms");

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
          <Button variant="ghost" size="sm" onClick={() => navigate("/bookings")} data-testid="button-back-bookings">
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

            <p className="text-xs text-gray-400 text-center" data-testid="text-detail-created">
              Booking created {fmtDateTime(booking.createdAt || booking.createAt)}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

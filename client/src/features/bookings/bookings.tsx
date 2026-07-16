import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiCall } from "@/lib/api-config";
import { usePrimaryShop } from "@/hooks/usePrimaryShop";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
  BedDouble, Plus, ChevronLeft, ChevronRight, Loader2, LogIn, LogOut,
  XCircle, CalendarDays, Phone, User,
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
}

interface Room {
  _id: string;
  name: string;
  nightlyRate: number;
}

const bid = (b: Booking) => String(b._id ?? b.id);

const STATUS_META: Record<string, { label: string; cls: string }> = {
  booked: { label: "Booked", cls: "bg-blue-100 text-blue-700" },
  checked_in: { label: "Checked in", cls: "bg-green-100 text-green-700" },
  checked_out: { label: "Checked out", cls: "bg-gray-100 text-gray-600" },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-600" },
};

const toDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const todayStr = () => toDateStr(new Date());
const addDays = (dateStr: string, n: number) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toDateStr(d);
};
const nightsBetween = (a: string, b: string) =>
  Math.max(0, Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000));

export default function BookingsPage() {
  const { shopId, adminId, attendantId, shopData } = usePrimaryShop();
  const isGuestHouse = !!shopData?.isGuestHouse;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [monthAnchor, setMonthAnchor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string>(todayStr());
  const [actionBooking, setActionBooking] = useState<Booking | null>(null);
  const [pendingAction, setPendingAction] = useState<"checked_in" | "checked_out" | "cancelled" | null>(null);
  const [isActing, setIsActing] = useState(false);

  // Payment collected at check-out (recorded on the booking — never a POS sale)
  const [payMethod, setPayMethod] = useState<"cash" | "mpesa" | "none">("cash");
  const [payMpesaCode, setPayMpesaCode] = useState("");

  // Bulk "add many rooms at once" dialog
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({ prefix: "Room", start: "1", count: "10", rate: "" });
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  // Rooms are their OWN records in the standalone guest-house module —
  // NOT products or services. They live on the main Pointify backend.
  const { data: rooms = [], isLoading: roomsLoading } = useQuery<Room[]>({
    queryKey: ["booking-rooms", shopId],
    queryFn: async () => {
      const res = await apiCall(`/api/rooms?shop=${shopId}`, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? data?.rooms ?? [];
      if (!Array.isArray(list)) throw new Error("Rooms endpoint not available");
      return list.map((r: any) => ({
        _id: r._id,
        name: r.name,
        nightlyRate: Number(r.nightlyRate) || 0,
      }));
    },
    enabled: !!shopId,
    retry: 1,
  });

  const {
    data: bookings = [],
    isLoading,
    isError,
  } = useQuery<Booking[]>({
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

  const activeBookings = useMemo(
    () => bookings.filter((b) => b.status === "booked" || b.status === "checked_in"),
    [bookings]
  );

  // ---- Calendar layout ----
  const monthDays = useMemo(() => {
    const year = monthAnchor.getFullYear();
    const month = monthAnchor.getMonth();
    const first = new Date(year, month, 1);
    const startWeekday = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(toDateStr(new Date(year, month, d)));
    return cells;
  }, [monthAnchor]);

  const bookingsOnDay = (day: string) =>
    activeBookings.filter((b) => b.checkIn <= day && day < b.checkOut);

  const dayBookings = bookingsOnDay(selectedDay);
  const occupiedRoomIdsOnDay = new Set(dayBookings.map((b) => b.roomId));

  // Bookings revenue for the displayed month — kept fully separate from POS
  // sales: it is the sum of payments recorded on checked-out bookings.
  const monthRevenue = useMemo(() => {
    const y = monthAnchor.getFullYear();
    const m = monthAnchor.getMonth();
    return bookings
      .filter((b) => {
        if (b.status !== "checked_out") return false;
        if (b.paymentMethod === "none") return false;
        const d = new Date((b.paidAt || b.checkOut) + (b.paidAt ? "" : "T00:00:00"));
        return d.getFullYear() === y && d.getMonth() === m;
      })
      .reduce((sum, b) => sum + (Number(b.amountPaid) || Number(b.totalAmount) || 0), 0);
  }, [bookings, monthAnchor]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["bookings", shopId] });

  const openNewBooking = (day?: string) => {
    const start = day || selectedDay || todayStr();
    navigate(`/bookings/new?date=${start}`);
  };

  const handleAction = async () => {
    if (!actionBooking || !pendingAction) return;
    setIsActing(true);
    try {
      let resp: Response;
      if (pendingAction === "checked_out") {
        // Atomic check-out on the guest-house backend: records the payment on
        // the booking itself AND flips the status in ONE call. Payments stay
        // completely separate from POS sales.
        const nights = Math.max(1, nightsBetween(actionBooking.checkIn, actionBooking.checkOut));
        const total =
          Number(actionBooking.totalAmount) || nights * (Number(actionBooking.nightlyRate) || 0);
        resp = await apiCall(`/api/booking/${bid(actionBooking)}/checkout`, {
          method: "POST",
          body: JSON.stringify({
            paymentMethod: payMethod,
            amountPaid: payMethod === "none" ? 0 : total,
            mpesaCode: payMethod === "mpesa" ? payMpesaCode.trim() : "",
          }),
        });
      } else {
        resp = await apiCall(`/api/booking/${bid(actionBooking)}`, {
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
      const paid =
        pendingAction === "checked_out" && payMethod !== "none"
          ? " Payment recorded on the booking."
          : "";
      toast({ title: "Booking updated", description: `${actionBooking.guestName} ${labels[pendingAction]}.${paid}` });
      refresh();
      setActionBooking(null);
      setPendingAction(null);
    } catch (err: any) {
      // Keep the dialog open so the user can fix the problem and retry. The
      // check-out call is atomic upstream, so a retry can never double-charge.
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
    setIsActing(false);
  };

  // Create many rooms in one go (e.g. Room 1..100).
  const bulkCount = Math.floor(Number(bulkForm.count));
  const bulkStart = Math.floor(Number(bulkForm.start));
  const bulkRate = Number(bulkForm.rate);
  const canBulkCreate =
    !!bulkForm.prefix.trim() &&
    Number.isFinite(bulkStart) && bulkStart >= 0 &&
    Number.isFinite(bulkCount) && bulkCount >= 1 && bulkCount <= 200 &&
    Number.isFinite(bulkRate) && bulkRate > 0 &&
    !bulkProgress;

  const handleBulkCreate = async () => {
    if (!canBulkCreate) return;
    const prefix = bulkForm.prefix.trim();
    const existingNames = new Set(rooms.map((r) => r.name.toLowerCase()));
    const wanted: string[] = [];
    let skipped = 0;
    for (let i = 0; i < bulkCount; i++) {
      const name = `${prefix} ${bulkStart + i}`;
      if (existingNames.has(name.toLowerCase())) skipped++;
      else wanted.push(name);
    }
    setBulkProgress({ done: 0, total: bulkCount });
    let created = 0;
    try {
      if (wanted.length > 0) {
        // ONE request creates all rooms in the standalone rooms collection.
        const bulkResp = await apiCall("/api/rooms/bulk", {
          method: "POST",
          body: JSON.stringify({
            shop: shopId,
            rooms: wanted.map((name) => ({ name, nightlyRate: bulkRate })),
          }),
        });
        const data = await bulkResp.json().catch(() => null);
        if (!bulkResp.ok || !data || data.success === false) {
          throw new Error(data?.error || data?.message || `HTTP ${bulkResp.status}`);
        }
        // Be tolerant of the exact response shape the upstream returns.
        created =
          Number(data.created) ||
          (Array.isArray(data.data) ? data.data.length : 0) ||
          (Array.isArray(data.rooms) ? data.rooms.length : 0) ||
          wanted.length;
        skipped += Number(data.skipped) || 0;
        setBulkProgress({ done: bulkCount, total: bulkCount });
      }
      toast({
        title: "Rooms created",
        description: `${created} room${created !== 1 ? "s" : ""} added${skipped ? `, ${skipped} skipped (name already exists)` : ""}.`,
      });
      setBulkOpen(false);
    } catch (err: any) {
      toast({
        title: created > 0 ? `Stopped after creating ${created} room${created !== 1 ? "s" : ""}` : "Could not create rooms",
        description: err.message,
        variant: "destructive",
      });
    }
    setBulkProgress(null);
    queryClient.invalidateQueries({ queryKey: ["booking-rooms", shopId] });
  };

  const monthLabel = monthAnchor.toLocaleDateString("en-KE", { month: "long", year: "numeric" });

  if (shopData && !isGuestHouse) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-lg mx-auto text-center">
          <BedDouble className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-gray-800 mb-1">Guest House Mode is off</h1>
          <p className="text-sm text-gray-500" data-testid="text-guesthouse-off">
            Turn on Guest House Mode in your shop settings to use room bookings.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 max-w-6xl mx-auto">
        <div className="mb-4 rounded-lg border bg-white p-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <BedDouble className="h-5 w-5 text-purple-600" />
                Room Bookings
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Rooms and bookings are managed here, separate from products and sales.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div
                className="rounded-md bg-purple-50 border border-purple-200 px-3 py-1.5 text-sm"
                data-testid="text-month-revenue"
              >
                <span className="text-gray-600">Revenue ({monthLabel}): </span>
                <span className="font-semibold text-purple-700">{monthRevenue.toLocaleString()}</span>
              </div>
              <Button variant="outline" onClick={() => setBulkOpen(true)} data-testid="button-bulk-add-rooms">
                <BedDouble className="h-4 w-4 mr-1.5" />
                Add Rooms
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => openNewBooking()} disabled={roomsLoading || rooms.length === 0} data-testid="button-new-booking">
                <Plus className="h-4 w-4 mr-1.5" />
                New Booking
              </Button>
            </div>
          </div>
        </div>

        {isError && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800" data-testid="banner-bookings-unavailable">
            The booking service is not available on the main Pointify server yet. Bookings will work
            once the backend team adds the endpoints described in <span className="font-mono">BOOKINGS_API_SPEC.md</span>.
          </div>
        )}
        {!roomsLoading && rooms.length === 0 && (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            No rooms yet. Click "Add Rooms" above to create your rooms (e.g. Room 1–100)
            with their nightly rate. Rooms are managed right here — not under Products.
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr,340px] gap-4">
          {/* Calendar */}
          <div className="rounded-md border bg-white p-3">
            <div className="flex items-center justify-between mb-2">
              <Button variant="ghost" size="sm" onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))} data-testid="button-prev-month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="font-semibold text-gray-800">{monthLabel}</p>
              <Button variant="ghost" size="sm" onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1))} data-testid="button-next-month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-1">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />;
                const dayNum = Number(day.slice(8, 10));
                const count = bookingsOnDay(day).length;
                const isSelected = day === selectedDay;
                const isToday = day === todayStr();
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`relative aspect-square rounded-md border text-sm flex flex-col items-center justify-center transition-colors
                      ${isSelected ? "border-purple-500 bg-purple-50" : "border-gray-100 hover:bg-gray-50"}
                      ${isToday ? "font-bold text-purple-700" : "text-gray-700"}`}
                    data-testid={`day-${day}`}
                  >
                    <span>{dayNum}</span>
                    {count > 0 && (
                      <span className="mt-0.5 text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-purple-600 text-white">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day detail */}
          <div className="rounded-md border bg-white p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-purple-600" />
                {new Date(selectedDay + "T00:00:00").toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" })}
              </p>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openNewBooking(selectedDay)} disabled={rooms.length === 0}>
                <Plus className="h-3 w-3 mr-1" /> Book
              </Button>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              {rooms.length > 0 && (
                <>{rooms.length - occupiedRoomIdsOnDay.size} of {rooms.length} room{rooms.length !== 1 ? "s" : ""} free this night</>
              )}
            </p>
            {isLoading ? (
              <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-purple-500" /></div>
            ) : dayBookings.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No guests this night.</p>
            ) : (
              <ul className="space-y-2 overflow-y-auto">
                {dayBookings.map((b) => (
                  <li key={bid(b)} className="rounded-md border p-2" data-testid={`card-booking-${bid(b)}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm text-gray-900 truncate flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-gray-400" />{b.guestName}
                      </p>
                      <Badge className={`text-[10px] ${STATUS_META[b.status]?.cls || ""}`} variant="secondary">
                        {STATUS_META[b.status]?.label || b.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {b.roomName} · {b.checkIn} → {b.checkOut}
                      {b.guestPhone ? <> · <Phone className="inline h-3 w-3" /> {b.guestPhone}</> : null}
                    </p>
                    <div className="flex gap-1.5 mt-1.5">
                      {b.status === "booked" && (
                        <>
                          <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 text-green-700 border-green-300" onClick={() => { setActionBooking(b); setPendingAction("checked_in"); }}>
                            <LogIn className="h-3 w-3 mr-1" />Check in
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 text-red-600 border-red-200" onClick={() => { setActionBooking(b); setPendingAction("cancelled"); }}>
                            <XCircle className="h-3 w-3 mr-1" />Cancel
                          </Button>
                        </>
                      )}
                      {b.status === "checked_in" && (
                        <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={() => { setActionBooking(b); setPendingAction("checked_out"); setPayMethod("cash"); setPayMpesaCode(""); }}>
                          <LogOut className="h-3 w-3 mr-1" />Check out
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* All upcoming bookings */}
        <div className="rounded-md border bg-white mt-4">
          <p className="font-semibold text-gray-800 p-3 pb-1">All bookings</p>
          {isLoading ? (
            <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-purple-500" /></div>
          ) : bookings.length === 0 ? (
            <p className="text-sm text-gray-400 p-4">No bookings yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="p-2 pl-3">Guest</th>
                    <th className="p-2">Room</th>
                    <th className="p-2">Check-in</th>
                    <th className="p-2">Check-out</th>
                    <th className="p-2 text-right">Total</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...bookings]
                    .sort((a, b) => (a.checkIn < b.checkIn ? 1 : -1))
                    .map((b) => (
                      <tr key={bid(b)} className="border-b last:border-0" data-testid={`row-booking-${bid(b)}`}>
                        <td className="p-2 pl-3 font-medium text-gray-900">{b.guestName}</td>
                        <td className="p-2 text-gray-600">{b.roomName}</td>
                        <td className="p-2 text-gray-600">{b.checkIn}</td>
                        <td className="p-2 text-gray-600">{b.checkOut}</td>
                        <td className="p-2 text-right text-gray-800">{Number(b.totalAmount).toLocaleString()}</td>
                        <td className="p-2">
                          <Badge className={`text-[10px] ${STATUS_META[b.status]?.cls || ""}`} variant="secondary">
                            {STATUS_META[b.status]?.label || b.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirm status action */}
      <Dialog open={!!actionBooking} onOpenChange={(o) => { if (!isActing && !o) { setActionBooking(null); setPendingAction(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {pendingAction === "checked_in" && "Check in guest?"}
              {pendingAction === "checked_out" && "Check out guest?"}
              {pendingAction === "cancelled" && "Cancel booking?"}
            </DialogTitle>
            <DialogDescription>
              {actionBooking?.guestName} — {actionBooking?.roomName}, {actionBooking?.checkIn} → {actionBooking?.checkOut}
            </DialogDescription>
          </DialogHeader>
          {pendingAction === "checked_out" && actionBooking && (
            <div className="space-y-3">
              <div className="rounded-lg bg-purple-50 border border-purple-100 px-3 py-2 text-sm flex items-center justify-between">
                <span className="text-gray-600">
                  {Math.max(1, nightsBetween(actionBooking.checkIn, actionBooking.checkOut))} night
                  {Math.max(1, nightsBetween(actionBooking.checkIn, actionBooking.checkOut)) !== 1 ? "s" : ""} × {Number(actionBooking.nightlyRate).toLocaleString()}
                </span>
                <span className="font-semibold text-purple-700" data-testid="text-checkout-total">
                  Total: {Number(actionBooking.totalAmount || Math.max(1, nightsBetween(actionBooking.checkIn, actionBooking.checkOut)) * actionBooking.nightlyRate).toLocaleString()}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Payment</label>
                <Select value={payMethod} onValueChange={(v) => setPayMethod(v as any)} disabled={isActing}>
                  <SelectTrigger data-testid="select-checkout-payment"><SelectValue /></SelectTrigger>
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
                    data-testid="input-checkout-mpesa-code"
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
            <Button variant="outline" onClick={() => { setActionBooking(null); setPendingAction(null); }} disabled={isActing}>Back</Button>
            <Button
              className={pendingAction === "cancelled" ? "" : "bg-purple-600 hover:bg-purple-700"}
              variant={pendingAction === "cancelled" ? "destructive" : "default"}
              onClick={handleAction}
              disabled={isActing}
              data-testid="button-confirm-action"
            >
              {isActing ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk add rooms */}
      <Dialog open={bulkOpen} onOpenChange={(o) => { if (!bulkProgress) setBulkOpen(o); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add many rooms at once</DialogTitle>
            <DialogDescription>
              Creates numbered rooms, e.g. "Room 1" to "Room 100", each with the nightly
              rate you set. Rooms with names that already exist are skipped.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Name prefix</label>
                <Input
                  value={bulkForm.prefix}
                  onChange={(e) => setBulkForm((f) => ({ ...f, prefix: e.target.value }))}
                  placeholder="Room"
                  disabled={!!bulkProgress}
                  data-testid="input-bulk-prefix"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Start number</label>
                <Input
                  type="number"
                  min={0}
                  value={bulkForm.start}
                  onChange={(e) => setBulkForm((f) => ({ ...f, start: e.target.value }))}
                  disabled={!!bulkProgress}
                  data-testid="input-bulk-start"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">How many rooms</label>
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={bulkForm.count}
                  onChange={(e) => setBulkForm((f) => ({ ...f, count: e.target.value }))}
                  disabled={!!bulkProgress}
                  data-testid="input-bulk-count"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Nightly rate</label>
                <Input
                  type="number"
                  min={1}
                  value={bulkForm.rate}
                  onChange={(e) => setBulkForm((f) => ({ ...f, rate: e.target.value }))}
                  placeholder="e.g. 2500"
                  disabled={!!bulkProgress}
                  data-testid="input-bulk-rate"
                />
              </div>
            </div>
            {canBulkCreate && (
              <p className="text-xs text-gray-500" data-testid="text-bulk-preview">
                Will create: {bulkForm.prefix.trim()} {bulkStart} … {bulkForm.prefix.trim()} {bulkStart + bulkCount - 1}
              </p>
            )}
            {bulkProgress && (
              <div>
                <div className="h-2 w-full rounded bg-gray-200 overflow-hidden">
                  <div
                    className="h-full bg-purple-600 transition-all"
                    style={{ width: `${Math.round((bulkProgress.done / bulkProgress.total) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1" data-testid="text-bulk-progress">
                  Creating room {bulkProgress.done} of {bulkProgress.total}…
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={!!bulkProgress}>Cancel</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={handleBulkCreate}
              disabled={!canBulkCreate}
              data-testid="button-bulk-create"
            >
              {bulkProgress ? (<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Creating…</>) : "Create Rooms"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

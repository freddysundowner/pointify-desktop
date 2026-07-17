import { useEffect, useMemo, useState } from "react";
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
import { usePermissions } from "@/hooks/usePermissions";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useNavigationRoute } from "@/lib/navigation-utils";
import {
  BedDouble, Plus, Loader2, LogIn, LogOut,
  XCircle, CalendarDays, Phone, User, Trash2, Sparkles, Receipt,
  SlidersHorizontal, ArrowLeft,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
  group?: string;
  nightlyRate: number;
  amenities?: string[];
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

export default function BookingsPage({ view = "rooms" }: { view?: "rooms" | "bookings" }) {
  const { shopId, adminId, attendantId, shopData } = usePrimaryShop();
  const isGuestHouse = !!shopData?.isGuestHouse;

  // Room-booking permissions: admins can do everything; attendants only what
  // they've been granted under the "bookings" permission group.
  const { hasAttendantPermission, isAdmin } = usePermissions();
  const isAdminUser = isAdmin || localStorage.getItem("userType") === "admin";
  const canManageRooms = isAdminUser || hasAttendantPermission("bookings", "manage_rooms");
  const canCreateBookings = isAdminUser || hasAttendantPermission("bookings", "create_bookings");
  const canManageBookings = isAdminUser || hasAttendantPermission("bookings", "manage_bookings");
  const canViewBookingsReport = isAdminUser || hasAttendantPermission("bookings", "view_reports");
  const canViewBookings =
    isAdminUser ||
    canManageRooms || canCreateBookings || canManageBookings ||
    hasAttendantPermission("bookings", "view_bookings");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const dashboardRoute = useNavigationRoute('dashboard');

  // The stay the user is checking availability for (check-in → check-out)
  const [rangeFrom, setRangeFrom] = useState<string>(todayStr());
  const [rangeTo, setRangeTo] = useState<string>(addDays(todayStr(), 1));
  // Filters for the "All bookings" list (applied on the device — no server call)
  const [filterText, setFilterText] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");

  const [actionBooking, setActionBooking] = useState<Booking | null>(null);
  const [pendingAction, setPendingAction] = useState<"checked_in" | "checked_out" | "cancelled" | null>(null);
  const [isActing, setIsActing] = useState(false);

  // Payment collected at check-out (recorded on the booking — never a POS sale)
  const [payMethod, setPayMethod] = useState<"cash" | "mpesa" | "none">("cash");
  const [payMpesaCode, setPayMpesaCode] = useState("");

  // Floating "+" action menu (small devices only)
  const [fabOpen, setFabOpen] = useState(false);

  // Bulk "add many rooms at once" dialog
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({ prefix: "Room", start: "1", count: "10", rate: "", group: "", amenities: "" });
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  // Rooms grid: filters + clicked room
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [roomSearch, setRoomSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "vacant" | "occupied">("all");
  const [roomDialog, setRoomDialog] = useState<Room | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const mobileFilterCount = (groupFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0);

  // Change the dates of an existing booking (guest extends / shortens stay)
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [editDates, setEditDates] = useState({ checkIn: "", checkOut: "" });
  const [isSavingDates, setIsSavingDates] = useState(false);

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
        group: String(r.group || "").trim(),
        nightlyRate: Number(r.nightlyRate) || 0,
        amenities: Array.isArray(r.amenities)
          ? Array.from(new Set(r.amenities.map((a: any) => String(a ?? "").trim()).filter(Boolean)))
          : [],
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

  // Bookings that overlap ANY night of the selected stay range
  const rangeBookings = activeBookings.filter(
    (b) => b.checkIn < rangeTo && b.checkOut > rangeFrom
  );
  const occupiedRoomIds = new Set(rangeBookings.map((b) => b.roomId));
  const rangeNights = nightsBetween(rangeFrom, rangeTo);

  // Rooms grouped by their (optional) group label, respecting the filter
  const groupNames = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach((r) => set.add(r.group || ""));
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [rooms]);

  const groupedRooms = useMemo(() => {
    const filterValue = groupFilter === "__ungrouped" ? "" : groupFilter;
    const q = roomSearch.trim().toLowerCase();
    const visible = rooms.filter((r) => {
      if (groupFilter !== "all" && (r.group || "") !== filterValue) return false;
      if (q && !r.name.toLowerCase().includes(q) && !(r.group || "").toLowerCase().includes(q))
        return false;
      if (statusFilter !== "all") {
        const occupied = occupiedRoomIds.has(r._id);
        if (statusFilter === "vacant" && occupied) return false;
        if (statusFilter === "occupied" && !occupied) return false;
      }
      return true;
    });
    const map = new Map<string, Room[]>();
    visible.forEach((r) => {
      const g = r.group || "";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(r);
    });
    const sorted = [...map.entries()].sort(([a], [b]) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
    sorted.forEach(([, list]) =>
      list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    );
    return sorted;
  }, [rooms, groupFilter, roomSearch, statusFilter, occupiedRoomIds]);

  // The active booking (if any) covering the selected night for a room
  const bookingForRoom = (rid: string) =>
    rangeBookings.find((b) => b.roomId === rid) || null;

  // Bookings revenue for the displayed month — kept fully separate from POS
  // sales: it is the sum of payments recorded on checked-out bookings.
  const monthRevenue = useMemo(() => {
    const anchor = new Date(rangeFrom + "T00:00:00");
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    return bookings
      .filter((b) => {
        if (b.status !== "checked_out") return false;
        if (b.paymentMethod === "none") return false;
        const d = new Date((b.paidAt || b.checkOut) + (b.paidAt ? "" : "T00:00:00"));
        return d.getFullYear() === y && d.getMonth() === m;
      })
      .reduce((sum, b) => sum + (Number(b.amountPaid) || Number(b.totalAmount) || 0), 0);
  }, [bookings, rangeFrom]);

  // Debounce the guest search so we don't hit the server on every keystroke.
  const [debouncedText, setDebouncedText] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedText(filterText.trim()), 350);
    return () => clearTimeout(t);
  }, [filterText]);

  const hasFilters = !!(debouncedText || filterStatus !== "all" || filterFrom || filterTo);

  // Server-side filtered "All bookings" list. The server (and eventually the
  // main backend database) applies status / date-range / guest search filters.
  const { data: serverFiltered = [], isFetching: isFilterFetching } = useQuery<Booking[]>({
    queryKey: ["bookings", shopId, "filtered", filterStatus, filterFrom, filterTo, debouncedText],
    queryFn: async () => {
      const params = new URLSearchParams({ shop: shopId! });
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);
      if (debouncedText) params.set("q", debouncedText);
      const res = await apiCall(`/api/booking?${params.toString()}`, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? data?.bookings ?? [];
      if (!Array.isArray(list)) throw new Error("Bookings endpoint not available");
      return list;
    },
    enabled: !!shopId && hasFilters,
    placeholderData: (prev) => prev,
    retry: 1,
  });

  const filteredBookings = hasFilters ? serverFiltered : bookings;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["bookings", shopId] });
    // Report numbers are served by /api/booking/stats — keep them fresh too.
    queryClient.invalidateQueries({ queryKey: ["booking-stats", shopId] });
  };

  const openNewBooking = (day?: string, roomId?: string) => {
    const start = day || rangeFrom || todayStr();
    const end = !day && rangeNights > 0 ? `&out=${rangeTo}` : "";
    navigate(`/bookings/new?date=${start}${end}${roomId ? `&room=${roomId}` : ""}`);
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
            rooms: wanted.map((name) => ({
              name,
              nightlyRate: bulkRate,
              group: bulkForm.group.trim(),
              amenities: bulkForm.amenities.split(",").map((a) => a.trim()).filter(Boolean),
            })),
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

  const monthLabel = new Date(rangeFrom + "T00:00:00").toLocaleDateString("en-KE", { month: "long", year: "numeric" });

  // Delete a room (upstream refuses with 409 if it still has active bookings)
  const [deleteRoom, setDeleteRoom] = useState<Room | null>(null);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  const handleDeleteRoom = async () => {
    if (!deleteRoom) return;
    setIsDeletingRoom(true);
    try {
      const resp = await apiCall(`/api/rooms/${deleteRoom._id}`, { method: "DELETE" });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || (data && data.success === false)) {
        throw new Error(
          resp.status === 409
            ? "This room still has an upcoming or checked-in booking. Cancel or check out that booking first."
            : data?.error || data?.message || `HTTP ${resp.status}`
        );
      }
      toast({ title: "Room deleted", description: `${deleteRoom.name} has been removed.` });
      setDeleteRoom(null);
      queryClient.invalidateQueries({ queryKey: ["booking-rooms", shopId] });
    } catch (err: any) {
      toast({ title: "Could not delete room", description: err.message, variant: "destructive" });
    }
    setIsDeletingRoom(false);
  };

  // Change the dates of an existing booking (guest shortens or extends a stay).
  const openEditDates = (b: Booking) => {
    setEditBooking(b);
    setEditDates({ checkIn: b.checkIn, checkOut: b.checkOut });
  };
  const editNights = editDates.checkIn && editDates.checkOut ? nightsBetween(editDates.checkIn, editDates.checkOut) : 0;
  const editConflict = useMemo(() => {
    if (!editBooking || editNights <= 0) return false;
    return activeBookings.some(
      (b) =>
        bid(b) !== bid(editBooking) &&
        b.roomId === editBooking.roomId &&
        b.checkIn < editDates.checkOut &&
        b.checkOut > editDates.checkIn
    );
  }, [editBooking, editDates, editNights, activeBookings]);

  const handleSaveDates = async () => {
    if (!editBooking || editNights <= 0 || editConflict) return;
    setIsSavingDates(true);
    try {
      const rate = Number(editBooking.nightlyRate) || 0;
      const resp = await apiCall(`/api/booking/${bid(editBooking)}`, {
        method: "PUT",
        body: JSON.stringify({
          checkIn: editDates.checkIn,
          checkOut: editDates.checkOut,
          totalAmount: editNights * rate,
        }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || (data && data.success === false)) {
        throw new Error(data?.error || data?.message || `HTTP ${resp.status}`);
      }
      toast({
        title: "Dates updated",
        description: `${editBooking.guestName}: ${editDates.checkIn} → ${editDates.checkOut} (${editNights} night${editNights !== 1 ? "s" : ""}).`,
      });
      refresh();
      setEditBooking(null);
    } catch (err: any) {
      toast({ title: "Could not update dates", description: err.message, variant: "destructive" });
    }
    setIsSavingDates(false);
  };

  if (!canViewBookings) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-lg mx-auto text-center">
          <BedDouble className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-gray-800 mb-1">No access to Room Bookings</h1>
          <p className="text-sm text-gray-500" data-testid="text-bookings-no-access">
            Ask your shop owner to give you the Room Bookings permission.
          </p>
        </div>
      </DashboardLayout>
    );
  }

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
      <div className="px-2 py-4 sm:px-3 lg:px-4 lg:py-6 w-full">
        <div className="mb-4 rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-600 to-purple-700 p-4 sm:p-5 text-white shadow-md">
          <div className="flex items-center justify-between gap-3">
            {/* Back button — left */}
            <button
              onClick={() => navigate(view === "rooms" ? "/bookings" : dashboardRoute)}
              className="h-9 w-9 rounded-xl flex items-center justify-center bg-white/15 active:bg-white/25 shrink-0"
              aria-label={view === "rooms" ? "Back to bookings" : "Back to home"}
              data-testid="button-back-header"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            {/* Title + revenue — evenly centered on small devices */}
            <div className="min-w-0 flex-1 text-center lg:text-left">
              <h1 className="text-lg sm:text-xl font-bold flex items-center justify-center lg:justify-start gap-2">
                <span className="bg-white/15 rounded-xl p-2">
                  <BedDouble className="h-5 w-5" />
                </span>
                {view === "rooms" ? "Rooms" : "Bookings"}
              </h1>
              <p className="text-xs text-purple-200 mt-1" data-testid="text-month-revenue">
                Revenue ({monthLabel}):{" "}
                <span className="font-semibold text-white">{monthRevenue.toLocaleString()}</span>
              </p>
            </div>

            {/* Header actions — desktop only; small devices use the floating "+" button */}
            <div className="hidden lg:flex items-center gap-2 shrink-0">
              {view === "rooms" && canManageRooms && (
                <Button
                  variant="outline"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
                  onClick={() => setBulkOpen(true)}
                  data-testid="button-bulk-add-rooms"
                >
                  <BedDouble className="h-4 w-4 mr-1.5" />
                  Add Rooms
                </Button>
              )}
              {canCreateBookings && (
                <Button
                  className="bg-white text-purple-700 hover:bg-purple-50 font-semibold shadow-sm"
                  onClick={() => openNewBooking()}
                  disabled={roomsLoading || rooms.length === 0}
                  data-testid="button-new-booking"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  New Booking
                </Button>
              )}
            </div>

            {/* Right spacer on small devices keeps the title perfectly centered */}
            <div className="lg:hidden h-9 w-9 shrink-0" aria-hidden="true" />
          </div>
        </div>

        {isError && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800" data-testid="banner-bookings-unavailable">
            The booking service is not available on the main Pointify server yet. Bookings will work
            once the backend team adds the endpoints described in <span className="font-mono">BOOKINGS_API_SPEC.md</span>.
          </div>
        )}
        {view === "rooms" && !roomsLoading && rooms.length === 0 && (
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            No rooms yet. Click "Add Rooms" above to create your rooms (e.g. Room 1–100)
            with their nightly rate. Rooms are managed right here — not under Products.
          </div>
        )}

        {/* Rooms grid — manage rooms, see occupancy for the selected night */}
        {view === "rooms" && rooms.length > 0 && (
          <div className="rounded-2xl border bg-white p-3 sm:p-4 mb-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                <BedDouble className="h-4 w-4 text-purple-600" />
                Rooms
                <span className="text-xs font-normal text-gray-500" data-testid="text-free-count">
                  — {rooms.length - occupiedRoomIds.size} of {rooms.length} free for this stay
                </span>
              </p>
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-white border border-gray-300 inline-block" />Free</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-blue-500 inline-block" />Booked</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-green-500 inline-block" />Checked in</span>
              </div>
            </div>
            {/* Mobile: search + filter sheet trigger */}
            <div className="flex items-center gap-2 mb-3 sm:hidden">
              <Input
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                placeholder="Search room name…"
                className="h-9 flex-1 min-w-0 text-sm bg-white"
                data-testid="input-room-search-mobile"
              />
              <Button
                variant="outline"
                className="h-9 shrink-0 relative"
                onClick={() => setFilterSheetOpen(true)}
                data-testid="button-open-filters"
              >
                <SlidersHorizontal className="h-4 w-4 mr-1.5" />
                Filters
                {mobileFilterCount > 0 && (
                  <span className="ml-1.5 h-5 min-w-5 px-1 rounded-full bg-purple-600 text-white text-[11px] font-semibold inline-flex items-center justify-center">
                    {mobileFilterCount}
                  </span>
                )}
              </Button>
            </div>
            <p className="text-[11px] text-gray-500 -mt-2 mb-3 sm:hidden" data-testid="text-range-summary-mobile">
              Stay: {rangeFrom} → {rangeTo} · {rangeNights > 0 ? `${rangeNights} night${rangeNights !== 1 ? "s" : ""}` : "invalid dates"}
            </p>
            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetContent side="bottom" className="rounded-t-2xl">
                <SheetHeader className="text-left">
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-3 pb-2">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1.5">Stay dates</label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="date"
                        value={rangeFrom}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!v) return;
                          setRangeFrom(v);
                          if (v >= rangeTo) setRangeTo(addDays(v, 1));
                        }}
                        className="h-10 flex-1 min-w-0 text-sm bg-white"
                        data-testid="input-range-from-sheet"
                      />
                      <span className="text-gray-400 text-sm shrink-0">→</span>
                      <Input
                        type="date"
                        value={rangeTo}
                        min={addDays(rangeFrom, 1)}
                        onChange={(e) => { if (e.target.value) setRangeTo(e.target.value); }}
                        className="h-10 flex-1 min-w-0 text-sm bg-white"
                        data-testid="input-range-to-sheet"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {rangeNights > 0 ? `${rangeNights} night${rangeNights !== 1 ? "s" : ""}` : "invalid dates"}
                    </p>
                  </div>
                  {groupNames.length > 1 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1.5">Group</label>
                      <Select value={groupFilter} onValueChange={setGroupFilter}>
                        <SelectTrigger className="h-10 w-full text-sm bg-white" data-testid="select-room-group-sheet">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All groups</SelectItem>
                          {groupNames.map((g) => (
                            <SelectItem key={g || "__ungrouped"} value={g || "__ungrouped"}>
                              {g || "Ungrouped"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1.5">Availability</label>
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                      <SelectTrigger className="h-10 w-full text-sm bg-white" data-testid="select-room-status-sheet">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All rooms</SelectItem>
                        <SelectItem value="vacant">Vacant</SelectItem>
                        <SelectItem value="occupied">Occupied</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => { setGroupFilter("all"); setStatusFilter("all"); }}
                      data-testid="button-clear-filters"
                    >
                      Clear
                    </Button>
                    <Button
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                      onClick={() => setFilterSheetOpen(false)}
                      data-testid="button-apply-filters"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop: inline filter bar — evenly distributed */}
            <div className="hidden sm:flex items-end gap-3 rounded-xl bg-gray-50 border border-gray-100 p-3 mb-4">
              <div className="flex-[2] min-w-0">
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide block mb-1">
                  Stay dates
                  <span className="normal-case font-normal text-gray-400 ml-1.5" data-testid="text-range-nights">
                    ({rangeNights > 0 ? `${rangeNights} night${rangeNights !== 1 ? "s" : ""}` : "invalid dates"})
                  </span>
                </label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="date"
                    value={rangeFrom}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) return;
                      setRangeFrom(v);
                      if (v >= rangeTo) setRangeTo(addDays(v, 1));
                    }}
                    className="h-9 flex-1 min-w-0 text-sm bg-white"
                    data-testid="input-range-from"
                  />
                  <span className="text-gray-400 text-sm shrink-0">→</span>
                  <Input
                    type="date"
                    value={rangeTo}
                    min={addDays(rangeFrom, 1)}
                    onChange={(e) => { if (e.target.value) setRangeTo(e.target.value); }}
                    className="h-9 flex-1 min-w-0 text-sm bg-white"
                    data-testid="input-range-to"
                  />
                </div>
              </div>
              <div className="flex-[1.5] min-w-0">
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide block mb-1">Search</label>
                <Input
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  placeholder="Search room name…"
                  className="h-9 w-full text-sm bg-white"
                  data-testid="input-room-search"
                />
              </div>
              {groupNames.length > 1 && (
                <div className="flex-1 min-w-0">
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide block mb-1">Group</label>
                  <Select value={groupFilter} onValueChange={setGroupFilter}>
                    <SelectTrigger className="h-9 w-full text-sm bg-white" data-testid="select-room-group">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All groups</SelectItem>
                      {groupNames.map((g) => (
                        <SelectItem key={g || "__ungrouped"} value={g || "__ungrouped"}>
                          {g || "Ungrouped"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide block mb-1">Availability</label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                  <SelectTrigger className="h-9 w-full text-sm bg-white" data-testid="select-room-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All rooms</SelectItem>
                    <SelectItem value="vacant">Vacant</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isLoading && (
              <div className="py-6 flex justify-center" data-testid="loader-rooms-occupancy">
                <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
              </div>
            )}
            {!isLoading && groupedRooms.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center" data-testid="text-no-rooms-match">
                No rooms match these filters.
              </p>
            )}
            {!isLoading && groupedRooms.map(([group, list]) => (
              <div key={group || "__none"} className="mb-4 last:mb-0">
                {(groupNames.length > 1 || group) && (
                  <div className="flex items-center gap-2 mb-2 mt-3 first:mt-0">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {group || "Ungrouped"}
                    </p>
                    <span className="text-[11px] text-gray-400">· {list.length} room{list.length !== 1 ? "s" : ""}</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                )}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5 sm:gap-3">
                  {list.map((room) => {
                    const b = bookingForRoom(room._id);
                    const cls = !b
                      ? "bg-white border-gray-200 hover:border-purple-400 hover:shadow-md hover:-translate-y-0.5 active:bg-purple-50"
                      : b.status === "checked_in"
                      ? "bg-gradient-to-br from-green-500 to-green-600 border-green-600 text-white hover:shadow-md hover:-translate-y-0.5 active:from-green-600 active:to-green-700"
                      : "bg-gradient-to-br from-blue-500 to-blue-600 border-blue-600 text-white hover:shadow-md hover:-translate-y-0.5 active:from-blue-600 active:to-blue-700";
                    return (
                      <button
                        key={room._id}
                        onClick={() => setRoomDialog(room)}
                        className={`rounded-xl border px-3 py-3.5 text-left transition-all duration-150 shadow-sm ${cls}`}
                        data-testid={`tile-room-${room._id}`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <p className="text-sm font-semibold truncate flex items-center gap-1 min-w-0">
                            <span className="truncate">{room.name}</span>
                            {(room.amenities?.length ?? 0) > 0 && (
                              <Sparkles
                                className={`h-3 w-3 shrink-0 ${b ? "text-white/80" : "text-purple-500"}`}
                                data-testid={`icon-amenities-${room._id}`}
                              />
                            )}
                          </p>
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${
                              !b ? "bg-gray-300" : b.status === "checked_in" ? "bg-white" : "bg-white/80"
                            }`}
                          />
                        </div>
                        <p className={`text-xs truncate ${b ? "text-white/90" : "text-gray-600"}`}>
                          {b ? b.guestName : `${Number(room.nightlyRate).toLocaleString()} / night`}
                        </p>
                        <p className={`text-[10px] mt-0.5 truncate ${b ? "text-white/70" : "text-gray-400"}`}>
                          {!b ? "Available" : b.status === "checked_in" ? "Checked in" : "Booked"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* All upcoming bookings */}
        {view === "bookings" && (
        <div className="rounded-2xl border bg-white mt-4 shadow-sm overflow-hidden">
          <p className="font-semibold text-gray-800 p-3 sm:p-4 pb-1 sm:pb-1">All bookings</p>

          {/* Filters — applied on the device, no server call needed */}
          <div className="px-3 sm:px-4 pt-2 pb-3 flex flex-col sm:flex-row gap-2 sm:items-center border-b">
            <Input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search guest name, ID or phone…"
              className="h-9 sm:max-w-[240px]"
              data-testid="input-filter-guest"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 sm:w-[150px]" data-testid="select-filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
                <SelectItem value="checked_in">Checked in</SelectItem>
                <SelectItem value="checked_out">Checked out</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="h-9 sm:w-[150px]" data-testid="input-filter-from" />
              <span className="text-xs text-gray-400">to</span>
              <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="h-9 sm:w-[150px]" data-testid="input-filter-to" />
            </div>
            {isFilterFetching && <Loader2 className="h-4 w-4 animate-spin text-purple-400 shrink-0" />}
            {(filterText || filterStatus !== "all" || filterFrom || filterTo) && (
              <Button variant="ghost" size="sm" className="h-9 text-xs text-gray-500 self-start sm:self-auto" onClick={() => { setFilterText(""); setFilterStatus("all"); setFilterFrom(""); setFilterTo(""); }} data-testid="button-clear-filters">
                <XCircle className="h-3.5 w-3.5 mr-1" />Clear
              </Button>
            )}
          </div>
          {isLoading ? (
            <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-purple-500" /></div>
          ) : bookings.length === 0 ? (
            <p className="text-sm text-gray-400 p-4">No bookings yet.</p>
          ) : filteredBookings.length === 0 ? (
            <p className="text-sm text-gray-400 p-4" data-testid="text-no-filter-results">No bookings match these filters.</p>
          ) : (
            <>
            <div className="sm:hidden divide-y">
              {[...filteredBookings]
                .sort((a, b) => (a.checkIn < b.checkIn ? 1 : -1))
                .map((b) => (
                  <div
                    key={bid(b)}
                    className="p-3 cursor-pointer active:bg-purple-50"
                    onClick={() => navigate(`/bookings/${bid(b)}`)}
                    data-testid={`card-booking-${bid(b)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{b.guestName}</p>
                        <p className="text-xs text-gray-500 truncate">{b.roomName}</p>
                      </div>
                      <Badge className={`text-[10px] shrink-0 ${STATUS_META[b.status]?.cls || ""}`} variant="secondary">
                        {STATUS_META[b.status]?.label || b.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                        {b.checkIn} → {b.checkOut}
                      </span>
                      <span className="font-semibold text-gray-900">{Number(b.totalAmount).toLocaleString()}</span>
                    </div>
                    {canManageBookings && (b.status === "booked" || b.status === "checked_in") && (
                      <Button size="sm" variant="outline" className="mt-2 h-8 w-full text-xs text-purple-700 border-purple-200" onClick={(e) => { e.stopPropagation(); openEditDates(b); }} data-testid={`button-edit-dates-mobile-${bid(b)}`}>
                        <CalendarDays className="h-3.5 w-3.5 mr-1" />Change dates
                      </Button>
                    )}
                  </div>
                ))}
            </div>
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="p-2 pl-3">Guest</th>
                    <th className="p-2">Check-in</th>
                    <th className="p-2">Check-out</th>
                    <th className="p-2 text-right">Total</th>
                    <th className="p-2">Status</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody className="[&_td]:align-middle">
                  {[...filteredBookings]
                    .sort((a, b) => (a.checkIn < b.checkIn ? 1 : -1))
                    .map((b) => (
                      <tr
                        key={bid(b)}
                        className="border-b last:border-0 cursor-pointer hover:bg-purple-50/50"
                        onClick={() => navigate(`/bookings/${bid(b)}`)}
                        data-testid={`row-booking-${bid(b)}`}
                      >
                        <td className="p-2 pl-3">
                          <p className="font-medium text-gray-900">{b.guestName}</p>
                          <p className="text-xs text-gray-500">{b.roomName}</p>
                        </td>
                        <td className="p-2 text-gray-600">{b.checkIn}</td>
                        <td className="p-2 text-gray-600">{b.checkOut}</td>
                        <td className="p-2 text-right text-gray-800">{Number(b.totalAmount).toLocaleString()}</td>
                        <td className="p-2">
                          <Badge className={`text-[10px] ${STATUS_META[b.status]?.cls || ""}`} variant="secondary">
                            {STATUS_META[b.status]?.label || b.status}
                          </Badge>
                        </td>
                        <td className="p-2 pr-3 text-right whitespace-nowrap">
                          {canManageBookings && (b.status === "booked" || b.status === "checked_in") && (
                            <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2 text-purple-700" onClick={(e) => { e.stopPropagation(); openEditDates(b); }} data-testid={`button-edit-dates-${bid(b)}`}>
                              <CalendarDays className="h-3 w-3 mr-1" />Change dates
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
        )}
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

      {/* Room details — booking status for the selected night, book / manage */}
      <Dialog open={!!roomDialog} onOpenChange={(o) => { if (!o) setRoomDialog(null); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:max-w-md rounded-lg">
          {roomDialog && (() => {
            const b = bookingForRoom(roomDialog._id);
            return (
              <>
                <DialogHeader>
                  <div className="rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 -mx-1 mb-1 mt-4">
                    <DialogTitle className="flex items-center gap-2 text-white">
                      <span className="h-9 w-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                        <BedDouble className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">{roomDialog.name}</span>
                        {roomDialog.group && (
                          <span className="block text-xs font-normal text-purple-200 truncate">{roomDialog.group}</span>
                        )}
                      </span>
                    </DialogTitle>
                    <DialogDescription className="text-purple-100 mt-2 flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">{Number(roomDialog.nightlyRate).toLocaleString()} <span className="font-normal text-purple-200">/ night</span></span>
                      <span className="text-xs text-purple-200">{rangeFrom} → {rangeTo}</span>
                    </DialogDescription>
                  </div>
                </DialogHeader>
                {(roomDialog.amenities?.length ?? 0) > 0 && (
                  <div className="rounded-md border border-purple-100 bg-purple-50/60 p-3" data-testid="room-dialog-amenities">
                    <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      Amenities
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {roomDialog.amenities!.map((a) => (
                        <span key={a} className="text-xs bg-white border border-purple-200 text-purple-800 rounded-full px-2 py-0.5">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {b ? (
                  <div className="rounded-md border p-3 space-y-1.5" data-testid="room-dialog-booking">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm text-gray-900 flex items-center gap-1.5">
                        <User className="h-4 w-4 text-gray-400" />
                        {b.guestName}
                      </p>
                      <Badge className={`text-[10px] ${STATUS_META[b.status]?.cls || ""}`} variant="secondary">
                        {STATUS_META[b.status]?.label || b.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {b.checkIn} → {b.checkOut}
                      {b.guestPhone ? <> · <Phone className="inline h-3 w-3" /> {b.guestPhone}</> : null}
                    </p>
                    <div className="flex gap-1.5 pt-1 flex-wrap">
                      {canManageBookings && (b.status === "booked" || b.status === "checked_in") && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setRoomDialog(null); openEditDates(b); }} data-testid="button-room-edit-dates">
                          <CalendarDays className="h-3.5 w-3.5 mr-1" />Change dates
                        </Button>
                      )}
                      {canManageBookings && b.status === "booked" && (
                        <>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-300" onClick={() => { setRoomDialog(null); setActionBooking(b); setPendingAction("checked_in"); }} data-testid="button-room-checkin">
                            <LogIn className="h-3.5 w-3.5 mr-1" />Check in
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200" onClick={() => { setRoomDialog(null); setActionBooking(b); setPendingAction("cancelled"); }} data-testid="button-room-cancel">
                            <XCircle className="h-3.5 w-3.5 mr-1" />Cancel
                          </Button>
                        </>
                      )}
                      {canManageBookings && b.status === "checked_in" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setRoomDialog(null); setActionBooking(b); setPendingAction("checked_out"); setPayMethod("cash"); setPayMpesaCode(""); }} data-testid="button-room-checkout">
                          <LogOut className="h-3.5 w-3.5 mr-1" />Check out
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-3 flex items-center gap-2.5" data-testid="room-dialog-free">
                    <span className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <BedDouble className="h-4 w-4 text-green-600" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-green-800">Available</p>
                      <p className="text-xs text-green-700">This room is free for the selected dates.</p>
                    </div>
                  </div>
                )}
                <DialogFooter className="flex-col-reverse sm:flex-row sm:flex-wrap gap-2">
                  {b && (
                    <Button
                      className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700"
                      onClick={() => { setRoomDialog(null); navigate(`/bookings/${bid(b)}`); }}
                      data-testid="button-room-booking-details"
                    >
                      <Receipt className="h-4 w-4 mr-1.5" />
                      Booking details
                    </Button>
                  )}
                  {!b && canManageRooms && (
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-50 sm:mr-auto"
                      onClick={() => { setRoomDialog(null); setDeleteRoom(roomDialog); }}
                      data-testid="button-room-delete"
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Delete room
                    </Button>
                  )}
                  {!b && canCreateBookings && (
                    <Button
                      className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700"
                      onClick={() => { setRoomDialog(null); openNewBooking(undefined, roomDialog._id); }}
                      data-testid="button-room-book"
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      Book now
                    </Button>
                  )}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Confirm room deletion */}
      <Dialog open={!!deleteRoom} onOpenChange={(o) => { if (!isDeletingRoom && !o) setDeleteRoom(null); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-lg">
          <DialogHeader>
            <DialogTitle>Delete {deleteRoom?.name}?</DialogTitle>
            <DialogDescription>
              This removes the room from the rooms list. Past bookings and their payments are kept for your
              reports. A room with an upcoming or checked-in booking cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setDeleteRoom(null)} disabled={isDeletingRoom}>
              Keep room
            </Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={handleDeleteRoom}
              disabled={isDeletingRoom}
              data-testid="button-confirm-delete-room"
            >
              {isDeletingRoom ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
              Delete room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change booking dates */}
      <Dialog open={!!editBooking} onOpenChange={(o) => { if (!isSavingDates && !o) setEditBooking(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change booking dates</DialogTitle>
            <DialogDescription>
              {editBooking?.guestName} — {editBooking?.roomName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Check-in</label>
                <Input
                  type="date"
                  value={editDates.checkIn}
                  onChange={(e) => setEditDates((d) => ({ ...d, checkIn: e.target.value }))}
                  disabled={isSavingDates}
                  data-testid="input-edit-checkin"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Check-out</label>
                <Input
                  type="date"
                  value={editDates.checkOut}
                  onChange={(e) => setEditDates((d) => ({ ...d, checkOut: e.target.value }))}
                  disabled={isSavingDates}
                  data-testid="input-edit-checkout"
                />
              </div>
            </div>
            {editBooking && editNights > 0 && !editConflict && (
              <div className="rounded-lg bg-purple-50 border border-purple-100 px-3 py-2 text-sm flex items-center justify-between" data-testid="text-edit-total">
                <span className="text-gray-600">
                  {editNights} night{editNights !== 1 ? "s" : ""} × {Number(editBooking.nightlyRate).toLocaleString()}
                </span>
                <span className="font-semibold text-purple-700">
                  New total: {(editNights * (Number(editBooking.nightlyRate) || 0)).toLocaleString()}
                </span>
              </div>
            )}
            {editNights <= 0 && (
              <p className="text-xs text-red-600" data-testid="text-edit-invalid">
                Check-out must be after check-in.
              </p>
            )}
            {editConflict && (
              <p className="text-xs text-red-600" data-testid="text-edit-conflict">
                Another booking already uses this room on those dates.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditBooking(null)} disabled={isSavingDates}>Cancel</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={handleSaveDates}
              disabled={isSavingDates || editNights <= 0 || editConflict}
              data-testid="button-save-dates"
            >
              {isSavingDates ? (<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving…</>) : "Save new dates"}
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
            <div>
              <label className="text-sm font-medium text-gray-700">Group (optional)</label>
              <Input
                value={bulkForm.group}
                onChange={(e) => setBulkForm((f) => ({ ...f, group: e.target.value }))}
                placeholder='e.g. "Property 1", "House A" or "Floor 2"'
                disabled={!!bulkProgress}
                data-testid="input-bulk-group"
              />
              <p className="text-xs text-gray-500 mt-1">
                Rooms with the same group are shown together. Run this tool once per
                group to give each property/floor its own rooms and rate.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Amenities (optional)</label>
              <Input
                value={bulkForm.amenities}
                onChange={(e) => setBulkForm((f) => ({ ...f, amenities: e.target.value }))}
                placeholder='e.g. "Wi-Fi, TV, Hot shower, Breakfast"'
                disabled={!!bulkProgress}
                data-testid="input-bulk-amenities"
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate with commas. These amenities are added to every room created here.
              </p>
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

      {/* Floating "+" action button — small devices only */}
      {(canCreateBookings || canManageRooms) && (
        <>
          {fabOpen && (
            <div
              className="lg:hidden fixed inset-0 z-40 bg-black/20"
              onClick={() => setFabOpen(false)}
              aria-hidden="true"
            />
          )}
          <div className="lg:hidden fixed bottom-6 right-4 z-50 flex flex-col items-end gap-2">
            {fabOpen && (
              <div className="flex flex-col items-end gap-2 mb-1">
                {view === "bookings" && (
                  <button
                    onClick={() => { setFabOpen(false); navigate("/rooms"); }}
                    className="flex items-center gap-2 rounded-full bg-white shadow-lg border border-purple-100 pl-4 pr-3 py-2.5 text-sm font-semibold text-purple-700 active:scale-95 transition-transform"
                    data-testid="fab-view-rooms"
                  >
                    Rooms
                    <span className="h-7 w-7 rounded-full bg-purple-100 flex items-center justify-center">
                      <BedDouble className="h-4 w-4 text-purple-700" />
                    </span>
                  </button>
                )}
                {view === "bookings" && canViewBookingsReport && (
                  <button
                    onClick={() => { setFabOpen(false); navigate("/bookings/report"); }}
                    className="flex items-center gap-2 rounded-full bg-white shadow-lg border border-purple-100 pl-4 pr-3 py-2.5 text-sm font-semibold text-purple-700 active:scale-95 transition-transform"
                    data-testid="fab-view-report"
                  >
                    Report
                    <span className="h-7 w-7 rounded-full bg-purple-100 flex items-center justify-center">
                      <Receipt className="h-4 w-4 text-purple-700" />
                    </span>
                  </button>
                )}
                {canManageRooms && (
                  <button
                    onClick={() => { setFabOpen(false); setBulkOpen(true); }}
                    className="flex items-center gap-2 rounded-full bg-white shadow-lg border border-purple-100 pl-4 pr-3 py-2.5 text-sm font-semibold text-purple-700 active:scale-95 transition-transform"
                    data-testid="fab-add-rooms"
                  >
                    Add Rooms
                    <span className="h-7 w-7 rounded-full bg-purple-100 flex items-center justify-center">
                      <BedDouble className="h-4 w-4 text-purple-700" />
                    </span>
                  </button>
                )}
                {canCreateBookings && (
                  <button
                    onClick={() => { setFabOpen(false); openNewBooking(); }}
                    disabled={roomsLoading || rooms.length === 0}
                    className="flex items-center gap-2 rounded-full bg-white shadow-lg border border-purple-100 pl-4 pr-3 py-2.5 text-sm font-semibold text-purple-700 active:scale-95 transition-transform disabled:opacity-50"
                    data-testid="fab-new-booking"
                  >
                    New Booking
                    <span className="h-7 w-7 rounded-full bg-purple-100 flex items-center justify-center">
                      <CalendarDays className="h-4 w-4 text-purple-700" />
                    </span>
                  </button>
                )}
              </div>
            )}
            <button
              onClick={() => setFabOpen(o => !o)}
              className="h-14 w-14 rounded-full bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-300 flex items-center justify-center active:scale-95 transition-transform"
              aria-label={fabOpen ? "Close menu" : "Open actions menu"}
              data-testid="fab-bookings-menu"
            >
              <Plus className={`h-6 w-6 transition-transform ${fabOpen ? "rotate-45" : ""}`} />
            </button>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

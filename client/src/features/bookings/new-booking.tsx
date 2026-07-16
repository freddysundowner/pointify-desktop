import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiCall } from "@/lib/api-config";
import { usePrimaryShop } from "@/hooks/usePrimaryShop";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
  BedDouble, ArrowLeft, Loader2, Search, User, UserPlus, Check, Phone,
  CalendarDays, X,
} from "lucide-react";

interface Room {
  _id: string;
  name: string;
  nightlyRate: number;
}

interface Customer {
  _id: string;
  name: string;
  phonenumber?: string;
  phone?: string;
  email?: string;
}

interface Booking {
  _id?: string;
  id?: string | number;
  roomId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: string;
}

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

export default function NewBookingPage() {
  const { shopId, adminId } = usePrimaryShop();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const initialDate = useMemo(() => {
    const p = new URLSearchParams(window.location.search).get("date");
    return p && /^\d{4}-\d{2}-\d{2}$/.test(p) ? p : todayStr();
  }, []);
  const initialRoomId = useMemo(
    () => new URLSearchParams(window.location.search).get("room") || "",
    []
  );
  const initialCheckOut = useMemo(() => {
    const p = new URLSearchParams(window.location.search).get("out");
    return p && /^\d{4}-\d{2}-\d{2}$/.test(p) && p > initialDate ? p : addDays(initialDate, 1);
  }, [initialDate]);

  const [roomSearch, setRoomSearch] = useState("");
  const [roomId, setRoomId] = useState(initialRoomId);
  const [guestSearch, setGuestSearch] = useState("");
  const [guestPickerOpen, setGuestPickerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({
    guestName: "",
    guestPhone: "",
    guestIdNumber: "",
    guestsCount: "1",
    checkIn: initialDate,
    checkOut: initialCheckOut,
    nightlyRate: "",
    notes: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Add-a-new-guest dialog
  const [newGuestOpen, setNewGuestOpen] = useState(false);
  const [newGuest, setNewGuest] = useState({ name: "", phone: "", email: "" });
  const [isCreatingGuest, setIsCreatingGuest] = useState(false);

  // Rooms are standalone records in the guest-house module (NOT products).
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

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["bookings", shopId],
    queryFn: async () => {
      const res = await apiCall(`/api/booking?shop=${shopId}`, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? data?.bookings ?? [];
      return Array.isArray(list) ? list : [];
    },
    enabled: !!shopId,
    retry: 1,
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["customers", shopId, "booking-page"],
    queryFn: async () => {
      const params = new URLSearchParams({ shopId, adminid: adminId });
      const res = await apiCall(`/api/customers?${params.toString()}`, { method: "GET" });
      const data = await res.json().catch(() => null);
      const list = Array.isArray(data) ? data : data?.customers ?? data?.data ?? [];
      return Array.isArray(list) ? list : [];
    },
    enabled: !!shopId && !!adminId,
  });

  const activeBookings = useMemo(
    () => bookings.filter((b) => b.status === "booked" || b.status === "checked_in"),
    [bookings],
  );

  const nights = nightsBetween(form.checkIn, form.checkOut);

  const isRoomFree = (rid: string) =>
    !activeBookings.some(
      (b) => b.roomId === rid && b.checkIn < form.checkOut && b.checkOut > form.checkIn,
    );

  const filteredRooms = useMemo(() => {
    const q = roomSearch.trim().toLowerCase();
    return q ? rooms.filter((r) => r.name.toLowerCase().includes(q)) : rooms;
  }, [rooms, roomSearch]);

  const filteredCustomers = useMemo(() => {
    const q = guestSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers
      .filter((c) => {
        const phone = String(c.phonenumber || c.phone || "");
        return c.name?.toLowerCase().includes(q) || phone.includes(q);
      })
      .slice(0, 8);
  }, [customers, guestSearch]);

  const selectedRoom = rooms.find((r) => r._id === roomId);
  const rate = form.nightlyRate !== "" ? Number(form.nightlyRate) : selectedRoom?.nightlyRate || 0;
  const total = nights * rate;

  const formConflict = useMemo(() => {
    if (!roomId || nights <= 0) return null;
    return activeBookings.find(
      (b) =>
        b.roomId === roomId &&
        b.checkIn < form.checkOut &&
        b.checkOut > form.checkIn,
    );
  }, [activeBookings, roomId, form.checkIn, form.checkOut, nights]);

  const canSave =
    !!selectedRoom && !!form.guestName.trim() && nights > 0 && rate >= 0 && !formConflict && !isSaving;

  const pickCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setForm((f) => ({
      ...f,
      guestName: c.name || "",
      guestPhone: String(c.phonenumber || c.phone || ""),
    }));
    setGuestPickerOpen(false);
    setGuestSearch("");
  };

  const clearGuest = () => {
    setSelectedCustomer(null);
    setForm((f) => ({ ...f, guestName: "", guestPhone: "" }));
  };

  const handleCreateGuest = async () => {
    const name = newGuest.name.trim();
    if (!name || isCreatingGuest) return;
    setIsCreatingGuest(true);
    try {
      const resp = await apiCall("/api/customers", {
        method: "POST",
        body: JSON.stringify({
          name,
          phonenumber: newGuest.phone.trim(),
          email: newGuest.email.trim(),
          address: "",
          wallet: 0,
          shopId,
          adminid: adminId,
        }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || (data && data.success === false)) {
        throw new Error(data?.error || data?.message || `HTTP ${resp.status}`);
      }
      const created = data?.customer ?? data?.data ?? data;
      const customer: Customer =
        created && typeof created === "object" && !Array.isArray(created) && created._id
          ? created
          : { _id: "", name, phonenumber: newGuest.phone.trim() };
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      pickCustomer(customer);
      setNewGuestOpen(false);
      setNewGuest({ name: "", phone: "", email: "" });
      toast({ title: "Guest added", description: `${name} saved to your customers.` });
    } catch (err: any) {
      toast({ title: "Could not add guest", description: err.message, variant: "destructive" });
    }
    setIsCreatingGuest(false);
  };

  const handleCreate = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      const resp = await apiCall("/api/booking", {
        method: "POST",
        body: JSON.stringify({
          shop: shopId,
          roomId,
          roomName: selectedRoom?.name || "",
          guestName: form.guestName.trim(),
          guestPhone: form.guestPhone.trim(),
          guestIdNumber: form.guestIdNumber.trim(),
          guestsCount: Math.max(1, Number(form.guestsCount) || 1),
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          nightlyRate: rate,
          totalAmount: total,
          status: "booked",
          notes: form.notes.trim(),
        }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || (data && data.success === false)) {
        throw new Error(data?.error || data?.message || `HTTP ${resp.status}`);
      }
      const created = data?.data ?? data?.booking ?? data;
      if (!created || Array.isArray(created) || typeof created !== "object" || !(created._id || created.id)) {
        throw new Error("The server did not confirm the booking was saved.");
      }
      queryClient.invalidateQueries({ queryKey: ["bookings", shopId] });
      toast({
        title: "Booking created",
        description: `${form.guestName.trim()} — ${selectedRoom?.name}, ${nights} night${nights !== 1 ? "s" : ""}.`,
      });
      navigate("/bookings");
    } catch (err: any) {
      toast({
        title: "Could not create booking",
        description: err.message?.includes("404")
          ? "The booking service is not available on the main server yet."
          : err.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Button variant="ghost" size="sm" onClick={() => navigate("/bookings")} data-testid="button-back-bookings">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-purple-600" />
              New Booking
            </h1>
            <p className="text-sm text-gray-500">Reserve a room for a guest.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr,320px] gap-4 items-start">
          <div className="space-y-4">
            {/* Step 1: dates */}
            <section className="rounded-xl border bg-white p-4">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">1</span>
                Stay dates
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Check-in</label>
                  <Input type="date" value={form.checkIn} onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))} data-testid="input-check-in" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Check-out</label>
                  <Input type="date" value={form.checkOut} min={addDays(form.checkIn, 1)} onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))} data-testid="input-check-out" />
                </div>
              </div>
              {nights <= 0 ? (
                <p className="text-sm text-red-600 mt-2">Check-out must be after check-in.</p>
              ) : (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {nights} night{nights !== 1 ? "s" : ""}
                </p>
              )}
            </section>

            {/* Step 2: room */}
            <section className="rounded-xl border bg-white p-4">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">2</span>
                Choose a room
              </h2>
              <div className="relative mb-3">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  className="pl-9"
                  placeholder="Search rooms…"
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  data-testid="input-room-search"
                />
              </div>
              {roomsLoading ? (
                <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-purple-500" /></div>
              ) : filteredRooms.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  {rooms.length === 0 ? "No rooms yet — add rooms from the Bookings page." : "No rooms match your search."}
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                  {filteredRooms.map((r) => {
                    const free = nights > 0 ? isRoomFree(r._id) : true;
                    const selected = r._id === roomId;
                    return (
                      <button
                        key={r._id}
                        type="button"
                        disabled={!free}
                        onClick={() => { setRoomId(r._id); setForm((f) => ({ ...f, nightlyRate: "" })); }}
                        className={`rounded-lg border p-2.5 text-left transition-colors relative
                          ${selected ? "border-purple-500 bg-purple-50 ring-1 ring-purple-500" : free ? "border-gray-200 hover:border-purple-300 hover:bg-purple-50/40" : "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"}`}
                        data-testid={`card-room-${r._id}`}
                      >
                        {selected && <Check className="h-4 w-4 text-purple-600 absolute top-2 right-2" />}
                        <p className="font-medium text-sm text-gray-900 truncate">{r.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{r.nightlyRate.toLocaleString()}/night</p>
                        <Badge variant="secondary" className={`mt-1.5 text-[10px] ${free ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                          {free ? "Available" : "Booked"}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Step 3: guest */}
            <section className="rounded-xl border bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">3</span>
                  Guest
                </h2>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setNewGuest({ name: guestSearch.trim(), phone: "", email: "" }); setNewGuestOpen(true); }} data-testid="button-add-guest">
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> New guest
                </Button>
              </div>

              {selectedCustomer ? (
                <div className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-8 w-8 rounded-full bg-purple-600 text-white text-sm font-semibold flex items-center justify-center shrink-0">
                      {selectedCustomer.name?.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate" data-testid="text-selected-guest">{selectedCustomer.name}</p>
                      {(selectedCustomer.phonenumber || selectedCustomer.phone) && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Phone className="h-3 w-3" />{selectedCustomer.phonenumber || selectedCustomer.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={clearGuest} data-testid="button-clear-guest">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative mb-3">
                  <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    className="pl-9"
                    placeholder="Search customers by name or phone…"
                    value={guestSearch}
                    onFocus={() => setGuestPickerOpen(true)}
                    onChange={(e) => { setGuestSearch(e.target.value); setGuestPickerOpen(true); }}
                    data-testid="input-guest-search"
                  />
                  {guestPickerOpen && (
                    <div className="absolute z-20 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-56 overflow-y-auto">
                      {customersLoading ? (
                        <div className="py-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-purple-500" /></div>
                      ) : filteredCustomers.length === 0 ? (
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2.5 text-sm text-purple-700 hover:bg-purple-50 flex items-center gap-2"
                          onClick={() => { setNewGuest({ name: guestSearch.trim(), phone: "", email: "" }); setNewGuestOpen(true); setGuestPickerOpen(false); }}
                          data-testid="button-add-guest-inline"
                        >
                          <UserPlus className="h-4 w-4" />
                          Add "{guestSearch.trim() || "new guest"}" as a new guest
                        </button>
                      ) : (
                        <>
                          {filteredCustomers.map((c) => (
                            <button
                              key={c._id || c.name}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-purple-50 flex items-center gap-2"
                              onClick={() => pickCustomer(c)}
                              data-testid={`option-customer-${c._id}`}
                            >
                              <User className="h-4 w-4 text-gray-400 shrink-0" />
                              <span className="text-sm text-gray-900 truncate">{c.name}</span>
                              {(c.phonenumber || c.phone) && (
                                <span className="text-xs text-gray-400 ml-auto shrink-0">{c.phonenumber || c.phone}</span>
                              )}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2.5 text-sm text-purple-700 hover:bg-purple-50 flex items-center gap-2 border-t"
                            onClick={() => { setNewGuest({ name: guestSearch.trim(), phone: "", email: "" }); setNewGuestOpen(true); setGuestPickerOpen(false); }}
                          >
                            <UserPlus className="h-4 w-4" />
                            Add a new guest
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {!selectedCustomer && (
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-600">Guest name *</label>
                    <Input value={form.guestName} onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))} placeholder="Walk-in guest name" data-testid="input-guest-name" />
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-600">Phone</label>
                  <Input value={form.guestPhone} onChange={(e) => setForm((f) => ({ ...f, guestPhone: e.target.value }))} data-testid="input-guest-phone" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">ID number</label>
                  <Input value={form.guestIdNumber} onChange={(e) => setForm((f) => ({ ...f, guestIdNumber: e.target.value }))} data-testid="input-guest-id" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Number of guests</label>
                  <Input type="number" min={1} value={form.guestsCount} onChange={(e) => setForm((f) => ({ ...f, guestsCount: e.target.value }))} data-testid="input-guests-count" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Rate per night</label>
                  <Input type="number" min={0} value={form.nightlyRate} placeholder={String(selectedRoom?.nightlyRate ?? "")} onChange={(e) => setForm((f) => ({ ...f, nightlyRate: e.target.value }))} data-testid="input-nightly-rate" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600">Notes (optional)</label>
                  <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} data-testid="input-notes" />
                </div>
              </div>
            </section>
          </div>

          {/* Summary */}
          <aside className="rounded-xl border bg-white p-4 lg:sticky lg:top-4">
            <h2 className="font-semibold text-gray-800 mb-3">Summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Room</dt>
                <dd className="font-medium text-gray-900 text-right" data-testid="text-summary-room">{selectedRoom?.name || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Guest</dt>
                <dd className="font-medium text-gray-900 text-right truncate" data-testid="text-summary-guest">{form.guestName.trim() || "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Stay</dt>
                <dd className="text-gray-900 text-right">{form.checkIn} → {form.checkOut}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Nights</dt>
                <dd className="text-gray-900">{nights > 0 ? nights : "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-500">Rate / night</dt>
                <dd className="text-gray-900">{rate ? rate.toLocaleString() : "—"}</dd>
              </div>
              <div className="border-t pt-2 flex justify-between gap-2">
                <dt className="font-semibold text-gray-800">Total</dt>
                <dd className="font-bold text-purple-700" data-testid="text-summary-total">{total > 0 ? total.toLocaleString() : "—"}</dd>
              </div>
            </dl>
            {formConflict && (
              <p className="text-sm text-red-600 mt-3" data-testid="text-conflict">
                This room is already booked {formConflict.checkIn} to {formConflict.checkOut} ({formConflict.guestName}).
              </p>
            )}
            <Button
              className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
              onClick={handleCreate}
              disabled={!canSave}
              data-testid="button-save-booking"
            >
              {isSaving ? (<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving…</>) : "Save Booking"}
            </Button>
            <Button variant="outline" className="w-full mt-2" onClick={() => navigate("/bookings")} disabled={isSaving} data-testid="button-cancel-booking">
              Cancel
            </Button>
          </aside>
        </div>
      </div>

      {/* click-away for guest dropdown */}
      {guestPickerOpen && <div className="fixed inset-0 z-10" onClick={() => setGuestPickerOpen(false)} />}

      {/* Add new guest dialog */}
      <Dialog open={newGuestOpen} onOpenChange={(o) => { if (!isCreatingGuest) setNewGuestOpen(o); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add a new guest</DialogTitle>
            <DialogDescription>The guest is saved to your customers list.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Name *</label>
              <Input value={newGuest.name} onChange={(e) => setNewGuest((g) => ({ ...g, name: e.target.value }))} data-testid="input-new-guest-name" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Phone</label>
              <Input value={newGuest.phone} onChange={(e) => setNewGuest((g) => ({ ...g, phone: e.target.value }))} data-testid="input-new-guest-phone" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Email</label>
              <Input type="email" value={newGuest.email} onChange={(e) => setNewGuest((g) => ({ ...g, email: e.target.value }))} data-testid="input-new-guest-email" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNewGuestOpen(false)} disabled={isCreatingGuest}>Cancel</Button>
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleCreateGuest} disabled={!newGuest.name.trim() || isCreatingGuest} data-testid="button-save-guest">
              {isCreatingGuest ? (<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving…</>) : "Save Guest"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

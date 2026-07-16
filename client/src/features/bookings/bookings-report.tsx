import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiCall } from "@/lib/api-config";
import { usePrimaryShop } from "@/hooks/usePrimaryShop";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { BedDouble, Loader2, Banknote, Percent, CalendarDays, Smartphone } from "lucide-react";

interface Booking {
  _id?: string;
  id?: string | number;
  roomId: string;
  roomName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  nightlyRate: number;
  totalAmount: number;
  status: "booked" | "checked_in" | "checked_out" | "cancelled";
  paymentMethod?: "cash" | "mpesa" | "none";
  amountPaid?: number;
  paidAt?: string;
}

interface Room {
  _id: string;
  name: string;
  group?: string;
  nightlyRate: number;
}

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
const nightsBetween = (a: string, b: string) =>
  Math.max(0, Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000));

// Nights of a booking that fall inside [from, to) — for occupancy
const nightsInRange = (b: Booking, from: string, to: string) => {
  const start = b.checkIn > from ? b.checkIn : from;
  const end = b.checkOut < to ? b.checkOut : to;
  return nightsBetween(start, end);
};

export default function BookingsReportPage() {
  const { shopId, shopData } = usePrimaryShop();
  const isGuestHouse = !!shopData?.isGuestHouse;

  // Default: current month so far
  const now = new Date();
  const [from, setFrom] = useState<string>(toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState<string>(toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 1)));

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
      }));
    },
    enabled: !!shopId,
    retry: 1,
  });

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

  const rangeDays = nightsBetween(from, to);
  const validRange = rangeDays > 0;

  // Bookings whose stay overlaps the report range (excluding cancelled)
  const inRange = useMemo(
    () =>
      validRange
        ? bookings.filter((b) => b.status !== "cancelled" && b.checkIn < to && b.checkOut > from)
        : [],
    [bookings, from, to, validRange]
  );

  // Payment date of a checked-out booking (when the money was recorded)
  const paidDateOf = (b: Booking) => (b.paidAt ? b.paidAt.slice(0, 10) : b.checkOut);

  const stats = useMemo(() => {
    let nightsSold = 0;
    let cash = 0;
    let mpesa = 0;
    let unpaid = 0;
    const perRoom = new Map<string, { name: string; bookings: number; nights: number; revenue: number }>();
    const roomIdsSeen = new Set<string>();

    const roomRowFor = (b: Booking) => {
      const key = b.roomId || b.roomName;
      let row = perRoom.get(key);
      if (!row) {
        row = {
          name: b.roomName || rooms.find((r) => r._id === b.roomId)?.name || "Unknown room",
          bookings: 0,
          nights: 0,
          revenue: 0,
        };
        perRoom.set(key, row);
      }
      return row;
    };

    // Nights & booking counts: by stay overlap with the period
    for (const b of inRange) {
      const n = nightsInRange(b, from, to);
      nightsSold += n;
      if (b.roomId) roomIdsSeen.add(b.roomId);
      const row = roomRowFor(b);
      row.bookings += 1;
      row.nights += n;
    }

    // Revenue: by PAYMENT date (when it was collected at check-out), so a
    // payment is counted once, in the period it was received — never split
    // or double-counted across periods, and never mixed with POS sales.
    for (const b of bookings) {
      if (b.status !== "checked_out") continue;
      const pd = paidDateOf(b);
      if (pd < from || pd >= to) continue;
      if (b.paymentMethod === "none" || !b.paymentMethod) {
        unpaid += Number(b.totalAmount) || 0;
        continue;
      }
      const paid = Number(b.amountPaid) || Number(b.totalAmount) || 0;
      if (b.paymentMethod === "cash") cash += paid;
      else if (b.paymentMethod === "mpesa") mpesa += paid;
      roomRowFor(b).revenue += paid;
    }

    const roomRows = [...perRoom.values()].sort((a, b) => b.revenue - a.revenue || b.nights - a.nights);
    // Denominator: current rooms PLUS any booked rooms that no longer exist,
    // so occupancy can never exceed 100% because of a deleted room.
    const currentIds = new Set(rooms.map((r) => r._id));
    let extraRooms = 0;
    roomIdsSeen.forEach((id) => {
      if (!currentIds.has(id)) extraRooms += 1;
    });
    const availableNights = (rooms.length + extraRooms) * rangeDays;
    const occupancy = availableNights > 0 ? Math.min(100, Math.round((nightsSold / availableNights) * 100)) : 0;
    return { nightsSold, cash, mpesa, unpaid, roomRows, occupancy, availableNights, roomCount: rooms.length + extraRooms };
  }, [inRange, bookings, from, to, rooms, rangeDays]);

  const revenue = stats.cash + stats.mpesa;

  const sortedBookings = useMemo(
    () => [...inRange].sort((a, b) => (a.checkIn < b.checkIn ? 1 : -1)),
    [inRange]
  );

  if (!isGuestHouse) {
    return (
      <DashboardLayout title="Rooms Report">
        <div className="p-6 text-sm text-gray-500">
          Turn on Guest House Mode in Shop Settings to use room bookings and reports.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Rooms Report">
      <div className="p-4 lg:p-6 space-y-4 max-w-6xl mx-auto">
        {/* Range picker */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">From</label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 w-[150px]"
              data-testid="input-report-from"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">To (exclusive)</label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 w-[150px]"
              data-testid="input-report-to"
            />
          </div>
          <div className="flex gap-2 pb-0.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const d = new Date();
                setFrom(toDateStr(new Date(d.getFullYear(), d.getMonth(), 1)));
                setTo(toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 1)));
              }}
              data-testid="button-report-this-month"
            >
              This month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const d = new Date();
                setFrom(toDateStr(new Date(d.getFullYear(), d.getMonth() - 1, 1)));
                setTo(toDateStr(new Date(d.getFullYear(), d.getMonth(), 1)));
              }}
              data-testid="button-report-last-month"
            >
              Last month
            </Button>
          </div>
          {!validRange && (
            <p className="text-xs text-red-500 pb-2">"To" must be after "From".</p>
          )}
        </div>

        {isLoading || roomsLoading ? (
          <div className="flex items-center gap-2 text-gray-500 py-10 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading report…
          </div>
        ) : isError ? (
          <div className="text-sm text-red-500 py-6">
            The booking service is not available right now. Please try again shortly.
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <Banknote className="w-4 h-4" /> Revenue collected
                  </div>
                  <p className="text-xl font-bold" data-testid="text-report-revenue">
                    {revenue.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Cash {stats.cash.toLocaleString()} · M-Pesa {stats.mpesa.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <CalendarDays className="w-4 h-4" /> Nights sold
                  </div>
                  <p className="text-xl font-bold" data-testid="text-report-nights">
                    {stats.nightsSold}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    of {stats.availableNights} available ({stats.roomCount} rooms × {rangeDays} nights)
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <Percent className="w-4 h-4" /> Occupancy
                  </div>
                  <p className="text-xl font-bold" data-testid="text-report-occupancy">
                    {stats.occupancy}%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                    <BedDouble className="w-4 h-4" /> Bookings
                  </div>
                  <p className="text-xl font-bold" data-testid="text-report-bookings">
                    {inRange.length}
                  </p>
                  {stats.unpaid > 0 && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      {stats.unpaid.toLocaleString()} checked out without recorded payment
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Per-room breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Per-room performance</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {stats.roomRows.length === 0 ? (
                  <p className="text-sm text-gray-400 p-4">No bookings in this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 border-b">
                          <th className="p-3">Room</th>
                          <th className="p-3 text-right">Bookings</th>
                          <th className="p-3 text-right">Nights (in period)</th>
                          <th className="p-3 text-right">Revenue collected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.roomRows.map((r, i) => (
                          <tr key={i} className="border-b last:border-0" data-testid={`row-room-report-${i}`}>
                            <td className="p-3 font-medium text-gray-800">{r.name}</td>
                            <td className="p-3 text-right">{r.bookings}</td>
                            <td className="p-3 text-right">{r.nights}</td>
                            <td className="p-3 text-right">{r.revenue.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bookings list */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Bookings in this period</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {sortedBookings.length === 0 ? (
                  <p className="text-sm text-gray-400 p-4">No bookings in this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 border-b">
                          <th className="p-3">Guest</th>
                          <th className="p-3">Room</th>
                          <th className="p-3">Stay</th>
                          <th className="p-3 text-right">Total</th>
                          <th className="p-3 text-right">Paid</th>
                          <th className="p-3">Method</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedBookings.map((b, i) => {
                          const paid =
                            b.status === "checked_out" && b.paymentMethod !== "none"
                              ? Number(b.amountPaid) || Number(b.totalAmount) || 0
                              : 0;
                          return (
                            <tr key={String(b._id ?? b.id ?? i)} className="border-b last:border-0" data-testid={`row-booking-report-${i}`}>
                              <td className="p-3 font-medium text-gray-800">{b.guestName}</td>
                              <td className="p-3">{b.roomName}</td>
                              <td className="p-3 whitespace-nowrap">
                                {b.checkIn} → {b.checkOut}
                              </td>
                              <td className="p-3 text-right">{Number(b.totalAmount).toLocaleString()}</td>
                              <td className="p-3 text-right">{paid ? paid.toLocaleString() : "—"}</td>
                              <td className="p-3">
                                {b.status === "checked_out" ? (
                                  b.paymentMethod === "mpesa" ? (
                                    <span className="inline-flex items-center gap-1 text-green-700">
                                      <Smartphone className="w-3.5 h-3.5" /> M-Pesa
                                    </span>
                                  ) : b.paymentMethod === "cash" ? (
                                    <span className="inline-flex items-center gap-1 text-gray-700">
                                      <Banknote className="w-3.5 h-3.5" /> Cash
                                    </span>
                                  ) : (
                                    <span className="text-amber-600">Not recorded</span>
                                  )
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="p-3">
                                <Badge className={`text-[10px] ${STATUS_META[b.status]?.cls || ""}`} variant="secondary">
                                  {STATUS_META[b.status]?.label || b.status}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

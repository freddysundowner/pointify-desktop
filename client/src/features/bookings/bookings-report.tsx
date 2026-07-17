import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiCall } from "@/lib/api-config";
import { usePrimaryShop } from "@/hooks/usePrimaryShop";
import { usePermissions } from "@/hooks/usePermissions";
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

interface ReportStats {
  from: string;
  to: string;
  revenue: { total: number; cash: number; mpesa: number; unpaid: number };
  nightsSold: number;
  availableNights: number;
  roomCount: number;
  occupancy: number;
  bookingsCount: number;
  perRoom: { roomId: string; name: string; bookings: number; nights: number; revenue: number }[];
  bookings: Booking[];
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

export default function BookingsReportPage() {
  const { shopId, shopData } = usePrimaryShop();
  const isGuestHouse = !!shopData?.isGuestHouse;

  // Attendants need the "view reports" permission under Room Bookings.
  const { hasAttendantPermission, isAdmin } = usePermissions();
  const canViewReports =
    isAdmin || localStorage.getItem("userType") === "admin" ||
    hasAttendantPermission("bookings", "view_reports");

  // Default: current month so far
  const now = new Date();
  const [from, setFrom] = useState<string>(toDateStr(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState<string>(toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 1)));

  const rangeDays = nightsBetween(from, to);
  const validRange = rangeDays > 0;

  // All report numbers come from ONE server endpoint. The proxy computes them
  // today (from /booking + /room) and will pass through the main backend's
  // /booking/stats endpoint once it exists — same response shape either way.
  const { data: report, isLoading, isError } = useQuery<ReportStats>({
    queryKey: ["booking-stats", shopId, from, to],
    queryFn: async () => {
      const res = await apiCall(`/api/booking/stats?shop=${shopId}&from=${from}&to=${to}`, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data || !Array.isArray(data.perRoom)) throw new Error("Stats endpoint not available");
      return data;
    },
    enabled: !!shopId && validRange,
    placeholderData: (prev) => prev,
    retry: 1,
  });

  const stats = {
    nightsSold: report?.nightsSold ?? 0,
    cash: report?.revenue?.cash ?? 0,
    mpesa: report?.revenue?.mpesa ?? 0,
    unpaid: report?.revenue?.unpaid ?? 0,
    roomRows: report?.perRoom ?? [],
    occupancy: report?.occupancy ?? 0,
    availableNights: report?.availableNights ?? 0,
    roomCount: report?.roomCount ?? 0,
  };
  const inRange = report?.bookings ?? [];
  const revenue = report?.revenue?.total ?? 0;

  const sortedBookings = useMemo(
    () => [...inRange].sort((a, b) => (a.checkIn < b.checkIn ? 1 : -1)),
    [inRange]
  );

  if (!canViewReports) {
    return (
      <DashboardLayout title="Rooms Report">
        <div className="p-6 text-sm text-gray-500" data-testid="text-report-no-access">
          You don't have permission to view the rooms report. Ask your shop owner to give you the
          "view reports" permission under Room Bookings.
        </div>
      </DashboardLayout>
    );
  }

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
      <div className="px-2 py-4 sm:px-3 lg:px-4 lg:py-6 space-y-4 w-full">
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

        {isLoading ? (
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

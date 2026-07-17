import type { Express, Request, Response } from "express";
import { makeOnlinePointifyRequest } from "../config.js";

const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

// Thin proxy for the standalone Guest House module (rooms + bookings).
// All data lives on the main Pointify backend (Node + MongoDB) — see
// BOOKINGS_API_SPEC.md at the project root for the endpoint contract.
// Rooms are their OWN collection (not products) and check-out payments are
// recorded on the booking itself (never as a POS sale).
export function registerBookingRoutes(app: Express) {
  const forward = async (
    req: Request,
    res: Response,
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE"
  ) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }
      const options: any = {
        method,
        headers: { Authorization: `Bearer ${token}` },
      };
      if (method === "POST" || method === "PUT") {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(req.body);
      }
      // All requests go straight to the online upstream. The shared
      // makePointifyRequest graceful fallback can mask failures as an empty
      // 200 — unacceptable here: a failed save must never look saved.
      const data: any = await makeOnlinePointifyRequest(endpoint, options);
      if (data && data.success === false && data.httpStatus) {
        return res.status(data.httpStatus).json(data);
      }
      res.json(data);
    } catch (error) {
      const status = (error as any).status || 500;
      res.status(status).json({ error: "Guest house request failed" });
    }
  };

  // ---- Rooms (standalone collection, NOT products) ----
  app.get("/api/rooms", (req, res) => {
    const qs = new URLSearchParams(req.query as any).toString();
    forward(req, res, `/room${qs ? `?${qs}` : ""}`, "GET");
  });
  app.post("/api/rooms", (req, res) => forward(req, res, "/room", "POST"));
  app.post("/api/rooms/bulk", (req, res) => forward(req, res, "/room/bulk", "POST"));
  app.put("/api/rooms/:id", (req, res) => forward(req, res, `/room/${req.params.id}`, "PUT"));
  app.delete("/api/rooms/:id", (req, res) => forward(req, res, `/room/${req.params.id}`, "DELETE"));

  // ---- Bookings ----
  // Server-side filtering: supports ?status=, ?from=, ?to= (YYYY-MM-DD, matched
  // against the stay range) and ?q= (guest name / ID number / phone / room name).
  // All params are forwarded upstream so the main backend can filter at the
  // database level once it supports them; until then this proxy applies the
  // same filters itself, so the API contract is identical either way.
  app.get("/api/booking", async (req, res) => {
    const { status, from, to, q, ...rest } = req.query as Record<string, string>;
    const qs = new URLSearchParams(req.query as any).toString();
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }
      const data: any = await makeOnlinePointifyRequest(`/booking${qs ? `?${qs}` : ""}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data && data.success === false && data.httpStatus) {
        return res.status(data.httpStatus).json(data);
      }
      const hasFilters = !!(status || from || to || q);
      const list = Array.isArray(data) ? data : data?.data ?? data?.bookings;
      if (!hasFilters || !Array.isArray(list)) {
        return res.json(data);
      }
      const needle = (q || "").trim().toLowerCase();
      const filtered = list.filter((b: any) => {
        if (status && b.status !== status) return false;
        // Keep bookings whose stay overlaps the [from, to] window.
        if (from && b.checkOut < from) return false;
        if (to && b.checkIn > to) return false;
        if (needle) {
          const hay = `${b.guestName || ""} ${b.guestIdNumber || ""} ${b.guestPhone || ""} ${b.roomName || ""}`.toLowerCase();
          if (!hay.includes(needle)) return false;
        }
        return true;
      });
      if (Array.isArray(data)) return res.json(filtered);
      if (Array.isArray(data?.data)) return res.json({ ...data, data: filtered });
      return res.json({ ...data, bookings: filtered });
    } catch (error) {
      const s = (error as any).status || 500;
      res.status(s).json({ error: "Guest house request failed" });
    }
  });
  // ---- Report stats (server-side) ----
  // GET /api/booking/stats?shop=&from=&to=   (to is EXCLUSIVE, YYYY-MM-DD)
  // Tries the upstream /booking/stats endpoint first so the main backend can
  // compute these at the database level once it supports it; until then this
  // proxy computes the exact same numbers from /booking + /room, so the API
  // contract is identical either way (see BOOKINGS_API_SPEC.md).
  app.get("/api/booking/stats", async (req, res) => {
    const { shop, from, to } = req.query as Record<string, string>;
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }
      if (!shop || !from || !to || to <= from) {
        return res.status(400).json({ error: "shop, from and to (after from) are required" });
      }
      const auth = { method: "GET" as const, headers: { Authorization: `Bearer ${token}` } };

      // 1) Prefer a native upstream stats endpoint if it exists.
      try {
        const upstream: any = await makeOnlinePointifyRequest(
          `/booking/stats?shop=${shop}&from=${from}&to=${to}`,
          auth
        );
        const payload = upstream?.data ?? upstream;
        if (payload && Array.isArray(payload.perRoom) && payload.revenue) {
          return res.json(payload);
        }
      } catch {
        // Not implemented upstream yet — fall through and compute here.
      }

      // 2) Compute from the raw lists.
      const [bookingsRaw, roomsRaw]: any[] = await Promise.all([
        makeOnlinePointifyRequest(`/booking?shop=${shop}`, auth),
        makeOnlinePointifyRequest(`/room?shop=${shop}`, auth),
      ]);
      const bookings: any[] = Array.isArray(bookingsRaw)
        ? bookingsRaw
        : bookingsRaw?.data ?? bookingsRaw?.bookings ?? [];
      const rooms: any[] = Array.isArray(roomsRaw)
        ? roomsRaw
        : roomsRaw?.data ?? roomsRaw?.rooms ?? [];
      if (!Array.isArray(bookings) || !Array.isArray(rooms)) {
        return res.status(502).json({ error: "Guest house request failed" });
      }

      const nightsBetween = (a: string, b: string) =>
        Math.max(0, Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000));
      const rangeDays = nightsBetween(from, to);

      // Bookings whose stay overlaps [from, to) — excluding cancelled.
      const inRange = bookings.filter(
        (b) => b.status !== "cancelled" && b.checkIn < to && b.checkOut > from
      );

      let nightsSold = 0;
      let cash = 0;
      let mpesa = 0;
      let unpaid = 0;
      const perRoom = new Map<string, { roomId: string; name: string; bookings: number; nights: number; revenue: number }>();
      const roomIdsSeen = new Set<string>();
      const roomRowFor = (b: any) => {
        const key = b.roomId || b.roomName;
        let row = perRoom.get(key);
        if (!row) {
          row = {
            roomId: b.roomId || "",
            name: b.roomName || rooms.find((r) => r._id === b.roomId)?.name || "Unknown room",
            bookings: 0,
            nights: 0,
            revenue: 0,
          };
          perRoom.set(key, row);
        }
        return row;
      };

      // Nights & booking counts: portion of each stay inside the window.
      for (const b of inRange) {
        const start = b.checkIn > from ? b.checkIn : from;
        const end = b.checkOut < to ? b.checkOut : to;
        const n = nightsBetween(start, end);
        nightsSold += n;
        if (b.roomId) roomIdsSeen.add(b.roomId);
        const row = roomRowFor(b);
        row.bookings += 1;
        row.nights += n;
      }

      // Revenue: counted once, by PAYMENT date (paidAt, falling back to
      // checkOut) — never split across periods, never mixed with POS sales.
      for (const b of bookings) {
        if (b.status !== "checked_out") continue;
        // Normalise paidAt to YYYY-MM-DD whatever format upstream sends it in.
        let pd = b.checkOut;
        if (b.paidAt) {
          const t = Date.parse(b.paidAt);
          pd = Number.isNaN(t) ? String(b.paidAt).slice(0, 10) : new Date(t).toISOString().slice(0, 10);
        }
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

      // Occupancy denominator includes booked rooms that were later deleted,
      // so occupancy can never exceed 100%.
      const currentIds = new Set(rooms.map((r) => r._id));
      let extraRooms = 0;
      roomIdsSeen.forEach((id) => {
        if (!currentIds.has(id)) extraRooms += 1;
      });
      const roomCount = rooms.length + extraRooms;
      const availableNights = roomCount * rangeDays;
      const occupancy =
        availableNights > 0 ? Math.min(100, Math.round((nightsSold / availableNights) * 100)) : 0;

      res.json({
        from,
        to,
        revenue: { total: cash + mpesa, cash, mpesa, unpaid },
        nightsSold,
        availableNights,
        roomCount,
        occupancy,
        bookingsCount: inRange.length,
        perRoom: [...perRoom.values()].sort((a, b) => b.revenue - a.revenue || b.nights - a.nights),
        bookings: inRange,
      });
    } catch (error) {
      const s = (error as any).status || 500;
      res.status(s).json({ error: "Guest house request failed" });
    }
  });

  app.post("/api/booking", (req, res) => forward(req, res, "/booking", "POST"));
  // Atomic check-out: records the payment AND flips the status in one upstream
  // call, so a payment can never be recorded without the check-out (or vice versa).
  app.post("/api/booking/:id/checkout", (req, res) =>
    forward(req, res, `/booking/${req.params.id}/checkout`, "POST"));
  app.put("/api/booking/:id", (req, res) => forward(req, res, `/booking/${req.params.id}`, "PUT"));
  app.delete("/api/booking/:id", (req, res) => forward(req, res, `/booking/${req.params.id}`, "DELETE"));
}

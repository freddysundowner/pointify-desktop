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
  app.post("/api/booking", (req, res) => forward(req, res, "/booking", "POST"));
  // Atomic check-out: records the payment AND flips the status in one upstream
  // call, so a payment can never be recorded without the check-out (or vice versa).
  app.post("/api/booking/:id/checkout", (req, res) =>
    forward(req, res, `/booking/${req.params.id}/checkout`, "POST"));
  app.put("/api/booking/:id", (req, res) => forward(req, res, `/booking/${req.params.id}`, "PUT"));
  app.delete("/api/booking/:id", (req, res) => forward(req, res, `/booking/${req.params.id}`, "DELETE"));
}

import type { Express, Request, Response } from "express";
import { makeOnlinePointifyRequest } from "../config.js";

const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
};

// Thin proxy for room bookings. Bookings live on the main Pointify backend
// (Node + MongoDB) — see BOOKINGS_API_SPEC.md at the project root for the
// endpoint contract the main backend must implement.
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
      // All booking requests go straight to the online upstream. The shared
      // makePointifyRequest graceful fallback can mask failures as an empty
      // 200 — unacceptable here: a failed booking save must never look saved.
      const data: any = await makeOnlinePointifyRequest(endpoint, options);
      if (data && data.success === false && data.httpStatus) {
        return res.status(data.httpStatus).json(data);
      }
      res.json(data);
    } catch (error) {
      const status = (error as any).status || 500;
      res.status(status).json({ error: "Booking request failed" });
    }
  };

  app.get("/api/booking", (req, res) => {
    const qs = new URLSearchParams(req.query as any).toString();
    forward(req, res, `/booking${qs ? `?${qs}` : ""}`, "GET");
  });
  app.post("/api/booking", (req, res) => forward(req, res, "/booking", "POST"));
  app.put("/api/booking/:id", (req, res) => forward(req, res, `/booking/${req.params.id}`, "PUT"));
  app.delete("/api/booking/:id", (req, res) => forward(req, res, `/booking/${req.params.id}`, "DELETE"));
}

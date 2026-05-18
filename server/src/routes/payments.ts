import type { Express } from "express";
import { makePointifyRequest } from "../config.js";

const extractToken = (req: any) => {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
};

export function registerPaymentRoutes(app: Express) {
  app.get("/api/payments", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ error: "Authorization token required" });

      const { shop, fromDate, toDate } = req.query;
      const params = new URLSearchParams();
      if (shop)     params.set("shop",     shop as string);
      if (fromDate) params.set("fromDate", fromDate as string);
      if (toDate)   params.set("toDate",   toDate as string);

      const data = await makePointifyRequest(`/payments?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      res.json(data);
    } catch (error) {
      console.error("Payments API error:", error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });
}

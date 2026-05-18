import type { Express } from "express";
import { makePointifyRequest } from "../config.js";

const extractToken = (req: any) => {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
};

const PAYMENTS_TIMEOUT_MS = 12_000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

export function registerPaymentRoutes(app: Express) {
  app.get("/api/payments", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ error: "Authorization token required" });

      const { shopId, shop, fromDate, toDate } = req.query;
      const resolvedShopId = (shopId || shop) as string;

      const params = new URLSearchParams();
      if (resolvedShopId) params.set("shopId", resolvedShopId);
      if (fromDate) params.set("fromDate", fromDate as string);
      if (toDate)   params.set("toDate",   toDate as string);

      const data = await withTimeout(
        makePointifyRequest(`/customers/payments?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        PAYMENTS_TIMEOUT_MS
      );
      res.json(data);
    } catch (error: any) {
      console.error("Payments API error:", error?.message ?? error);
      if (error?.message?.includes("timed out")) {
        return res.status(504).json({ error: "Payments endpoint timed out", payments: [], data: [] });
      }
      res.status(500).json({ error: "Failed to fetch payments", payments: [], data: [] });
    }
  });
}

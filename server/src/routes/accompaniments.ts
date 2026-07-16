import type { Express } from "express";
import { makePointifyRequest } from "../config.js";

const extractToken = (req: any): string | null => {
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
};

export function registerAccompanimentRoutes(app: Express) {
  // ── GET all accompaniments for a shop (used by POS on load) ──────────────
  app.get("/api/accompaniment/shop/:shopId", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ error: "Unauthorized" });

      const { shopId } = req.params;
      const data = await makePointifyRequest(`/accompaniment/shop/${shopId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      res.json(data);
    } catch (err: any) {
      console.error("Get shop accompaniments error:", err);
      res.status(500).json({ error: "Failed to get accompaniments" });
    }
  });

  // ── GET accompaniment config for one product ─────────────────────────────
  app.get("/api/accompaniment/:productId", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ error: "Unauthorized" });

      const { productId } = req.params;
      const { shopId } = req.query;
      const qs = shopId ? `?shopId=${shopId}` : "";

      const data = await makePointifyRequest(
        `/accompaniment/${productId}${qs}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      res.json(data);
    } catch (err: any) {
      console.error("Get accompaniment error:", err);
      res.status(500).json({ error: "Failed to get accompaniment" });
    }
  });

  // ── PUT (create / replace) accompaniment config for a product ────────────
  app.put("/api/accompaniment/:productId", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ error: "Unauthorized" });

      const { productId } = req.params;
      const data = await makePointifyRequest(`/accompaniment/${productId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });
      res.json(data);
    } catch (err: any) {
      console.error("Upsert accompaniment error:", err);
      res.status(500).json({ error: "Failed to save accompaniment" });
    }
  });

  // ── DELETE accompaniment config for a product ────────────────────────────
  app.delete("/api/accompaniment/:productId", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ error: "Unauthorized" });

      const { productId } = req.params;
      const { shopId } = req.query;
      const qs = shopId ? `?shopId=${shopId}` : "";

      const data = await makePointifyRequest(
        `/accompaniment/${productId}${qs}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      res.json(data);
    } catch (err: any) {
      console.error("Delete accompaniment error:", err);
      res.status(500).json({ error: "Failed to delete accompaniment" });
    }
  });
}

import type { Express } from "express";
import { makePointifyRequest } from "../config.js";

const extractToken = (req: any) => {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;
};

export function registerSyncRoutes(app: Express) {
  app.get("/api/network/status", async (_req, res) => {
    try {
      await makePointifyRequest("/health", {});
      res.json({ status: "online", isOnline: true, isOffline: false, timestamp: new Date().toISOString() });
    } catch {
      res.json({ status: "offline", isOnline: false, isOffline: true, timestamp: new Date().toISOString() });
    }
  });

  app.post("/api/network/check", async (_req, res) => {
    try {
      await makePointifyRequest("/health", {});
      res.json({ status: "online", isOnline: true, isOffline: false, timestamp: new Date().toISOString() });
    } catch {
      res.json({ status: "offline", isOnline: false, isOffline: true, timestamp: new Date().toISOString() });
    }
  });

  app.get("/api/sync/status", (_req, res) => {
    res.json({ needsSync: false, progress: [] });
  });

  app.get("/api/sync/progress", (_req, res) => {
    res.json([]);
  });

  app.post("/api/sync/initial", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ error: "Authorization token required" });

      const { adminId, shopId } = req.body;
      const failedEntities: string[] = [];
      let products: any[] = [];
      let customers: any[] = [];

      const progress: any[] = [
        { entity: "products", total: 0, synced: 0, status: "syncing" },
        { entity: "customers", total: 0, synced: 0, status: "pending" },
      ];

      try {
        const params = new URLSearchParams({
          page: "1", limit: "500",
          shopid: shopId || "", adminid: adminId || "",
          type: "all", useWarehouse: "true", warehouse: "false",
        });
        const data: any = await makePointifyRequest(`/product?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        products = Array.isArray(data) ? data : data?.data || data?.products || [];
        progress[0] = { entity: "products", total: products.length, synced: products.length, status: "completed" };
      } catch {
        failedEntities.push("products");
        progress[0] = { entity: "products", total: 0, synced: 0, status: "failed" };
      }

      try {
        progress[1].status = "syncing";
        const params = new URLSearchParams({ adminid: adminId || "", shopId: shopId || "" });
        const data: any = await makePointifyRequest(`/customers?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        customers = Array.isArray(data) ? data : data?.customers || data?.data || [];
        progress[1] = { entity: "customers", total: customers.length, synced: customers.length, status: "completed" };
      } catch {
        failedEntities.push("customers");
        progress[1] = { entity: "customers", total: 0, synced: 0, status: "failed" };
      }

      const result = {
        success: failedEntities.length === 0,
        totalEntities: 2,
        syncedEntities: 2 - failedEntities.length,
        failedEntities,
        progress,
        data: { products, customers },
      };

      res.json({ result });
    } catch (error) {
      console.error("Initial sync error:", error);
      res.status(500).json({ error: "Sync failed" });
    }
  });

  app.post("/api/sync/shop", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ error: "Authorization token required" });

      const { adminId, shopId } = req.body;
      const failedEntities: string[] = [];
      let products: any[] = [];
      let customers: any[] = [];

      const progress: any[] = [
        { entity: "products", total: 0, synced: 0, status: "syncing" },
        { entity: "customers", total: 0, synced: 0, status: "pending" },
      ];

      try {
        const params = new URLSearchParams({
          page: "1", limit: "500",
          shopid: shopId || "", adminid: adminId || "",
          type: "all", useWarehouse: "true", warehouse: "false",
        });
        const data: any = await makePointifyRequest(`/product?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        products = Array.isArray(data) ? data : data?.data || data?.products || [];
        progress[0] = { entity: "products", total: products.length, synced: products.length, status: "completed" };
      } catch {
        failedEntities.push("products");
        progress[0].status = "failed";
      }

      try {
        progress[1].status = "syncing";
        const params = new URLSearchParams({ adminid: adminId || "", shopId: shopId || "" });
        const data: any = await makePointifyRequest(`/customers?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        customers = Array.isArray(data) ? data : data?.customers || data?.data || [];
        progress[1] = { entity: "customers", total: customers.length, synced: customers.length, status: "completed" };
      } catch {
        failedEntities.push("customers");
        progress[1].status = "failed";
      }

      res.json({
        result: {
          success: failedEntities.length === 0,
          totalEntities: 2,
          syncedEntities: 2 - failedEntities.length,
          failedEntities,
          progress,
          data: { products, customers },
        },
      });
    } catch (error) {
      console.error("Shop sync error:", error);
      res.status(500).json({ error: "Shop sync failed" });
    }
  });
}

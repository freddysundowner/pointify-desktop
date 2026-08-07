import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerAllRoutes } from "./routes/index.js";
import { networkMonitor, getNetworkStatus, isOnline, isOffline } from "./network-monitor.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register all organized routes
  registerAllRoutes(app);

  // Network monitoring API endpoints
  app.get("/api/network/status", (req, res) => {
    res.json({
      status: getNetworkStatus(),
      isOnline: isOnline(),
      isOffline: isOffline(),
      timestamp: new Date().toISOString()
    });
  });
  app.get('/api/config', (req, res) => {
    res.json({
      googleMapsApiKey: process.env.VITE_GOOGLE_MAPS_API_KEY
    });
  });
  app.get("/api/network/stats", (req, res) => {
    res.json(networkMonitor.getStats());
  });

  app.post("/api/network/check", async (req, res) => {
    try {
      const status = await networkMonitor.forceCheck();
      res.json({
        status,
        isOnline: status === 'online',
        isOffline: status === 'offline',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to check network status",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

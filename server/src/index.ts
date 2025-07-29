import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { getGlobalApiMode, isElectron } from "./config.js";
import { dumpRetryMonitor } from "./dump-retry-monitor.js";
import "./network-status-handler.js";
import dotenv from 'dotenv';
dotenv.config();

import path from "path";
import { performDataSync } from "./network-status-handler.js";
const __dirname = path.dirname(process.argv[1]);


const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));
app.use((req, res, next) => {
  const interceptMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (interceptMethods.includes(req.method) && getGlobalApiMode() != "offline") {
    console.log(interceptMethods, getGlobalApiMode())
    performDataSync();
  }
  next();
});
// Logger for /api
app.use((req, res, next) => {
  const start = Date.now();
  const routePath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    if (routePath.startsWith("/api")) {
      const duration = Date.now() - start;
      let logLine = `${req.method} ${routePath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 120) logLine = logLine.slice(0, 119) + "…";
      console.log(logLine);
    }
  });

  next();
});

(async () => {
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Content-Type", "application/json");
    next();
  });

  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || "Internal Server Error" });
    console.error("🔥 Express error:", err);
  });

  app.use("/api/*", (req, res) => {
    console.log(`⚠️ [API] Unhandled route: ${req.method} ${req.originalUrl}`);
    if (!res.headersSent) {
      res.status(404).json({
        error: "API endpoint not found",
        method: req.method,
        path: req.originalUrl,
      });
    }
  });


  // Handle different paths for pkg binary vs normal Node.js
  // const staticPath = path.resolve(__dirname, "../../web/client/dist");
  // const staticPath = path.resolve(process.cwd(), "client/dist");
  const staticPath = "/var/www/pointify/pos-web/web/client/dist";

  // const staticPath = process.env.STATIC_DIR || path.resolve(__dirname, "../../client/dist");
  app.use(express.static(staticPath));

  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(staticPath, "index.html"));
    }
  });

  console.log("🔥 Running file:", __filename);
  console.log("🧭 STATIC PATH:", staticPath);

  const port = 1999;
  app.listen(port, () => {
    console.log(`✅ Pointify server running on http://localhost:${port} ${isElectron()}`);
    if (isElectron()) {
      dumpRetryMonitor.startMonitoring();

    }
  });
})();

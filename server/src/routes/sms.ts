import type { Express } from "express";
import { makePointifyRequest } from "../config.js";

export function registerSmsRoutes(app: Express) {
  // Top up SMS credits via M-Pesa STK push
  app.post("/api/sms/topup", async (req, res) => {
    try {
      const { phone, amount, userid } = req.body;
      const token = req.headers.authorization;

      const response = await makePointifyRequest("/sms/topup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: token } : {}),
        },
        body: JSON.stringify({ phone, amount, userid }),
      });

      res.json(response);
    } catch (error) {
      console.error("SMS top-up error:", error);
      res.status(500).json({ error: "Failed to initiate top-up" });
    }
  });

  // Get SMS logs for an admin
  app.get("/api/sms/sms-logs", async (req, res) => {
    try {
      const { adminId } = req.query;
      const token = req.headers.authorization;

      const response = await makePointifyRequest(`/sms/sms-logs?adminId=${adminId ?? ""}`, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: token } : {}),
        },
      });

      res.json(response);
    } catch (error) {
      console.error("SMS logs fetch error:", error);
      res.status(500).json({ error: "Failed to fetch SMS logs" });
    }
  });

  // Get SMS price per credit
  app.get("/api/sms/price", async (req, res) => {
    try {
      const token = req.headers.authorization;

      const response = await makePointifyRequest("/sms/price", {
        method: "GET",
        headers: {
          ...(token ? { Authorization: token } : {}),
        },
      });

      res.json(response);
    } catch (error) {
      console.error("SMS price fetch error:", error);
      res.status(500).json({ pricePerSms: 1 });
    }
  });
}

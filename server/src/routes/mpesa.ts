import type { Express } from "express";
import { makePointifyRequest } from "../config.js";

export function registerMpesaRoutes(app: Express) {
  // STK push: prompt the customer's phone for an M-Pesa PIN
  app.post("/api/mpesa/stk-push", async (req, res) => {
    try {
      const token = req.headers.authorization;
      const response = await makePointifyRequest("/mpesa/stk-push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: token } : {}),
        },
        body: JSON.stringify(req.body),
      });
      res.json(response);
    } catch (error) {
      console.error("M-Pesa STK push error:", error);
      res.status(500).json({ error: "Failed to send STK push" });
    }
  });

  // Expect: register an expected payment, then poll for it by code/amount
  app.post("/api/mpesa/expect", async (req, res) => {
    try {
      const token = req.headers.authorization;
      const response = await makePointifyRequest("/mpesa/expect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: token } : {}),
        },
        body: JSON.stringify(req.body),
      });
      res.json(response);
    } catch (error) {
      console.error("M-Pesa expect error:", error);
      res.status(500).json({ error: "Failed to register expected payment" });
    }
  });

  // Status: poll an STK/expect transaction by id
  app.get("/api/mpesa/status/:transactionId", async (req, res) => {
    try {
      const token = req.headers.authorization;
      const { transactionId } = req.params;
      const response = await makePointifyRequest(
        `/mpesa/status/${encodeURIComponent(transactionId)}`,
        {
          method: "GET",
          headers: {
            ...(token ? { Authorization: token } : {}),
          },
        }
      );
      res.json(response);
    } catch (error) {
      console.error("M-Pesa status error:", error);
      res.status(500).json({ error: "Failed to fetch payment status" });
    }
  });

  // Lookup: manual fallback — find a payment by its M-Pesa code
  app.get("/api/mpesa/lookup", async (req, res) => {
    try {
      const token = req.headers.authorization;
      const code = (req.query.code as string) ?? "";
      const shopId = (req.query.shopId as string) ?? "";
      const params = new URLSearchParams({ code, shopId });
      const response = await makePointifyRequest(`/mpesa/lookup?${params.toString()}`, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: token } : {}),
        },
      });
      res.json(response);
    } catch (error) {
      console.error("M-Pesa lookup error:", error);
      res.status(500).json({ error: "Failed to look up payment" });
    }
  });
}

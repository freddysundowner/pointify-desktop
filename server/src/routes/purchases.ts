import type { Express } from "express";
import { makePointifyRequest } from "../config.js";

export function registerPurchaseRoutes(app: Express) {
  // Get purchases with filtering
  app.get("/api/purchases", async (req, res) => {
    try {
      const {
        start,
        end,
        shopId,
        attendantId,
        paymentType,
        customerId,
        supplierId,
        paginated,
        page,
        limit,
        search,
        purchaseNo,
        status,
        dateRange,
      } = req.query;

      const params = new URLSearchParams();
      if (start) params.append("start", start as string);
      if (end) params.append("end", end as string);
      if (shopId) params.append("shopId", shopId as string);
      if (attendantId) params.append("attendantId", attendantId as string);
      if (paymentType) params.append("paymentType", paymentType as string);
      if (customerId) params.append("customerId", customerId as string);
      if (supplierId) params.append("supplierId", supplierId as string);
      if (paginated) params.append("paginated", paginated as string);
      if (page) params.append("page", page as string);
      if (limit) params.append("limit", limit as string);
      if (search) params.append("search", search as string);
      if (purchaseNo) params.append("purchaseNo", purchaseNo as string);
      if (status) params.append("status", status as string);
      if (dateRange) params.append("dateRange", dateRange as string);

      const response = await makePointifyRequest(
        `/purchases/?${params.toString()}`,
      );
      res.json(response);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ error: "Failed to fetch purchases" });
    }
  });

  // Get single purchase by ID
  app.get("/api/purchases/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const response = await makePointifyRequest(`/purchases/${id}`);
      res.json(response);
    } catch (error) {
      console.error("Error fetching purchase:", error);
      res.status(500).json({ error: "Failed to fetch purchase" });
    }
  });

  // Create new purchase
  app.post("/api/purchases", async (req, res) => {
    try {
      console.log(
        "Purchase creation payload:",
        JSON.stringify(req.body, null, 2),
      );

      const response = await makePointifyRequest("/purchases/", {
        method: "POST",
        body: JSON.stringify(req.body),
        headers: {
          "Content-Type": "application/json",
        },
      });
      res.json(response);
    } catch (error) {
      console.error("Error creating purchase:", error);
      res.status(500).json({ error: "Failed to create purchase" });
    }
  });

  // Update purchase
  app.put("/api/purchases/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const response = await makePointifyRequest(`/purchases/${id}`, {
        method: "PUT",
        body: JSON.stringify(req.body),
        headers: {
          "Content-Type": "application/json",
        },
      });
      res.json(response);
    } catch (error) {
      console.error("Error updating purchase:", error);
      res.status(500).json({ error: "Failed to update purchase" });
    }
  });

  // Make payment for purchase
  app.post("/api/purchases/:id/payment", async (req, res) => {
    try {
      const { id } = req.params;
      const { amount, attendantId } = req.body;
      console.log(
        "Purchase payment request:",
        JSON.stringify(req.body, null, 2),
      );

      // Create payload matching Pointify API requirements
      const paymentData = {
        purchaseId: id,
        paymentAmount: amount,
        attendantId: attendantId,
      };

      console.log("Sending to Pointify:", JSON.stringify(paymentData, null, 2));

      const response = await makePointifyRequest(
        "/payments/recordPurchasePayment",
        {
          method: "POST",
          body: JSON.stringify(paymentData),
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      res.json(response);
    } catch (error) {
      console.error("Error processing payment:", error);
      res.status(500).json({ error: "Failed to process payment" });
    }
  });

  // Delete purchase
  app.delete("/api/purchases/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const response = await makePointifyRequest(`/purchases/${id}`, {
        method: "DELETE",
      });
      res.json(response);
    } catch (error) {
      console.error("Error deleting purchase:", error);
      res.status(500).json({ error: "Failed to delete purchase" });
    }
  });

  // Receive purchase items
  app.post("/api/purchases/:id/receive", async (req, res) => {
    try {
      const { id } = req.params;
      const response = await makePointifyRequest(`/purchases/${id}/receive`, {
        method: "POST",
        body: JSON.stringify(req.body),
        headers: {
          "Content-Type": "application/json",
        },
      });
      res.json(response);
    } catch (error) {
      console.error("Error receiving purchase:", error);
      res.status(500).json({ error: "Failed to receive purchase" });
    }
  });

  // Cancel purchase
  app.post("/api/purchases/:id/cancel", async (req, res) => {
    try {
      const { id } = req.params;
      const response = await makePointifyRequest(`/purchases/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify(req.body),
        headers: {
          "Content-Type": "application/json",
        },
      });
      res.json(response);
    } catch (error) {
      console.error("Error cancelling purchase:", error);
      res.status(500).json({ error: "Failed to cancel purchase" });
    }
  });

  // Get purchase payment history
  app.get("/api/purchases/:id/payment-history", async (req, res) => {
    try {
      const { id } = req.params;
      const { format } = req.query;

      // Get purchase details first
      const purchase = await makePointifyRequest(`/purchases/${id}`, {
        method: "GET",
      });

      if (format === "pdf") {
        // Generate HTML for PDF conversion
        const currency = purchase.shopId?.currency || "KES";
        const outstanding =
          (purchase.totalAmount || 0) - (purchase.amountPaid || 0);
        let finalBalance = outstanding;

        // Use last payment balance if available
        if (purchase.payments && purchase.payments.length > 0) {
          const lastPayment = purchase.payments[purchase.payments.length - 1];
          finalBalance = lastPayment.balance || 0;
        }

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Payment History - ${purchase.purchaseNo}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
              .info { margin-bottom: 20px; }
              .info-item { margin: 5px 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .amount { text-align: right; }
              .balance-positive { color: #dc2626; }
              .balance-zero { color: #16a34a; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Payment History Report</h1>
            </div>
            
            <div class="info">
              <div class="info-item"><strong>Purchase No:</strong> ${purchase.purchaseNo}</div>
              <div class="info-item"><strong>Supplier:</strong> ${purchase.supplier?.name || "N/A"}</div>
              <div class="info-item"><strong>Total Amount:</strong> ${currency} ${(purchase.totalAmount || 0).toFixed(2)}</div>
              <div class="info-item"><strong>Amount Paid:</strong> ${currency} ${(purchase.amountPaid || 0).toFixed(2)}</div>
              <div class="info-item"><strong>Outstanding Balance:</strong> <span class="${finalBalance > 0 ? "balance-positive" : "balance-zero"}">${currency} ${finalBalance.toFixed(2)}</span></div>
              <div class="info-item"><strong>Report Generated:</strong> ${new Date().toLocaleString()}</div>
            </div>
            
            <h2>Payment History</h2>
            ${
              purchase.payments && purchase.payments.length > 0
                ? `
              <table>
                <thead>
                  <tr>
                    <th>Payment No</th>
                    <th>Date</th>
                    <th class="amount">Amount</th>
                    <th class="amount">Balance After</th>
                  </tr>
                </thead>
                <tbody>
                  ${purchase.payments
                    .map(
                      (payment: any) => `
                    <tr>
                      <td>${payment.paymentNo || `REC${Date.now()}`}</td>
                      <td>${new Date(payment.date).toLocaleDateString()}</td>
                      <td class="amount">${currency} ${(payment.amount || 0).toFixed(2)}</td>
                      <td class="amount ${(payment.balance || 0) > 0 ? "balance-positive" : "balance-zero"}">${currency} ${(payment.balance || 0).toFixed(2)}</td>
                    </tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>
            `
                : "<p>No payment history available</p>"
            }
          </body>
          </html>
        `;

        res.setHeader("Content-Type", "text/html");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="purchase_${purchase.purchaseNo}_payment_history.html"`,
        );
        res.send(html);
      } else {
        // Return JSON data
        res.json({
          purchase,
          payments: purchase.payments || [],
        });
      }
    } catch (error) {
      console.error("Error fetching payment history:", error);
      res.status(500).json({ error: "Failed to fetch payment history" });
    }
  });

  // Get purchases analytics/report
  app.get("/api/analysis/report/purchases", async (req, res) => {
    try {
      const { shopid, fromDate, toDate, supplierId, attendantId, paymentType, purchaseNo } =
        req.query;

      const params = new URLSearchParams();
      if (shopid) params.append("shopid", shopid as string);
      if (fromDate) params.append("fromDate", fromDate as string);
      if (toDate) params.append("toDate", toDate as string);
      if (supplierId) params.append("supplierId", supplierId as string);
      if (attendantId) params.append("attendantId", attendantId as string);
      if (paymentType) params.append("paymentType", paymentType as string);
      if (purchaseNo) params.append("purchaseNo", purchaseNo as string);

      const response = await makePointifyRequest(
        `/analysis/report/purchases?${params.toString()}`,
      );
      res.json(response);
    } catch (error) {
      console.error("Error fetching purchases analytics:", error);
      res.status(500).json({ error: "Failed to fetch purchases analytics" });
    }
  });

  // Get purchase returns (list view)
  app.get("/api/purchasereturns", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { 
        shopId, 
        supplierId,
        toDate,
        fromDate,
        page = 1, 
        limit = 10, 
        search, 
        status, 
        startDate, 
        endDate, 
        dateRange,
        attendantId 
      } = req.query;

      if (!shopId) {
        return res.status(400).json({ error: "shopId is required" });
      }

      const params = new URLSearchParams({
        shopId: shopId as string,
        ...(supplierId && { supplierId: supplierId as string }),
        ...(toDate && { toDate: toDate as string }),
        ...(fromDate && { fromDate: fromDate as string }),
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search: search as string }),
        ...(status && { status: status as string }),
        ...(startDate && { startDate: startDate as string }),
        ...(endDate && { endDate: endDate as string }),
        ...(dateRange && { dateRange: dateRange as string }),
        ...(attendantId && { attendantId: attendantId as string })
      });

      const data = await makePointifyRequest(`/purchasereturns?${params}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      res.json(data);
    } catch (error: any) {
      console.error("Error fetching purchase returns:", error);
      res.status(500).json({ error: "Failed to fetch purchase returns" });
    }
  });

  // Purchase returns report endpoint
  app.get("/api/purchasereturns/report", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { 
        shopId, 
        format = 'pdf',
        search, 
        startDate, 
        endDate, 
        supplierId,
        attendantId 
      } = req.query;

      if (!shopId) {
        return res.status(400).json({ error: "shopId is required" });
      }

      // First get the purchase returns data using the same endpoint
      const params = new URLSearchParams({
        shopId: shopId as string,
        page: "1",
        limit: "1000", // Get all returns for export
        ...(search && { search: search as string }),
        ...(supplierId && { supplierId: supplierId as string }),
        ...(startDate && { fromDate: startDate as string }),
        ...(endDate && { toDate: endDate as string }),
        ...(attendantId && { attendantId: attendantId as string })
      });

      const returnsData = await makePointifyRequest(`/purchasereturns?${params}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // Return data for client-side PDF generation
      const returns = returnsData.data || [];
      const total = returnsData.meta?.total || returns.length;
      const totalAmount = returns.reduce((sum: number, ret: any) => sum + (ret.refundAmount || ret.totalAmount || 0), 0);

      // Return JSON data for client-side processing
      res.json({
        returns,
        total,
        totalAmount,
        filters: {
          search,
          startDate,
          endDate,
          supplierId: supplierId && supplierId !== 'all' ? supplierId : null
        }
      });
    } catch (error: any) {
      console.error("Error generating purchase returns report:", error);
      res.status(500).json({ error: "Failed to generate purchase returns report" });
    }
  });

  // Purchase returns endpoint
  app.post("/api/purchasereturns", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { purchaseId, items, reason, deleteReceipt, invoiceType } =
        req.body;

      if (!purchaseId || !items || !Array.isArray(items)) {
        return res
          .status(400)
          .json({ error: "Missing required fields: purchaseId, items" });
      }

      // Validate items structure - each item should have product, quantity, unitPrice
      for (const item of items) {
        if (!item.product || !item.quantity || !item.unitPrice) {
          return res.status(400).json({
            error: "Each item must have product, quantity, and unitPrice",
          });
        }
      }

      const returnPayload = {
        purchaseId,
        items,
        reason: reason || "Purchase return processed",
        deleteReceipt: deleteReceipt || false,
        invoiceType: invoiceType || "",
      };

      console.log(
        "Processing purchase return with payload:",
        JSON.stringify(returnPayload, null, 2),
      );

      const data = await makePointifyRequest("/purchasereturns", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(returnPayload),
      });

      res.json(data);
    } catch (error: any) {
      console.error("Error processing purchase return:", error);

      let errorMessage = "Failed to process purchase return";
      let statusCode = 500;

      if (error.responseBody) {
        try {
          const errorData = JSON.parse(error.responseBody);
          if (errorData.error) {
            errorMessage = errorData.error;
            statusCode = error.status || 400;
          }
        } catch (parseError) {
          errorMessage = error.message || errorMessage;
        }
      }

      res.status(statusCode).json({ error: errorMessage });
    }
  });
}

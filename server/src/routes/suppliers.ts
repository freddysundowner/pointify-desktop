import type { Express } from "express";
import { makePointifyRequest } from "../config.js";

export function registerSupplierRoutes(app: Express) {
  // Get suppliers for a shop
  app.get("/api/suppliers", async (req, res) => {
    try {
      const { shopId, page, limit } = req.query;

      if (!shopId) {
        return res.status(400).json({ error: "shopId is required" });
      }

      const params = new URLSearchParams({ shopId: String(shopId) });
      if (page) params.append('page', String(page));
      if (limit) params.append('limit', String(limit));

      const response: any = await makePointifyRequest(`/suppliers?${params.toString()}`, {
        method: 'GET'
      });

      // Upstream may return either a bare array (legacy) or { suppliers, pagination }.
      const suppliers = Array.isArray(response)
        ? response
        : (Array.isArray(response?.suppliers) ? response.suppliers
          : (Array.isArray(response?.data) ? response.data : []));

      // Backward-compat: only return the paginated envelope when caller asked for it.
      if (!page && !limit) {
        return res.json(suppliers);
      }

      const up = response?.pagination || {};
      const total = Number(up.total ?? suppliers.length) || 0;
      const curPage = Number(up.page ?? page ?? 1) || 1;
      const curLimit = Number(up.limit ?? limit ?? suppliers.length) || suppliers.length || 0;
      const totalPages = curLimit > 0 ? Math.max(1, Math.ceil(total / curLimit)) : 1;

      res.json({
        data: suppliers,
        pagination: { total, page: curPage, limit: curLimit, totalPages }
      });
    } catch (error: any) {
      console.error("Pointify API Error:", error.status, error.responseBody || error.message);
      res.status(error.status || 500).json({ 
        error: "Failed to fetch suppliers",
        details: error.message 
      });
    }
  });

  // Create new supplier
  app.post("/api/suppliers", async (req, res) => {
    try {
      console.log("Creating supplier with payload:", req.body);
      
      // Ensure required fields are present
      const payload = {
        name: req.body.name,
        phoneNumber: req.body.phoneNumber,
        email: req.body.email,
        address: req.body.address,
        shopId: req.body.shopId,
        adminId: req.body.adminId,
        attendantId: req.body.attendantId
      };
      

      const response = await makePointifyRequest('/suppliers', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      res.json(response);
    } catch (error: any) {
      console.error("Pointify API Error:", error.status, error.responseBody || error.message);
      res.status(error.status || 500).json({ 
        error: "Failed to create supplier",
        details: `API request failed: ${error.status} ${error.responseBody || error.message}` 
      });
    }
  });

  // Update supplier or process debt payment
  app.put("/api/suppliers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { amount, attendantId, shopId } = req.body;

      // Check if this is a debt payment request
      if (amount !== undefined && attendantId && shopId) {

        // Create payload for supplier payment - send directly to supplier endpoint
        const paymentData = {
          amount,
          attendantId,
          shopId
        };


        const response = await makePointifyRequest(`/suppliers/${id}`, {
          method: "PUT",
          body: JSON.stringify(paymentData),
          headers: {
            "Content-Type": "application/json",
          },
        });

        res.json(response);
      } else {
        // Regular supplier update
        const response = await makePointifyRequest(`/suppliers/${id}`, {
          method: 'PUT',
          body: JSON.stringify(req.body)
        });

        res.json(response);
      }
    } catch (error: any) {
      console.error("Pointify API Error:", error.status, error.responseBody || error.message);
      const { amount } = req.body;
      res.status(error.status || 500).json({ 
        error: amount !== undefined ? "Failed to process supplier payment" : "Failed to update supplier",
        details: error.message 
      });
    }
  });

  // Bulk delete suppliers - POST /api/suppliers/bulk-delete
  app.post("/api/suppliers/bulk-delete", async (req, res) => {
    try {
      const { supplierIds } = req.body || {};
      if (!Array.isArray(supplierIds) || supplierIds.length === 0) {
        return res.status(400).json({ error: "supplierIds (non-empty array) is required" });
      }
      const response = await makePointifyRequest(`/suppliers/bulk/delete/suppliers`, {
        method: 'POST',
        body: JSON.stringify({ supplierIds }),
        headers: { 'Content-Type': 'application/json' }
      });
      res.json(response);
    } catch (error: any) {
      console.error("Pointify bulk-delete suppliers error:", error.status, error.responseBody || error.message);
      res.status(error.status || 500).json({
        error: "Failed to bulk delete suppliers",
        details: error.responseBody || error.message
      });
    }
  });

  // Delete supplier
  app.delete("/api/suppliers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const response = await makePointifyRequest(`/suppliers/${id}`, {
        method: 'DELETE'
      });

      res.json(response);
    } catch (error: any) {
      console.error("Pointify API Error:", error.status, error.responseBody || error.message);
      res.status(error.status || 500).json({ 
        error: "Failed to delete supplier",
        details: error.message 
      });
    }
  });

  // Get supplier statement
  app.get("/api/suppliers/:id/statement", async (req, res) => {
    try {
      const { id } = req.params;
      const { shopId, format } = req.query;
      
      if (!shopId) {
        return res.status(400).json({ error: "shopId is required" });
      }

      // Get supplier details
      const supplier = await makePointifyRequest(`/suppliers/${id}`, {
        method: 'GET'
      });

      // Get purchases for this supplier
      const purchases = await makePointifyRequest(`/purchases?supplierId=${id}&shopId=${shopId}`, {
        method: 'GET'
      });

      if (format === 'pdf') {
        // Generate HTML statement locally
        const currency = purchases[0]?.shopId?.currency || 'KES';
        const totalAmount = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
        const totalPaid = purchases.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
        const totalOutstanding = totalAmount - totalPaid;

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Supplier Statement - ${supplier.name}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
              .info { margin-bottom: 20px; }
              .info-item { margin: 5px 0; }
              .summary { background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; }
              .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
              .summary-item { text-align: center; }
              .summary-value { font-size: 18px; font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .amount { text-align: right; }
              .status-paid { color: #16a34a; }
              .status-credit { color: #dc2626; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Supplier Statement</h1>
            </div>
            
            <div class="info">
              <div class="info-item"><strong>Supplier:</strong> ${supplier.name}</div>
              <div class="info-item"><strong>Contact:</strong> ${supplier.contact || 'N/A'}</div>
              <div class="info-item"><strong>Phone:</strong> ${supplier.phoneNumber || 'N/A'}</div>
              <div class="info-item"><strong>Email:</strong> ${supplier.email || 'N/A'}</div>
              <div class="info-item"><strong>Statement Date:</strong> ${new Date().toLocaleDateString()}</div>
            </div>
            
            <div class="summary">
              <h2>Summary</h2>
              <div class="summary-grid">
                <div class="summary-item">
                  <div>Total Orders</div>
                  <div class="summary-value">${purchases.length}</div>
                </div>
                <div class="summary-item">
                  <div>Total Amount</div>
                  <div class="summary-value">${currency} ${totalAmount.toFixed(2)}</div>
                </div>
                <div class="summary-item">
                  <div>Outstanding Balance</div>
                  <div class="summary-value ${totalOutstanding > 0 ? 'status-credit' : 'status-paid'}">${currency} ${totalOutstanding.toFixed(2)}</div>
                </div>
              </div>
            </div>
            
            <h2>Purchase History</h2>
            ${purchases.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Purchase No</th>
                    <th>Date</th>
                    <th class="amount">Total Amount</th>
                    <th class="amount">Amount Paid</th>
                    <th class="amount">Outstanding</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${purchases.map(purchase => {
                    const outstanding = (purchase.totalAmount || 0) - (purchase.amountPaid || 0);
                    let finalBalance = outstanding;
                    
                    // Use last payment balance if available
                    if (purchase.payments && purchase.payments.length > 0) {
                      const lastPayment = purchase.payments[purchase.payments.length - 1];
                      finalBalance = lastPayment.balance || 0;
                    }
                    
                    const isPaid = finalBalance <= 0.01;
                    
                    return `
                      <tr>
                        <td>${purchase.purchaseNo}</td>
                        <td>${new Date(purchase.createdAt).toLocaleDateString()}</td>
                        <td class="amount">${currency} ${(purchase.totalAmount || 0).toFixed(2)}</td>
                        <td class="amount">${currency} ${(purchase.amountPaid || 0).toFixed(2)}</td>
                        <td class="amount ${finalBalance > 0 ? 'status-credit' : 'status-paid'}">${currency} ${finalBalance.toFixed(2)}</td>
                        <td class="${isPaid ? 'status-paid' : 'status-credit'}">${isPaid ? 'Paid' : 'Credit'}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            ` : '<p>No purchase history available</p>'}
          </body>
          </html>
        `;
        
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="supplier_${supplier.name}_statement.html"`);
        res.send(html);
      } else {
        // Return JSON data
        res.json({
          supplier,
          purchases,
          summary: {
            totalOrders: purchases.length,
            totalAmount: purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0),
            totalPaid: purchases.reduce((sum, p) => sum + (p.amountPaid || 0), 0),
            totalOutstanding: purchases.reduce((sum, p) => sum + ((p.totalAmount || 0) - (p.amountPaid || 0)), 0)
          }
        });
      }
    } catch (error: any) {
      console.error("Pointify API Error:", error.status, error.responseBody || error.message);
      res.status(error.status || 500).json({ 
        error: "Failed to fetch supplier statement",
        details: error.message 
      });
    }
  });
}
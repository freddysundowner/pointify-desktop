import type { Express } from "express";
import { makePointifyRequest } from "../config.js";
import nodemailer from "nodemailer";

// Authentication middleware to extract token from Authorization header
const extractToken = (req: any) => {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
};

export function registerSalesRoutes(app: Express) {
  // Get sales returns with filtering
  app.get("/api/salereturns/filter", async (req, res) => {
    try {
      const { type, shopId, fromDate, toDate, status, paymentTag, attendantId, receiptNo, page, limit, paginated } = req.query;
      
      const params = new URLSearchParams();
      if (type) params.append('type', type as string);
      if (shopId) params.append('shopId', shopId as string);
      if (fromDate) params.append('fromDate', fromDate as string);
      if (toDate) params.append('toDate', toDate as string);
      if (status) params.append('status', status as string);
      if (paymentTag) params.append('paymentTag', paymentTag as string);
      if (attendantId) params.append('attendantId', attendantId as string);
      if (receiptNo) params.append('receiptNo', receiptNo as string);
      if (page) params.append('page', page as string);
      if (limit) params.append('limit', limit as string);
      if (paginated) params.append('paginated', paginated as string);

      const response = await makePointifyRequest(`/salereturns/filter?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': req.headers.authorization || '',
        },
      });

      res.json(response);
    } catch (error) {
      console.error("Error fetching sales returns:", error);
      res.status(500).json({ error: "Failed to fetch sales returns" });
    }
  });

  // Get sales returns analytics/report
  app.get("/api/analysis/report/returns", async (req, res) => {
    try {
      const { shopid, fromDate, toDate } = req.query;
      
      const params = new URLSearchParams();
      if (shopid) params.append('shopid', shopid as string);
      if (fromDate) params.append('fromDate', fromDate as string);
      if (toDate) params.append('toDate', toDate as string);

      const response = await makePointifyRequest(`/analysis/report/returns?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': req.headers.authorization || '',
        },
      });

      res.json(response);
    } catch (error) {
      console.error("Error fetching returns analytics:", error);
      res.status(500).json({ error: "Failed to fetch returns analytics" });
    }
  });

  // Delete a sales return
  app.delete("/api/salereturns/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const response = await makePointifyRequest(`/salereturns/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': req.headers.authorization || '',
        },
      });

      res.json(response);
    } catch (error) {
      console.error("Error deleting sales return:", error);
      res.status(500).json({ error: "Failed to delete sales return" });
    }
  });
  // =============================================================================
  // SALES MANAGEMENT ROUTES
  // =============================================================================
  
  // Get sales report analysis - GET /api/analysis/report/sales
  app.get("/api/analysis/report/sales", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const queryParams = new URLSearchParams(req.query as any);
      const endpoint = `/analysis/report/sales?${queryParams.toString()}`;
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error: any) {
      console.error("Sales report analysis error:", error);
      res.status(500).json({ error: "Failed to fetch sales report analysis" });
    }
  });
  
  // Get filtered sales data - GET /api/sales/filter
  app.get("/api/sales/filter", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      // Extract query parameters
      const {
        order = '',
        paymentTag = '',
        receiptNo = '',
        start = '',
        saleType = '',
        duedate = '',
        end = '',
        shopId = '',
        attendantId = '',
        paymentType = '',
        customerId = '',
        customer = '',
        status = '',
        page = '1',
        limit = '50',
        paginated = 'true',
        production = 'false'
      } = req.query;

      // Build query string for Pointify API
      const params = new URLSearchParams();
      
      // Only add parameters that have values to avoid empty strings
      if (order) params.append('order', order as string);
      // Always include paymentTag parameter, even if empty
      params.append('paymentTag', paymentTag as string);
      if (receiptNo) params.append('receiptNo', receiptNo as string);
      if (start) params.append('start', start as string);
      if (saleType) params.append('saleType', saleType as string);
      if (duedate) params.append('duedate', duedate as string);
      if (end) params.append('end', end as string);
      if (shopId) params.append('shopId', shopId as string);
      if (attendantId) params.append('attendantId', attendantId as string);
      if (paymentType) params.append('paymentType', paymentType as string);
      if (customerId) params.append('customerId', customerId as string);
      if (customer) params.append('customer', customer as string);
      if (status) params.append('status', status as string);
      if (page) params.append('page', page as string);
      if (limit) params.append('limit', limit as string);
      // Always ensure paginated is true for proper response structure
      params.append('paginated', 'true');
      if (production) params.append('production', production as string);

      const data = await makePointifyRequest(`/sales/filter?${params.toString()}`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      // Add cache-busting headers to response
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.json(data);
    } catch (error: any) {
      console.error("Sales filter error:", error);
      
      let errorMessage = "Failed to fetch sales data";
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

  // Get individual sale by ID - GET /api/sales/:id
  app.get("/api/sales/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const saleId = req.params.id;
      console.log("Fetching sale:", saleId);

      const data = await makePointifyRequest(`/sales/single/receipt/${saleId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error: any) {
      console.error("Sales fetch error:", error);
      
      let errorMessage = "Failed to fetch sale";
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

  // Return sale transaction - POST /api/sales/:id/return
  app.post("/api/sales/:id/return", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const saleId = req.params.id;
      console.log("Returning sale:", saleId);

      const data = await makePointifyRequest(`/sales/${saleId}/return`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(req.body)
      });
      
      res.json(data);
    } catch (error: any) {
      console.error("Sales return error:", error);
      
      let errorMessage = "Failed to return sale";
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

  // Delete sale transaction - DELETE /api/sales/:id
  app.delete("/api/sales/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const saleId = req.params.id;
      console.log("Deleting sale:", saleId);

      const data = await makePointifyRequest(`/sales/void/sale/${saleId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error: any) {
      console.error("Sales delete error:", error);
      
      let errorMessage = "Failed to delete sale";
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
  
  // Create sales transaction - POST to /sales endpoint
  app.post("/api/sales", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      // Validate required fields
      if (!req.body.shopId || req.body.shopId === "") {
        return res.status(400).json({ error: "shopId is required" });
      }

      // Add attendantId if missing (extract from token context or request)
      if (!req.body.attendantId) {
        // Try to get attendantId from request headers or context
        const attendantId = req.headers['x-attendant-id'] || req.body.attendantId;
        if (attendantId) {
          req.body.attendantId = attendantId;
        }
      }

      console.log("Sales transaction data:", JSON.stringify(req.body, null, 2));

      const data = await makePointifyRequest("/sales", {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(req.body)
      });
      
      console.log("Pointify sales response:", JSON.stringify(data, null, 2));
      res.json(data);
    } catch (error: any) {
      console.error("Sales transaction error:", error);
      console.error("Error details:", error.message);
      
      // Try to extract the actual Pointify API error message
      let errorMessage = "Failed to create sales transaction";
      let statusCode = 500;
      
      if (error.responseBody) {
        try {
          const errorData = JSON.parse(error.responseBody);
          if (errorData.error) {
            errorMessage = errorData.error;
            statusCode = error.status || 400;
          }
        } catch (parseError) {
          // If parsing fails, use the original error message
          errorMessage = error.message || errorMessage;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      res.status(statusCode).json({ 
        error: errorMessage,
        details: error.message 
      });
    }
  });

  // Get sales transactions
  app.get("/api/sales/filter", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const queryParams = new URLSearchParams(req.query as any);
      const endpoint = `/sales/filter?${queryParams.toString()}`;
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error: any) {
      console.error("Sales filter error:", error);
      res.status(500).json({ error: "Failed to fetch sales transactions" });
    }
  });

  // Get single sales transaction
  app.get("/api/sales/single/receipt/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { id } = req.params;
      const data = await makePointifyRequest(`/sales/single/receipt/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch sales transaction" });
    }
  });

  // Process sale returns
  app.post("/api/salereturns", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { saleid, attendantId, shopId, items, reason, deleteReceipt } = req.body;
      
      if (!saleid || !attendantId || !shopId || !items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Missing required fields: saleid, attendantId, shopId, items' });
      }

      const returnPayload = {
        saleid,
        attendantId,
        shopId,
        items,
        reason: reason || 'Return processed',
        deleteReceipt: deleteReceipt || false
      };

      console.log("Processing return with payload:", JSON.stringify(returnPayload, null, 2));

      const data = await makePointifyRequest('/salereturns', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(returnPayload)
      });

      res.json(data);
    } catch (error: any) {
      console.error('Error processing return:', error);
      
      let errorMessage = "Failed to process return";
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

  // Update sales transaction
  app.put("/api/sales/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { id } = req.params;
      const data = await makePointifyRequest(`/sales/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(req.body)
      });
      
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update sales transaction" });
    }
  });

  app.get("/api/sales/shop/onlineorders/:shopId", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { shopId } = req.params;
      const queryParams = new URLSearchParams(req.query as any);
      console.log(queryParams);

      const data = await makePointifyRequest(`/sales/orders/sale/online?shop=${shopId}&${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch sales transaction" });
    }
  });

  // Void sales transaction
  app.delete("/api/sales/void/sale/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { id } = req.params;
      const data = await makePointifyRequest(`/sales/void/sale/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to void sales transaction" });
    }
  });

  // Get product sales
  app.get("/api/sales/product/filter", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const queryParams = new URLSearchParams(req.query as any);
      const endpoint = `/sales/product/filter?${queryParams.toString()}`;
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch product sales" });
    }
  });

  // Get sales summary by dates
  app.get("/api/sales/summary/bydates", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const queryParams = new URLSearchParams(req.query as any);
      const endpoint = `/sales/summary/bydates?${queryParams.toString()}`;
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch sales summary" });
    }
  });

  // Get discount reports
  app.get("/api/sales/discount/reports", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const queryParams = new URLSearchParams(req.query as any);
      const endpoint = `/sales/discount/reports?${queryParams.toString()}`;
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch discount reports" });
    }
  });

  // Get shop sales
  app.get("/api/sales/shops/sales", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const queryParams = new URLSearchParams(req.query as any);
      const endpoint = `/sales/shops/sales?${queryParams.toString()}`;
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch shop sales" });
    }
  });

  // Get monthly analysis
  app.get("/api/sales/product/month/analysis", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const queryParams = new URLSearchParams(req.query as any);
      const endpoint = `/sales/product/month/analysis?${queryParams.toString()}`;
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch monthly analysis" });
    }
  });

  // Create online sales order
  app.post("/api/sales/orders/sale/online", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const data = await makePointifyRequest("/sales/orders/sale/online", {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(req.body)
      });
      
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create online sales order" });
    }
  });

  // Get online sales orders
  app.get("/api/sales/orders/sale/online", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const queryParams = new URLSearchParams(req.query as any);
      const endpoint = `/sales/orders/sale/online?${queryParams.toString()}`;
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch online sales orders" });
    }
  });

  // Send receipt via email
  app.post("/api/sales/email-receipt", async (req, res) => {
    try {
      const { toEmail, receiptHtml, receiptNo, shopName, customerName, total, currency } = req.body;

      if (!toEmail || !receiptHtml) {
        return res.status(400).json({ success: false, error: "Email address and receipt data are required" });
      }

      const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
      const smtpPort = parseInt(process.env.SMTP_PORT || "587");
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const fromName = process.env.SMTP_FROM_NAME || shopName || "Pointify POS";
      const fromEmail = process.env.SMTP_FROM_EMAIL || smtpUser;

      if (!smtpUser || !smtpPass) {
        return res.status(503).json({
          success: false,
          error: "Email service not configured. Please set SMTP_USER and SMTP_PASS environment variables.",
          notConfigured: true
        });
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: toEmail,
        subject: `Your Receipt #${receiptNo} from ${shopName}`,
        html: receiptHtml,
      });

      res.json({ success: true, message: "Receipt sent successfully" });
    } catch (error: any) {
      console.error("Email receipt error:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to send email" });
    }
  });

  // Delete online sales order
  app.delete("/api/sales/orders/sale/online/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { id } = req.params;
      const data = await makePointifyRequest(`/sales/orders/sale/online/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete online sales order" });
    }
  });
}
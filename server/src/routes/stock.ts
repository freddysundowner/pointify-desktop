import type { Express } from "express";
import { makePointifyRequest } from "../config.js";

// Authentication middleware to extract token from Authorization header
const extractToken = (req: any) => {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
};

export function registerStockRoutes(app: Express) {
  // Get transfer history (GET - backward compatibility)
  app.get("/api/transfer/filter", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      // Handle shops array parameter
      const query = req.query as any;
      console.log('Received query parameters:', query);
      const params = new URLSearchParams();
      
      // Handle shops parameter - can be single value or array
      if (query.shops) {
        const shopsArray = Array.isArray(query.shops) ? query.shops : [query.shops];
        console.log('Processing shops array:', shopsArray);
        shopsArray.forEach((shopId: string) => {
          params.append('shops', shopId);
        });
      }
      
      // Handle other parameters  
      if (query.startDate) params.append('startDate', query.startDate);
      if (query.endDate) params.append('endDate', query.endDate);
      if (query.shopId) params.append('shopId', query.shopId); // Keep backward compatibility
      if (query.attendantId) params.append('attendantId', query.attendantId);
      
      const endpoint = `/transfer/filter?${params.toString()}`;
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Add cache-busting headers to prevent caching
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.json(data);
    } catch (error) {
      console.error("Transfer history error:", error);
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;
      
      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to fetch transfer history" });
        }
      } else {
        res.status(500).json({ error: "Failed to fetch transfer history" });
      }
    }
  });

  // Post transfer history with shops array in body
  app.post("/api/transfer/filter", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { shops, startDate, endDate, attendantId } = req.body;
      const params = new URLSearchParams();
      
      // Handle shops array from request body
      if (shops && Array.isArray(shops)) {
        console.log('Received shops array in POST:', shops);
        shops.forEach((shopId: string) => {
          params.append('shops', shopId);
        });
      }
      
      // Handle other parameters
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (attendantId) params.append('attendantId', attendantId);
      
      const endpoint = `/transfer/filter?${params.toString()}`;
      console.log('Calling Pointify endpoint:', endpoint);
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error) {
      console.error("Transfer history POST error:", error);
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;
      
      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to fetch transfer history" });
        }
      } else {
        res.status(500).json({ error: "Failed to fetch transfer history" });
      }
    }
  });

  // POST /transfers/shops - Call transfers/shops endpoint with shop IDs
  app.post("/api/transfers/shops", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { shops } = req.body;
      if (!shops || !Array.isArray(shops)) {
        return res.status(400).json({ error: "shops array is required in request body" });
      }

      const data = await makePointifyRequest("/transfers/shops", {
        method: "POST",
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ shops })
      });
      
      res.json(data);
    } catch (error) {
      console.error("Transfers shops error:", error);
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;
      
      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to call transfers/shops endpoint" });
        }
      } else {
        res.status(500).json({ error: "Failed to call transfers/shops endpoint" });
      }
    }
  });

  // Get stock movements for a product
  app.get("/api/stock/movements", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { productId, month, year } = req.query;
      
      // Build query parameters for stock movements
      const queryParams = new URLSearchParams({
        productId: productId as string,
        ...(month && { month: month as string }),
        ...(year && { year: year as string }),
      });
      
      const endpoint = `/product/history/product?${queryParams.toString()}`;
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Extract stock movements from the response
      const stockMovements = data.stockMovements || [];
      
      res.json(stockMovements);
    } catch (error) {
      console.error("Stock movements error:", error);
      res.status(500).json({ error: "Failed to fetch stock movements" });
    }
  });

  // Submit stock count
  app.post("/api/counts", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { attendantId, useWarehouse, shopId, products } = req.body;
      
      console.log("Stock count payload received:", { attendantId, useWarehouse, shopId, products });

      // Forward the exact payload to Pointify API
      const data = await makePointifyRequest("/counts", {
        method: "POST",
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ attendantId, useWarehouse, shopId, products })
      });
      
      res.json({ message: "Stock count submitted successfully", data });
    } catch (error) {
      console.error("Stock count submission error:", error);
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;
      
      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to submit stock count" });
        }
      } else {
        res.status(status).json({ error: "Failed to submit stock count" });
      }
    }
  });

  // Get stock count history for a shop
  app.get("/api/counts/shop/:shopId", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { shopId } = req.params;
      const { fromDate, toDate, attendantId } = req.query;
      
      console.log(`Fetching stock count history for shop ${shopId} from ${fromDate} to ${toDate}`);
      
      // Build endpoint with appropriate parameters
      const params = new URLSearchParams({
        fromDate: fromDate as string,
        toDate: toDate as string
      });
      
      // Add attendantId parameter if provided (for attendant requests)
      if (attendantId) {
        params.append('attendantId', attendantId as string);
        console.log(`Adding attendantId parameter: ${attendantId}`);
      }
      
      const endpoint = `/counts/shop/${shopId}?${params.toString()}`;
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error) {
      console.error("Stock count history error:", error);
      const status = (error as any).status || 500;
      res.status(status).json({ error: "Failed to fetch stock count history" });
    }
  });

  // Report bad stock
  app.post("/api/badstock", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { productId, shopId, attendantId, quantity, unitPrice, reason, useWarehouse } = req.body;
      
      console.log("Reporting bad stock:", { productId, shopId, attendantId: attendantId?._id, quantity, unitPrice, reason, useWarehouse });
      
      const payload = {
        productId,
        shopId,
        attendantId: attendantId?._id,
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice),
        reason,
        useWarehouse: useWarehouse || false
      };
      
      const data = await makePointifyRequest("/badstock", {
        method: "POST",
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      res.json(data);
    } catch (error) {
      console.error("Bad stock reporting error:", error);
      const status = (error as any).status || 500;
      res.status(status).json({ error: "Failed to report bad stock" });
    }
  });

  // Get bad stock items
  app.get("/api/badstock", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { shopId, status, fromDate, toDate, startDate, endDate, page = 1, limit = 10, search, attendantId  } = req.query;
      
      const queryParams = new URLSearchParams({
        ...(shopId && { shopId: shopId as string }),
        ...(status && { status: status as string }),
        ...(fromDate && { fromDate: fromDate as string }),
        ...(toDate && { toDate: toDate as string }),
        ...(startDate && { startDate: startDate as string }),
        ...(endDate && { endDate: endDate as string }),
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search: search as string }),
        ...(attendantId && { attendantId: attendantId as string }),
      });
      
      const endpoint = `/badstock?${queryParams.toString()}`;
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      }); 
      
      res.json(data);
    } catch (error) {
      console.error("Bad stock fetch error:", error);
      const status = (error as any).status || 500;
      res.status(status).json({ error: "Failed to fetch bad stock items" });
    }
  });

  // Delete bad stock item
  app.delete("/api/badstock/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { id } = req.params;
      
      console.log("Deleting bad stock item:", id);
      
      const data = await makePointifyRequest(`/badstock/${id}`, {
        method: "DELETE",
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error) {
      console.error("Bad stock deletion error:", error);
      const status = (error as any).status || 500;
      res.status(status).json({ error: "Failed to delete bad stock item" });
    }
  });

  // Get bad stock summary analytics
  app.get("/api/badstock/summary/analysis", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { shopId, startDate, endDate, attendantId } = req.query;
      if (!shopId) {
        return res.status(400).json({ error: "shopId is required" });
      }
      
      const queryParams = new URLSearchParams({
        shopId: shopId as string,
        ...(startDate && { startDate: startDate as string }),
        ...(endDate && { endDate: endDate as string }),
        ...(attendantId && { attendantId: attendantId as string }),
      });
      
      console.log("Fetching bad stock summary for shop:", shopId, "with params:", queryParams.toString());
      
      const data = await makePointifyRequest(`/badstock/summary/analysis?${queryParams.toString()}`, {
        method: "GET",
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error) {
      console.error("Bad stock summary fetch error:", error);
      const status = (error as any).status || 500;
      res.status(status).json({ error: "Failed to fetch bad stock summary" });
    }
  });
}
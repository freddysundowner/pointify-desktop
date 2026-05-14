import type { Express } from "express";
import { makePointifyRequest ,POINTIFY_API_BASE} from "../config.js";

// Authentication middleware to extract token from Authorization header
const extractToken = (req: any) => {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
};

export function registerAnalyticsRoutes(app: Express) {
  // =============================================================================
  // ANALYTICS & REPORTING ROUTES
  // =============================================================================
  
  // Stock analysis
  app.get("/api/analysis/stockanalysis", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const queryParams = new URLSearchParams(req.query as any);
      const endpoint = `/analysis/stockanalysis/?${queryParams.toString()}`;
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      res.json(data);
    } catch (error) {
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;
      
      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to fetch stock analysis" });
        }
      } else {
        res.status(500).json({ error: "Failed to fetch stock analysis" });
      }
    }
  });

  // Stock count analysis
  app.get("/analysis/stock/count/analysis", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const queryParams = new URLSearchParams(req.query as any);
      const endpoint = `/analysis/stock/count/analysis?${queryParams.toString()}`;
      
      console.log("Fetching stock count analysis:", endpoint);
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      res.json(data);
    } catch (error) {
      console.error("Stock count analysis error:", error);
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;
      
      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to fetch stock count analysis" });
        }
      } else {
        res.status(500).json({ error: "Failed to fetch stock count analysis" });
      }
    }
  });

  // Sales analytics
  app.get("/api/analysis/sales", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const queryParams = new URLSearchParams(req.query as any);
      const endpoint = `/analysis/sales/?${queryParams.toString()}`;
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error) {
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;
      
      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to fetch sales analytics" });
        }
      } else {
        res.status(500).json({ error: "Failed to fetch sales analytics" });
      }
    }
  });

  // Performance analytics
  app.get("/api/analysis/performance", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const queryParams = new URLSearchParams(req.query as any);
      const endpoint = `/analysis/performance/?${queryParams.toString()}`;
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error) {
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;
      
      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to fetch performance analytics" });
        }
      } else {
        res.status(500).json({ error: "Failed to fetch performance analytics" });
      }
    }
  });

  // Customer analytics
  app.get("/api/analysis/customers", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const queryParams = new URLSearchParams(req.query as any);
      const endpoint = `/analysis/customers/?${queryParams.toString()}`;
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error) {
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;
      
      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to fetch customer analytics" });
        }
      } else {
        res.status(500).json({ error: "Failed to fetch customer analytics" });
      }
    }
  });

  // Profit analytics
  app.get("/api/analysis/profit", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const queryParams = new URLSearchParams(req.query as any);
      const endpoint = `/analysis/profit/?${queryParams.toString()}`;
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error) {
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;
      
      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to fetch profit analytics" });
        }
      } else {
        res.status(500).json({ error: "Failed to fetch profit analytics" });
      }
    }
  });

  // Net profit analytics for dashboard
  app.get("/api/analysis/netprofit", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const queryParams = new URLSearchParams(req.query as any);
      const endpoint = `/analysis/netprofit/?${queryParams.toString()}`;
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error) {
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;
      
      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to fetch net profit analytics" });
        }
      } else {
        res.status(500).json({ error: "Failed to fetch net profit analytics" });
      }
    }
  });

  // PDF/Excel download endpoint for stock analysis
  app.get("/api/analysis/pdf/download", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const queryParams = new URLSearchParams(req.query as any);
      const endpoint = `/analysis/pdf/download/file?${queryParams.toString()}`;
      
      // Direct fetch to handle binary data properly  
      const url = `${POINTIFY_API_BASE}${endpoint}`;
      
      console.log('Downloading Excel from:', url);
      console.log('Using token:', token ? 'present' : 'missing');
      
      const response = await fetch(url, {
        method: "GET",
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('External API response status:', response.status);
      console.log('External API response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`Failed to fetch from Pointify API: ${response.status} ${response.statusText}`);
      }

      // Get the binary data as a buffer
      const buffer = await response.arrayBuffer();
      
      // Set appropriate headers for Excel file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="stock_report.xlsx"');
      res.setHeader('Content-Length', buffer.byteLength.toString());
      
      // Send the binary data
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error('Error downloading Excel file:', error);
      res.status(500).json({ error: "Failed to download stock report" });
    }
  });

  // Stock report per shop (paginated, searchable by name)
  app.get("/api/product/stockreport/:shopid", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ error: "Authorization token required" });
      const { shopid } = req.params;
      const queryParams = new URLSearchParams(req.query as any);
      const endpoint = `/product/stockreport/${shopid}?${queryParams.toString()}`;
      const data = await makePointifyRequest(endpoint, { headers: { 'Authorization': `Bearer ${token}` } });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch stock report" });
    }
  });

  // Alternative endpoint for file download (with /file path)
  app.get("/api/analysis/pdf/download/file", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const queryParams = new URLSearchParams(req.query as any);
      const endpoint = `/analysis/pdf/download/file?${queryParams.toString()}`;
      
      // Direct fetch to handle binary data properly  
      const url = `${POINTIFY_API_BASE}${endpoint}`;
      
      console.log('Downloading Excel from:', url);
      console.log('Using token:', token ? 'present' : 'missing');
      
      const response = await fetch(url, {
        method: "GET",
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('External API response status:', response.status);
      console.log('External API response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`Failed to fetch from Pointify API: ${response.status} ${response.statusText}`);
      }

      // Get the binary data as a buffer
      const buffer = await response.arrayBuffer();
      
      // Set appropriate headers for Excel file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="stock_report.xlsx"');
      res.setHeader('Content-Length', buffer.byteLength.toString());
      
      // Send the binary data
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error('Error downloading Excel file:', error);
      res.status(500).json({ error: "Failed to download stock report" });
    }
  });
}
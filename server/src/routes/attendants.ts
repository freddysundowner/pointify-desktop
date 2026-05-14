import type { Express } from "express";
import { makePointifyRequest } from "../config.js";

// In-memory storage for attendants when API is not available
interface Attendant {
  _id: string;
  username: string;
  uniqueDigits: number;
  password?: string;
  shopId: string;
  adminId: string;
  permissions: string[];
  createdAt: string;
  last_seen?: string;
  status: 'active' | 'inactive' | 'on_leave';
}

const attendantsStorage = new Map<string, Attendant>();

// Helper function to generate ID
const generateId = () => Math.random().toString(36).substr(2, 9);

export function registerAttendantRoutes(app: Express) {
  // Get admin permissions
  app.get("/api/admin/permissions", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      try {
        const data = await makePointifyRequest(`/admin/permissions`, {
          method: "GET",
          headers: { 'Authorization': `Bearer ${token}` },
        });
        res.json(data);
      } catch (apiError) {
        console.log("Pointify API not available for admin permissions, using fallback");
        
        // Fallback permissions structure
        const fallbackPermissions = [
          { key: "sales", value: ["create_sales", "view_sales", "edit_sales", "delete_sales"] },
          { key: "products", value: ["add_products", "edit_products", "view_products"] },
          { key: "stocks", value: ["add_purchases", "view_purchases", "adjust_stock"] },
          { key: "customers", value: ["add_customers", "view_customers", "edit_customers"] },
          { key: "reports", value: ["view_reports", "export_data"] }
        ];
        
        res.json(fallbackPermissions);
      }
    } catch (error) {
      console.error("Get admin permissions error:", error);
      res.status(500).json({ 
        error: "Failed to fetch admin permissions",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get all attendants for an admin
  app.get("/api/attendants/all/:adminId", async (req, res) => {
    try {
      const { adminId } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      if (!adminId) {
        return res.status(400).json({ error: "adminId parameter required" });
      }

      try {
        const data = await makePointifyRequest(`/attendants/all/${adminId}`, {
          method: "GET",
          headers: { 'Authorization': `Bearer ${token}` },
        });
        res.json(data);
      } catch (apiError) {
        console.log("Pointify API not available, using local storage");
        
        // Fallback to local storage
        const adminAttendants = Array.from(attendantsStorage.values())
          .filter(attendant => attendant.adminId === adminId);
        
        res.json(adminAttendants);
      }
    } catch (error) {
      console.error("Get attendants error:", error);
      res.status(500).json({ 
        error: "Failed to fetch attendants",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get attendants for a shop using the Pointify shop filter endpoint
  app.get("/api/attendants/shop/filter", async (req, res) => {
    try {
      const { shopId, adminId } = req.query;
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      if (!shopId) {
        return res.status(400).json({ error: "shopId query parameter required" });
      }

      res.setHeader('Cache-Control', 'no-store');

      const queryParams = new URLSearchParams({ shopId: shopId as string });

      try {
        const data = await makePointifyRequest(`/attendants/shop/filter?${queryParams.toString()}`, {
          method: "GET",
          headers: { 'Authorization': `Bearer ${token}` },
        });
        res.json(data);
      } catch (apiError) {
        console.log("Pointify API not available, using local storage");
        const shopAttendants = Array.from(attendantsStorage.values())
          .filter(attendant => attendant.shopId === shopId);
        res.json(shopAttendants);
      }
    } catch (error) {
      console.error("Get attendants error:", error);
      res.status(500).json({ 
        error: "Failed to fetch attendants",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get all attendants for a shop (legacy route)
  app.get("/api/attendants/shop/:shopId", async (req, res) => {
    try {
      const { shopId } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      // Extract adminId from query parameters
      const adminId = req.query.adminId;
      
      if (!adminId) {
        return res.status(400).json({ error: "adminId query parameter required" });
      }

      // Build query string for GET request
      const queryParams = new URLSearchParams({ shopId, adminId: adminId as string });

      try {
        const data = await makePointifyRequest(`/attendants/shop/filter?${queryParams.toString()}`, {
          method: "GET",
          headers: { 'Authorization': `Bearer ${token}` },
        });
        res.json(data);
      } catch (apiError) {
        console.log("Pointify API not available, using local storage");
        
        // Fallback to local storage
        const shopAttendants = Array.from(attendantsStorage.values())
          .filter(attendant => attendant.shopId === shopId);
        
        res.json(shopAttendants);
      }
    } catch (error) {
      console.error("Get attendants error:", error);
      res.status(500).json({ 
        error: "Failed to fetch attendants",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Create new attendant
  app.post("/api/attendants", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      // Validate required fields
      const { username, uniqueDigits, password, shopId, adminId } = req.body;
      
      if (!username || !uniqueDigits || !password || !shopId || !adminId) {
        return res.status(400).json({ 
          error: "Missing required fields: username, uniqueDigits, password, shopId, adminId" 
        });
      }

      // Construct payload with permissions defaulted to empty array
      const attendantData = {
        username,
        uniqueDigits: parseInt(uniqueDigits),
        password,
        shopId,
        adminId,
        permissions: req.body.permissions || []
      };

      console.log('Creating attendant with payload:', attendantData);

      try {
        const data = await makePointifyRequest("/attendants", {
          method: "POST",
          headers: { 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(attendantData),
        });
        res.json(data);
      } catch (apiError) {
        console.log("Pointify API not available, using local storage");
        
        // Fallback to local storage
        const attendantId = generateId();
        const attendant: Attendant = {
          _id: attendantId,
          username: attendantData.username,
          uniqueDigits: attendantData.uniqueDigits,
          shopId: attendantData.shopId,
          adminId: attendantData.adminId,
          permissions: attendantData.permissions,
          createdAt: new Date().toISOString(),
          status: 'active'
        };
        
        attendantsStorage.set(attendantId, attendant);
        res.json(attendant);
      }
    } catch (error) {
      console.error("Create attendant error:", error);
      res.status(500).json({ 
        error: "Failed to create attendant",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update attendant
  app.put("/api/attendants/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      console.log('Updating attendant with payload:', req.body);

      const data = await makePointifyRequest(`/attendants/${id}`, {
        method: "PUT",
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(req.body),
      });

      res.json(data);
    } catch (error) {
      console.error("Update attendant error:", error);
      
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;
      
      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to update attendant" });
        }
      } else {
        res.status(500).json({ 
          error: "Failed to update attendant",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  // Delete attendant
  app.delete("/api/attendants/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const data = await makePointifyRequest(`/attendants/${id}`, {
        method: "DELETE",
        headers: { 'Authorization': `Bearer ${token}` },
      });

      res.json(data);
    } catch (error) {
      console.error("Delete attendant error:", error);
      
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;
      
      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to delete attendant" });
        }
      } else {
        res.status(500).json({ 
          error: "Failed to delete attendant",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  // Get single attendant
  app.get("/api/attendants/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const data = await makePointifyRequest(`/attendants/${id}`, {
        method: "GET",
        headers: { 'Authorization': `Bearer ${token}` },
      });

      res.json(data);
    } catch (error) {
      console.error("Get attendant error:", error);
      
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;
      
      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to fetch attendant" });
        }
      } else {
        res.status(500).json({ 
          error: "Failed to fetch attendant",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });
}
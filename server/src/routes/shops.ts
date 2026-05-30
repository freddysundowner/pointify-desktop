import type { Express } from "express";
import { makePointifyRequest } from "../config.js";

const extractToken = (req: any) => {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
};

// Function to fetch categories from local API
async function fetchLocalCategories() {
  try {
    console.log("Fetching shop categories from local API...");
    
    // Fetch from local Pointify API
    const categories = await makePointifyRequest("/shop/category", {
      method: "GET",
    });
    
    console.log(`Found ${categories?.length || 0} categories locally`);
    return categories || [];
  } catch (error) {
    console.error("Error fetching categories from local API:", error);
    throw error;
  }
}

export function registerShopRoutes(app: Express) {
  // Add missing shopcategories endpoint for local storage
  app.post("/api/shopcategories", async (req, res) => {
    try {
      console.log("Storing shop category locally:", req.body);
      
      const response = await makePointifyRequest("/shopcategories", {
        method: "POST",
        body: JSON.stringify(req.body),
      });
      
      res.json(response);
    } catch (error) {
      console.error("Shop category storage error:", error);
      res.status(500).json({ 
        error: "Failed to store shop category",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Add bulk categories storage endpoint
  app.post("/api/shopcategories/bulk", async (req, res) => {
    try {
      console.log("Storing shop categories in bulk:", req.body);
      
      const response = await makePointifyRequest("/shopcategories/bulk", {
        method: "POST",
        body: JSON.stringify(req.body),
      });
      
      res.json(response);
    } catch (error) {
      console.error("Bulk categories storage error:", error);
      res.status(500).json({ 
        error: "Failed to store shop categories in bulk",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get shops by admin ID
  app.get("/api/shop/admin/:adminId", async (req, res) => {
    try {
      const { adminId } = req.params;
      const token = extractToken(req);
      console.log(`🏪 Fetching shops for admin: ${adminId}`);

      const response = await makePointifyRequest(`/shop/admin/${adminId}`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      console.log(`🏪 Found ${response?.length || 0} shops for admin ${adminId}`);
      res.json(response);
    } catch (error) {
      console.error("Shop fetch error:", error);
      
      const status = (error as any).status || 500;
      

      res.status(500).json({ 
        error: "Failed to fetch shops",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get shop categories (check local MongoDB first, then fetch from online)
  app.get("/api/shop/category", async (req, res) => {
    try {
      // Check local MongoDB first via Pointify API
      try {
        const localCategories = await makePointifyRequest("/shopcategories", {
          method: "GET",
        });
        
        if (Array.isArray(localCategories) && localCategories.length > 0) {
          console.log(`Returning ${localCategories.length} categories from local MongoDB`);
          return res.json(localCategories);
        }
      } catch (localError) {
        console.log("No local categories found or local fetch failed, trying online...");
      }
      
      // If local API isn't available, use smart routing
      try {
        console.log("Fetching shop categories via smart routing...");
        const categories = await makePointifyRequest("/shop/category", {
          method: "GET",
        });
        
        if (categories) {
          console.log(`Found ${categories?.length || 0} categories via smart routing`);
          return res.json(categories || []);
        }
      } catch (routingError) {
        console.error("Smart routing categories fetch failed:", routingError);
      }
      
      // If no local categories, try to fetch from local API
      console.log("Trying local API as fallback...");
      const localCategories = await fetchLocalCategories();
      
      res.json(localCategories);
    } catch (error) {
      console.error("Shop categories fetch error:", error);
      
      res.status(500).json({ 
        error: "Failed to fetch shop categories",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get specific shop by ID
  app.get("/api/shop/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Fetching shop details for ID: ${id}`);
      
      const response = await makePointifyRequest(`/shop/${id}`, {
        method: "GET",
      });

      // A valid shop is a single object with an _id. If the upstream failed and
      // the graceful fallback returned [] (or any non-shop value), do NOT return
      // 200 with empty data — that would make the client blank out the form.
      // Return an error instead so the client keeps the last good data and retries.
      const isValidShop =
        response &&
        typeof response === "object" &&
        !Array.isArray(response) &&
        (response as any)._id;

      if (!isValidShop) {
        console.warn(`Shop ${id} fetch returned no valid record (upstream failure).`);
        return res.status(502).json({
          error: "Failed to fetch shop details",
          message: "Upstream did not return a valid shop record",
        });
      }

      console.log(`Shop details response:`, response);
      res.json(response);
    } catch (error) {
      console.error("Shop detail fetch error:", error);
      res.status(500).json({ 
        error: "Failed to fetch shop details",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update shop
  app.put("/api/shop/:id", async (req, res) => {
    try {
      const { id } = req.params;

      console.log(
        `🛠️  PUT /api/shop/${id} receiptemail=`,
        (req.body as any)?.receiptemail,
        "email_receipt=",
        (req.body as any)?.email_receipt,
      );

      const response = await makePointifyRequest(`/shop/${id}`, {
        method: "PUT",
        body: JSON.stringify(req.body),
      });

      res.json(response);
    } catch (error) {
      console.error("Shop update error:", error);
      res.status(500).json({ 
        error: "Failed to update shop",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Create new shop
  app.post("/api/shop", async (req, res) => {
    try {
      console.log("Creating shop with data:", req.body);
      
      // Ensure required fields are present to prevent null errors
      const shopData = {
        ...req.body,
        // Add default values for fields that might be null/undefined
        durationUnit: req.body.durationUnit || 'monthly',
        duration: req.body.duration || 30,
        subscriptionType: req.body.subscriptionType || 'standard',
        // Ensure other critical fields have defaults
        currency: req.body.currency || 'KES',
        taxRate: req.body.taxRate || 0,
        trackbatches: req.body.trackbatches || false,
      };
      
      console.log("Enhanced shop data with defaults:", shopData);
      
      const response = await makePointifyRequest("/shop", {
        method: "POST",
        body: JSON.stringify(shopData),
      });
      
      console.log("Shop creation response:", response);
      res.json(response);
    } catch (error) {
      console.error("Shop creation error:", error);
      res.status(500).json({ 
        error: "Failed to create shop",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Force refresh categories from local (admin endpoint)
  app.post("/api/shop/category/refresh", async (req, res) => {
    try {
      console.log("Force refreshing shop categories from local...");
      const localCategories = await fetchLocalCategories();
      res.json({ 
        success: true, 
        message: `Refreshed ${localCategories.length} categories`,
        categories: localCategories
      });
    } catch (error) {
      console.error("Categories refresh error:", error);
      res.status(500).json({ 
        error: "Failed to refresh shop categories",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Initial sync endpoints
  app.get("/api/sync/status", async (req, res) => {
    try {
      const needsSync = false;
      const progress = [];
      
      res.json({
        needsSync,
        progress
      });
    } catch (error) {
      console.error("Sync status check error:", error);
      res.status(500).json({ 
        error: "Failed to check sync status",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/sync/initial", async (req, res) => {
    try {
      const { adminId, shopId } = req.body;
      
      console.log(`Starting initial sync for admin: ${adminId}, shop: ${shopId}`);
      
      const result = { success: true, message: "Sync system removed" };
      
      if (result.success) {
        res.json({
          message: "Initial sync completed successfully",
          result
        });
      } else {
        res.status(207).json({
          message: "Initial sync completed with some failures",
          result
        });
      }
    } catch (error) {
      console.error("Initial sync error:", error);
      res.status(500).json({ 
        error: "Failed to perform initial sync",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/sync/progress", async (req, res) => {
    try {
      const progress = [];
      res.json(progress);
    } catch (error) {
      console.error("Sync progress error:", error);
      res.status(500).json({ 
        error: "Failed to get sync progress",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/sync/shop", async (req, res) => {
    try {
      const { adminId, shopId } = req.body;
      
      if (!adminId || !shopId) {
        return res.status(400).json({ 
          error: "Missing required parameters",
          message: "adminId and shopId are required"
        });
      }
      
      console.log(`Starting shop-specific sync for admin: ${adminId}, shop: ${shopId}`);
      
      const result = { success: true, message: "Sync system removed" };
      
      if (result.success) {
        res.json({
          message: "Shop sync completed successfully",
          result
        });
      } else {
        res.status(207).json({
          message: "Shop sync completed with some failures",
          result
        });
      }
    } catch (error) {
      console.error("Shop sync error:", error);
      res.status(500).json({ 
        error: "Failed to perform shop sync",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.delete("/api/shop/data/:id", async (req, res) => {
    try {
      const shopId = req.params.id;
      const token = extractToken(req);
      console.log(`Deleting shop data for ID: ${shopId}`);

      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }
      
      const response = await makePointifyRequest(`/shop/data/${shopId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log(`Delete shop data response:`, response);
      res.json(response);
    } catch (error: any) {
      console.error("Error deleting shop data:", error);
      let errorMessage = "Failed to delete shop data";
      if (error.responseBody) {
        try {
          const parsed = JSON.parse(error.responseBody);
          if (parsed.error) errorMessage = parsed.error;
        } catch {}
      }
      res.status(error.status || 500).json({ 
        error: errorMessage,
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}
import type { Express } from "express";
import { makePointifyRequest, setGlobalApiMode } from "../config.js";
import { setAdminId, clearAdminId, performPeriodicSync, } from "../network-status-handler.js";

export function registerAuthRoutes(app: Express) {
  // =============================================================================
  // AUTHENTICATION ROUTES
  // =============================================================================

  // =============================================================================
// BUSINESS REGISTRATION
// =============================================================================
app.post("/api/business/register", async (req, res) => {
  try {
    
    // For registration, try external API first if internet is available
    let data: any  = await makePointifyRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(req.body),
    }); 

    const adminId = data?.userdata?._id;
    if (adminId) {
      setAdminId(data?.userdata);
    } else {
      console.log("❌ No admin ID found in registration data");
    }
    
    res.json(data);
  } catch (error) {
    console.error("Registration error:", error);

    const status = (error as any).status || 500;
    const responseBody = (error as any).responseBody;

    if (responseBody) {
      try {
        const errorData = JSON.parse(responseBody);
        res.status(status).json(errorData);
      } catch (parseError) {
        console.log("Failed to parse response as JSON:", parseError);
        if (responseBody.includes('<')) {
          res.status(status).json({ 
            error: "Registration failed", 
            message: "External API returned HTML error page",
            details: `Status: ${status}`
          });
        } else {
          res.status(status).json({ 
            error: "Registration failed",
            message: responseBody || "Unknown error"
          });
        }
      }
    } else {
      res.status(500).json({ 
        error: "Failed to register business",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
});

  // Business login
  app.post("/api/business/login", async (req, res) => {
    try {
      console.log("Login request body:", req.body);
      
      // For login, try external API first if internet is available
      let data: any = await makePointifyRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify(req.body),
      });
      
      // Extract and cache admin ID from successful login
      console.log("🔍 Login data received:", JSON.stringify(data, null, 2));
      console.log("🔍 Checking admin ID extraction:");
      console.log("data?._id:", data?._id);
      console.log("data?.userdata?._id:", data?.userdata?._id);
      const adminId = data?._id || data?.userdata?._id;
      console.log("Final adminId:", adminId);
      if (adminId) {
        console.log("✅ Admin ID found in login data:", adminId);
        setGlobalApiMode(data?.userdata?.status || "online");
        setAdminId(data?.userdata);
      } else {
        console.log("❌ No admin ID found in login data");
      }
      
      res.json(data);
    } catch (error) {
      console.error("Login error:", error);
      
      // Forward the status code from the external API
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;
      
      console.log("Raw response body:", responseBody);
      
      if (responseBody) {
        try {
          // Try to parse and forward the exact error response
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch (parseError) {
          console.log("Failed to parse response as JSON:", parseError);
          // If parsing fails, the response might be HTML or plain text
          if (responseBody.includes('<')) {
            // HTML response - likely an error page
            res.status(status).json({ 
              error: "Authentication failed", 
              message: "External API returned HTML error page",
              details: `Status: ${status}`
            });
          } else {
            // Plain text response
            res.status(status).json({ 
              error: "Authentication failed",
              message: responseBody || "Unknown error"
            });
          }
        }
      } else {
        res.status(500).json({ 
          error: "Failed to login",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  // Get admin data by ID
  app.get("/api/auth/admin/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '');

      const data: any = await makePointifyRequest(`/auth/admin/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log("🔍 Admin data received:", JSON.stringify(data, null, 2));

      // Cache admin ID from successful admin data fetch
      if (data && data._id) {
        setGlobalApiMode(data?.status);
        setAdminId(data);
        await performPeriodicSync();
      }

      // The makePointifyRequest now returns null for auth failures instead of throwing errors
      res.json(data);
    } catch (error) {
      console.error("Admin fetch error:", error);
      
      // Check if this is a 401 error that requires logout
      if ((error as any).logoutRequired || (error as any).status === 401) {
        console.log("🚪 401 Unauthorized detected - triggering logout");
        return res.status(401).json({ 
          error: "Authentication expired",
          logout: true,
          message: "Please log in again"
        });
      }
      
      // Check if both online and local APIs have failed
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;
      
      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to fetch admin data" });
        }
      } else {
        res.status(500).json({ 
          error: "Failed to fetch admin data",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  // Update admin status - PUT method for status updates
  app.put("/api/auth/admin/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }
      
      if (!status || !['online', 'offline', 'hybrid'].includes(status)) {
        return res.status(400).json({ error: "Valid status required: online, offline, or hybrid" });
      }

      const data = await makePointifyRequest(`/auth/admin/${id}`, {
        method: "PUT",
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });

      res.json(data);
    } catch (error) {
      console.error("Admin status update error:", error);
      
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;
      
      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to update admin status" });
        }
      } else {
        res.status(500).json({ 
          error: "Failed to update admin status",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  // Update admin data - PUT method (supports { username, email, phone } or { username, email, phone, password })
  app.put("/api/admin/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      console.log('Admin update payload:', req.body);

      const data = await makePointifyRequest(`/admin/${id}`, {
        method: "PUT",
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(req.body),
      });

      res.json(data);
    } catch (error) {
      console.error("Admin update error:", error);
      
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;
      
      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to update admin data" });
        }
      } else {
        res.status(500).json({ 
          error: "Failed to update admin data",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  // PATCH admin data - for partial updates like primaryShop
  app.patch("/api/admin/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      console.log('Admin patch payload:', req.body);

      const data = await makePointifyRequest(`/admin/${id}`, {
        method: "PUT", // Pointify API uses PUT for updates
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(req.body),
      });

      res.json(data);
    } catch (error) {
      console.error("Admin patch error:", error);
      
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;
      
      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to update admin data" });
        }
      } else {
        res.status(500).json({ 
          error: "Failed to update admin data",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  // Legacy endpoint for backward compatibility
  app.put("/api/auth/admin/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const data = await makePointifyRequest(`/admin/${id}`, {
        method: "PUT",
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(req.body),
      });

      res.json(data);
    } catch (error) {
      console.error("Admin update error:", error);
      
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;
      
      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to update admin data" });
        }
      } else {
        res.status(500).json({ 
          error: "Failed to update admin data",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });



  // Logout - clear admin ID cache
  app.post("/api/business/logout", async (req, res) => {
    try {
      // Clear cached admin ID for sync operations
      clearAdminId();
      
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to logout" });
    }
  });
}


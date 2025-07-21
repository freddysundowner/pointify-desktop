import { Express, Request, Response } from "express";
import { makePointifyRequest } from "../config.js";

export function registerCashflowCategoryRoutes(app: Express) {
  // Get cashflow categories by shop and type
  app.get("/api/cashflow-categories/shop/:id/:type", async (req: Request, res: Response) => {
    try {
      const { id: shopId, type } = req.params;
      
      if (!shopId) {
        return res.status(400).json({ error: "Shop ID is required" });
      }

      if (type && !["cashin", "cashout"].includes(type)) {
        return res.status(400).json({ error: "Type must be either 'cashin' or 'cashout'" });
      }

      console.log(`Fetching cashflow categories with endpoint: /cashflowcategory/shop/${shopId}/${type}`);
      
      const response = await makePointifyRequest(`/cashflowcategory/shop/${shopId}/${type}`, {
        method: "GET",
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      // Set cache-busting headers
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.json(response);
    } catch (error) {
      console.error("Error fetching cashflow categories:", error);
      res.status(500).json({ error: "Failed to fetch cashflow categories" });
    }
  });

  // Get all cashflow categories for a shop (backward compatibility)
  app.get("/api/cashflow-categories", async (req: Request, res: Response) => {
    try {
      const { shop } = req.query;
      
      if (!shop) {
        return res.status(400).json({ error: "Shop ID is required" });
      }

      // Try to fetch all categories using "all" parameter first
      let response;
      try {
        console.log(`Attempting to fetch all cashflow categories from: /cashflowcategory/shop/${shop}/all`);
        response = await makePointifyRequest(`/cashflowcategory/shop/${shop}/all`, {
          method: "GET",
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
      } catch (error) {
        // If single endpoint fails, fall back to separate calls
        console.log(`Single endpoint failed, falling back to separate calls: /cashflowcategory/shop/${shop}/cashin and /cashflowcategory/shop/${shop}/cashout`);
        
        const [cashinResponse, cashoutResponse] = await Promise.all([
          makePointifyRequest(`/cashflowcategory/shop/${shop}/cashin`, {
            method: "GET",
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          }),
          makePointifyRequest(`/cashflowcategory/shop/${shop}/cashout`, {
            method: "GET",
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          })
        ]);

        // Combine both responses
        response = [...(cashinResponse || []), ...(cashoutResponse || [])];
      }

      // Set cache-busting headers
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.json(response);
    } catch (error) {
      console.error("Error fetching cashflow categories:", error);
      res.status(500).json({ error: "Failed to fetch cashflow categories" });
    }
  });

  // Create cashflow category
  app.post("/api/cashflow-categories", async (req: Request, res: Response) => {
    try {
      const { name, shopId, type } = req.body;

      if (!name || !shopId || !type) {
        return res.status(400).json({ error: "Name, shopId, and type are required" });
      }

      if (!["cashin", "cashout"].includes(type)) {
        return res.status(400).json({ error: "Type must be either 'cashin' or 'cashout'" });
      }

      const response = await makePointifyRequest("/cashflowcategory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, shopId, type })
      });

      res.json(response);
    } catch (error: any) {
      console.error("Error creating cashflow category:", error);
      
      // Handle specific Pointify API errors with user-friendly messages
      if (error.status === 400 && error.responseBody) {
        try {
          const errorData = JSON.parse(error.responseBody);
          if (errorData.error && errorData.error.includes("you already have")) {
            const categoryName = errorData.error.replace("you already have ", "");
            return res.status(400).json({ 
              error: `A category named "${categoryName}" already exists. Please choose a different name.` 
            });
          }
        } catch (parseError) {
          // If we can't parse the error, fall back to generic message
        }
      }
      
      res.status(500).json({ error: "Failed to create cashflow category" });
    }
  });

  // Update cashflow category
  app.put("/api/cashflow-categories/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, type } = req.body;

      if (!name || !type) {
        return res.status(400).json({ error: "Name and type are required" });
      }

      if (!["cashin", "cashout"].includes(type)) {
        return res.status(400).json({ error: "Type must be either 'cashin' or 'cashout'" });
      }

      const response = await makePointifyRequest(`/cashflowcategory/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, type })
      });

      res.json(response);
    } catch (error: any) {
      console.error("Error updating cashflow category:", error);
      
      // Handle specific Pointify API errors with user-friendly messages
      if (error.status === 400 && error.responseBody) {
        try {
          const errorData = JSON.parse(error.responseBody);
          if (errorData.error && errorData.error.includes("you already have")) {
            const categoryName = errorData.error.replace("you already have ", "");
            return res.status(400).json({ 
              error: `A category named "${categoryName}" already exists. Please choose a different name.` 
            });
          }
        } catch (parseError) {
          // If we can't parse the error, fall back to generic message
        }
      }
      
      res.status(500).json({ error: "Failed to update cashflow category" });
    }
  });

  // Delete cashflow category
  app.delete("/api/cashflow-categories/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const response = await makePointifyRequest(`/cashflowcategory/${id}`, {
        method: "DELETE"
      });

      res.json(response);
    } catch (error) {
      console.error("Error deleting cashflow category:", error);
      res.status(500).json({ error: "Failed to delete cashflow category" });
    }
  });
}
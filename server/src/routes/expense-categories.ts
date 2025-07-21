import type { Express } from "express";
import { makePointifyRequest } from "../config.js";

// Authentication middleware to extract token from Authorization header
const extractToken = (req: any) => {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
};

export function registerExpenseCategoryRoutes(app: Express) {
  // =============================================================================
  // EXPENSE CATEGORY MANAGEMENT ROUTES
  // =============================================================================
  
  // Get all expense categories
  app.get("/api/expense-categories", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      // Convert shopId to shop parameter for Pointify API
      const queryParams = new URLSearchParams();
      if (req.query.shop) {
        queryParams.set('shop', req.query.shop as string);
      }
      
      // Add any other query parameters
      Object.entries(req.query).forEach(([key, value]) => {
        if (key !== 'shop' && value) {
          queryParams.set(key, value as string);
        }
      });

      const endpoint = `/expensescategory?${queryParams.toString()}`;
      console.log('Fetching expense categories with endpoint:', endpoint);
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error) {
      console.error('Expense categories fetch error:', error);
      res.status(500).json({ error: "Failed to fetch expense categories" });
    }
  });

  // Get single expense category
  app.get("/api/expense-categories/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { id } = req.params;
      const data = await makePointifyRequest(`/expensescategory/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error) {
      console.error('Expense category fetch error:', error);
      res.status(500).json({ error: "Failed to fetch expense category" });
    }
  });

  // Create expense category
  app.post("/api/expense-categories", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      // Validate required fields
      if (!req.body.name || req.body.name.trim() === '') {
        return res.status(400).json({ error: "Category name is required" });
      }

      if (!req.body.shopId) {
        return res.status(400).json({ error: "Shop ID is required" });
      }

      // Prepare payload
      const categoryPayload = {
        name: req.body.name.trim(),
        shopId: req.body.shopId
      };

      console.log('Creating expense category:', categoryPayload);

      const data = await makePointifyRequest("/expensescategory", {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(categoryPayload)
      });
      
      res.json(data);
    } catch (error) {
      console.error('Expense category creation error:', error);
      res.status(500).json({ error: "Failed to create expense category" });
    }
  });

  // Update expense category
  app.put("/api/expense-categories/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { id } = req.params;

      // Validate required fields
      if (!req.body.name || req.body.name.trim() === '') {
        return res.status(400).json({ error: "Category name is required" });
      }

      // Prepare payload
      const categoryPayload = {
        name: req.body.name.trim(),
        shopId: req.body.shopId
      };

      console.log('Updating expense category:', id, categoryPayload);

      const data = await makePointifyRequest(`/expensescategory/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(categoryPayload)
      });
      
      res.json(data);
    } catch (error) {
      console.error('Expense category update error:', error);
      res.status(500).json({ error: "Failed to update expense category" });
    }
  });

  // Delete expense category
  app.delete("/api/expense-categories/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { id } = req.params;
      
      console.log('Deleting expense category:', id);

      const data = await makePointifyRequest(`/expensescategory/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error) {
      console.error('Expense category deletion error:', error);
      res.status(500).json({ error: "Failed to delete expense category" });
    }
  });
}
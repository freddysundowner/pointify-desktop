import type { Express } from "express";
import { makePointifyRequest } from "../config.js";

// Authentication middleware to extract token from Authorization header
const extractToken = (req: any) => {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
};

export function registerExpenseRoutes(app: Express) {
  // =============================================================================
  // EXPENSE MANAGEMENT ROUTES
  // =============================================================================
  
  // Get all expenses
  app.get("/api/expenses", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      // Convert query parameters for Pointify API
      const queryParams = new URLSearchParams();
      if (req.query.shop) {
        queryParams.set('shop', req.query.shop as string);
      }
      
      // Add filter parameters to Pointify API call
      if (req.query.category) {
        queryParams.set('category', req.query.category as string);
      }
      
      if (req.query.startDate) {
        queryParams.set('startDate', req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        queryParams.set('endDate', req.query.endDate as string);
      }
      
      // Add other query parameters (pagination, etc.)
      Object.entries(req.query).forEach(([key, value]) => {
        if (!['shop', 'category', 'startDate', 'endDate'].includes(key) && value) {
          queryParams.set(key, value as string);
        }
      });

      const endpoint = `/expenses?${queryParams.toString()}`;
      console.log('Fetching expenses with endpoint:', endpoint);
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Set cache-busting headers
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.json(data);
    } catch (error) {
      console.error('Expenses fetch error:', error);
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  // Get single expense
  app.get("/api/expenses/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { id } = req.params;
      const data = await makePointifyRequest(`/expenses/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error) {
      console.error('Expense fetch error:', error);
      res.status(500).json({ error: "Failed to fetch expense" });
    }
  });

  // Get expense analytics/stats
  app.get("/api/expenses/stats/summary/analysis", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      // Convert query parameters for Pointify API
      const queryParams = new URLSearchParams();
      if (req.query.shop) {
        queryParams.set('shop', req.query.shop as string);
      }
      
      // Add filter parameters to Pointify API call
      if (req.query.category) {
        queryParams.set('category', req.query.category as string);
      }
      
      if (req.query.startDate) {
        queryParams.set('startDate', req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        queryParams.set('endDate', req.query.endDate as string);
      }
      
      if (req.query.page) {
        queryParams.set('page', req.query.page as string);
      }
      
      if (req.query.limit) {
        queryParams.set('limit', req.query.limit as string);
      }

      const endpoint = `/expenses/stats/summary/analysis?${queryParams.toString()}`;
      console.log('Fetching expense stats with endpoint:', endpoint);
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Set cache-busting headers
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.json(data);
    } catch (error) {
      console.error('Expense stats fetch error:', error);
      res.status(500).json({ error: "Failed to fetch expense analytics" });
    }
  });

  // Create expense
  app.post("/api/expenses", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      // Validate required fields
      if (!req.body.description || req.body.description.trim() === '') {
        return res.status(400).json({ error: "Description is required" });
      }

      if (!req.body.amount || req.body.amount <= 0) {
        return res.status(400).json({ error: "Valid amount is required" });
      }

      if (!req.body.category) {
        return res.status(400).json({ error: "Category is required" });
      }

      if (!req.body.attendantId) {
        return res.status(400).json({ error: "Attendant ID is required" });
      }

      if (!req.body.shopId) {
        return res.status(400).json({ error: "Shop ID is required" });
      }

      // Prepare payload with exact structure
      const expensePayload = {
        description: req.body.description.trim(),
        amount: Number(req.body.amount),
        category: req.body.category,
        attendantId: req.body.attendantId,
        shopId: req.body.shopId,
        frequency: req.body.frequency || null,
        autoSave: req.body.autoSave || false
      };

      console.log('Creating expense:', expensePayload);

      const data = await makePointifyRequest("/expenses", {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(expensePayload)
      });
      
      res.json(data);
    } catch (error) {
      console.error('Expense creation error:', error);
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  // Update expense
  app.put("/api/expenses/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { id } = req.params;

      // Validate required fields
      if (!req.body.description || req.body.description.trim() === '') {
        return res.status(400).json({ error: "Description is required" });
      }

      if (!req.body.amount || req.body.amount <= 0) {
        return res.status(400).json({ error: "Valid amount is required" });
      }

      if (!req.body.category) {
        return res.status(400).json({ error: "Category is required" });
      }

      // Prepare payload
      const expensePayload = {
        description: req.body.description.trim(),
        amount: Number(req.body.amount),
        category: req.body.category,
        attendantId: req.body.attendantId,
        shopId: req.body.shopId,
        frequency: req.body.frequency || null,
        autoSave: req.body.autoSave || false
      };

      console.log('Updating expense:', id, expensePayload);

      const data = await makePointifyRequest(`/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(expensePayload)
      });
      
      res.json(data);
    } catch (error) {
      console.error('Expense update error:', error);
      res.status(500).json({ error: "Failed to update expense" });
    }
  });

  // Delete expense
  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { id } = req.params;
      
      console.log('Deleting expense:', id);

      const data = await makePointifyRequest(`/expenses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error) {
      console.error('Expense deletion error:', error);
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });
}
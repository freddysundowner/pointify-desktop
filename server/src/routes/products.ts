import type { Express } from "express";
import { makePointifyRequest } from "../config.js";

// Authentication middleware to extract token from Authorization header
const extractToken = (req: any) => {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;
};

export function registerProductRoutes(app: Express) {
  // =============================================================================
  // PRODUCT MANAGEMENT ROUTES
  // =============================================================================

  // Get products with filtering and search
  app.get("/api/product", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const queryParams = new URLSearchParams(req.query as any);
      const endpoint = `/product?${queryParams.toString()}`;

      const data = await makePointifyRequest(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
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
          res.status(status).json({ error: "Failed to fetch products" });
        }
      } else {
        res.status(500).json({ error: "Failed to fetch products" });
      }
    }
  });

  // Get products for a specific shop
  app.get("/api/product/shop/:shopId", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { shopId } = req.params;
      const attendantId = req.query.attendantId as string;

      if (!attendantId) {
        return res
          .status(400)
          .json({ error: "attendantId parameter is required" });
      }

      console.log(
        `Fetching products for shop ${shopId} with attendant ${attendantId}`,
      );

      // Use the correct Pointify API endpoint structure
      const queryParams = new URLSearchParams({
        page: "1",
        reason: "",
        date: "",
        limit: "100",
        name: "",
        shopid: shopId,
        type: "",
        sort: "name",
        productid: "",
        barcodeid: "",
        productType: "",
        useWarehouse: "true",
        warehouse: "false",
        adminid: attendantId,
      });

      const data = await makePointifyRequest(
        `/product?${queryParams.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000, // 30 second timeout instead of default
        },
      );

      console.log(
        `Shop ${shopId} products response: ${JSON.stringify(data).length} characters, ${Array.isArray(data) ? data.length : data?.data?.length || 0} products`,
      );
      res.json(data);
    } catch (error) {
      const { shopId } = req.params;
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;

      console.error(`Error fetching products for shop ${shopId}:`, error);
      


      // For 504 Gateway Timeout, return empty array to indicate no products available
      if (status === 504) {
        console.log(
          `API timeout for shop ${shopId}, returning empty product array`,
        );
        return res.json({ data: [] });
      }

      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to fetch shop products" });
        }
      } else {
        res.status(500).json({ error: "Failed to fetch shop products" });
      }
    }
  });

  // Get single product
  app.get("/api/product/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { id } = req.params;
      const data = await makePointifyRequest(`/product/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
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
          res.status(status).json({ error: "Failed to fetch product" });
        }
      } else {
        res.status(500).json({ error: "Failed to fetch product" });
      }
    }
  });

  // Create product
  app.post("/api/product", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const data = await makePointifyRequest("/product", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(req.body),
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
          res.status(status).json({ error: "Failed to create product" });
        }
      } else {
        res.status(500).json({ error: "Failed to create product" });
      }
    }
  });

  // Get bundle items for a product
  app.get("/api/product/bundle/items/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { id } = req.params;
      const data = await makePointifyRequest(`/product/bundle/items/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
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
          res.status(status).json({ error: "Failed to fetch bundle items" });
        }
      } else {
        res.status(500).json({ error: "Failed to fetch bundle items" });
      }
    }
  });

  // Update product
  app.put("/api/product/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { id } = req.params;

      // Debug logging for bundle updates
      console.log("=== PRODUCT UPDATE DEBUG ===");
      console.log("Product ID:", id);
      console.log("Update payload:", JSON.stringify(req.body, null, 2));
      console.log("Bundle field in payload:", req.body.bundle);
      console.log("Items field in payload:", req.body.items);

      const data = await makePointifyRequest(`/product/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(req.body),
      });

      console.log("Pointify API response:", JSON.stringify(data, null, 2));
      console.log("=== END PRODUCT UPDATE DEBUG ===");

      res.json(data);
    } catch (error) {
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;

      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to update product" });
        }
      } else {
        res.status(500).json({ error: "Failed to update product" });
      }
    }
  });

  // =============================================================================
  // BUNDLE PRODUCT ROUTES
  // =============================================================================

  // Get bundle items
  app.get("/api/product/bundle/items/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { id } = req.params;
      console.log(`Fetching bundle items for product ID: ${id}`);

      const data = await makePointifyRequest(`/product/bundle/items/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log(`Bundle items response:`, data);
      res.json(data);
    } catch (error) {
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;

      console.error(`Error fetching bundle items:`, error);

      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to fetch bundle items" });
        }
      } else {
        res.status(500).json({ error: "Failed to fetch bundle items" });
      }
    }
  });

  // Get product categories
  app.get("/api/product/category", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const queryParams = new URLSearchParams(req.query as any);
      const endpoint = `/product/category?${queryParams.toString()}`;

      const data = await makePointifyRequest(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
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
          res
            .status(status)
            .json({ error: "Failed to fetch product categories" });
        }
      } else {
        res.status(500).json({ error: "Failed to fetch product categories" });
      }
    }
  });

  // Create product category
  app.post("/api/product/category", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const data = await makePointifyRequest("/product/category", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(req.body),
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
          res.status(status).json({ error: "Failed to create category" });
        }
      } else {
        res.status(500).json({ error: "Failed to create category" });
      }
    }
  });

  // Get stock movements
  app.get("/api/stock-movements", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const {
        productId,
        month,
        year,
        page = 1,
        limit = 10,
        stockPage = 1,
        stockLimit = 10,
      } = req.query;

      // Build query parameters for stock movements
      const queryParams = new URLSearchParams({
        id: productId as string,
        ...(month && { month: month as string }),
        ...(year && { year: year as string }),
        page: stockPage as string,
        limit: stockLimit as string,
        stockPage: stockPage as string,
        stockLimit: stockLimit as string,
      });

      const endpoint = `/history/product/stock/${productId}?${queryParams.toString()}`;

      const data = await makePointifyRequest(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Stock movements response:", JSON.stringify(data, null, 2));
      res.json(data);
    } catch (error) {
      console.error("Stock movements error:", error);
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;

      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to fetch stock movements" });
        }
      } else {
        res.status(500).json({ error: "Failed to fetch stock movements" });
      }
    }
  });

  // Get product sales history
  app.get("/api/sales-history", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { productId, month, year, page = 1, limit = 10 } = req.query;

      // Build query parameters for sales history
      const queryParams = new URLSearchParams({
        id: productId as string,
        ...(month && { month: month as string }),
        ...(year && { year: year as string }),
        page: page as string,
        limit: limit as string,
      });

      const endpoint = `/history/product/sales/${productId}?${queryParams.toString()}`;

      const data = await makePointifyRequest(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Sales history response:", JSON.stringify(data, null, 2));
      res.json(data);
    } catch (error) {
      console.error("Sales history error:", error);
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;

      if (responseBody) {
        console.error("Sales history error response body:", responseBody);
      }

      res.status(status).json({
        error: "Failed to fetch sales history",
        details: responseBody || (error as Error).message,
      });
    }
  });

  // Get product summary analytics
  app.get("/api/product-summary", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { productId, month, year } = req.query;

      // Build query parameters for summary
      const queryParams = new URLSearchParams({
        ...(month && { month: month as string }),
        ...(year && { year: year as string }),
      });

      const endpoint = `/history/product/summary/${productId}?${queryParams.toString()}`;

      const data = await makePointifyRequest(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Product summary response:", JSON.stringify(data, null, 2));
      res.json(data);
    } catch (error) {
      console.error("Product summary error:", error);
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;

      if (responseBody) {
        console.error("Product summary error response body:", responseBody);
      }

      res.status(status).json({
        error: "Failed to fetch product summary",
        details: responseBody || (error as Error).message,
      });
    }
  });

  // Get product history (sales and stock movements)
  app.get("/api/product/history", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { productId, month, year } = req.query;

      // Build query parameters for product history
      const queryParams = new URLSearchParams({
        productId: productId as string,
        ...(month && { month: month as string }),
        ...(year && { year: year as string }),
      });

      const endpoint = `/product/history/product?${queryParams.toString()}`;

      const data = await makePointifyRequest(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      res.json(data);
    } catch (error) {
      console.error("Product history error:", error);
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;

      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to fetch product history" });
        }
      } else {
        res.status(500).json({ error: "Failed to fetch product history" });
      }
    }
  });

  // Get purchases history for Stock In tab
  app.get("/api/purchases-history", async (req: Request, res: Response) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { productId, month, year, page = 1, limit = 10 } = req.query;

      // Build query parameters for purchases history
      const queryParams = new URLSearchParams({
        productId: productId as string,
        ...(month && { month: month as string }),
        ...(year && { year: year as string }),
        page: page as string,
        limit: limit as string,
      });

      const endpoint = `/history/product/purchases/${productId}?${queryParams.toString()}`;

      const data = await makePointifyRequest(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Purchases history response:", JSON.stringify(data, null, 2));
      res.json(data);
    } catch (error) {
      console.error("Purchases history error:", error);
      const status = (error as any).status || 500;
      res.status(status).json({ error: "Failed to fetch purchases history" });
    }
  });

  // Get stock out movements for Stock Out tab
  app.get("/api/stock-out-movements", async (req: Request, res: Response) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { productId, month, year, page = 1, limit = 10 } = req.query;

      // Build query parameters for stock out movements
      const queryParams = new URLSearchParams({
        productId: productId as string,
        ...(month && { month: month as string }),
        ...(year && { year: year as string }),
        page: page as string,
        limit: limit as string,
      });

      const endpoint = `/history/product/stock-out/${productId}?${queryParams.toString()}`;

      const data = await makePointifyRequest(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Stock out movements response:", JSON.stringify(data, null, 2));
      res.json(data);
    } catch (error) {
      console.error("Stock out movements error:", error);
      const status = (error as any).status || 500;
      res.status(status).json({ error: "Failed to fetch stock out movements" });
    }
  });

  // Get bad stock movements for Bad Stock tab
  app.get("/api/bad-stock-movements", async (req: Request, res: Response) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { productId, month, year, page = 1, limit = 10 } = req.query;

      // Build query parameters for bad stock movements
      const queryParams = new URLSearchParams({
        product: productId as string,
        page: page as string,
        limit: limit as string,
        ...(month && { month: month as string }),
        ...(year && { year: year as string }),
      });

      const endpoint = `/badstock?${queryParams.toString()}`;

      const data = await makePointifyRequest(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Bad stock movements response:", JSON.stringify(data, null, 2));
      res.json(data);
    } catch (error) {
      console.error("Bad stock movements error:", error);
      const status = (error as any).status || 500;
      res.status(status).json({ error: "Failed to fetch bad stock movements" });
    }
  });

  // Bulk import products
  app.post("/api/product/import/products", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }
      const { products } = req.body;
      if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ error: "products array is required" });
      }
      const data = await makePointifyRequest("/product/import/products", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ products }),
      });
      res.json(data);
    } catch (error) {
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;
      if (responseBody) {
        try {
          res.status(status).json(JSON.parse(responseBody));
        } catch {
          res.status(status).json({ error: "Failed to import products" });
        }
      } else {
        res.status(500).json({ error: "Failed to import products" });
      }
    }
  });

  // Bulk delete products
  app.delete("/api/product/bulk/delete", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "ids array is required" });
      }
      const data = await makePointifyRequest("/product/bulk/delete", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
      });
      res.json(data);
    } catch (error) {
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;
      if (responseBody) {
        try {
          res.status(status).json(JSON.parse(responseBody));
        } catch {
          res.status(status).json({ error: "Failed to bulk delete products" });
        }
      } else {
        res.status(500).json({ error: "Failed to bulk delete products" });
      }
    }
  });

  // Delete product
  app.delete("/api/product/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { id } = req.params;
      const data = await makePointifyRequest(`/product/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
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
          res.status(status).json({ error: "Failed to delete product" });
        }
      } else {
        res.status(500).json({ error: "Failed to delete product" });
      }
    }
  });

  // Get suppliers
  app.get("/api/supplier", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const shopId = req.query.shopId;
      if (!shopId) {
        return res.status(400).json({ error: "shopId parameter is required" });
      }

      const data = await makePointifyRequest(`/suppliers?shopId=${shopId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      res.json(data);
    } catch (error) {
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;

      console.error(`Error fetching suppliers:`, error);

      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to fetch suppliers" });
        }
      } else {
        res.status(500).json({ error: "Failed to fetch suppliers" });
      }
    }
  });

  // Create new supplier
  app.post("/api/supplier", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { name, shopId, phoneNumber } = req.body;

      if (!name || !shopId || !phoneNumber) {
        return res.status(400).json({
          error:
            "Missing required fields: name, shopId, and phoneNumber are required",
        });
      }

      const data = await makePointifyRequest(`/suppliers`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          shopId,
          phoneNumber,
        }),
      });

      res.json(data);
    } catch (error) {
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;

      console.error(`Error creating supplier:`, error);

      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to create supplier" });
        }
      } else {
        res.status(500).json({ error: "Failed to create supplier" });
      }
    }
  });

  // =============================================================================
  // PRODUCT TRANSFER ROUTES
  // =============================================================================

  // Transfer products between shops
  app.post("/api/transfer/shop/transfer", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      console.log(
        "Product transfer request:",
        JSON.stringify(req.body, null, 2),
      );

      const data = await makePointifyRequest("/transfer/shop/transfer", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(req.body),
      });

      console.log("Product transfer response:", JSON.stringify(data, null, 2));
      res.json(data);
    } catch (error) {
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;

      console.error("Product transfer error:", error);

      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to transfer products" });
        }
      } else {
        res.status(500).json({ error: "Failed to transfer products" });
      }
    }
  });

  // =============================================================================
  // STOCK ADJUSTMENT ROUTES
  // =============================================================================

  // Adjust product stock
  app.put("/api/product/adjust/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { id } = req.params;
      const { type, quantity, useWarehouse, shop, product, before } = req.body;

      console.log("Received payload:", JSON.stringify(req.body, null, 2));
      console.log("Extracted fields:", {
        type,
        quantity,
        useWarehouse,
        shop,
        product,
        before,
      });

      if (!type || quantity === undefined || !shop || !product) {
        return res.status(400).json({
          error:
            "Missing required fields: type, quantity, shop, and product are required",
        });
      }

      console.log("Stock adjustment request:", {
        id,
        type,
        quantity,
        useWarehouse,
        shop,
        product,
        before,
      });

      // Forward the payload directly to Pointify API
      const data = await makePointifyRequest(`/product/adjust/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type,
          quantity,
          useWarehouse,
          shop,
          product,
          before,
        }),
      });

      console.log("Stock adjustment response:", JSON.stringify(data, null, 2));
      res.json(data);
    } catch (error) {
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;

      console.error("Stock adjustment error:", error);

      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res.status(status).json({ error: "Failed to adjust stock" });
        }
      } else {
        res.status(500).json({ error: "Failed to adjust stock" });
      }
    }
  });

  // Get product adjustment history
  app.get("/api/product/adjust/history/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { id } = req.params;
      const { page = 1, limit = 10, shopId, fromDate, toDate, type } = req.query;

      const queryParams = new URLSearchParams({
        page: page as string,
        limit: limit as string,
        ...(shopId && { shop: shopId as string }),
        ...(fromDate && { fromDate: fromDate as string }),
        ...(toDate && { toDate: toDate as string }),
        ...(type && { type: type as string }),
      });

      const endpoint = `/product/adjust/${id}?${queryParams.toString()}`;
      console.log("Adjustment history endpoint:", endpoint);

      const data = await makePointifyRequest(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log(
        "Adjustment history response:",
        JSON.stringify(data, null, 2),
      );
      res.json(data);
    } catch (error) {
      const status = (error as any).status || 500;
      const responseBody = (error as any).responseBody;

      console.error("Adjustment history error:", error);

      if (responseBody) {
        try {
          const errorData = JSON.parse(responseBody);
          res.status(status).json(errorData);
        } catch {
          res
            .status(status)
            .json({ error: "Failed to fetch adjustment history" });
        }
      } else {
        res.status(500).json({ error: "Failed to fetch adjustment history" });
      }
    }
  });
}

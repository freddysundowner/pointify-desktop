import { Express, Request, Response } from "express";
import { makePointifyRequest } from "../config.js";

export function registerCashflowRoutes(app: Express) {
  // Get cashflow transactions with date filtering and attendant filtering
  app.get("/api/cashflow", async (req: Request, res: Response) => {
    try {
      const { shop, startDate, endDate, attendantId } = req.query;
      
      if (!shop) {
        return res.status(400).json({ error: "Shop ID is required" });
      }

      // Build query parameters for Pointify API
      const params = new URLSearchParams({
        shop: shop as string,
      });
      
      if (startDate) {
        params.append('startDate', startDate as string);
      }
      
      if (endDate) {
        params.append('endDate', endDate as string);
      }
      
      if (attendantId) {
        params.append('attendantId', attendantId as string);
      }

      // First try to get summary data with paymentType=deposit
      const summaryParams = new URLSearchParams(params);
      summaryParams.append('paymentType', 'deposit');

      console.log(`Fetching cashflow summary from: /cashflow/shop/cashflow?${summaryParams.toString()}`);

      const result = await makePointifyRequest(`/cashflow/shop/cashflow?${summaryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      console.log('Cashflow summary fetched:', result);
      res.json(result);


    } catch (error) {
      console.error('Error fetching cashflow transactions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create cashflow transaction
  app.post("/api/cashflow", async (req: Request, res: Response) => {
    try {
      const { name, amount, category, attendantId, shopId } = req.body;

      // Validate required fields
      if (!name || !amount || !category || !attendantId || !shopId) {
        return res.status(400).json({ 
          error: "Missing required fields: name, amount, category, attendantId, shopId" 
        });
      }

      const payload = {
        name,
        amount: parseFloat(amount),
        category,
        attendantId,
        shopId
      };

      console.log('Creating cashflow transaction with payload:', payload);

      const result = await makePointifyRequest('/cashflow/', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      res.json(result);
    } catch (error: any) {
      console.error('Error creating cashflow transaction:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to create cashflow transaction' 
      });
    }
  });
}
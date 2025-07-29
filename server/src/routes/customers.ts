import type { Express } from "express";
import { makePointifyRequest } from "../config.js";

// Authentication middleware to extract token from Authorization header
const extractToken = (req: any) => {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
};

// Helper function to fetch customer data
const getCustomers = async (token: string, shopId: string, adminid: string) => {
  return await makePointifyRequest(`/customers?adminid=${adminid}&shopId=${shopId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
};

export function registerCustomerRoutes(app: Express) {
  // =============================================================================
  // CUSTOMER MANAGEMENT ROUTES
  // =============================================================================
  
  // Get customer analysis data
  app.get('/api/customers/analysis/:shopId', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { shopId } = req.params;
      const adminid = req.query.adminid as string;
      
      // Get customer data for analysis
      const data:any = await getCustomers(token, shopId, adminid);
      const customerList = Array.isArray(data) ? data : data?.customers || data?.data || [];
      

      
      // Calculate analysis metrics
      const totalCustomers = customerList.length;
      const totalWalletBalance = customerList.reduce((sum, c) => sum + (c.wallet || 0), 0);
      // Use wallet field when balance is not available, negative wallet means debt
      const totalOutstanding = customerList.reduce((sum, c) => {
        const balance = c.balance || 0;
        const walletDebt = c.wallet < 0 ? Math.abs(c.wallet) : 0;
        return sum + Math.abs(balance) + walletDebt;
      }, 0);
      const avgOutstandingPerCustomer = totalCustomers > 0 ? (totalOutstanding / totalCustomers) : 0;
      

      
      // Get top debtors - include customers with negative wallet balances
      const topDebtors = customerList
        .filter(c => (c.balance && Math.abs(c.balance) > 0) || (c.wallet < 0))
        .sort((a, b) => {
          const aDebt = Math.abs(a.balance || 0) + (a.wallet < 0 ? Math.abs(a.wallet) : 0);
          const bDebt = Math.abs(b.balance || 0) + (b.wallet < 0 ? Math.abs(b.wallet) : 0);
          return bDebt - aDebt;
        })
        .slice(0, 5)
        .map(c => ({
          name: c.name,
          phonenumber: c.phonenumber || c.phone,
          totalOutstanding: Math.abs(c.balance || 0) + (c.wallet < 0 ? Math.abs(c.wallet) : 0),
          totalSpent: c.totalPurchases || 0
        }));
      
      const analysisData = {
        shopId: shopId,
        totalCustomers,
        totalWalletBalance,
        totalOutstanding,
        avgOutstandingPerCustomer: avgOutstandingPerCustomer.toFixed(2),
        topDebtors
      };
      
      res.json(analysisData);
    } catch (error) {
      console.error('Customer analysis error:', error);
      res.status(500).json({ error: "Failed to fetch customer analysis" });
    }
  });

  // Get overdue customers
  app.get('/api/customers/overdue/:shopId', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { shopId } = req.params;
      console.log('token:', token);
      
      // Call the external Pointify API directly
      const overdueData = await makePointifyRequest(`/customers/overdue/${shopId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      
      // Transform the external API response to match UI expectations
      if (Array.isArray(overdueData)) {
        const today = new Date();
        
        // Transform each customer to match UI expectations
        const transformedCustomers = overdueData.map(customer => {
          const latestDueDate = new Date(customer.latestDue);
          const daysOverdue = Math.max(0, Math.floor((today.getTime() - latestDueDate.getTime()) / (1000 * 60 * 60 * 24)));
          
          return {
            customerId: customer.customerId,
            name: customer.name,
            phonenumber: customer.phonenumber,
            totalOverdue: Math.abs(customer.totalOverdue), // Make positive for display
            daysOverdue: daysOverdue,
            dueCount: customer.dueCount,
            latestDue: customer.latestDue
          };
        });
        
        // Calculate totals
        const totalOverdueAmount = transformedCustomers.reduce((sum, customer) => sum + customer.totalOverdue, 0);
        
        const formattedResponse = {
          shopId: shopId,
          totalOverdueCustomers: transformedCustomers.length,
          totalOverdueAmount: totalOverdueAmount,
          overdueCustomers: transformedCustomers
        };
        
        res.json(formattedResponse);
      } else {
        // If not an array, return as-is
        res.json(overdueData);
      }
    } catch (error) {
      console.error('Overdue customers error:', error);
      res.status(500).json({ error: "Failed to fetch overdue customers" });
    }
  });

  // Get customer debtors Excel export
  app.get("/customers/customers/debtors/excel", async (req: any, res: any) => {
    try {
      const { shopId } = req.query;
      
      if (!shopId) {
        return res.status(400).json({ 
          error: "shopId is required" 
        });
      }

      console.log(`Getting debtors Excel for shop: ${shopId}`);

      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: "No authorization token provided" });
      }

      // Call external API for Excel export
      const response = await makePointifyRequest(`/customers/customers/debtors/excel?shopId=${shopId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Debtors Excel API response type:', typeof response);

      // If response is a blob (Excel file), handle it properly
      if (response && response instanceof Blob) {
        const buffer = Buffer.from(await response.arrayBuffer());
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="debtors-report-${new Date().toISOString().split('T')[0]}.xlsx"`);
        res.send(buffer);
      } else {
        // If it's a regular response, send as JSON
        res.json(response);
      }

    } catch (error: any) {
      console.error('Debtors Excel API Error:', error);
      res.status(500).json({ 
        error: "Failed to fetch debtors Excel data",
        details: error.message 
      });
    }
  });

  // Get customer debtors
  app.get("/api/customers/debtors", async (req: any, res: any) => {
    try {
      const { shopId, adminid, page, limit } = req.query;
      
      if (!shopId || !adminid) {
        return res.status(400).json({ 
          error: "shopId and adminid are required" 
        });
      }

      console.log(`Getting debtors for shop: ${shopId}, admin: ${adminid}`);

      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: "No authorization token provided" });
      }

      // Build query string with pagination parameters
      let queryString = `shopId=${shopId}`;
      if (page) queryString += `&page=${page}`;
      if (limit) queryString += `&limit=${limit}`;

      const response: any = await makePointifyRequest(`/customers/customers/debtors?${queryString}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Handle the response structure based on what the API returns
      if (response && typeof response === 'object') {
        // If response is already formatted correctly
        if (response.debtors && Array.isArray(response.debtors)) {
          return res.json(response);
        }
        
        // If response is an array of debtors
        if (Array.isArray(response)) {
          const totalDebtAmount = response.reduce((sum: number, debtor: any) => {
            return sum + Math.abs(debtor.wallet || debtor.totalOutstanding || 0);
          }, 0);

          return res.json({
            shopId: shopId,
            totalDebtors: response.length,
            totalDebtAmount: totalDebtAmount,
            debtors: response
          });
        }

        // If response has data property
        if (response.data && Array.isArray(response.data)) {
          const totalDebtAmount = response.data.reduce((sum: number, debtor: any) => {
            return sum + Math.abs(debtor.wallet || debtor.totalOutstanding || 0);
          }, 0);

          return res.json({
            shopId: shopId,
            total: response.total || totalDebtAmount,
            totalDebtors: response.data.length,
            totalDebtAmount: totalDebtAmount,
            debtors: response.data
          });
        }
      }

      // Fallback if response structure is unexpected
      return res.json({
        shopId: shopId,
        totalDebtors: 0,
        totalDebtAmount: 0,
        debtors: []
      });

    } catch (error: any) {
      console.error('Debtors API Error:', error);
      res.status(500).json({ 
        error: "Failed to fetch debtors data",
        details: error.message 
      });
    }
  });

  // Get customers
  app.get("/api/customers", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { shopId, adminid } = req.query;
      
        // Use cached data if both shopId and adminid are provided
        let data: any = await makePointifyRequest(`/customers?shopId=${shopId}&adminid=${adminid}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (data && data.data && Array.isArray(data.data)) {
          data = data.data;
        }
        
        res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  // Get single customer
  app.get("/api/customers/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { id } = req.params;
      const data = await makePointifyRequest(`/customers/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  // Create customer
  app.post("/api/customers", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      // Log the incoming request body for debugging
      console.log('Customer creation request body:', {
        body: JSON.stringify(req.body)
      });

      // Validate that name is not empty
      if (!req.body.name || req.body.name.trim() === '') {
        return res.status(400).json({ error: "Customer name is required" });
      }

      // Ensure required fields are present and properly formatted
      const customerPayload: any = {
        name: req.body.name.trim(),
        phonenumber: req.body.phonenumber || req.body.phone || '',
        email: req.body.email || '',
        address: req.body.address || '',
        wallet: Number(req.body.wallet) || 0,
        shopId: req.body.shopId,
        adminid: req.body.adminid
      };

      // Only include optional fields if they have values
      if (req.body.type) customerPayload.type = req.body.type;
      if (req.body.creditLimit) customerPayload.creditLimit = req.body.creditLimit;

      const data = await makePointifyRequest("/customers", {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(customerPayload)
      });
      
      res.json(data);
    } catch (error) {
      console.error('Customer creation error:', error);
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  // Update customer
  app.put("/api/customers/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { id } = req.params;
      const data = await makePointifyRequest(`/customers/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(req.body)
      });
      
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  // Delete customer
  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { id } = req.params;
      const data = await makePointifyRequest(`/customers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  // Get customer payment history
  app.get("/api/customers/payments/:id", async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: "Authorization token required" });
      }

      const { id } = req.params;
      const { type = 'all' } = req.query;
      
      // Build query parameters for external API
      const queryParams = new URLSearchParams({
        type: type as string
      });
      
      const endpoint = `/customers/payments/${id}?${queryParams.toString()}`;
      
      const data = await makePointifyRequest(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      res.json(data);
    } catch (error) {
      console.error('Customer payments API error:', error);
      res.status(500).json({ error: "Failed to fetch customer payments" });
    }
  });
}
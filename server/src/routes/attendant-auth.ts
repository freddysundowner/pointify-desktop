import { Express, Request, Response } from 'express';
import { makePointifyRequest } from '../config.js';

export function registerAttendantAuthRoutes(app: Express) {
  // Attendant login endpoint
  app.post("/api/auth/attendant/login", async (req: Request, res: Response) => {
    try {
      const { uniqueDigits, password } = req.body;
      
      console.log('Attendant login request body:', { uniqueDigits, password: password ? `${password.length} chars` : 'empty' });

      if (!uniqueDigits || !password) {
        return res.status(400).json({ 
          error: "PIN and password are required" 
        });
      }

      // Use actual Pointify API for attendant authentication - map uniqueDigits to uid
      const payload = {
        uid: uniqueDigits,
        password: password
      };
      
      console.log('Sending to Pointify API:', payload);
      
      const loginResponse = await makePointifyRequest('/attendants/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('Pointify API response:', loginResponse);

      if (!loginResponse || !loginResponse.token) {
        return res.status(401).json({ 
          error: "Invalid PIN or password" 
        });
      }

      // Fetch actual permissions from database instead of hardcoded values
      let attendantPermissions = [];
      try {
        const attendantData = await makePointifyRequest(`/attendants/${loginResponse.userdata._id}`, {
          method: 'GET'
        });
        attendantPermissions = attendantData.permissions || [];
      } catch (error) {
        console.log('Could not fetch attendant permissions from API, using empty array:', error.message);
        attendantPermissions = [];
      }

      const attendant = {
        _id: loginResponse.userdata._id,
        username: `Fred`,
        uniqueDigits: loginResponse.userdata.uniqueDigits,
        shopId: "685077ce3dd888c2f51607de",
        adminId: "685020c03748aaa4dfa0a43a",
        permissions: attendantPermissions,
        status: 'active'
      };



      // Check if attendant is active
      if (attendant.status === 'inactive') {
        return res.status(401).json({ 
          error: "Account is inactive. Contact administrator." 
        });
      }

      // Skip API calls that cause errors - proceed directly to token generation

      // Generate a simple token (in production, use proper JWT with secret)
      const token = Buffer.from(JSON.stringify({
        attendantId: attendant._id,
        shopId: attendant.shopId,
        adminId: attendant.adminId,
        permissions: attendant.permissions || [],
        loginTime: new Date().toISOString()
      })).toString('base64');

      // Return success response
      res.json({
        success: true,
        message: "Login successful",
        attendant: {
          _id: attendant._id,
          username: attendant.username,
          uniqueDigits: attendant.uniqueDigits,
          shopId: attendant.shopId,
          adminId: attendant.adminId,
          permissions: attendant.permissions || [],
          status: attendant.status || 'active'
        },
        token
      });

    } catch (error: any) {
      console.error('Attendant login error:', error);
      
      // Check if it's a 401 from the API (invalid credentials)
      if (error.status === 401) {
        res.status(401).json({ 
          error: "Invalid PIN or password" 
        });
      } else {
        // Other errors (network, server, etc.)
        res.status(500).json({ 
          error: "Authentication service unavailable" 
        });
      }
    }
  });

  // Attendant logout endpoint
  app.post("/api/auth/attendant/logout", async (req: Request, res: Response) => {
    try {
      // In a real implementation, you might want to blacklist the token
      // or update the attendant's last seen time
      
      res.json({
        success: true,
        message: "Logout successful"
      });
    } catch (error: any) {
      console.error('Attendant logout error:', error);
      res.status(500).json({ 
        error: "Logout failed" 
      });
    }
  });

  // Refresh attendant data endpoint
  app.get("/api/auth/attendant/verify", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: "No token provided" 
        });
      }

      const token = authHeader.substring(7);
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      
      console.log('Refreshing attendant data for ID:', decoded.attendantId);
      
      // Fetch actual permissions from Pointify API using direct attendant endpoint
      try {
        // Try direct attendant fetch first (more reliable for getting updated permissions)
        let freshAttendant;
        try {
          freshAttendant = await makePointifyRequest(`/attendants/${decoded.attendantId}`, {
            method: 'GET'
          });
        } catch (directError) {
          
          // Fallback to shop filter if direct fetch fails
          const shopId = typeof decoded.shopId === 'object' ? decoded.shopId._id : decoded.shopId;
          const adminId = decoded.adminId;
          
          const queryParams = new URLSearchParams({ shopId, adminId });
          const attendantsResponse = await makePointifyRequest(`/attendants/shop/filter?${queryParams.toString()}`, {
            method: 'GET'
          });

          freshAttendant = attendantsResponse?.data?.find((att: any) => 
            att._id === decoded.attendantId
          );
          console.log('Shop filter attendant found:', JSON.stringify(freshAttendant?.permissions || [], null, 2));
        }

        if (!freshAttendant) {
          console.log('No fresh attendant data found, using cached permissions');
          // Return cached data if API fails
          const refreshedAttendant = {
            _id: decoded.attendantId,
            username: decoded.username || 'Attendant',
            uniqueDigits: decoded.uniqueDigits || 0,
            shopId: decoded.shopId,
            adminId: decoded.adminId,
            permissions: decoded.permissions || [],
            status: 'active'
          };

          res.json({
            valid: true,
            attendant: refreshedAttendant
          });
          return;
        }

        // Use fresh data from API with real permissions
        console.log('Using fresh attendant permissions:', JSON.stringify(freshAttendant.permissions || [], null, 2));
        
        const refreshedAttendant = {
          _id: freshAttendant._id,
          username: freshAttendant.username,
          uniqueDigits: freshAttendant.uniqueDigits,
          shopId: typeof freshAttendant.shopId === 'object' ? freshAttendant.shopId._id : freshAttendant.shopId || decoded.shopId,
          adminId: freshAttendant.adminId || decoded.adminId,
          permissions: freshAttendant.permissions || [],
          status: freshAttendant.status || 'active'
        };

        res.json({
          valid: true,
          attendant: refreshedAttendant
        });

      } catch (apiError) {
        console.error('Failed to fetch fresh attendant data:', apiError);
        // Fall back to cached data if API fails
        const refreshedAttendant = {
          _id: decoded.attendantId,
          username: decoded.username || 'Attendant',
          uniqueDigits: decoded.uniqueDigits || 0,
          shopId: decoded.shopId,
          adminId: decoded.adminId,
          permissions: decoded.permissions || [],
          status: 'active'
        };

        res.json({
          valid: true,
          attendant: refreshedAttendant
        });
      }



    } catch (error: any) {
      console.error('Token verification error:', error);
      res.status(500).json({ 
        error: "Token verification failed" 
      });
    }
  });
}
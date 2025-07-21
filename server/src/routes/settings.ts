import type { Express } from "express";
import { makePointifyRequest, setGlobalApiMode, getGlobalApiMode, makeLocalPointifyRequest } from "../config.js";
import { stopSyncTimer, startSyncTimer } from "../network-status-handler.js";


export function registerSettingsRoutes(app: Express) {
  // Get current settings (calls first reachable API and uses that response)
  app.get("/api/settings", async (req, res) => {
    try {
      const adminId = req.query.adminId as string;
      if (!adminId) {
        return res.status(400).json({ error: "adminId query parameter is required" });
      }

      console.log(`🔧 Fetching admin settings for: ${adminId}`);

      // Use existing makePointifyRequest method to call first reachable API
      const adminData = await makeLocalPointifyRequest(`/auth/admin/${adminId}`, {
        method: "GET",
      });

      console.log(`📊 Admin data received:`, adminData);

      // Get API mode from local storage first, then external API, then default
      const apiMode = adminData?.status || 'hybrid';
      setGlobalApiMode(apiMode);
      
      // Transform admin data to settings format
      const settings = {
        apiMode: apiMode, // 'online', 'offline', 'hybrid'
        onlineApiUrl: 'https://staging.pointifypos.com',
        localApiUrl: 'http://localhost:3000',
        syncEnabled: apiMode !== 'offline',
        syncInterval: adminData?.syncInterval,
        adminId: adminId,
        autoPrint: adminData?.autoPrint || true,
        currentStatus: apiMode
      };

      console.log(`⚙️ Settings response:`, settings);

      res.json({
        success: true,
        data: settings,
        message: "Settings retrieved successfully"
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      // Return default settings if both APIs fail
      const defaultSyncInterval = 120000; // 2 minutes default
      res.json({
        success: true,
        data: {
          apiMode: 'hybrid',
          onlineApiUrl: 'https://staging.pointifypos.com',
          localApiUrl: 'http://localhost:3000',
          syncEnabled: true,
        autoPrint:  true,
          syncInterval: defaultSyncInterval,
          adminId: req.query.adminId as string,
          currentStatus: 'hybrid'
        },
        message: "Default settings returned (both APIs unavailable)"
      });
    }
  });

  // Update settings (calls :3000/admin/update)
  app.put("/api/settings", async (req, res) => {
    try {
      const { adminId, apiMode, syncInterval } = req.body;
      console.log( req.body)
      
      if (!adminId || !apiMode) {
        return res.status(400).json({ 
          success: false,
          error: "adminId and apiMode are required" 
        });
      }

      if (!['online', 'offline', 'hybrid'].includes(apiMode)) {
        return res.status(400).json({ 
          success: false,
          error: "apiMode must be 'online', 'offline', or 'hybrid'" 
        });
      }

      // Validate sync interval if provided
      const finalSyncInterval = syncInterval || 120000; // Default to 2 minutes
      if (syncInterval && (typeof syncInterval !== 'number')) {
        return res.status(400).json({ 
          success: false,
          error: "syncInterval must be a number" 
        });
      }

      console.log(`🔧 Updating admin ${adminId} status to: ${apiMode}, syncInterval: ${finalSyncInterval}ms`);

      // Store both sync interval and API mode in memory
      let data = await makeLocalPointifyRequest(`/admin/${adminId}`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
        }, 
        body: JSON.stringify({
          syncInterval: finalSyncInterval,
          status: apiMode
        })
      });
      // syncIntervalStorage.set(adminId, finalSyncInterval);
      // apiModeStorage.set(adminId, apiMode);

      // Update global API mode first
      setGlobalApiMode(apiMode);


      // Handle sync timer based on mode
      if (apiMode === 'offline') {
        console.log('🔄 Stopping sync timer for offline mode');
        stopSyncTimer();
      } else {
        console.log(`🔄 Starting sync timer for online/hybrid mode with interval: ${data?.syncInterval}min`);
        startSyncTimer(data?.syncInterval * 60 * 1000 || 120000);
      }

      // Return success response
      res.json({
        success: true,
        data: {
          apiMode: apiMode,
          onlineApiUrl: 'https://staging.pointifypos.com',
          localApiUrl: 'http://localhost:3000',
          syncEnabled: apiMode !== 'offline',
          syncInterval: finalSyncInterval,
          adminId: adminId,
          currentStatus: apiMode,
          updated: true
        },
        message: `Settings updated successfully - API mode set to ${apiMode}, sync interval: ${finalSyncInterval}ms`
      });

    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update settings",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get current API mode status
  app.get("/api/settings/status", async (req, res) => {
    try {
      const adminId = req.query.adminId as string;
      if (!adminId) {
        return res.status(400).json({ error: "adminId query parameter is required" });
      }

      console.log(`🔍 Fetching status for admin: ${adminId}`);

      // Call auth/admin/:id to get current status from both APIs
      const adminData = await makePointifyRequest(`/auth/admin/${adminId}`, {
        method: "GET",
      });

      console.log(`📊 Admin status data:`, adminData);

      res.json({
        success: true,
        data: {
          apiMode: adminData?.status || 'hybrid',
          syncEnabled: adminData?.status !== 'offline',
          adminId: adminId
        },
        message: "Status retrieved successfully"
      });
    } catch (error) {
      console.error("Error fetching status:", error);
      res.json({
        success: true,
        data: {
          apiMode: 'hybrid',
          syncEnabled: true,
          adminId: adminId
        },
        message: "Default status returned (API unavailable)"
      });
    }
  });
}
import type { Express } from "express";
import { registerAuthRoutes } from "./auth.js";
import { registerProductRoutes } from "./products.js";
import { registerAnalyticsRoutes } from "./analytics.js";
import { registerCustomerRoutes } from "./customers.js";
import { registerShopRoutes } from "./shops.js";
import { registerStockRoutes } from "./stock.js";
import { registerSalesRoutes } from "./sales.js";
import { registerAttendantRoutes } from "./attendants.js";
import { registerAttendantAuthRoutes } from "./attendant-auth.js";
import { registerPurchaseRoutes } from "./purchases.js";
import { registerSupplierRoutes } from "./suppliers.js";
import { registerExpenseCategoryRoutes } from "./expense-categories.js";
import { registerExpenseRoutes } from "./expenses.js";
import { registerCashflowCategoryRoutes } from "./cashflow-categories.js";
import { registerCashflowRoutes } from "./cashflow.js";
import { registerPackageRoutes } from "./packages.js";
import { registerSubscriptionRoutes } from "./subscriptions.js";
import { registerPrinterRoutes } from "./printer.js";
import { registerSettingsRoutes } from "./settings.js";
import { registerInitsRoutes } from "./init.js";

import { isElectron } from "../config.js";



export function registerAllRoutes(app: Express) {
  // Register all route modules
  if (isElectron()) {
    registerInitsRoutes(app);
  }
  registerAuthRoutes(app);
  registerProductRoutes(app);
  registerAnalyticsRoutes(app);
  registerCustomerRoutes(app);
  registerShopRoutes(app);
  registerStockRoutes(app);
  registerSalesRoutes(app);
  registerAttendantRoutes(app);
  registerAttendantAuthRoutes(app);
  registerPurchaseRoutes(app);
  registerSupplierRoutes(app);
  registerExpenseCategoryRoutes(app);
  registerExpenseRoutes(app);
  registerCashflowCategoryRoutes(app);
  registerCashflowRoutes(app);
  registerPackageRoutes(app);
  registerSubscriptionRoutes(app);
  registerPrinterRoutes(app);
  registerSettingsRoutes(app);





  // Sync endpoint for offline mode preparation
  app.get("/api/sync/:id", async (req, res) => {
    // try {
    //   const adminId = req.params.id;
    //   console.log(`🔄 Starting external API sync for admin: ${adminId}`);

    //   const { makeOnlinePointifyRequest } = await import('../config');
    //   console.log('📡 Calling external API sync endpoint...');

    //   // Call the external API's sync/dump endpoint (this is the endpoint that goes with offline status)
    //   console.log(`📡 Making sync call to external API: /sync/dump`);
    //   const syncResult = await makeOnlinePointifyRequest(`/sync/dump`, {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({ adminId })
    //   });
    //   console.log('📡 External API sync response:', syncResult);

    //   if (!syncResult) {
    //     throw new Error('No sync response received from external API');
    //   }

    //   // Update admin status to "offline" in online database
    //   console.log('🔄 Updating admin status to offline in online database...');
    //   try {
    //     const { makeOnlinePointifyRequest } = await import('../config');
    //     await makeOnlinePointifyRequest(`/admin/${adminId}`, {
    //       method: 'PUT',
    //       headers: {
    //         'Content-Type': 'application/json',
    //       },
    //       body: JSON.stringify({ status: 'offline' })
    //     });
    //     console.log('✅ Admin status updated to offline in online database');
    //   } catch (statusError) {
    //     console.warn('⚠️ Failed to update admin status in online database:', statusError);
    //   }

    //   // Update admin status to "offline" in local database
    //   console.log('🔄 Updating admin status to offline in local database...');
    //   try {
    //     const { makeLocalPointifyRequest } = await import('../config');
    //     await makeLocalPointifyRequest(`/admin/${adminId}`, {
    //       method: 'PUT',
    //       headers: {
    //         'Content-Type': 'application/json',
    //       },
    //       body: JSON.stringify({ status: 'offline' })
    //     });
    //     console.log('✅ Admin status updated to offline in local database');
    //   } catch (localStatusError) {
    //     console.warn('⚠️ Failed to update admin status in local database:', localStatusError);
    //   }

    //   // Post the sync dump data to local /sync/dump endpoint with status offline
    //   if (syncResult.downloadUrl && syncResult.latestSyncTime) {
    //     console.log('📤 Posting sync dump data to local /sync/dump...');
    //     const dumpData = {
    //       downloadUrl: syncResult.downloadUrl,
    //       latestSyncTime: syncResult.latestSyncTime,
    //       id: adminId,
    //       status: 'offline'
    //     };

    //     try {
    //       // Make local POST request to /sync/dump using makeLocalPointifyRequest
    //       const { makeLocalPointifyRequest } = await import('../config');
    //       const dumpResponse = await makeLocalPointifyRequest('/sync/dump', {
    //         method: 'POST',
    //         headers: {
    //           'Content-Type': 'application/json',
    //         },
    //         body: JSON.stringify(dumpData)
    //       });
    //       console.log('📤 Local sync dump POST response:', dumpResponse);
    //     } catch (dumpError) {
    //       console.warn('⚠️ Failed to post sync dump data:', dumpError);
    //     }
    //   }

    //   console.log('🎉 External API sync completed successfully:', syncResult);

    //   res.json({ 
    //     success: true, 
    //     message: `External API sync completed for admin ${adminId}`,
    //     timestamp: new Date().toISOString(),
    //     syncResult
    //   });
    // } catch (error) {
    //   console.error('🚨 External API sync error:', error);
    //   res.status(500).json({ 
    //     error: 'Failed to sync data from external API',
    //     details: error instanceof Error ? error.message : 'Unknown error'
    //   });
    // }
  });



}
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
import { registerSmsRoutes } from "./sms.js";
import { registerPaymentRoutes } from "./payments.js";
import { registerSyncRoutes } from "./sync.js";
import { registerAiImportRoutes } from "./ai-import.js";

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
  registerSmsRoutes(app);
  registerPaymentRoutes(app);
  registerSyncRoutes(app);
  registerAiImportRoutes(app);

}
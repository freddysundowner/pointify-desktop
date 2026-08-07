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
import { registerSmsRoutes } from "./sms.js";
import { registerMpesaRoutes } from "./mpesa.js";
import { registerPaymentRoutes } from "./payments.js";
import { registerSyncRoutes } from "./sync.js";
import { registerAccompanimentRoutes } from "./accompaniments.js";
import { registerBookingRoutes } from "./bookings.js";
import { requireAuth } from "../middleware/require-auth.js";


export function registerAllRoutes(app: Express) {
  // Auth gates for route families that were historically unauthenticated
  // pass-throughs. Mounted before the route modules so they run first.
  // Deliberately NOT gated: login/register, attendant PIN login, /api/config,
  // network/health pings, printer routes (local hardware, used pre-auth on
  // the till), packages (public pricing), and payment confirmation polling
  // (/api/payment/*, /api/subscriptions GET happens while a subscription is
  // expired or during onboarding).
  app.use("/api/suppliers", requireAuth);
  app.use("/api/supplier", requireAuth); // legacy supplier endpoints in products.ts
  app.use("/api/purchases", requireAuth);
  app.use("/api/purchasereturns", requireAuth);
  app.use("/api/cashflow", requireAuth);
  app.use("/api/cashflow-categories", requireAuth);
  app.use("/api/settings", requireAuth);
  app.use("/api/sales/email-receipt", requireAuth); // local email handler had no check

  // Register all route modules
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
  registerMpesaRoutes(app);
  registerPaymentRoutes(app);
  registerSyncRoutes(app);
  registerAccompanimentRoutes(app);
  registerBookingRoutes(app);

}
import { Switch, Route, useLocation } from "wouter";
import { Component, lazy, Suspense, useEffect, type ReactNode } from "react";

import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { PwaInstallWidget } from "@/components/PwaInstallWidget";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { ProductsProvider } from "@/contexts/ProductsContext";
import { AttendantAuthProvider } from "@/contexts/AttendantAuthContext";
import { AttendantSessionChecker } from "@/components/AttendantSessionChecker";
import { AttendantLockScreen } from "@/components/AttendantLockScreen";
import { useAuth } from "@/features/auth/useAuth";

// Eagerly-loaded helpers — tiny and needed for routing/guards on first paint.
import PermissionsInit from "@/components/PermissionsInit";
import { AttendantRoute } from "@/components/AttendantRoute";
import AdminRouteHandler from "@/components/AdminRouteHandler";
import NotFound from "@/pages/not-found";

// Route components are lazy-loaded so the initial bundle stays small. Each
// import() becomes its own chunk, fetched only when its route is first visited.
const POS = lazy(() => import("@/features/pos/pos"));
const BusinessDashboard = lazy(() => import("@/features/dashboard/business-dashboard"));
const Login = lazy(() => import("@/features/auth/login"));
const BusinessLogin = lazy(() => import("@/features/auth/business-login"));
const Signup = lazy(() => import("@/features/auth/signup"));
const ForgotPassword = lazy(() => import("@/features/auth/forgot-password"));
const ResetPassword = lazy(() => import("@/features/auth/reset-password"));
const ShopSetup = lazy(() => import("@/features/shop/shop-setup"));
const ShopOnboarding = lazy(() => import("@/features/shop/shop-onboarding"));
const Shops = lazy(() => import("@/features/shop/shops"));
const ShopDetails = lazy(() => import("@/features/shop/shop-details"));
const StockProducts = lazy(() => import("@/features/inventory/stock-products"));
const ProductCategories = lazy(() => import("@/features/inventory/categories"));
const Bookings = lazy(() => import("@/features/bookings/bookings"));
const NewBooking = lazy(() => import("@/features/bookings/new-booking"));
const BookingsReport = lazy(() => import("@/features/bookings/bookings-report"));
const StockCount = lazy(() => import("@/features/shop/stock-count"));
const StockCountHistoryPage = lazy(() => import("@/pages/stock-count-history"));
const StockSummary = lazy(() => import("@/pages/stock-summary"));
const StockBadStock = lazy(() => import("@/features/inventory/stock-bad-stock"));
const StockTransfer = lazy(() => import("@/features/shop/stock-transfer"));
const ProductForm = lazy(() => import("@/features/inventory/product-form"));
const ProductHistory = lazy(() => import("@/features/inventory/product-history"));
const AdjustmentHistoryPage = lazy(() => import("@/pages/adjustment-history"));
const SalesList = lazy(() => import("@/features/sales/sales-list"));
const PendingOrders = lazy(() => import("@/pages/pending-orders"));
const ReturnsList = lazy(() => import("@/features/sales/returns-list"));
const ReceiptView = lazy(() => import("@/features/sales/receipt-view"));
const EditSale = lazy(() => import("@/features/sales/edit-sale"));
const ReturnSale = lazy(() => import("@/features/sales/return-sale"));
const DeleteSale = lazy(() => import("@/features/sales/delete-sale"));
const PurchasesList = lazy(() => import("@/features/purchases/purchases-list"));
const PurchaseOrderPage = lazy(() => import("@/pages/purchase-order"));
const ReturnPurchase = lazy(() => import("@/pages/return-purchase"));
const PurchaseReturns = lazy(() => import("@/pages/purchase-returns"));
const PurchaseReturnDetails = lazy(() => import("@/pages/purchase-return-details"));
const ReceivePurchase = lazy(() => import("@/features/purchases/receive-purchase"));
const CancelPurchase = lazy(() => import("@/features/purchases/cancel-purchase"));
const CreatePurchase = lazy(() => import("@/features/purchases/create-purchase"));
const Suppliers = lazy(() => import("@/features/suppliers/suppliers"));
const SupplierOverview = lazy(() => import("@/features/suppliers/supplier-overview"));
const Customers = lazy(() => import("@/features/customers/customers"));
const CustomerOverview = lazy(() => import("@/features/customers/customer-overview"));
const Expenses = lazy(() => import("@/features/expenses/expenses"));
const StaffPermissions = lazy(() => import("@/features/attendants/staff-permissions"));
const CashFlow = lazy(() => import("@/features/cashflow/cashflow"));
const ReportsHub = lazy(() => import("@/features/shop/reports"));
const IncomeReports = lazy(() => import("@/features/reports/income-reports"));
const NetProfitReport = lazy(() => import("@/features/reports/net-profit-report"));
const SalesReportPage = lazy(() => import("@/features/reports/sales-report"));
const ExpenseReportPage = lazy(() => import("@/features/reports/expense-report"));
const DueSalesPage = lazy(() => import("@/features/reports/due-sales"));
const PurchasesReportPage = lazy(() => import("@/features/reports/purchases-report"));
const AnalysisReportPage = lazy(() => import("@/features/reports/analysis-report"));
const ProfitAnalysis = lazy(() => import("@/features/reports/profit-analysis"));
const DiscountReports = lazy(() => import("@/features/reports/discount-reports"));
const StockReport = lazy(() => import("@/features/reports/stock-report"));
const ProductMovements = lazy(() => import("@/features/reports/product-movements"));
const ProductSalesReport = lazy(() => import("@/features/reports/product-sales-report"));
const SalesReturnsReport = lazy(() => import("@/features/reports/sales-returns-report"));
const PurchasesSummary = lazy(() => import("@/features/reports/purchases-summary"));
const SubscriptionPage = lazy(() => import("@/pages/subscription"));
const PaymentWaiting = lazy(() => import("@/pages/payment-waiting"));
const EditProfilePage = lazy(() => import("@/pages/edit-profile"));
const ExpenseCategories = lazy(() => import("@/pages/expense-categories"));
const CashflowCategories = lazy(() => import("@/pages/cashflow-categories"));
const ProfitLossPage = lazy(() => import("@/pages/profit-loss"));
const DebtorsPage = lazy(() => import("@/pages/debtors"));
const DebtPaymentsPage = lazy(() => import("@/pages/debt-payments"));
const PrinterConfigPage = lazy(() => import("@/pages/printer-config"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const SmsSettingsPage = lazy(() => import("@/pages/sms-settings"));
const AttendantsPage = lazy(() => import("@/features/attendants/attendants"));
const OrdersPage = lazy(() => import("@/pages/orders"));
const PurchasePaymentPage = lazy(() => import("@/pages/purchase-payment"));
const PurchaseViewPage = lazy(() => import("@/pages/purchase-view"));
const PurchaseEditPage = lazy(() => import("@/pages/purchase-edit"));
const SupplierHistoryPage = lazy(() => import("@/pages/supplier-history"));
const BulkCreateProducts = lazy(() => import("@/pages/bulk-create-products"));
const ImportProductsPage = lazy(() => import("@/pages/import-products"));
const AttendantLogin = lazy(() => import("@/pages/attendant-login"));
const AttendantDashboard = lazy(() => import("@/pages/attendant-dashboard"));

// Recovers from transient "Failed to fetch dynamically imported module" errors
// that can happen when a lazy chunk is missing (network blip or a stale service
// worker pointing at an old build). It reloads once to fetch the fresh chunks;
// a sessionStorage guard prevents an infinite reload loop.
class ChunkErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const isChunkError = /dynamically imported module|Importing a module script failed|ChunkLoadError|Failed to fetch/i.test(message);
    if (isChunkError && !sessionStorage.getItem("__chunk_reloaded__")) {
      sessionStorage.setItem("__chunk_reloaded__", "1");
      window.location.reload();
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <p className="text-gray-700 mb-4">Couldn't finish loading. Please refresh.</p>
            <button
              type="button"
              onClick={() => { sessionStorage.removeItem("__chunk_reloaded__"); window.location.reload(); }}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg"
              data-testid="button-reload-app"
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function FullScreenSpinner({ label }: { label?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
        {label ? <p className="text-gray-600">{label}</p> : null}
      </div>
    </div>
  );
}

function RedirectToStockProducts() {
  const [, navigate] = useLocation();
  useEffect(() => { navigate('/stock/products'); }, []);
  return null;
}

function AppContent() {
  const { isAuthenticated, isLoading, admin, serverError } = useAuth();
  const [, setLocation] = useLocation();
  const [location] = useLocation();

  // Dismiss the HTML splash screen the moment auth state is known.
  // The splash was kept alive (instead of removed on first rAF) so the
  // user never sees a white flash while isLoading is still true.
  useEffect(() => {
    if (!isLoading) {
      (window as any).__hideSplash?.();
    }
  }, [isLoading]);

  // Check if user has a primary shop from admin data
  const hasPrimaryShop = admin?.primaryShop;

  // Auto-route based on localStorage on initial load
  useEffect(() => {
    
    // Don't auto-redirect if user is already on attendant routes
    if (location.startsWith('/attendant/')) {
      return;
    }
    
    // Only check on initial load (root path)
    if (location === '/' && !isLoading) {
      const attendantData = localStorage.getItem('attendantData');
      const adminData = localStorage.getItem('adminData') || localStorage.getItem('authToken');
      
      if (attendantData) {
        // Attendant is logged in - check if they have can_sell permission
        try {
          const attendant = JSON.parse(attendantData);
          const hasCanSell = attendant.permissions?.some((p: any) => 
            p.key === 'pos' && p.value?.includes('can_sell')
          );
          
          if (hasCanSell) {
            setLocation('/attendant/pos');
          } else {
            setLocation('/attendant/dashboard');
          }
          return;
        } catch {
          setLocation('/attendant/dashboard');
          return;
        }
      }
      
      if (adminData && isAuthenticated) {
        // Admin is logged in - go to admin dashboard
        setLocation('/dashboard');
        return;
      }
      
      // No one is logged in - go to login selection
      if (!isAuthenticated && !attendantData) {
        setLocation('/login');
        return;
      }
    }
  }, [location, isLoading, isAuthenticated, setLocation]);

  // Redirect authenticated users without primary shop to onboarding
  // Only redirect if we have fresh data from the server (no server errors)
  useEffect(() => {
    if (isAuthenticated && !isLoading && admin && !hasPrimaryShop && !serverError) {
      setLocation('/onboarding');
    }
  }, [isAuthenticated, isLoading, admin, hasPrimaryShop, setLocation, serverError]);

  // Removed server error page - let app load normally even if API is down

  if (isLoading) {
    return <FullScreenSpinner label="Loading Pointify..." />;
  }

  return (
    <ChunkErrorBoundary>
    <Suspense fallback={<FullScreenSpinner />}>
    <Switch>
      {/* Attendant routes - always check first before admin auth */}
      <Route path="/attendant/login" component={AttendantLogin} />
      <Route path="/attendant/pos" component={POS} />
      <Route path="/attendant/dashboard">
        {() => (
          <AttendantRoute>
            <AttendantDashboard />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/products">
        {() => (
          <AttendantRoute>
            <StockProducts />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/sales">
        {() => (
          <AttendantRoute>
            <SalesList />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/pending-orders">
        {() => (
          <AttendantRoute>
            <PendingOrders />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/sales/return/:id">
        {() => (
          <AttendantRoute>
            <ReturnSale />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/receipt/:id">
        {() => (
          <AttendantRoute>
            <ReceiptView />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/sales/edit/:id">
        {() => (
          <AttendantRoute>
            <EditSale />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/customers">
        {() => (
          <AttendantRoute>
            <Customers />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/customer-overview">
        {() => (
          <AttendantRoute>
            <CustomerOverview />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/purchases">
        {() => (
          <AttendantRoute>
            <PurchasesList />
          </AttendantRoute>
        )}
      </Route>
      {/* /purchases/create */}
      <Route path="/attendant/purchases/create">
        {() => (
          <AttendantRoute>
            <CreatePurchase />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/purchases/view/:id">
        {() => (
          <AttendantRoute>
            <PurchaseViewPage />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/purchases/edit/:id">
        {() => (
          <AttendantRoute>
            <PurchaseEditPage />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/purchases/pay/:id">
        {() => (
          <AttendantRoute>
            <PurchasePaymentPage />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/purchases/return/:id">
        {() => (
          <AttendantRoute>
            <ReturnPurchase />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/purchases/returns">
        {() => (
          <AttendantRoute>
            <PurchaseReturns />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/purchase-return-details/:id">
        {() => (
          <AttendantRoute>
            <PurchaseReturnDetails />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/suppliers">
        {() => (
          <AttendantRoute>
            <Suppliers />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/supplier-history">
        {() => (
          <AttendantRoute>
            <SupplierHistoryPage />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/stock/summary">
        {() => (
          <AttendantRoute>
            <StockSummary />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/stock/count">
        {() => (
          <AttendantRoute>
            <StockCount />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/stock/count-history">
        {() => (
          <AttendantRoute>
            <StockCountHistoryPage />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/stock/transfer">
        {() => (
          <AttendantRoute>
            <StockTransfer />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/stock/bad-stock">
        {() => (
          <AttendantRoute>
            <StockBadStock />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/stock/add-product">
        {() => (
          <AttendantRoute>
            <ProductForm />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/stock/edit-product/:id">
        {() => (
          <AttendantRoute>
            <ProductForm />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/product/:id/history">
        {() => (
          <AttendantRoute>
            <ProductHistory />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/product/adjustment-history/:id">
        {() => (
          <AttendantRoute>
            <AdjustmentHistoryPage />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/expenses">
        {() => (
          <AttendantRoute>
            <Expenses />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/expense-categories">
        {() => (
          <AttendantRoute>
            <ExpenseCategories />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/cashflow">
        {() => (
          <AttendantRoute>
            <CashFlow />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/cashflow-categories">
        {() => (
          <AttendantRoute>
            <CashflowCategories />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/profit-analysis">
        {() => (
          <AttendantRoute>
            <ProfitAnalysis />
          </AttendantRoute>
        )}
      </Route>
      <Route path="/attendant/profit-loss">
        {() => (
          <AttendantRoute>
            <ProfitLossPage />
          </AttendantRoute>
        )}
      </Route>

      {isAuthenticated ? (
        hasPrimaryShop ? (
          <>
            <Route path="/" component={BusinessDashboard} />
            <Route path="/dashboard" component={BusinessDashboard} />
            <Route path="/pos" component={POS} />
            <Route path="/sales" component={SalesList} />
            <Route path="/pending-orders" component={PendingOrders} />
            <Route path="/returns" component={ReturnsList} />
            <Route path="/orders" component={OrdersPage} />
            <Route path="/receipt/:id" component={ReceiptView} />
            <Route path="/sales/edit/:id" component={EditSale} />
            <Route path="/sales/return/:id" component={ReturnSale} />
            <Route path="/sales/delete/:id" component={DeleteSale} />
            <Route path="/purchases" component={PurchasesList} />
            <Route path="/purchases/order" component={PurchaseOrderPage} />
            <Route path="/purchases/create" component={CreatePurchase} />
            <Route path="/purchases/view/:id" component={PurchaseViewPage} />
            <Route path="/purchases/edit/:id" component={PurchaseEditPage} />
            <Route path="/purchases/pay/:id" component={PurchasePaymentPage} />
            <Route path="/purchases/return/:id" component={ReturnPurchase} />
            <Route path="/purchase-returns" component={PurchaseReturns} />
            <Route path="/purchase-return-details/:id" component={PurchaseReturnDetails} />
            <Route path="/purchases/receive/:id" component={ReceivePurchase} />
            <Route path="/purchases/cancel/:id" component={CancelPurchase} />
            <Route path="/suppliers" component={Suppliers} />
            <Route path="/supplier-history" component={SupplierHistoryPage} />
            <Route path="/supplier-overview" component={SupplierOverview} />
            <Route path="/customers" component={Customers} />
            <Route path="/customer-overview" component={CustomerOverview} />
            <Route path="/expenses" component={Expenses} />
            <Route path="/expense-categories" component={ExpenseCategories} />
            <Route path="/attendants" component={AttendantsPage} />
            <Route path="/staff-permissions" component={StaffPermissions} />
            <Route path="/cashflow" component={CashFlow} />
            <Route path="/cashflow-categories" component={CashflowCategories} />
            <Route path="/reports" component={ReportsHub} />
            <Route path="/income-reports" component={IncomeReports} />
            <Route path="/net-profit-report" component={NetProfitReport} />
            <Route path="/sales-report" component={SalesReportPage} />
            <Route path="/expense-report" component={ExpenseReportPage} />
            <Route path="/due-sales" component={DueSalesPage} />
            <Route path="/purchases-report" component={PurchasesReportPage} />
            <Route path="/analysis-report" component={AnalysisReportPage} />
            <Route path="/profit-analysis" component={ProfitAnalysis} />
            <Route path="/profit-loss" component={ProfitLossPage} />
            <Route path="/debtors" component={DebtorsPage} />
            <Route path="/debt-payments" component={DebtPaymentsPage} />
            <Route path="/printer-config" component={PrinterConfigPage} />
            <Route path="/settings" component={SettingsPage} />
            <Route path="/sms-settings" component={SmsSettingsPage} />

            <Route path="/discount-reports" component={DiscountReports} />
            <Route path="/stock-report" component={StockReport} />
            <Route path="/product-movements" component={ProductMovements} />
            <Route path="/product-sales" component={ProductSalesReport} />
            <Route path="/sales-returns" component={SalesReturnsReport} />
            <Route path="/purchases-summary" component={PurchasesSummary} />
            <Route path="/shops" component={Shops} />
            <Route path="/shop/:id" component={ShopDetails} />
            <Route path="/shop-setup" component={ShopSetup} />
            <Route path="/shop/setup" component={ShopSetup} />
            <Route path="/stock/products" component={StockProducts} />
            <Route path="/stock/categories" component={ProductCategories} />
            <Route path="/bookings">{() => <Bookings view="bookings" />}</Route>
            <Route path="/rooms">{() => <Bookings view="rooms" />}</Route>
            <Route path="/bookings/new" component={NewBooking} />
            <Route path="/bookings/report" component={BookingsReport} />
            <Route path="/stock/import-products" component={ImportProductsPage} />
            <Route path="/stock/summary" component={StockSummary} />
            <Route path="/stock/count" component={StockCount} />
            <Route path="/stock/count-history" component={StockCountHistoryPage} />
            <Route path="/bulk-create-products" component={BulkCreateProducts} />
            <Route path="/stock/bad-stock" component={StockBadStock} />
            <Route path="/stock/transfer" component={StockTransfer} />
            <Route path="/stock/add-product" component={ProductForm} />
            <Route path="/stock/edit-product/:id" component={ProductForm} />
            <Route path="/product/:id/history" component={ProductHistory} />
            <Route path="/product/adjustment-history/:id" component={AdjustmentHistoryPage} />
            <Route path="/subscription/:id" component={SubscriptionPage} />
            <Route path="/subscription" component={SubscriptionPage} />
            <Route path="/payment-waiting" component={PaymentWaiting} />
            <Route path="/edit-profile" component={EditProfilePage} />
            {/* Legacy / mis-typed routes — redirect to correct paths */}
            <Route path="/products" component={RedirectToStockProducts} />
            <Route component={() => <BusinessDashboard />} />
          </>
        ) : (
          <>
            <Route path="/onboarding" component={ShopOnboarding} />
            <Route path="/shop-setup" component={ShopSetup} />
            <Route component={() => <ShopOnboarding />} />
          </>
        )
      ) : (
        <>
          {/* Attendant routes - always available */}
          <Route path="/attendant/login" component={AttendantLogin} />
          <Route path="/attendant/pos" component={POS} />
          <Route path="/attendant/dashboard">
            {() => (
              <AttendantRoute>
                <AttendantDashboard />
              </AttendantRoute>
            )}
          </Route>
          <Route path="/attendant/products">
            {() => (
              <AttendantRoute>
                <StockProducts />
              </AttendantRoute>
            )}
          </Route>
          <Route path="/attendant/customers">
            {() => (
              <AttendantRoute>
                <Customers />
              </AttendantRoute>
            )}
          </Route>
          <Route path="/attendant/sales">
            {() => (
              <AttendantRoute>
                <SalesList />
              </AttendantRoute>
            )}
          </Route>
          <Route path="/attendant/pending-orders">
            {() => (
              <AttendantRoute>
                <PendingOrders />
              </AttendantRoute>
            )}
          </Route>
          <Route path="/attendant/purchases">
            {() => (
              <AttendantRoute>
                <PurchasesList />
              </AttendantRoute>
            )}
          </Route>
          <Route path="/attendant/suppliers">
            {() => (
              <AttendantRoute>
                <Suppliers />
              </AttendantRoute>
            )}
          </Route>
          <Route path="/attendant/stock-count">
            {() => (
              <AttendantRoute>
                <StockCount />
              </AttendantRoute>
            )}
          </Route>
          <Route path="/attendant/stock-transfer">
            {() => (
              <AttendantRoute>
                <StockTransfer />
              </AttendantRoute>
            )}
          </Route>
          <Route path="/attendant/expenses">
            {() => (
              <AttendantRoute>
                <Expenses />
              </AttendantRoute>
            )}
          </Route>
          <Route path="/attendant/cashflow">
            {() => (
              <AttendantRoute>
                <CashFlow />
              </AttendantRoute>
            )}
          </Route>
          <Route path="/attendant/profit-analysis">
            {() => (
              <AttendantRoute>
                <ProfitAnalysis />
              </AttendantRoute>
            )}
          </Route>
          
          {/* Public routes */}
          <Route path="/" component={Login} />
          <Route path="/login" component={Login} />
          <Route path="/login-selection" component={Login} />
          <Route path="/business-login" component={BusinessLogin} />
          <Route path="/signup" component={Signup} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          
          {/* Handle special case: admin routes when attendant is logged in */}
          <Route path="/attendants" component={() => <AdminRouteHandler targetRoute="/attendants" />} />
          <Route path="/dashboard" component={() => <AdminRouteHandler targetRoute="/dashboard" />} />
          <Route path="/shops" component={() => <AdminRouteHandler targetRoute="/shops" />} />
          
          <Route component={Login} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
    </Suspense>
    </ChunkErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AttendantAuthProvider>
          <ProductsProvider>
            <TooltipProvider>
              <PermissionsInit>
                <AttendantSessionChecker />
                <AttendantLockScreen />
                <AppContent />
              </PermissionsInit>
              <Toaster />
              <PwaInstallWidget />
            </TooltipProvider>
          </ProductsProvider>
        </AttendantAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

// API Configuration - All requests go through server proxy
export const API_ENDPOINTS = {
  // Product endpoints - all go through /api/ proxy
  products: {
    getAll: "/api/product",
    getById: (id: number) => `/api/product/${id}`,
    search: "/api/product",
    getByCategory: "/api/product",
    categories: "/api/product/category",
  },
  
  // Customer endpoints - all go through /api/ proxy
  customers: {
    getAll: "/api/customers",
    getById: (id: number) => `/api/customers/${id}`,
    create: "/api/customers",
    updateBalance: (id: number) => `/api/customers/${id}/balance`,
  },
  
  // Sales endpoints - all go through /api/ proxy
  sales: {
    create: "/api/sales",
    getAll: "/api/sales/filter",
    getById: (id: string) => `/api/sales/single/receipt/${id}`,
    update: (id: string) => `/api/sales/${id}`,
    void: (id: string) => `/api/sales/void/sale/${id}`,
    
    // Product-related sales
    getProductSales: "/api/sales/product/filter",
    getProductReports: "/api/sales/products/reports",
    getMostSellingProducts: "/api/sales/summary/month/analysis/product",
    
    // Summary and analytics
    getSummaryByDates: "/api/sales/summary/bydates",
    getShopSales: "/api/sales/shops/sales",
    getMonthlyAnalysis: "/api/sales/product/month/analysis",
    
    // Reports
    getDiscountReports: "/api/sales/discount/reports",
    getStatements: "/api/sales/reports/statements",
    sendReportEmail: "/api/sales/send/report/email",
    
    // Online sales/orders
    onlineSales: {
      create: "/api/sales/orders/sale/online",
      getAll: "/api/sales/orders/sale/online",
      delete: (id: string) => `/api/sales/orders/sale/online/${id}`,
    },
    
    // Development/maintenance
    updateSandbox: (id: string) => `/api/sales/sandbox/updating/sales/${id}`,
  },
  
  // Transaction endpoints - all go through /api/ proxy
  transactions: {
    create: "/api/transactions",
    getAll: "/api/transactions",
    getById: (id: string) => `/api/transactions/${id}`,
    getByDate: "/api/transactions/summary/bydates",
  },
  
  // Shop endpoints - all go through /api/ proxy
  shop: {
    getShopData: "/api/shop",
    getShopById: (shopId: string) => `/api/shop/${shopId}`,
  },
  
  // Auth endpoints - all go through /api/ proxy
  auth: {
    register: "/api/business/register",
    login: "/api/business/login",
    logout: "/api/business/logout",
    getAdmin: (id: string) => `/api/auth/admin/${id}`,
    resetPassword: "/api/admin/reset/password",
    requestPasswordReset: "/api/admin/request/password",
    sync: (id: string) => `/api/sync/${id}`,
  },

  // M-Pesa endpoints (proxied to SunPay via Pointify API)
  mpesa: {
    stkPush: "/api/mpesa/stk-push",
    expect: "/api/mpesa/expect",
    status: (transactionId: string) => `/api/mpesa/status/${transactionId}`,
    lookup: "/api/mpesa/lookup",
  },

  // Analytics endpoints - all go through /api/ proxy
  analytics: {
    stockAnalysis: "/api/analysis/stockanalysis",
    salesAnalysis: "/api/analysis/sales",
    customerAnalysis: "/api/analysis/customers",
    profitAnalysis: "/api/analysis/profit",
  },
};

// Shared fetcher for product categories. Includes `shop` in the query so the
// upstream API can scope categories to the selected shop. Used by the product
// form and prefetched from the products page so the dropdown opens instantly.
export const fetchProductCategories = async (
  shopId: string,
  adminId: string,
) => {
  const params = new URLSearchParams({
    shop: shopId || "",
    admin: adminId || "",
  });

  const response = await rawApiFetch(
    `${API_ENDPOINTS.products.categories}?${params.toString()}`,
    { auth: "admin-first" },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch categories");
  }

  const data = await response.json();
  return data.data || data || [];
};

// Helper function to build URL with query params
export const buildApiUrl = (endpoint: string, params?: URLSearchParams) => {
  return params ? `${endpoint}?${params.toString()}` : endpoint;
};

// ---------------------------------------------------------------------------
// Canonical API transport — ALL backend (/api) calls must go through here.
//
// Layers:
//   rawApiFetch  — the single low-level transport. Attaches the right auth
//                  token, optional timeout. Returns the raw Response and never
//                  throws on HTTP error statuses — callers own error semantics.
//                  Use this when migrating former raw fetch('/api/...') sites
//                  so their behavior is preserved exactly.
//   apiCall      — high-level wrapper (admin-first token, 20s timeout,
//                  no-cache headers, 401 redirect handling). Returns Response.
//   apiRequest / getQueryFn (in lib/queryClient.ts) — React Query layer;
//                  attendant-first token, delegates transport to rawApiFetch.
//
// Token precedence differs on purpose and must not be "unified": apiCall
// historically prefers the admin token, while the React Query layer prefers
// the attendant token. Both behaviors are load-bearing on shared tills.
// ---------------------------------------------------------------------------

export type TokenPreference = "admin-first" | "attendant-first" | "none";

// Selects the bearer token exactly the way each legacy pattern did.
export const getAuthToken = (
  preference: TokenPreference = "admin-first",
): string | null => {
  if (preference === "none") return null;
  const adminToken = localStorage.getItem("authToken");
  const attendantToken = localStorage.getItem("attendantToken");
  return preference === "attendant-first"
    ? attendantToken || adminToken
    : adminToken || attendantToken;
};

export interface RawApiOptions extends RequestInit {
  /** Which stored token to attach. Default "admin-first" (apiCall's rule).
   *  An explicit Authorization header in `headers` always wins. */
  auth?: TokenPreference;
  /** Abort the request after this many ms. 0 (default) = no timeout.
   *  Ignored when the caller passes its own `signal`. */
  timeoutMs?: number;
}

/**
 * The single transport for backend calls. Does NOT throw on non-2xx —
 * callers keep their own `response.ok` / parsing semantics (this is what
 * makes migrating former raw fetch sites behavior-preserving).
 * Network/transport failures reject with the browser's native error, which
 * `isNetworkError` recognizes.
 */
export async function rawApiFetch(
  endpoint: string,
  options: RawApiOptions = {},
): Promise<Response> {
  const { auth = "admin-first", timeoutMs = 0, headers, signal, ...init } = options;

  const mergedHeaders: Record<string, string> = {};
  if (headers) {
    // Normalize whatever HeadersInit shape the caller used.
    new Headers(headers).forEach((v, k) => {
      mergedHeaders[k] = v;
    });
  }
  const hasExplicitAuth = Object.keys(mergedHeaders).some(
    (k) => k.toLowerCase() === "authorization",
  );
  if (!hasExplicitAuth) {
    const token = getAuthToken(auth);
    if (token) mergedHeaders["Authorization"] = `Bearer ${token}`;
  }

  let effectiveSignal = signal;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  if (timeoutMs > 0 && !signal) {
    const controller = new AbortController();
    timeoutId = setTimeout(
      // Abort with a proper AbortError. Aborting with a plain string would make
      // standards-compliant fetch reject with that raw string (no .name), which
      // breaks apiCall's timeout mapping and isNetworkError's offline detection.
      () =>
        controller.abort(
          typeof DOMException !== "undefined"
            ? new DOMException(
                `Request timeout after ${timeoutMs / 1000} seconds`,
                "AbortError",
              )
            : undefined,
        ),
      timeoutMs,
    );
    effectiveSignal = controller.signal;
  }

  try {
    return await fetch(endpoint, {
      ...init,
      headers: mergedHeaders,
      ...(effectiveSignal ? { signal: effectiveSignal } : {}),
    });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

// Detects whether an error (or the current device state) means we're offline /
// the server is unreachable, as opposed to a real server-side rejection. Used so
// create-customer / custom-item flows can fall back to the offline queue instead
// of just failing. Matches the messages thrown by apiCall and apiRequest.
export const isNetworkError = (error: any): boolean => {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (!error) return false;
  if (error?.name === "AbortError") return true;
  // Abort reasons can be plain strings — read the message off either shape.
  const msg = String(
    typeof error === "string" ? error : error.message || "",
  ).toLowerCase();
  // Match only true transport failures (the messages apiCall/apiRequest throw on
  // a dropped connection, plus the browser's native fetch errors). Deliberately
  // NOT a bare "network" substring — a real server validation error whose text
  // happens to contain that word must NOT be misread as offline.
  return (
    msg.includes("unable to connect") ||
    msg.includes("timeout") ||
    msg.includes("networkerror") || // Firefox native fetch failure
    msg.includes("failed to fetch") || // Chrome native fetch failure
    msg.includes("network request failed") ||
    msg.includes("not responding")
  );
};

// API request wrapper - uses server proxy with auth token forwarding
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  
  const url = buildApiUrl(endpoint, );

  const defaultHeaders = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  };

  try {
    const response = await rawApiFetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      // Legacy apiCall always enforced its own 20s timeout signal, replacing
      // any caller-supplied signal — preserve that exactly.
      signal: undefined,
      auth: "admin-first",
      timeoutMs: 20000,
      credentials: "include", // Include cookies for session management
    });
    
    if (!response.ok) {
      // Try to get the error message from the response body
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (parseError) {
        // If we can't parse the response, use the default error message
        console.warn("Could not parse error response:", parseError);
      }
      
      if (response.status === 401) {
        // Try to get error data to check for logout request
        let errorData;
        try {
          errorData = await response.json();
          if (errorData.logout) {
            console.log("🚪 Server requesting logout due to 401 error");
            // Clear all auth data and redirect to login
            localStorage.removeItem('authToken');
            localStorage.removeItem('adminData');
            localStorage.removeItem('attendantToken');
            localStorage.removeItem('attendantData');
            window.location.href = '/business-login';
            throw new Error(errorData.message || 'Authentication expired. Please log in again.');
          }
        } catch (parseError) {
          // If we can't parse the response, continue with normal 401 handling
        }
        
        // For login endpoints, don't auto-redirect on 401, just throw the error
        if (endpoint === '/api/business/login') {
          throw new Error(errorData?.message || errorMessage);
        }
        
        // Check if attendant is logged in - if so, don't redirect to business-login
        const attendantData = localStorage.getItem('attendantData');
        if (attendantData) {
          // Attendant is logged in, just throw error without redirect
          throw new Error(errorData?.message || errorMessage);
        }
        
        // For admin users, clear auth data and redirect to business login
        localStorage.removeItem('authToken');
        localStorage.removeItem('adminData');
        window.location.href = '/business-login';
        throw new Error(`Authentication failed. Please login again.`);
      }
      if (response.status === 502 || response.status === 503 || response.status === 504) {
        // Don't throw immediately - server fallback logic should handle this
        console.warn(`External API error ${response.status}, server should fallback to local API`);
        // Only throw if we get HTML response (indicating server error page)
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          throw new Error(`Service temporarily unavailable. The external API is experiencing issues. Please try again in a few moments.`);
        }
        // Otherwise, let the server handle the fallback
      }
      
      throw new Error(errorMessage);
    }
    
    return response;
  } catch (error: any) {
    // Fetch may reject with a non-Error abort reason (e.g. a string or
    // DOMException) — don't gate on `instanceof Error`.
    const name = error?.name;
    const message =
      typeof error === 'string' ? error : String(error?.message ?? '');
    if (name === 'AbortError' || /request timeout/i.test(message)) {
      throw new Error(`Request timeout. The server is not responding.`);
    }
    if (message.includes('fetch') || message.includes('NetworkError')) {
      throw new Error(`Unable to connect to server. Please verify the server is running.`);
    }
    throw error;
  }
};
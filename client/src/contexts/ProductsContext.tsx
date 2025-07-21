import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { useAttendantAuth } from '@/contexts/AttendantAuthContext';
import { apiCall } from '@/lib/api-config';
import type { Product } from '@shared/schema';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

interface ProductsContextType {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export const useProducts = () => {
  const context = useContext(ProductsContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return context;
};

interface ProductsProviderProps {
  children: ReactNode;
}

export const ProductsProvider = ({ children }: ProductsProviderProps) => {
  const { admin, token, isAuthenticated } = useAuth();
  const { attendant, token: attendantToken, isAuthenticated: isAttendantAuthenticated } = useAttendantAuth();
  const { selectedShopId } = useSelector((state: RootState) => state.shop);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const getPrimaryShopId = () => {
    if (!admin?.primaryShop) return null;
    
    if (typeof admin.primaryShop === 'string') {
      return admin.primaryShop;
    }
    
    if (typeof admin.primaryShop === 'object' && admin.primaryShop !== null) {
      return admin.primaryShop._id || admin.primaryShop.id;
    }
    
    return null;
  };

  const fetchProducts = async () => {
    // Check if either admin or attendant is authenticated
    const isAuthenticatedUser = isAuthenticated || isAttendantAuthenticated;
    const authToken = token || attendantToken;
    const user = admin || attendant;
    
    if (!isAuthenticatedUser || !user || !authToken) {
      console.log('fetchProducts skipped - not authenticated', {
        isAdmin: isAuthenticated,
        isAttendant: isAttendantAuthenticated,
        hasToken: !!authToken,
        hasUser: !!user
      });
      return;
    }

    let shopId = selectedShopId || getPrimaryShopId();
    
    // For attendants, get shop ID from attendant data
    if (attendant && !shopId) {
      shopId = typeof attendant.shopId === 'string' ? attendant.shopId : attendant.shopId?._id;
    }
    
    if (!shopId) {
      setError('No shop found');
      console.log('fetchProducts skipped - no shop ID');
      return;
    }

    console.log('fetchProducts starting for shop:', shopId, 'user type:', admin ? 'admin' : 'attendant');
    setIsLoading(true);
    setError(null);

    try {
      // Build query parameters matching the required format
      const queryParams = new URLSearchParams({
        page: '1',
        reason: '',
        date: '',
        limit: '50',
        name: '',
        shopid: shopId,
        type: 'all',
        sort: '',
        productid: '',
        barcodeid: '',
        productType: '',
        useWarehouse: 'true',
        warehouse: 'false'
      });

      // Add different ID parameter based on user type
      if (attendant) {
        queryParams.append('attendantId', attendant._id);
      } else if (admin) {
        queryParams.append('adminid', admin._id || admin.id);
      }

      const response = await apiCall(`/api/product?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      const data = await response.json();
      
      // Handle different response structures
      let productList: Product[] = [];
      if (Array.isArray(data)) {
        productList = data;
      } else if (data.data && Array.isArray(data.data)) {
        productList = data.data;
      } else if (data.products && Array.isArray(data.products)) {
        productList = data.products;
      }

      console.log(`Fetched ${productList.length} products from API`);
      console.log('First 3 products:', productList.slice(0, 3));
      setProducts(productList);
      
      // Don't cache - always fetch fresh data
      console.log('Products updated with fresh data - state now has:', productList.length, 'products');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch products';
      setError(errorMessage);
      console.error('Error fetching products:', err);
      
      // No fallback to cached data - always show error
      console.error('Failed to fetch fresh products, no fallback used');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProducts = async () => {
    console.log('refreshProducts called - forcing fresh API call');
    // Clear any localStorage cache
    localStorage.removeItem('cachedProducts');
    localStorage.removeItem('productsLastFetch');
    // Immediately fetch fresh data
    await fetchProducts();
  };

  // Fetch products when authentication is ready and shop changes
  useEffect(() => {
    const isAuthenticatedUser = isAuthenticated || isAttendantAuthenticated;
    const authToken = token || attendantToken;
    const user = admin || attendant;
    
    if (isAuthenticatedUser && user && authToken) {
      console.log('Auth ready - fetching products for shop:', selectedShopId, 'user type:', admin ? 'admin' : 'attendant');
      fetchProducts();
    }
  }, [isAuthenticated, isAttendantAuthenticated, admin?._id, attendant?._id, token, attendantToken, selectedShopId]);

  // Disable auto-refresh to prevent infinite loops
  // Auto-refresh can be re-enabled later with proper debouncing

  // No cached loading - always fetch fresh

  const value: ProductsContextType = {
    products,
    isLoading,
    error,
    refreshProducts
  };

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
};
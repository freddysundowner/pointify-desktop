import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { useAttendantAuth } from '@/contexts/AttendantAuthContext';
import { apiCall } from '@/lib/api-config';
import { offlineStorage } from '@/lib/offline-storage';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

interface ProductsContextType {
  products: any[];
  isLoading: boolean;
  error: string | null;
  isOffline: boolean;
  refreshProducts: () => Promise<void>;
  fetchMoreProducts: () => Promise<void>;
  hasMore: boolean;
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

  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const adminId = (admin as any)?._id || (admin as any)?.id || null;
  const attendantId = (attendant as any)?._id || null;

  const adminRef = useRef(admin);
  const attendantRef = useRef(attendant);
  useEffect(() => { adminRef.current = admin; }, [admin]);
  useEffect(() => { attendantRef.current = attendant; }, [attendant]);

  const getPrimaryShopId = useCallback(() => {
    const a = adminRef.current;
    if (!a?.primaryShop) return null;
    if (typeof a.primaryShop === 'string') return a.primaryShop;
    if (typeof a.primaryShop === 'object' && a.primaryShop !== null) {
      return (a.primaryShop as any)._id || (a.primaryShop as any).id;
    }
    return null;
  }, []);

  const fetchProducts = useCallback(async (pageNumber = 1, append = false) => {
    const isAuthenticatedUser = isAuthenticated || isAttendantAuthenticated;
    const authToken = token || attendantToken;
    const currentAdmin = adminRef.current;
    const currentAttendant = attendantRef.current;
    const user = currentAdmin || currentAttendant;

    if (!isAuthenticatedUser || !user || !authToken) return;

    let shopId = selectedShopId || getPrimaryShopId();
    if (currentAttendant && !shopId) {
      shopId = typeof currentAttendant.shopId === 'string'
        ? currentAttendant.shopId
        : (currentAttendant.shopId as any)?._id;
    }
    if (!shopId) {
      setError('No shop found');
      return;
    }

    if (!append) setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        page: pageNumber.toString(),
        reason: '',
        date: '',
        limit: '50',
        name: '',
        shop: shopId,
        type: '',
        stockMode: '',
        sort: '',
        productid: '',
        barcodeid: '',
        productType: '',
        useWarehouse: 'true',
        warehouse: 'false',
      });

      if (currentAttendant) queryParams.append('attendantId', (currentAttendant as any)._id);
      else if (currentAdmin) queryParams.append('adminid', (currentAdmin as any)._id || (currentAdmin as any).id);

      const response = await apiCall(`/api/v2/products/list?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });

      const data = await response.json();

      const productList: any[] = Array.isArray(data)
        ? data
        : data.data || data.products || [];

      setProducts(prev => {
        if (append && prev.length > 0) {
          const ids = new Set(prev.map((p: any) => p._id || p.id));
          const newItems = productList.filter((p: any) => !ids.has(p._id || p.id));
          return [...prev, ...newItems];
        }
        return productList;
      });

      const moreAvailable =
        (data.totalPages && data.currentPage < data.totalPages) ||
        productList.length === 50;

      setHasMore(Boolean(moreAvailable));
      setPage(pageNumber);
      setIsOffline(false);

      if (productList.length > 0 && !append) {
        offlineStorage.saveProducts(productList).catch(console.error);
      }
    } catch (err) {
      console.warn('API fetch failed, trying offline cache:', err);

      try {
        const cachedProducts = await offlineStorage.getProducts();
        if (cachedProducts.length > 0) {
          setProducts(append
            ? (prev: any[]) => {
                const ids = new Set(prev.map((p: any) => p._id || p.id));
                const newItems = cachedProducts.filter((p: any) => !ids.has(p._id || p.id));
                return [...prev, ...newItems];
              }
            : cachedProducts
          );
          setIsOffline(true);
          setHasMore(false);
          setError(null);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to fetch products');
        }
      } catch {
        setError(err instanceof Error ? err.message : 'Failed to fetch products');
      }
    } finally {
      if (!append) setIsLoading(false);
    }
  }, [isAuthenticated, isAttendantAuthenticated, token, attendantToken, adminId, attendantId, selectedShopId, getPrimaryShopId]);

  const fetchMoreProducts = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await fetchProducts(page + 1, true);
  }, [hasMore, isLoading, page, fetchProducts]);

  const refreshProducts = useCallback(async () => {
    setProducts([]);
    setPage(1);
    await fetchProducts(1, false);
  }, [fetchProducts]);

  useEffect(() => {
    const isAuthenticatedUser = isAuthenticated || isAttendantAuthenticated;
    const authToken = token || attendantToken;

    if (isAuthenticatedUser && authToken && (adminId || attendantId)) {
      setProducts([]);
      setPage(1);
      fetchProducts(1, false);
    }
  }, [isAuthenticated, isAttendantAuthenticated, token, attendantToken, adminId, attendantId, selectedShopId]);

  const value: ProductsContextType = {
    products,
    isLoading,
    error,
    isOffline,
    refreshProducts,
    fetchMoreProducts,
    hasMore,
  };

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
};

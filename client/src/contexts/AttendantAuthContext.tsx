import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setAttendant, updateAttendant, clearAttendant, setLoading, setRefreshing, setLocked } from '@/store/slices/attendantSlice';
import { setCurrency } from '@/store/slices/defaultCurrencySlicce';
import { verifyOfflineCredential, isNetworkError } from '@/lib/offline-auth';
import { announcePendingOfflineSales } from '@/hooks/useOfflineSync';
import { queryClient } from '@/lib/queryClient';
import { rawApiFetch } from '@/lib/api-config';

interface AttendantData {
  _id: string;
  username: string;
  uniqueDigits: number;
  shopId: string | { _id: string; name: string };
  adminId: string;
  permissions: Array<{ key: string; value: string[] }>;
  status: string;
  shopData?: any
}

interface AttendantAuthContextType {
  attendant: AttendantData | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  isLocked: boolean;
  shopData: any;
  login: (attendantData: AttendantData, token: string,shopData: any) => void;
  logout: () => void;
  refreshAttendantData: () => Promise<void>;
  lockScreen: () => void;
  unlockScreen: (password: string) => Promise<void>;
}

const AttendantAuthContext = createContext<AttendantAuthContextType | undefined>(undefined);

export const useAttendantAuth = () => {
  const context = useContext(AttendantAuthContext);
  if (context === undefined) {
    throw new Error('useAttendantAuth must be used within an AttendantAuthProvider');
  }
  return context;
};

interface AttendantAuthProviderProps {
  children: ReactNode;
}

export const AttendantAuthProvider = ({ children }: AttendantAuthProviderProps) => {
  const dispatch = useAppDispatch();
  const { attendant, token, isAuthenticated, isLoading, isRefreshing, isLocked, shopData } = useAppSelector(state => state.attendant);
  const [, setLocation] = useLocation();

  useEffect(() => {
    initializeAttendantAuth();
  }, []);

  const initializeAttendantAuth = () => {
    try {
      const storedAttendantData = localStorage.getItem('attendantData');
      const storedToken = localStorage.getItem('attendantToken');
      const storedShopData = localStorage.getItem('shopData');
      if (storedAttendantData && storedToken) {
        const parsedData = JSON.parse(storedAttendantData);
        
        // Map the stored data to the expected AttendantData structure
        const attendantData: AttendantData = {
          _id: parsedData.attendantId || parsedData._id,
          username: parsedData.username || '',
          uniqueDigits: parsedData.uniqueDigits || 96580,
          shopId: parsedData.shopId,
          adminId: parsedData.adminId,
          permissions: parsedData.permissions || [],
          status: parsedData.status || 'active',
          shopData: JSON.parse(storedShopData || '{}')
        };
        dispatch(setCurrency(storedShopData?.currency || 'KES'));
        dispatch(setAttendant({ attendant: attendantData, token: storedToken, shopData: JSON.parse(storedShopData || '{}') }));
        // Restore a previously-locked screen so refreshing the page (or the
        // OS suspending/resuming the tablet) doesn't silently drop the lock.
        if (localStorage.getItem('attendantLocked') === 'true') {
          dispatch(setLocked(true));
        }
        setLocation('/');
      }
    } catch (error) {
      console.error('Failed to initialize attendant auth:', error);
      logout();
    } finally {
      dispatch(setLoading(false));
    }
  };

  const login = (attendantData: AttendantData, authToken: string, shopData: any) => {
    // Shared tills: drop any in-memory server data cached by the previous
    // user so one attendant never sees another's customers/products/reports.
    // (Offline IndexedDB data is already isolated per identity by
    // offline-storage's per-scope databases.)
    queryClient.clear();
    dispatch(setAttendant({ attendant: attendantData, token: authToken,shopData }));
    localStorage.setItem('attendantData', JSON.stringify(attendantData));
    localStorage.setItem('shopData', JSON.stringify(shopData));
    localStorage.setItem('attendantToken', authToken);
    localStorage.removeItem('attendantLocked');
    // With per-user offline storage, sales this attendant queued in an earlier
    // session can only sync while they're signed in. Tell them anything is
    // still waiting and kick off an immediate flush. Fire-and-forget: must
    // never block or fail the login. Runs after the token is stored so the
    // offline scope resolves to this attendant.
    announcePendingOfflineSales();
  };

  const logout = () => {
    // Clear cached server data so the next user on this till starts fresh.
    queryClient.clear();
    dispatch(clearAttendant());
    localStorage.removeItem('attendantData');
    localStorage.removeItem('attendantToken');
    localStorage.removeItem('shopData');
    localStorage.removeItem('attendantLocked');
    // Restaurant-mode tills skip the admin/attendant choice screen on logout
    // and go straight back to the PIN keypad, since this device is always
    // used by attendants. `restaurantDeviceShopId` is the same flag
    // attendant-login.tsx uses to decide whether to show the PIN keypad.
    const isRestaurantDevice = !!localStorage.getItem('restaurantDeviceShopId');
    setLocation(isRestaurantDevice ? '/attendant/login' : '/login-selection');
  };

  // Lock the screen in place — the attendant stays "logged in" (session/cart
  // state is untouched) but the UI is covered until their own PIN + password
  // are re-entered. Restaurant-only feature: prevents another staff member
  // from selling under someone else's account while they're away from the till.
  const lockScreen = () => {
    dispatch(setLocked(true));
    localStorage.setItem('attendantLocked', 'true');
  };

  const unlockScreen = async (password: string) => {
    if (!attendant) {
      throw new Error('No active session to unlock');
    }
    let response: Response;
    try {
      response = await rawApiFetch('/api/auth/attendant/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uniqueDigits: attendant.uniqueDigits, password }),
        auth: 'none',
      });
    } catch (err) {
      // Transport failure (server unreachable): verify against the cached
      // salted verifier so an attendant isn't locked out mid-shift during an
      // internet outage. This branch is ONLY reached when no HTTP response
      // came back — a server rejection below stays final.
      if (isNetworkError(err)) {
        const credential = await verifyOfflineCredential(
          'attendant',
          String(attendant.uniqueDigits),
          password,
        );
        // Only the same attendant's own credentials may unlock their session.
        if (credential && credential.profile?._id === attendant._id) {
          dispatch(setLocked(false));
          localStorage.removeItem('attendantLocked');
          return;
        }
        throw new Error(
          "You're offline and we couldn't verify your password. Reconnect to the internet to unlock.",
        );
      }
      throw err;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Incorrect password');
    }
    // Only the same attendant's own credentials may unlock their session —
    // a different valid attendant should log in normally instead.
    if (data.attendant?._id !== attendant._id) {
      throw new Error('These credentials belong to a different account');
    }
    dispatch(setLocked(false));
    localStorage.removeItem('attendantLocked');
  };

  const refreshAttendantData = async () => {
    if (!token || !attendant?._id) return;
    
    dispatch(setRefreshing(true));
    try {
      // Restaurant-mode PIN logins carry Pointify's own opaque token, which the
      // server can't decode itself (see attendant-auth.ts verify handler) — so
      // pass the attendantId/shopId/adminId we already have as a fallback the
      // server can use instead of failing the refresh.
      const shopId = typeof attendant.shopId === 'object' ? attendant.shopId._id : attendant.shopId;
      const params = new URLSearchParams({
        attendantId: attendant._id,
        ...(shopId ? { shopId } : {}),
        ...(attendant.adminId ? { adminId: attendant.adminId } : {}),
      });
      const response = await rawApiFetch(`/api/auth/attendant/verify?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.attendant) {
          // Update both Redux state and localStorage with properly structured data
          dispatch(updateAttendant(data.attendant));
          localStorage.setItem('attendantData', JSON.stringify(data.attendant));
        }
      } else {
        // Only log out on authentication errors (401), not on data fetch failures
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.error && errorData.error.includes('Token expired')) {
            logout();
          } else {
            console.log('Refresh failed but keeping session active:', errorData.error);
            throw new Error('Refresh failed but session maintained');
          }
        } else {
          throw new Error('Network error during refresh');
        }
      }
    } catch (error) {
      console.error('Failed to refresh attendant data:', error);
      // Don't log out on network errors, just keep existing data
    } finally {
      dispatch(setRefreshing(false));
    }
  };

  const value = {
    attendant,
    token,
    isAuthenticated,
    isLoading,
    isRefreshing,
    isLocked,
    shopData,
    login,
    logout,
    refreshAttendantData,
    lockScreen,
    unlockScreen,
  };

  return (
    <AttendantAuthContext.Provider value={value}>
      {children}
    </AttendantAuthContext.Provider>
  );
};

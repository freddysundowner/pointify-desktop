import { useAppSelector } from '@/store/hooks';
import { useState, useEffect } from 'react';
import { useSubscriptionStatus } from './useSubscriptionStatus';

export const usePermissions = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { userPermissions } = useAppSelector((state) => state.permissions);
  const { roles } = useAppSelector((state) => state.roles);
  const [isAdmin, setIsAdmin] = useState(false);
  const { isExpired: isSubscriptionExpired } = useSubscriptionStatus();

  // Check if user is admin from localStorage
  useEffect(() => {
    const checkAdminStatus = () => {
      const token = localStorage.getItem("authToken");
      const adminData = localStorage.getItem("adminData");
      
      if (token || adminData) {
        // If we have any auth data, consider them admin for dashboard access
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    };
    
    checkAdminStatus();
    
    // Listen for localStorage changes
    const handleStorageChange = () => {
      checkAdminStatus();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Get user's role permissions
  const getUserRolePermissions = () => {
    if (!user?.role) return [];
    const userRole = roles.find(role => role.id === user.role);
    return userRole?.permissions || [];
  };

  // Combine role permissions with individual permissions
  const getAllUserPermissions = () => {
    const rolePermissions = getUserRolePermissions();
    const combined = rolePermissions.concat(userPermissions);
    return Array.from(new Set(combined));
  };

  // Check if user has specific permission
  const hasPermission = (permission: string): boolean => {
    // If subscription is expired, deny all permissions
    if (isSubscriptionExpired) {
      return false;
    }
    
    // Admin users automatically have all permissions
    if (isAdmin) {
      return true;
    }
    
    const allPermissions = getAllUserPermissions();
    return allPermissions.includes(permission);
  };

  // Check if user has any of the specified permissions
  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  // Check if user has all specified permissions
  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  // Get permissions by category
  const getPermissionsByCategory = (category: string) => {
    const allPermissions = getAllUserPermissions();
    return allPermissions.filter(permId => {
      // You could expand this to check actual permission definitions
      return permId.startsWith(category.toLowerCase());
    });
  };

  // Check if user can access specific routes
  const canAccessRoute = (route: string): boolean => {
    // If subscription is expired, deny all route access
    if (isSubscriptionExpired) {
      return false;
    }
    
    const routePermissions: Record<string, string[]> = {
      '/sales': ['sales_view', 'sales_create'],
      '/purchases': ['purchases_manage'],
      '/inventory': ['inventory_view'],
      '/stock': ['inventory_view', 'stock_adjust'],
      '/customers': [],
      '/suppliers': ['suppliers_manage'],
      '/expenses': ['expenses_create', 'financial_view'],
      '/cashflow': ['cashflow_manage', 'financial_view'],
      '/reports': ['reports_view'],
      '/attendants': ['staff_view'],
      '/staff-permissions': ['user_permissions', 'staff_manage'],
    };

    const requiredPermissions = routePermissions[route];
    if (!requiredPermissions) return true; // Allow access if no specific permissions required
    
    return hasAnyPermission(requiredPermissions);
  };

  // Check attendant permissions (key-value structure)
  const hasAttendantPermission = (key: string, action: string): boolean => {
    console.log(`=== PERMISSION CHECK: ${key}.${action} ===`);
    
    // Check if we're in attendant context
    const attendantData = localStorage.getItem('attendantData');
    if (!attendantData) {
      console.log('Permission denied: No attendant data in localStorage');
      return false;
    }
    
    // Parse attendant data to get shop information
    let attendant;
    try {
      attendant = JSON.parse(attendantData);
    } catch {
      console.log('Permission denied: Invalid attendant data');
      return false;
    }
    
    // For attendants, check their shop's subscription status from the shop data
    // The shop data should be available from when the attendant logged in
    const shopId = typeof attendant.shopId === 'object' ? attendant.shopId._id : attendant.shopId;
    
    // For attendants, we need to check their specific shop's subscription
    // The current isSubscriptionExpired is checking admin subscription, not shop subscription
    
    // Implement proper shop subscription validation
    const checkShopSubscription = () => {
      try {
        // Check if we have shop data cached from when attendant logged in
        const shopData = localStorage.getItem('currentShopData');
        if (shopData) {
          const shop = JSON.parse(shopData);
          if (shop.subscription) {
            const now = new Date();
            const endDate = new Date(shop.subscription.endDate);
            const isExpired = now > endDate || !shop.subscription.status;
            console.log('Shop subscription check:', {
              status: shop.subscription.status,
              endDate: shop.subscription.endDate,
              isExpired
            });
            return !isExpired;
          }
        }
        
        // If no cached shop data, assume subscription is valid for now
        // In production, this should make an API call to verify
        console.log('No cached shop subscription data - allowing access');
        return true;
      } catch (error) {
        console.log('Shop subscription check error:', error);
        return true; // Default to allowing access if check fails
      }
    };
    
    if (!checkShopSubscription()) {
      console.log('Permission denied: Shop subscription expired');
      return false;
    }
    
    console.log('Shop subscription valid - checking attendant permissions');
    
    // Continue with permission validation using the already parsed attendant data
    try {
      console.log('Attendant from localStorage:', attendant);
      
      if (!attendant.permissions) {
        console.log('Permission denied: No permissions array');
        return false;
      }
      
      console.log('Attendant permissions:', attendant.permissions);
      
      const permission = attendant.permissions.find((p: any) => p.key === key);
      console.log(`Found permission for key '${key}':`, permission);
      
      const hasPermission = permission ? permission.value.includes(action) : false;
      console.log(`Permission result for '${key}.${action}':`, hasPermission);
      
      return hasPermission;
    } catch (error) {
      console.log('Permission check error:', error);
      return false;
    }
  };

  return {
    user,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessRoute,
    getPermissionsByCategory,
    getAllUserPermissions,
    hasAttendantPermission,
    isAdmin: isAdmin || user?.isAdmin || false,
    isSubscriptionExpired,
  };
};
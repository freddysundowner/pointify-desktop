import { useEffect, useState, Suspense } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Store, 
  Clock, 
  LogOut, 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart3,
  DollarSign,
  Truck,
  Receipt,
  TrendingUp,
  Wallet,
  UserCheck,
  ClipboardList,
  Archive,
  RefreshCw,
  Lock,
  AlertTriangle,
  ChefHat,
  ChevronRight,
  BedDouble
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAttendantAuth } from '@/contexts/AttendantAuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { rawApiFetch } from '@/lib/api-config';

interface AttendantData {
  _id: string;
  username: string;
  uniqueDigits: number;
  shopId: string | { _id: string; name: string };
  adminId: string;
  permissions: Array<{ key: string; value: string[] }>;
  status: string;
}

function AttendantDashboardContent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { attendant, isAuthenticated, isLoading, isRefreshing, logout, refreshAttendantData } = useAttendantAuth();
  const { hasPermission, hasAttendantPermission } = usePermissions();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shopName, setShopName] = useState<string>('Loading...');
  const [isRestaurantShop, setIsRestaurantShop] = useState<boolean>(false);
  const [isGuestHouseShop, setIsGuestHouseShop] = useState<boolean>(false);



  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/attendant/login');
      return;
    }
    
    // Only auto-redirect to POS on initial page load (from login or refresh to dashboard)
    // but allow intentional navigation back to dashboard from POS
    if (isAuthenticated && attendant && !isLoading) {
      const hasCanSell = hasAttendantPermission('pos', 'can_sell');
      const wasRedirectedFromLogin = sessionStorage.getItem('attendantLoginRedirect') === 'true';
      const isDirectDashboardAccess = !sessionStorage.getItem('attendantNavigatedToDashboard');
      
      if (hasCanSell && (wasRedirectedFromLogin || isDirectDashboardAccess)) {
        console.log('Attendant has can_sell permission - redirecting to POS (initial access)');
        sessionStorage.removeItem('attendantLoginRedirect');
        sessionStorage.setItem('attendantNavigatedToDashboard', 'true');
        setLocation('/attendant/pos');
        return;
      }
    }
    
    // Update time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, [isAuthenticated, isLoading, attendant, setLocation, hasAttendantPermission]);

  // Pull the latest permissions on every dashboard visit. Permissions/attendantData
  // are cached in localStorage at login and previously only updated when the
  // attendant clicked the manual "Refresh" button — so an admin granting a new
  // permission (e.g. customers.manage) had no effect until the attendant logged
  // out and back in. Refreshing silently here means newly granted tiles/features
  // show up the next time the attendant lands on (or returns to) the dashboard.
  useEffect(() => {
    if (isAuthenticated && attendant && !isLoading) {
      refreshAttendantData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, attendant?._id]);

  // Fetch shop name and cache subscription data when attendant data is available
  useEffect(() => {
    const fetchShopData = async () => {
      if (attendant?.shopId) {
        try {
          const shopId = typeof attendant.shopId === 'object' ? attendant.shopId._id : attendant.shopId;
          const response = await rawApiFetch(`/api/shop/${shopId}`, { auth: 'attendant-first' });
          if (response.ok) {
            const shopData = await response.json();
            setShopName(shopData.name || 'Unknown Shop');
            setIsRestaurantShop(!!shopData.isRestaurant);
            setIsGuestHouseShop(!!shopData.isGuestHouse);

            // Store complete shop data with subscription info for permission checks
            localStorage.setItem('currentShopData', JSON.stringify(shopData));
            console.log('Cached shop subscription data for attendant permissions:', {
              shopId: shopData._id,
              subscriptionStatus: shopData.subscription?.status,
              subscriptionEndDate: shopData.subscription?.endDate
            });
          } else {
            setShopName('Unknown Shop');
          }
        } catch (error) {
          console.error('Error fetching shop data:', error);
          setShopName('Unknown Shop');
        }
      }
    };

    fetchShopData();
  }, [attendant?.shopId]);

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out", 
      description: "You have been successfully logged out."
    });
  };

  const handleRefresh = async () => {
    try {
      await refreshAttendantData();

      toast({
        title: "Data Refreshed",
        description: "Attendant data has been updated successfully."
      });
    } catch (error: any) {
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to refresh attendant data. Using cached data.",
        variant: "destructive"
      });
    }
  };

  const getShopName = (shopId: string | { _id: string; name: string }) => {
    if (typeof shopId === 'object' && shopId.name) {
      return shopId.name;
    }
    
    // If we have the attendant data, the shop name might be embedded in it
    // We'll need to make an API call to get the shop details
    return 'Loading...';
  };

  const hasSpecificPermission = (permissionValue: string) => {
    return attendant?.permissions?.some(p => p.value.includes(permissionValue)) || false;
  };

  const getAllPermissionValues = () => {
    const allValues: string[] = [];
    attendant?.permissions?.forEach(p => {
      allValues.push(...p.value);
    });
    return allValues;
  };

  // Function to check if attendant has any permissions for a group key
  const hasGroupPermission = (groupKey: string) => {
    return attendant?.permissions?.some(p => p.key === groupKey) || false;
  };

  const getPermissionActions = (groupKey: string) => {
    const permission = attendant?.permissions?.find(p => p.key === groupKey);
    return permission?.value || [];
  };

  if (isLoading || !attendant) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Debug: Log attendant permissions
  console.log('=== ATTENDANT PERMISSIONS DEBUG ===');
  console.log('Attendant data:', attendant);
  console.log('Attendant permissions:', attendant.permissions);
  
  // Check subscription status from usePermissions hook  
  const permissionsHook = usePermissions();
  const isSubscriptionExpired = permissionsHook.canAccessRoute ? false : true; // Simplified check
  console.log('Subscription expired:', isSubscriptionExpired);
  
  console.log('POS can_sell permission:', hasAttendantPermission('pos', 'can_sell'));
  console.log('Sales view_sales permission:', hasAttendantPermission('sales', 'view_sales'));
  console.log('Stocks view_products permission:', hasAttendantPermission('stocks', 'view_products'));

  const actionGroups = [
    {
      id: 'sales',
      title: 'Sales & Orders',
      icon: ShoppingCart,
      description: 'Process sales and manage orders',
      enabled: hasAttendantPermission('pos', 'can_sell') || hasAttendantPermission('sales', 'view_sales'),
      color: 'bg-green-500',
      subActions: [
        {
          title: 'Point of Sale',
          icon: ShoppingCart,
          description: 'Process sales and transactions',
          enabled: hasAttendantPermission('pos', 'can_sell'),
          route: '/attendant/pos'
        },
        {
          title: 'Sales History',
          icon: Receipt,
          description: 'View sales records and receipts',
          enabled: hasAttendantPermission('sales', 'view_sales'),
          route: '/attendant/sales'
        },
        {
          title: 'Pending Orders',
          icon: ChefHat,
          description: 'Take payment for orders sent from the kitchen',
          enabled: isRestaurantShop && hasAttendantPermission('pos', 'cashier'),
          route: '/attendant/pending-orders'
        }
      ]
    },
    {
      id: 'inventory',
      title: 'Inventory',
      icon: Package,
      description: 'Manage products and stock',
      enabled: hasAttendantPermission('stocks', 'view_products') || hasAttendantPermission('stocks', 'stock_count'),
      color: 'bg-blue-500',
      subActions: [
        {
          title: 'Products',
          icon: Package,
          description: 'Manage inventory and stock',
          enabled: hasAttendantPermission('stocks', 'view_products'),
          route: '/attendant/products'
        },
        {
          title: 'Stock Summary',
          icon: Archive,
          description: 'View stock analytics and insights',
          enabled: hasAttendantPermission('stocks', 'stock_summary'),
          route: '/attendant/stock/summary'
        },
        {
          title: 'Stock Count',
          icon: ClipboardList,
          description: 'Perform inventory counting',
          enabled: hasAttendantPermission('stocks', 'stock_count'),
          route: '/attendant/stock-count'
        },
        {
          title: 'Stock Transfer',
          icon: RefreshCw,
          description: 'Transfer stock between locations',
          enabled: hasAttendantPermission('stocks', 'transfer'),
          route: '/attendant/stock-transfer'
        },
        {
          title: 'Bad Stock',
          icon: AlertTriangle,
          description: 'Report damaged or expired inventory',
          enabled: hasAttendantPermission('stocks', 'badstock'),
          route: '/attendant/stock/bad-stock'
        }
      ]
    },
    {
      id: 'bookings',
      title: 'Room Bookings',
      icon: BedDouble,
      description: 'Manage guest house rooms and bookings',
      enabled: isGuestHouseShop && (
        hasAttendantPermission('bookings', 'view_bookings') ||
        hasAttendantPermission('bookings', 'create_bookings') ||
        hasAttendantPermission('bookings', 'manage_bookings') ||
        hasAttendantPermission('bookings', 'manage_rooms') ||
        hasAttendantPermission('bookings', 'view_reports')
      ),
      color: 'bg-indigo-500',
      subActions: [
        {
          title: 'Rooms',
          icon: BedDouble,
          description: 'See room availability and check guests in or out',
          enabled: isGuestHouseShop && (
            hasAttendantPermission('bookings', 'view_bookings') ||
            hasAttendantPermission('bookings', 'create_bookings') ||
            hasAttendantPermission('bookings', 'manage_bookings') ||
            hasAttendantPermission('bookings', 'manage_rooms')
          ),
          route: '/rooms'
        },
        {
          title: 'Bookings',
          icon: ClipboardList,
          description: 'View and manage guest bookings',
          enabled: isGuestHouseShop && (
            hasAttendantPermission('bookings', 'view_bookings') ||
            hasAttendantPermission('bookings', 'create_bookings') ||
            hasAttendantPermission('bookings', 'manage_bookings')
          ),
          route: '/bookings'
        },
        {
          title: 'Rooms Report',
          icon: BarChart3,
          description: 'Bookings revenue and occupancy report',
          enabled: isGuestHouseShop && hasAttendantPermission('bookings', 'view_reports'),
          route: '/bookings/report'
        }
      ]
    },
    {
      id: 'purchases',
      title: 'Purchases',
      icon: Truck,
      description: 'Manage purchase orders and returns',
      enabled: hasAttendantPermission('stocks', 'view_purchases'),
      color: 'bg-yellow-500',
      subActions: [
        {
          title: 'Purchase Orders',
          icon: Truck,
          description: 'Manage purchase orders',
          enabled: hasAttendantPermission('stocks', 'view_purchases'),
          route: '/attendant/purchases'
        },
        {
          title: 'Purchase Returns',
          icon: RefreshCw,
          description: 'Manage purchase returns',
          enabled: hasAttendantPermission('stocks', 'return'),
          route: '/attendant/purchases/returns'
        }
      ]
    },
    {
      id: 'users',
      title: 'Users',
      icon: Users,
      description: 'Manage customers and suppliers',
      enabled: hasAttendantPermission('customers', 'manage') || hasAttendantPermission('suppliers', 'view') || hasAttendantPermission('suppliers', 'manage'),
      color: 'bg-purple-500',
      subActions: [
        {
          title: 'Customers',
          icon: Users,
          description: 'Manage customer accounts',
          enabled: hasAttendantPermission('customers', 'manage'),
          route: '/attendant/customers'
        },
        {
          title: 'Suppliers',
          icon: UserCheck,
          description: 'Manage supplier relationships',
          enabled: hasAttendantPermission('suppliers', 'view') || hasAttendantPermission('suppliers', 'manage'),
          route: '/attendant/suppliers'
        }
      ]
    },
    {
      id: 'accounts',
      title: 'Accounts',
      icon: DollarSign,
      description: 'Manage expenses and cash flow',
      enabled: hasAttendantPermission('expenses', 'view') || hasAttendantPermission('expenses', 'manage') || hasAttendantPermission('accounts', 'cashflow'),
      color: 'bg-red-500',
      subActions: [
        {
          title: 'Expenses',
          icon: DollarSign,
          description: 'Record business expenses',
          enabled: hasAttendantPermission('expenses', 'view') || hasAttendantPermission('expenses', 'manage'),
          route: '/attendant/expenses'
        },
        {
          title: 'Cash Flow',
          icon: Wallet,
          description: 'Monitor cash flow operations',
          enabled: hasAttendantPermission('accounts', 'cashflow'),
          route: '/attendant/cashflow'
        }
      ]
    },
    {
      id: 'reports',
      title: 'Reports',
      icon: BarChart3,
      description: 'View analytics and reports',
      enabled: hasAttendantPermission('reports', 'sales'),
      color: 'bg-orange-500',
      subActions: [

        {
          title: 'Profit & Loss',
          icon: TrendingUp,
          description: 'Analyze business profitability',
          enabled: hasAttendantPermission('reports', 'sales'),
          route: '/attendant/profit-loss'
        }
      ]
    }
  ];

  // Active groups: only the sub-actions the attendant is actually permitted to use
  const activeGroups = actionGroups
    .map(group => ({ ...group, subActions: group.subActions.filter(sub => sub.enabled) }))
    .filter(group => group.subActions.length > 0);

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground p-2 rounded-xl shadow-sm">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-900 leading-tight">{shopName}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                User: <span className="font-medium text-slate-700">{attendant?.username || 'Unknown User'}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="hidden sm:flex gap-2 h-9 border-slate-200 hover:bg-slate-100 text-slate-700"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="sm:hidden h-9 w-9 border-slate-200 text-slate-700"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 w-full flex flex-col">

        {/* Active Tiles */}
        <div className="space-y-8">
          {activeGroups.map((group) => (
            <section key={`active-${group.id}`} className="space-y-4">
              <div className="flex items-center gap-2.5 px-1">
                <div className={`w-2.5 h-2.5 rounded-full ${group.color} shadow-sm`} />
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">{group.title}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {group.subActions.map((action) => (
                  <Card
                    key={action.title}
                    className="group cursor-pointer hover:border-primary/40 hover:shadow-lg transition-all duration-300 bg-white border-slate-200 overflow-hidden relative active:scale-[0.98] shadow-sm"
                    onClick={() => setLocation(action.route)}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${group.color} transition-all duration-300 group-hover:w-2`} />
                    <CardContent className="p-6 flex flex-col h-full gap-5 pl-7">
                      <div className="flex justify-between items-start">
                        <div className="p-3.5 rounded-2xl bg-slate-50 text-slate-700 group-hover:bg-primary/10 group-hover:text-primary transition-colors shadow-sm ring-1 ring-slate-100">
                          <action.icon className="w-7 h-7" strokeWidth={1.5} />
                        </div>
                        <div className="bg-slate-50 p-1.5 rounded-full text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="space-y-1.5 mt-auto">
                        <h3 className="font-semibold text-slate-900 text-lg leading-tight group-hover:text-primary transition-colors">{action.title}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2 leading-snug">
                          {action.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}

          {activeGroups.length === 0 && (
            <Card className="mb-8">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <Lock className="w-12 h-12 text-slate-300 mb-4" />
                <h2 className="text-lg font-semibold text-slate-900">No Features Enabled</h2>
                <p className="text-slate-500 max-w-sm mt-2">You don't have access to any active features. Contact your administrator to request access.</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Button
          variant="destructive"
          onClick={handleLogout}
          className="fixed bottom-6 right-6 h-16 px-6 text-lg font-semibold gap-3 rounded-full shadow-xl z-20"
        >
          <Lock className="w-6 h-6" />
          Lock
        </Button>

      </main>
    </div>
  );
}

export default function AttendantDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    }>
      <AttendantDashboardContent />
    </Suspense>
  );
}
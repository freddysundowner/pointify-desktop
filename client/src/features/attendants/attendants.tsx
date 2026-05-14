import { useState } from 'react';
import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, UserPlus, Settings, ArrowLeft, KeyRound, MoreVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Link } from 'wouter';
import { useNavigationRoute } from '@/lib/navigation-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/features/auth/useAuth';

interface Permission {
  key: string;
  value: string[];
}

interface Attendant {
  _id: string;
  username: string;
  uniqueDigits: number;
  password?: string;
  shopId: string | { _id: string; name: string };
  adminId: string;
  permissions: Permission[];
  createdAt?: string;
  last_seen?: string;
  status?: 'active' | 'inactive' | 'on_leave';
}

export default function Attendants() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [isEditingPermissions, setIsEditingPermissions] = useState(false);
  const [selectedAttendant, setSelectedAttendant] = useState<Attendant | null>(null);
  const [generatedPin, setGeneratedPin] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [editingPermissions, setEditingPermissions] = useState<Permission[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { admin } = useAuth(); // Use AuthProvider context instead of Redux
  const { selectedShopId, availableShops } = useSelector((state: RootState) => state.shop);
  
  // Force use of admin's primary shop if no shop is selected
  const shopId = selectedShopId || admin?.primaryShop?.id || admin?.primaryShop?._id || admin?.primaryShop;
  
  // Get admin's primary shop ID
  const primaryShopId = typeof admin?.primaryShop === 'string' ? admin.primaryShop : admin?.primaryShop?._id;
  const currentShopId = selectedShopId || primaryShopId;

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    permissions: [] as Permission[]
  });

  // Get shops data - availableShops uses 'id' field, not '_id'
  const shops = availableShops.map(shop => ({
    id: shop.id,
    name: shop?.name,
    location: shop.location || 'No address'
  }));
  
  console.log('Shops mapped:', shops);
  console.log('Available shops raw:', availableShops);
  console.log('Form shop ID:', formData.shopId);

  // Get admin from localStorage as fallback
  const localAdmin = JSON.parse(localStorage.getItem('adminData') || '{}');
  const effectiveAdmin = admin || localAdmin;

  // Fetch admin permissions when editing permissions
  const { data: adminPermissions = [], isLoading: isLoadingPermissions } = useQuery({
    queryKey: ['/api/admin/permissions'],
    queryFn: () => {
      const token = localStorage.getItem('authToken');
      return fetch(`/api/admin/permissions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
        .then(res => {
          if (!res.ok) throw new Error(`API error: ${res.status}`);
          return res.json();
        })
        .then(data => {
          console.log('Admin permissions response:', data);
          return Array.isArray(data) ? data : data.permissions || [];
        });
    },
    enabled: isPermissionsDialogOpen,
  });

  // Permission editing functions
  const initializeEditingPermissions = (attendant: Attendant) => {
    setEditingPermissions(attendant.permissions || []);
  };

  const toggleEditingPermission = (groupKey: string, action: string, checked: boolean) => {
    setEditingPermissions(prev => {
      const permissions = [...prev];
      const existingIndex = permissions.findIndex(p => p.key === groupKey);
      
      if (existingIndex >= 0) {
        if (checked) {
          // Add action if not already present
          if (!permissions[existingIndex].value.includes(action)) {
            permissions[existingIndex].value.push(action);
          }
        } else {
          // Remove action
          permissions[existingIndex].value = permissions[existingIndex].value.filter(a => a !== action);
          if (permissions[existingIndex].value.length === 0) {
            // Remove permission group if no actions left
            permissions.splice(existingIndex, 1);
          }
        }
      } else if (checked) {
        // Create new permission group
        permissions.push({
          key: groupKey,
          value: [action]
        });
      }
      
      return permissions;
    });
  };

  const hasEditingPermission = (groupKey: string, action: string) => {
    const permission = editingPermissions.find(p => p.key === groupKey);
    return permission?.value?.includes(action) || false;
  };
  
  // Debug logging
  console.log('Auth admin:', admin);
  console.log('LocalStorage admin:', localAdmin);
  console.log('Debug attendants query:', {
    currentShopId,
    adminId: effectiveAdmin?._id || effectiveAdmin?.id,
    primaryShopId,
    enabled: !!currentShopId && !!(effectiveAdmin?._id || effectiveAdmin?.id),
    selectedShopId,
    availableShopsCount: availableShops.length
  });

  const effectiveAdminId = effectiveAdmin?._id || effectiveAdmin?.id || '';

  const { data: attendants = [], isLoading, error } = useQuery({
    queryKey: ['/api/attendants/all', effectiveAdminId],
    queryFn: () => {
      const token = localStorage.getItem('authToken');
      return fetch(`/api/attendants/all/${effectiveAdminId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
        .then(res => {
          if (!res.ok) throw new Error(`API error: ${res.status}`);
          return res.json();
        })
        .then(data => Array.isArray(data) ? data : data.data || []);
    },
    enabled: !!effectiveAdminId,
    onError: (error: Error) => {
      console.error('Error fetching attendants:', error);
      toast({
        title: "Error",
        description: "Failed to load attendants",
        variant: "destructive",
      });
    }
  });

  // Create attendant mutation
  const createAttendantMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/attendants', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendants/all'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Attendant created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create attendant",
        variant: "destructive",
      });
    }
  });

  // Update attendant mutation
  const updateAttendantMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest('PUT', `/api/attendants/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendants/all'] });
      setIsDialogOpen(false);
      setIsPermissionsDialogOpen(false);
      setIsEditingPermissions(false);
      resetForm();
      toast({
        title: "Success",
        description: "Attendant updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update attendant",
        variant: "destructive",
      });
    }
  });

  // Delete attendant mutation
  const deleteAttendantMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/attendants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendants/all'] });
      setIsDeleteDialogOpen(false);
      setSelectedAttendant(null);
      toast({
        title: "Success",
        description: "Attendant deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete attendant",
        variant: "destructive",
      });
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      apiRequest('PUT', `/api/attendants/${id}`, { password }),
    onSuccess: () => {
      setIsResetPasswordDialogOpen(false);
      setResetPasswordValue('');
      setShowResetPassword(false);
      setSelectedAttendant(null);
      toast({ title: "Success", description: "Password reset successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    }
  });

  const generateRandomPin = () => {
    // Generate a unique 5-digit PIN
    let pin;
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loop
    
    do {
      pin = Math.floor(10000 + Math.random() * 90000);
      attempts++;
    } while (
      attempts < maxAttempts && 
      attendants.some((attendant: Attendant) => attendant.uniqueDigits === pin)
    );
    
    return pin;
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      permissions: []
    });
    setSelectedAttendant(null);
    setGeneratedPin(0);
    setShowPassword(false);
  };

  const handleCreate = () => {
    const pin = generateRandomPin();
    setGeneratedPin(pin);
    setFormData({
      username: '',
      password: '',
      permissions: []
    });
    setSelectedAttendant(null);
    setShowPassword(false);
    setIsDialogOpen(true);
  };

  const handleEdit = (attendant: Attendant) => {
    setSelectedAttendant(attendant);
    setFormData({
      username: attendant.username,
      password: '',
      permissions: attendant.permissions || []
    });
    setIsDialogOpen(true);
  };

  const handleResetPassword = (attendant: Attendant) => {
    setSelectedAttendant(attendant);
    setResetPasswordValue('');
    setShowResetPassword(false);
    setIsResetPasswordDialogOpen(true);
  };

  const handleEditPermissions = (attendant: Attendant) => {
    setSelectedAttendant(attendant);
    initializeEditingPermissions(attendant);
    setIsPermissionsDialogOpen(true);
  };

  const handleDelete = (attendant: Attendant) => {
    setSelectedAttendant(attendant);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.username || (!selectedAttendant && !formData.password)) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const shopId = currentShopId || (availableShops.length > 0 ? availableShops[0].id : '');
    const submitData = {
      username: formData.username,
      uniqueDigits: selectedAttendant ? selectedAttendant.uniqueDigits : generatedPin,
      shopId,
      adminId: admin?._id,
      permissions: formData.permissions,
      ...(formData.password && { password: formData.password })
    };

    if (selectedAttendant) {
      updateAttendantMutation.mutate({ id: selectedAttendant._id, data: submitData });
    } else {
      createAttendantMutation.mutate(submitData);
    }
  };

  // Filter attendants based on search query
  const filteredAttendants = attendants.filter((attendant: Attendant) =>
    attendant.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    attendant.uniqueDigits?.toString().includes(searchQuery)
  );

  const activeAttendants = attendants.filter((a: Attendant) => a.status === 'active' || !a.status).length;

  // Dynamic permission groups based on actual API data
  const getAvailablePermissionKeys = () => {
    const allKeys = new Set<string>();
    attendants.forEach((attendant: Attendant) => {
      attendant.permissions?.forEach(p => allKeys.add(p.key));
    });
    return Array.from(allKeys);
  };

  const getAvailableActionsForKey = (key: string) => {
    const allActions = new Set<string>();
    attendants.forEach((attendant: Attendant) => {
      const permission = attendant.permissions?.find(p => p.key === key);
      if (permission) {
        permission.value.forEach(action => allActions.add(action));
      }
    });
    return Array.from(allActions);
  };

  // Dynamic permission groups based on real API data
  const permissionGroups = React.useMemo(() => {
    const groups: Record<string, { name: string; actions: string[] }> = {};
    const availableKeys = getAvailablePermissionKeys();
    
    availableKeys.forEach(key => {
      groups[key] = {
        name: key.charAt(0).toUpperCase() + key.slice(1),
        actions: getAvailableActionsForKey(key)
      };
    });

    // Add fallback groups for common permission keys if not found in API data
    const fallbackGroups = {
      products: {
        name: 'Products',
        actions: ['edit', 'view_adjustment_history', 'adjust_stock']
      },
      stocks: {
        name: 'Stocks',
        actions: ['view_products', 'add_purchases', 'view_purchases', 'add_products', 'view_buying_price', 'stock_summary']
      },
      warehouse: {
        name: 'Warehouse',
        actions: ['view_orders', 'accept_warehouse_orders']
      },
      sales: {
        name: 'Sales',
        actions: ['create_sales', 'view_sales', 'edit_sales', 'delete_sales', 'process_payments']
      },
      customers: {
        name: 'Customers',
        actions: ['add_customers', 'view_customers', 'edit_customers', 'view_debt', 'manage_payments']
      },
      reports: {
        name: 'Reports & Analytics',
        actions: ['view_sales_reports', 'view_inventory_reports', 'view_financial_reports', 'export_data']
      }
    };

    // Merge API data with fallbacks
    Object.keys(fallbackGroups).forEach(key => {
      if (!groups[key]) {
        groups[key] = fallbackGroups[key];
      }
    });

    return groups;
  }, [attendants]);

  // Permission helper functions
  const hasPermission = (groupKey: string, action: string) => {
    const permission = formData.permissions.find(p => p.key === groupKey);
    return permission?.value.includes(action) || false;
  };

  const handlePermissionChange = (groupKey: string, action: string, checked: boolean) => {
    setFormData(prev => {
      const permissions = [...prev.permissions];
      const existingIndex = permissions.findIndex(p => p.key === groupKey);
      
      if (existingIndex >= 0) {
        if (checked) {
          if (!permissions[existingIndex].value.includes(action)) {
            permissions[existingIndex].value.push(action);
          }
        } else {
          permissions[existingIndex].value = permissions[existingIndex].value.filter(v => v !== action);
          if (permissions[existingIndex].value.length === 0) {
            permissions.splice(existingIndex, 1);
          }
        }
      } else if (checked) {
        permissions.push({ key: groupKey, value: [action] });
      }
      
      return { ...prev, permissions };
    });
  };

  const savePermissions = () => {
    if (!selectedAttendant) return;
    
    const submitData = {
      username: selectedAttendant.username,
      uniqueDigits: selectedAttendant.uniqueDigits,
      shopId: typeof selectedAttendant.shopId === 'string' ? selectedAttendant.shopId : selectedAttendant.shopId._id,
      adminId: admin?._id,
      permissions: formData.permissions
    };

    updateAttendantMutation.mutate({ id: selectedAttendant._id, data: submitData });
  };

  // Get shop name for display
  const getShopName = (shopId: string | { _id: string; name: string }) => {
    if (typeof shopId === 'object') return shopId?.name;
    const shop = shops.find((s) => s.id === shopId);
    return shop?.name || 'Unknown Shop';
  };

  const selectedShop = shops.find((shop) => shop.id === currentShopId);
  const dashboardRoute = useNavigationRoute('dashboard');

  return (
    <DashboardLayout>
      <div className="space-y-3 sm:space-y-5">
        <PageHeader
          title="Staff"
          backHref={dashboardRoute}
          actions={
            <Button onClick={handleCreate} size="sm" className="h-8 text-xs flex-shrink-0">
              <UserPlus className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Add </span>Attendant
            </Button>
          }
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-1.5">
          <Card>
            <CardContent className="p-2">
              <div className="text-sm sm:text-base font-bold text-purple-600">{filteredAttendants.length}</div>
              <div className="text-[10px] text-gray-500">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <div className="text-sm sm:text-base font-bold text-green-600">{activeAttendants}</div>
              <div className="text-[10px] text-gray-500">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <div className="text-sm sm:text-base font-bold text-orange-600">
                {attendants.filter((a: Attendant) => a.status === 'on_leave').length}
              </div>
              <div className="text-[10px] text-gray-500">On Leave</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <div className="text-sm sm:text-base font-bold text-red-600">
                {attendants.filter((a: Attendant) => a.status === 'inactive').length}
              </div>
              <div className="text-[10px] text-gray-500">Inactive</div>
            </CardContent>
          </Card>
        </div>

        {/* Search + Table */}
        <Card>
          <CardHeader className="py-2 px-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
                <Input
                  placeholder="Search staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-8 text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-8 text-sm text-gray-500">Loading attendants...</div>
            ) : error ? (
              <div className="text-center py-8 text-sm text-red-600">Error loading attendants</div>
            ) : filteredAttendants.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500">
                {searchQuery ? 'No attendants found matching your search' : 'No attendants found for this shop'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">PIN</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 hidden md:table-cell">Last Seen</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredAttendants.map((attendant: Attendant) => (
                      <tr key={attendant._id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="text-xs font-medium text-gray-900">{attendant.username}</div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs font-mono text-gray-500">{attendant.uniqueDigits}</span>
                        </td>
                        <td className="px-3 py-2 hidden md:table-cell">
                          <span className="text-xs text-gray-500">{attendant.last_seen ? new Date(attendant.last_seen).toLocaleDateString() : 'Never'}</span>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={attendant.status === 'active' || !attendant.status ? 'default' : attendant.status === 'on_leave' ? 'secondary' : 'destructive'} className="text-[10px] px-1.5 py-0">
                            {attendant.status || 'active'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(attendant)}>
                                <Edit className="h-4 w-4 mr-2 text-blue-600" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditPermissions(attendant)}>
                                <Settings className="h-4 w-4 mr-2 text-blue-600" />
                                Permissions
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleResetPassword(attendant)}>
                                <KeyRound className="h-4 w-4 mr-2 text-amber-600" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(attendant)} className="text-red-600 focus:text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Attendant Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>
                {selectedAttendant ? 'Edit Attendant' : 'Create New Attendant'}
              </DialogTitle>
              <DialogDescription>
                {selectedAttendant ? 'Update attendant information' : 'Add a new attendant to your team'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">PIN</Label>
                <Input
                  id="pin"
                  value={selectedAttendant ? selectedAttendant.uniqueDigits : generatedPin}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500">
                  {selectedAttendant
                    ? "Existing PIN cannot be changed"
                    : "Auto-generated 5-digit PIN for this attendant"
                  }
                </p>
              </div>

              {!selectedAttendant && (
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-6">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                className="w-full sm:w-auto"
                onClick={handleSubmit}
                disabled={createAttendantMutation.isPending || updateAttendantMutation.isPending}
              >
                {selectedAttendant ? 'Update' : 'Create'} Attendant
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={isResetPasswordDialogOpen} onOpenChange={(open) => {
          if (!open) { setIsResetPasswordDialogOpen(false); setResetPasswordValue(''); setShowResetPassword(false); }
        }}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-sm p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Set a new password for <strong>{selectedAttendant?.username}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 mt-2">
              <Label htmlFor="reset-password">New Password</Label>
              <div className="relative">
                <Input
                  id="reset-password"
                  type={showResetPassword ? "text" : "password"}
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  placeholder="Enter new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                >
                  {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-6">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => { setIsResetPasswordDialogOpen(false); setResetPasswordValue(''); setShowResetPassword(false); }}
              >
                Cancel
              </Button>
              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  if (!resetPasswordValue.trim()) {
                    toast({ title: "Error", description: "Please enter a new password", variant: "destructive" });
                    return;
                  }
                  if (selectedAttendant) {
                    resetPasswordMutation.mutate({ id: selectedAttendant._id, password: resetPasswordValue });
                  }
                }}
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Attendant</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedAttendant?.username}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedAttendant && deleteAttendantMutation.mutate(selectedAttendant._id)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Permissions Dialog */}
        <Dialog open={isPermissionsDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsPermissionsDialogOpen(false);
            setIsEditingPermissions(false);
          }
        }}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>
                {isEditingPermissions ? 'Edit Permissions' : 'View Permissions'}
              </DialogTitle>
              <DialogDescription>
                {isEditingPermissions ? 'Assign permissions for' : 'Current permissions for'} {selectedAttendant?.username}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto mt-2">
              {isLoadingPermissions ? (
                <div className="text-center py-8">Loading permissions...</div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Available Permissions for {selectedAttendant?.username}:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {adminPermissions.map((permission: Permission) => {
                      const isExpanded = expandedGroups.has(permission.key);
                      const checkedCount = permission.value.filter(a => hasEditingPermission(permission.key, a)).length;
                      return (
                        <div key={permission.key} className="border rounded-lg overflow-hidden">
                          <button
                            type="button"
                            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                            onClick={() => setExpandedGroups(prev => {
                              const next = new Set(prev);
                              next.has(permission.key) ? next.delete(permission.key) : next.add(permission.key);
                              return next;
                            })}
                          >
                            <span className="font-medium text-sm text-blue-700 capitalize">{permission.key}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-500">{checkedCount}/{permission.value.length}</span>
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="p-3 space-y-2">
                              {permission.value.map((action: string) => {
                                const isChecked = hasEditingPermission(permission.key, action);
                                return (
                                  <div key={action} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`${permission.key}-${action}`}
                                      checked={isChecked}
                                      onCheckedChange={(checked) => {
                                        toggleEditingPermission(permission.key, action, checked as boolean);
                                      }}
                                    />
                                    <Label htmlFor={`${permission.key}-${action}`} className="text-xs font-normal cursor-pointer leading-tight">
                                      {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </Label>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-4 pt-4 border-t">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setIsPermissionsDialogOpen(false);
                  setEditingPermissions([]);
                }}
              >
                Cancel
              </Button>
              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  if (!selectedAttendant) return;
                  
                  const submitData = {
                    username: selectedAttendant.username,
                    uniqueDigits: selectedAttendant.uniqueDigits,
                    shopId: typeof selectedAttendant.shopId === 'string' ? selectedAttendant.shopId : selectedAttendant.shopId._id,
                    adminId: effectiveAdmin?._id || effectiveAdmin?.id,
                    permissions: editingPermissions
                  };

                  console.log('Saving permissions:', submitData);
                  updateAttendantMutation.mutate({ 
                    id: selectedAttendant._id, 
                    data: submitData 
                  }, {
                    onSuccess: () => {
                      setIsPermissionsDialogOpen(false);
                      setEditingPermissions([]);
                      toast({
                        title: "Success",
                        description: "Permissions updated successfully",
                      });
                    }
                  });
                }}
                disabled={updateAttendantMutation.isPending}
              >
                {updateAttendantMutation.isPending ? 'Saving...' : 'Save Permissions'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
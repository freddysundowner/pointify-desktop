import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Phone, Mail, MapPin, CreditCard, Eye, ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { useAuth } from '@/features/auth/useAuth';
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { useShop } from "@/features/shop/useShop";
import { useAttendantAuth } from "@/contexts/AttendantAuthContext";
import { usePrimaryShop } from "@/hooks/usePrimaryShop";
import { useNavigationRoute } from "@/lib/navigation-utils";

interface Customer {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  phonenumber?: string;
  address?: string;
  balance: number;
  totalPurchases: number;
  lastPurchase?: string;
  status: 'active' | 'inactive';
  customerType: 'regular' | 'vip' | 'wholesale';
  wallet?: number;
  online?: boolean;
  dueDate?: string;
}

export default function Customers() {
  const { admin, token } = useAuth();
  const { attendant, isAuthenticated: isAttendantAuth } = useAttendantAuth();
  const { userType, shopId: primaryShopId, adminId } = usePrimaryShop();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const dashboardRoute = useNavigationRoute('dashboard');
  const customerOverviewRoute = useNavigationRoute('customerOverview');
  const queryClient = useQueryClient();
  
  // Helper function to generate customer overview URL
  const getCustomerOverviewUrl = (customerId: string) => {
    return `${customerOverviewRoute}?id=${customerId}`;
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    wallet: 0
  });

  const { selectedShopId } = useSelector((state: RootState) => state.shop);
  const { currency } = useShop();
  
  // Get the correct shop ID and admin ID based on user type
  const shopId = selectedShopId || primaryShopId;
  const currentAdminId = userType === "attendant" ? adminId : (admin?._id || admin?.id);

  // Fetch customers
  const { data: customersResponse, isLoading } = useQuery({
    queryKey: ['customers', shopId, userType],
    queryFn: async () => {
      if (!shopId || !currentAdminId) return [];
      
      const params = new URLSearchParams({
        shopId: shopId,
        adminid: currentAdminId
      });
      
      const response = await apiRequest('GET', `/api/customers?${params.toString()}`);
      const data = await response.json();
      return data;
    },
    enabled: !!shopId && !!currentAdminId && 
             (userType === "admin" ? !!admin && !!token : userType === "attendant" ? !!attendant && isAttendantAuth : false),
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache data
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  const customers = Array.isArray(customersResponse) 
    ? customersResponse 
    : customersResponse?.customers || customersResponse?.data || [];

  console.log('=== CUSTOMERS DEBUG ===');
  console.log('Raw customersResponse:', customersResponse);
  console.log('Processed customers array:', customers);
  console.log('Array length:', customers.length);
  if (customers.length > 0) {
    console.log('First customer:', customers[0]);
  }

  // Fetch customer analysis data
  const { data: analysisData } = useQuery({
    queryKey: ['customer-analysis', shopId, userType],
    queryFn: async () => {
      if (!shopId || !currentAdminId) return null;
      
      const params = new URLSearchParams({
        adminid: currentAdminId
      });
      
      const response = await apiRequest('GET', `/api/customers/analysis/${shopId}?${params.toString()}`);
      const data = await response.json();
      console.log('Customer Analysis Data:', data);
      return data;
    },
    enabled: !!shopId && !!currentAdminId && 
             (userType === "admin" ? !!admin && !!token : userType === "attendant" ? !!attendant && isAttendantAuth : false),
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache data
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });



  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (data: any) => {
      // Ensure name is not empty
      if (!data.name || data.name.trim() === '') {
        throw new Error('Customer name is required');
      }

      const customerData = {
        name: data.name.trim(),
        wallet: Number(data.wallet) || 0,
        phonenumber: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        shopId: shopId,
        adminid: currentAdminId
      };

      console.log('Customer Creation Debug:', {
        userType,
        shopId,
        currentAdminId,
        primaryShopId,
        adminId: adminId,
        selectedShopId,
        attendantExists: !!attendant,
        adminExists: !!admin
      });
      console.log('Frontend: Sending customer data:', customerData);
      
      const response = await apiRequest('POST', '/api/customers', customerData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-analysis'] });
      setIsCreateDialogOpen(false);
      setNewCustomer({ name: '', email: '', phone: '', address: '', wallet: 0 });
      toast({
        title: "Success",
        description: "Customer created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      });
    },
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PUT', `/api/customers/${data._id}`, {
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-analysis'] });
      setEditingCustomer(null);
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update customer",
        variant: "destructive",
      });
    },
  });

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const response = await apiRequest('DELETE', `/api/customers/${customerId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-analysis'] });
      toast({
        title: "Success",
        description: "Customer deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete customer",
        variant: "destructive",
      });
    },
  });

  const filteredCustomers = customers.filter((customer: Customer) =>
    customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery) ||
    customer.phonenumber?.includes(searchQuery)
  );

  const handleCreateCustomer = () => {
    // Validate required fields
    if (!newCustomer.name || newCustomer.name.trim() === '') {
      toast({
        title: "Validation Error",
        description: "Customer name is required",
        variant: "destructive",
      });
      return;
    }
    
    createCustomerMutation.mutate(newCustomer);
  };

  const handleUpdateCustomer = () => {
    if (editingCustomer) {
      updateCustomerMutation.mutate(editingCustomer);
    }
  };

  const handleDeleteCustomer = (customerId: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      deleteCustomerMutation.mutate(customerId);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
  };

  return (
    <DashboardLayout>
      <div className="space-y-3 sm:space-y-5">
        <PageHeader
          title="Customers"
          onBack={() => navigate(dashboardRoute)}
          actions={
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 text-xs sm:text-sm">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden sm:inline">Add Customer</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100%-1.5rem)] max-w-sm rounded-xl">
                <DialogHeader>
                  <DialogTitle className="text-base">Add New Customer</DialogTitle>
                </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name" className="text-xs font-medium mb-1 block">Customer Name *</Label>
                  <Input
                    id="name"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="Enter customer name"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs font-medium mb-1 block">Phone Number</Label>
                  <Input
                    id="phone"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    placeholder="Enter phone number"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-xs font-medium mb-1 block">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    placeholder="Enter email address"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="address" className="text-xs font-medium mb-1 block">Address</Label>
                  <Input
                    id="address"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    placeholder="Enter address"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="wallet" className="text-xs font-medium mb-1 block">Initial Wallet Balance</Label>
                  <Input
                    id="wallet"
                    type="number"
                    value={newCustomer.wallet}
                    onChange={(e) => setNewCustomer({ ...newCustomer, wallet: Number(e.target.value) })}
                    placeholder="0"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1 h-9" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 h-9"
                    onClick={handleCreateCustomer}
                    disabled={!newCustomer.name || createCustomerMutation.isPending}
                  >
                    {createCustomerMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
            </Dialog>
          }
        />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-2">
              <p className="text-[10px] font-medium text-gray-500">Total</p>
              <p className="text-sm sm:text-base font-bold text-gray-900">{analysisData?.totalCustomers || customers.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <p className="text-[10px] font-medium text-gray-500">Wallet</p>
              <p className="text-xs sm:text-sm font-bold text-green-600 truncate">{currency} {(analysisData?.totalWalletBalance || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <p className="text-[10px] font-medium text-gray-500">Outstanding</p>
              <p className="text-xs sm:text-sm font-bold text-red-600 truncate">{currency} {(analysisData?.totalOutstanding || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Top Debtors Section */}
        {analysisData?.topDebtors && analysisData.topDebtors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-orange-600">Top Debtors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysisData.topDebtors.map((debtor: any, index: number) => (
                  <div key={debtor.customerId} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-6 h-6 md:w-8 md:h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-semibold text-xs md:text-sm flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{debtor.name}</p>
                        {debtor.phonenumber && (
                          <p className="text-xs md:text-sm text-gray-500 truncate">{debtor.phonenumber}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 md:space-x-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-semibold text-orange-600 text-sm md:text-base">
                          {currency} {debtor.totalOutstanding.toLocaleString()}
                        </p>
                        {debtor.totalSpent > 0 && (
                          <p className="text-xs md:text-sm text-gray-500 hidden sm:block">
                            Total Spent: {currency} {debtor.totalSpent.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <Link href={getCustomerOverviewUrl(debtor.customerId || debtor._id)}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 hover:text-blue-700 h-8 w-8 p-0"
                          onClick={() => {
                            // Find the complete customer data from the customers array
                            const fullCustomerData = customers.find(c => c._id === (debtor.customerId || debtor._id));
                            if (fullCustomerData) {
                              // Pass complete customer data to customer overview
                              (window as any).__customerData = fullCustomerData;
                            } else {
                              // Fallback to debtor data if customer not found in array
                              (window as any).__customerData = {
                                _id: debtor.customerId || debtor._id,
                                name: debtor.name,
                                phonenumber: debtor.phonenumber,
                                wallet: debtor.totalOutstanding * -1 // Convert outstanding to negative wallet balance
                              };
                            }
                          }}
                        >
                          <Eye className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
                {(!analysisData?.topDebtors || analysisData.topDebtors.length === 0) && (
                  <div className="text-center py-6 text-gray-500">
                    <p>No customers with outstanding balances</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}



        {/* Customers Table */}
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="space-y-2">
                  {[...Array(5)].map((_, index) => (
                    <div key={index} className="h-3 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : filteredCustomers.length > 0 ? (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs py-2">Customer</TableHead>
                    <TableHead className="text-xs py-2 hidden sm:table-cell">Contact</TableHead>
                    <TableHead className="text-xs py-2">Wallet</TableHead>
                    <TableHead className="text-xs py-2 hidden sm:table-cell">Outstanding</TableHead>
                    <TableHead className="text-xs py-2 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer: Customer) => {
                    const outstandingBalance = Math.abs(customer.wallet || 0);
                    const walletBalance = customer.wallet || 0;
                    return (
                      <TableRow key={customer._id}>
                        <TableCell className="py-2 px-2 sm:px-4">
                          <p className="font-medium text-xs sm:text-sm">{customer.name}</p>
                          <p className="text-[10px] text-gray-500 capitalize">{customer.customerType || 'Regular'}</p>
                          <div className="sm:hidden space-y-0.5 mt-0.5">
                            {(customer.phonenumber || customer.phone) && <p className="text-[10px] text-gray-400 flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{customer.phonenumber || customer.phone}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 hidden sm:table-cell">
                          <div className="space-y-0.5 text-xs text-gray-600">
                            {(customer.phonenumber || customer.phone) && <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-gray-400" />{customer.phonenumber || customer.phone}</div>}
                            {customer.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-gray-400" />{customer.email}</div>}
                            {customer.address && <div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-gray-400" />{customer.address}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4">
                          <span className={`text-xs sm:text-sm font-medium ${walletBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {currency} {walletBalance.toLocaleString()}
                          </span>
                          {walletBalance < 0 && (
                            <p className="text-[10px] text-red-500 sm:hidden">Owed: {currency} {outstandingBalance.toLocaleString()}</p>
                          )}
                        </TableCell>
                        <TableCell className="py-2 hidden sm:table-cell">
                          {walletBalance < 0 ? (
                            <span className="text-xs font-medium text-red-600">{currency} {outstandingBalance.toLocaleString()}</span>
                          ) : <span className="text-xs text-gray-400">—</span>}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={getCustomerOverviewUrl(customer._id)}>
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-blue-600"
                                onClick={() => { (window as any).__customerData = { _id: customer._id, name: customer.name, email: customer.email, phonenumber: customer.phonenumber || customer.phone, address: customer.address, wallet: customer.wallet, customerType: customer.customerType }; }}
                              ><Eye className="h-3 w-3" /></Button>
                            </Link>
                            <Button size="sm" variant="outline" onClick={() => handleEdit(customer)} className="h-7 w-7 p-0"><Edit className="h-3 w-3" /></Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeleteCustomer(customer._id)} className="h-7 w-7 p-0 text-red-600"><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery ? 'No customers match your search criteria.' : 'Get started by adding your first customer.'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Edit Customer Dialog */}
        <Dialog open={!!editingCustomer} onOpenChange={() => setEditingCustomer(null)}>
          <DialogContent className="w-[calc(100%-1.5rem)] max-w-sm rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-base">Edit Customer</DialogTitle>
            </DialogHeader>
            {editingCustomer && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="edit-name" className="text-xs font-medium mb-1 block">Customer Name *</Label>
                  <Input
                    id="edit-name"
                    value={editingCustomer.name}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone" className="text-xs font-medium mb-1 block">Phone Number</Label>
                  <Input
                    id="edit-phone"
                    value={editingCustomer.phonenumber || editingCustomer.phone || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phonenumber: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email" className="text-xs font-medium mb-1 block">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingCustomer.email || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-address" className="text-xs font-medium mb-1 block">Address</Label>
                  <Input
                    id="edit-address"
                    value={editingCustomer.address || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-wallet" className="text-xs font-medium mb-1 block">Wallet Balance</Label>
                  <Input
                    id="edit-wallet"
                    type="number"
                    value={editingCustomer.wallet || 0}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, wallet: Number(e.target.value) })}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1 h-9" onClick={() => setEditingCustomer(null)}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 h-9"
                    onClick={handleUpdateCustomer}
                    disabled={!editingCustomer.name || updateCustomerMutation.isPending}
                  >
                    {updateCustomerMutation.isPending ? 'Updating...' : 'Update'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
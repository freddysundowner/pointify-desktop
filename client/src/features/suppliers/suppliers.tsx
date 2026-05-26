import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Plus, Search, Edit, Trash2, Phone, Mail, MapPin, Building2, DollarSign, History, ArrowLeft, CreditCard, MoreHorizontal } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import DashboardLayout from '@/components/layout/dashboard-layout';
import AlertModal from '@/components/ui/alert-modal';
import { useForm } from 'react-hook-form';
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { useAuth } from "@/features/auth/useAuth";
import { useAttendantAuth } from "@/contexts/AttendantAuthContext";

interface Supplier {
  _id: string;
  name: string;
  contact: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  creditLimit?: number;
  wallet?: number;
  status?: 'active' | 'inactive';
}

interface SupplierFormData {
  name: string;
  phoneNumber: string;
  email: string;
  address: string;
}

export default function SuppliersPage() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const { toast } = useToast();

  // Authentication hooks
  const { admin } = useAuth();
  const { attendant } = useAttendantAuth();
  
  // Check if this is an attendant route
  const isAttendantRoute = window.location.pathname.startsWith('/attendant');
  
  // Handle back button navigation
  const handleBack = () => window.history.back();

  // Get shop ID based on user type
  const { selectedShopId } = useSelector((state: RootState) => state.shop);
  const primaryShop = typeof admin?.primaryShop === 'object' ? admin.primaryShop : null;
  const attendantShopId = typeof attendant?.shopId === 'object' ? attendant.shopId._id : attendant?.shopId;
  const shopId = isAttendantRoute ? attendantShopId : (selectedShopId || (primaryShop as any)?._id);
  


  // Form hooks
  const createForm = useForm<SupplierFormData>({
    defaultValues: {
      name: '',
      phoneNumber: '',
      email: '',
      address: ''
    }
  });

  const editForm = useForm<SupplierFormData>({
    defaultValues: {
      name: '',
      phoneNumber: '',
      email: '',
      address: ''
    }
  });

  // Fetch suppliers (server-paginated)
  const { data: pageData, isLoading, error } = useQuery<{ data: Supplier[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>({
    queryKey: ['/api/suppliers', shopId, page, limit],
    queryFn: async () => {
      if (!shopId) return { data: [], pagination: { total: 0, page: 1, limit, totalPages: 1 } };
      const response = await apiRequest('GET', `/api/suppliers?shopId=${shopId}&page=${page}&limit=${limit}`);
      const json = await response.json();
      return json || { data: [], pagination: { total: 0, page: 1, limit, totalPages: 1 } };
    },
    enabled: !!shopId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
  const suppliers: Supplier[] = pageData?.data || [];
  const pagination = pageData?.pagination || { total: 0, page: 1, limit, totalPages: 1 };



  // Create supplier mutation
  const createMutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      const payload = {
        ...data,
        shopId,
        attendantId: isAttendantRoute ? attendant?._id : admin?.attendantId,
        adminId: isAttendantRoute ? attendant?.adminId : admin?._id
      };
      const response = await apiRequest('POST', '/api/suppliers', payload);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Supplier created successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create supplier",
        variant: "destructive"
      });
    }
  });

  // Update supplier mutation
  const updateMutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      if (!selectedSupplier) throw new Error('No supplier selected');
      const response = await apiRequest('PUT', `/api/suppliers/${selectedSupplier._id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Supplier updated successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      setIsEditDialogOpen(false);
      setSelectedSupplier(null);
      editForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update supplier",
        variant: "destructive"
      });
    }
  });

  // Delete supplier mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/suppliers/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Supplier deleted successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      setIsDeleteModalOpen(false);
      setSelectedSupplier(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete supplier",
        variant: "destructive"
      });
    }
  });

  // Bulk delete suppliers mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await apiRequest('POST', '/api/suppliers/bulk-delete', { supplierIds: ids, shopId });
      return await response.json();
    },
    onSuccess: (_data, ids) => {
      toast({ title: 'Deleted', description: `${ids.length} supplier(s) removed` });
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      setSelectedIds(new Set());
      setIsBulkDeleteOpen(false);
    },
    onError: (error: any) => {
      toast({ title: 'Bulk delete failed', description: error.message || 'Could not delete suppliers', variant: 'destructive' });
    }
  });

  // Pay supplier debt mutation
  const payDebtMutation = useMutation({
    mutationFn: async ({ supplierId, amount }: { supplierId: string; amount: number }) => {
      const attendantId = isAttendantRoute ? attendant?._id : (typeof admin?.attendantId === 'object' ? admin?.attendantId?._id : admin?.attendantId) || admin?._id;
      const payload = {
        amount,
        attendantId,
        shopId
      };
      const response = await apiRequest('PUT', `/api/suppliers/${supplierId}`, payload);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Successful",
        description: "Supplier debt payment has been recorded successfully"
      });
      // Refresh suppliers data
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      // Refresh analytics data
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = String(query.queryKey[0] || '');
          return key.includes('/api/analysis/report/purchases');
        }
      });
      setIsPaymentDialogOpen(false);
      setSelectedSupplier(null);
      setPaymentAmount(0);
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Filter suppliers based on search
  const filteredSuppliers = Array.isArray(suppliers) ? suppliers.filter((supplier: Supplier) =>
    supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    editForm.reset({
      name: supplier.name || '',
      phoneNumber: supplier.phoneNumber || '',
      email: supplier.email || '',
      address: supplier.address || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDeleteModalOpen(true);
  };

  const handleViewHistory = (supplier: Supplier) => {
    const route = isAttendantRoute ? '/attendant/supplier-history' : '/supplier-history';
    navigate(`${route}?supplierId=${supplier._id}&supplierName=${encodeURIComponent(supplier.name)}`);
  };

  const handlePayDebt = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    // Convert negative wallet to positive payment amount
    setPaymentAmount(Math.abs(supplier.wallet || 0));
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = () => {
    if (!selectedSupplier || paymentAmount <= 0) return;
    payDebtMutation.mutate({
      supplierId: selectedSupplier._id,
      amount: paymentAmount
    });
  };

  const onCreateSubmit = (data: SupplierFormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: SupplierFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Suppliers">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading suppliers...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Suppliers">
        <div className="text-center py-12">
          <p className="text-red-600">Failed to load suppliers. Please try again.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Suppliers">
      <div className="space-y-3 sm:space-y-5">
        <PageHeader
          title="Suppliers"
          onBack={handleBack}
          actions={
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 text-xs sm:text-sm">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden sm:inline">Add Supplier</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="w-[calc(100%-1.5rem)] max-w-sm rounded-xl">
              <DialogHeader>
                <DialogTitle className="text-base">Create New Supplier</DialogTitle>
              </DialogHeader>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-3">
                <div>
                  <Label htmlFor="name" className="text-xs font-medium mb-1 block">Supplier Name *</Label>
                  <Input id="name" {...createForm.register('name', { required: true })} placeholder="Enter supplier name" className="h-9 text-sm" />
                </div>
                <div>
                  <Label htmlFor="phoneNumber" className="text-xs font-medium mb-1 block">Phone Number *</Label>
                  <Input id="phoneNumber" {...createForm.register('phoneNumber', { required: true })} placeholder="Enter phone number" className="h-9 text-sm" />
                </div>
                <div>
                  <Label htmlFor="email" className="text-xs font-medium mb-1 block">Email *</Label>
                  <Input id="email" type="email" {...createForm.register('email', { required: true })} placeholder="Enter email address" className="h-9 text-sm" />
                </div>
                <div>
                  <Label htmlFor="address" className="text-xs font-medium mb-1 block">Address *</Label>
                  <Textarea id="address" {...createForm.register('address', { required: true })} placeholder="Enter address" className="text-sm min-h-[72px] resize-none" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" className="flex-1 h-9" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1 h-9" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
            </Dialog>
          }
        />

        {/* Search + bulk actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="pl-8 h-8 text-sm"
              data-testid="input-search-suppliers"
            />
          </div>
          {selectedIds.size > 0 && (
            <Button
              size="sm"
              variant="destructive"
              className="h-8 text-xs"
              onClick={() => setIsBulkDeleteOpen(true)}
              data-testid="button-bulk-delete-suppliers"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete {selectedIds.size} selected
            </Button>
          )}
        </div>

        {/* Suppliers Table */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Suppliers ({pagination.total})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredSuppliers.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No suppliers match your search' : 'No suppliers found'}
                </p>
                {!searchTerm && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Supplier
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs py-2 w-8">
                        <Checkbox
                          checked={filteredSuppliers.length > 0 && filteredSuppliers.every((s: Supplier) => selectedIds.has(s._id))}
                          onCheckedChange={(v) => {
                            const next = new Set(selectedIds);
                            if (v) filteredSuppliers.forEach((s: Supplier) => next.add(s._id));
                            else filteredSuppliers.forEach((s: Supplier) => next.delete(s._id));
                            setSelectedIds(next);
                          }}
                          data-testid="checkbox-select-all-suppliers"
                        />
                      </TableHead>
                      <TableHead className="text-xs py-2">Company</TableHead>
                      <TableHead className="text-xs py-2 hidden sm:table-cell">Phone / Email</TableHead>
                      <TableHead className="text-xs py-2 hidden md:table-cell">Credit Limit</TableHead>
                      <TableHead className="text-xs py-2">Wallet</TableHead>
                      <TableHead className="text-xs py-2">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.map((supplier: Supplier) => (
                      <TableRow key={supplier._id} data-testid={`row-supplier-${supplier._id}`}>
                        <TableCell className="py-2 px-2 sm:px-4 w-8">
                          <Checkbox
                            checked={selectedIds.has(supplier._id)}
                            onCheckedChange={(v) => {
                              const next = new Set(selectedIds);
                              if (v) next.add(supplier._id); else next.delete(supplier._id);
                              setSelectedIds(next);
                            }}
                            data-testid={`checkbox-supplier-${supplier._id}`}
                          />
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4">
                          <p className="font-medium text-xs sm:text-sm">{supplier.name}</p>
                          {supplier.address && <p className="text-[10px] text-muted-foreground hidden sm:block">{supplier.address}</p>}
                          <div className="sm:hidden space-y-0.5 mt-0.5">
                            {supplier.phoneNumber && <p className="text-[10px] text-gray-500 flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{supplier.phoneNumber}</p>}
                            {supplier.email && <p className="text-[10px] text-gray-500 flex items-center gap-1"><Mail className="h-2.5 w-2.5" />{supplier.email}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 hidden sm:table-cell">
                          <div className="space-y-0.5 text-xs">
                            {supplier.phoneNumber && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{supplier.phoneNumber}</div>}
                            {supplier.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{supplier.email}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 hidden md:table-cell text-xs">
                          {supplier.creditLimit ? <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{supplier.creditLimit.toFixed(2)}</span> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4">
                          {supplier.wallet !== undefined && supplier.wallet !== null ? (
                            <Badge variant={supplier.wallet > 0 ? "destructive" : "default"} className="text-[10px]">
                              {supplier.wallet.toFixed(2)}
                            </Badge>
                          ) : <span className="text-xs text-muted-foreground">0.00</span>}
                        </TableCell>
                        <TableCell className="py-2 px-2 sm:px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewHistory(supplier)}>
                                <History className="mr-2 h-4 w-4" />History
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                                <Edit className="mr-2 h-4 w-4" />Edit
                              </DropdownMenuItem>
                              {!!supplier.wallet && supplier.wallet < 0 && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handlePayDebt(supplier)} className="text-green-600 focus:text-green-600">
                                    <CreditCard className="mr-2 h-4 w-4" />Pay Debt
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(supplier)} className="text-red-600 focus:text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {pagination.total > 0 && (
              <div className="flex items-center justify-between gap-3 pt-3 mt-3 border-t text-xs">
                <div className="text-muted-foreground" data-testid="text-pagination-summary">
                  Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
                  {searchTerm && <span className="ml-1 italic">(search filters current page)</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2"
                    disabled={pagination.page <= 1 || isLoading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    data-testid="button-prev-page"
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2"
                    disabled={pagination.page >= pagination.totalPages || isLoading}
                    onClick={() => setPage((p) => p + 1)}
                    data-testid="button-next-page"
                  >
                    Next
                  </Button>
                  <select
                    className="h-7 text-xs border rounded px-1 bg-background ml-1"
                    value={limit}
                    onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                    data-testid="select-page-size"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="w-[calc(100%-1.5rem)] max-w-sm rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-base">Edit Supplier</DialogTitle>
            </DialogHeader>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-3">
              <div>
                <Label htmlFor="edit-name" className="text-xs font-medium mb-1 block">Supplier Name *</Label>
                <Input id="edit-name" {...editForm.register('name', { required: true })} placeholder="Enter supplier name" className="h-9 text-sm" />
              </div>
              <div>
                <Label htmlFor="edit-phoneNumber" className="text-xs font-medium mb-1 block">Phone Number *</Label>
                <Input id="edit-phoneNumber" {...editForm.register('phoneNumber', { required: true })} placeholder="Enter phone number" className="h-9 text-sm" />
              </div>
              <div>
                <Label htmlFor="edit-email" className="text-xs font-medium mb-1 block">Email *</Label>
                <Input id="edit-email" type="email" {...editForm.register('email', { required: true })} placeholder="Enter email address" className="h-9 text-sm" />
              </div>
              <div>
                <Label htmlFor="edit-address" className="text-xs font-medium mb-1 block">Address *</Label>
                <Textarea id="edit-address" {...editForm.register('address', { required: true })} placeholder="Enter address" className="text-sm min-h-[72px] resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1 h-9" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1 h-9" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Updating...' : 'Update'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>



        {/* Pay Debt Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="w-[calc(100%-1.5rem)] max-w-sm rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-base">Pay Supplier Debt</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="bg-red-50 rounded-lg px-3 py-2.5 flex justify-between items-center">
                <span className="text-sm text-gray-600">{selectedSupplier?.name}</span>
                <span className="text-base font-bold text-red-600">
                  {Math.abs(selectedSupplier?.wallet || 0).toFixed(2)}
                </span>
              </div>
              <div>
                <Label htmlFor="paymentAmount" className="text-xs font-medium mb-1 block">Payment Amount</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  placeholder="Enter amount"
                  min="0"
                  max={Math.abs(selectedSupplier?.wallet || 0)}
                  step="0.01"
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1 h-9" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
                <Button
                  className="flex-1 h-9 bg-green-600 hover:bg-green-700"
                  onClick={handlePaymentSubmit}
                  disabled={payDebtMutation.isPending || paymentAmount <= 0}
                >
                  {payDebtMutation.isPending ? 'Processing...' : 'Pay Debt'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Delete Confirmation */}
        <AlertModal
          isOpen={isBulkDeleteOpen}
          onClose={() => setIsBulkDeleteOpen(false)}
          onConfirm={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
          title="Delete Suppliers"
          description={`Are you sure you want to delete ${selectedIds.size} supplier(s)? This action cannot be undone.`}
          type="danger"
          confirmText={bulkDeleteMutation.isPending ? 'Deleting...' : `Delete ${selectedIds.size}`}
        />

        {/* Delete Confirmation */}
        <AlertModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={() => selectedSupplier && deleteMutation.mutate(selectedSupplier._id)}
          title="Delete Supplier"
          description={`Are you sure you want to delete ${selectedSupplier?.name}? This action cannot be undone.`}
          type="danger"
          confirmText="Delete"
          cancelText="Cancel"
        />
      </div>
    </DashboardLayout>
  );
}
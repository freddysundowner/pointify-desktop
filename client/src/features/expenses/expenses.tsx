import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ShopFilter } from '@/components/filters/shop-filter';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Filter, Download, Calendar, Clock, RefreshCw, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { useAuth } from "@/features/auth/useAuth";
import { useAttendantAuth } from "@/contexts/AttendantAuthContext";
import { apiRequest } from "@/lib/queryClient";
import { offlineStorage } from "@/lib/offline-storage";
import { isNetworkError } from "@/lib/api-config";
import { format } from "date-fns";
import { useNavigationRoute } from "@/lib/navigation-utils";
import { ArrowLeft } from "lucide-react";
import { useCurrency } from '@/utils';
import { DateTime } from "@/components/date-time";

interface Expense {
  _id: string;
  description: string;
  amount: number;
  category: string;
  attendantId: string;
  shopId: string;
  frequency?: string;
  autoSave: boolean;
  createAt?: string;
  updatedAt?: string;
  vendor?: string;
  paymentMethod?: string;
  receiptNumber?: string;
  notes?: string;
  isRecurring?: boolean;
  recurringPeriod?: string;
}

interface ExpenseCategory {
  _id: string;
  name: string;
  shopId: string;
}



export default function Expenses() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const currency  = useCurrency();
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    date: '',
    vendor: '',
    paymentMethod: 'cash' as 'cash' | 'card' | 'bank_transfer' | 'check',
    receiptNumber: '',
    notes: '',
    isRecurring: false,
    recurringPeriod: '' as 'daily' | 'friday' | 'saturday' | 'start_of_month' | 'end_of_month' | ''
  });
  const [showCategoryBreakdown, setShowCategoryBreakdown] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedShopId } = useSelector((state: RootState) => state.shop);
  const { admin } = useAuth();
  const { attendant } = useAttendantAuth();
  const dashboardRoute = useNavigationRoute('dashboard');

  // Get effective shop ID and attendant ID (support both admin and attendant contexts)
  const effectiveShopId = selectedShopId || 
    (typeof admin?.primaryShop === 'string' ? admin.primaryShop : admin?.primaryShop?._id) ||
    (typeof attendant?.shopId === 'string' ? attendant.shopId : attendant?.shopId?._id);
  const attendantId = admin?.attendantId?._id || admin?._id || attendant?._id;

  // Fetch expenses with filters
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', effectiveShopId, selectedCategory, customStartDate, customEndDate],
    queryFn: async () => {
      if (!effectiveShopId) return [];
      
      const params = new URLSearchParams({
        shop: effectiveShopId
      });
      
      // Add filter parameters
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      
      if (customStartDate) {
        params.append('startDate', customStartDate);
      }
      
      if (customEndDate) {
        params.append('endDate', customEndDate);
      }
      
      console.log('Fetching expenses with filters:', params.toString());
      
      const response = await apiRequest('GET', `/api/expenses?${params.toString()}`);
      const data = await response.json();
      return Array.isArray(data) ? data : data?.expenses || data?.data || [];
    },
    enabled: !!effectiveShopId,
    refetchOnMount: 'always',
    staleTime: 0,
    gcTime: 0
  });

  // Fetch expense categories
  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories', effectiveShopId],
    queryFn: async () => {
      if (!effectiveShopId) return [];
      
      const params = new URLSearchParams({
        shop: effectiveShopId
      });
      
      const response = await apiRequest('GET', `/api/expense-categories?${params.toString()}`);
      const data = await response.json();
      return Array.isArray(data) ? data : data?.categories || data?.data || [];
    },
    enabled: !!effectiveShopId
  });

  // Fetch expense analytics
  const { data: expenseStats } = useQuery({
    queryKey: ['expense-stats', effectiveShopId, selectedCategory, customStartDate, customEndDate],
    queryFn: async () => {
      if (!effectiveShopId) return null;
      
      const params = new URLSearchParams({
        shop: effectiveShopId,
        page: '1',
        limit: '20'
      });
      
      // Add filter parameters
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      
      if (customStartDate) {
        params.append('startDate', customStartDate);
      }
      
      if (customEndDate) {
        params.append('endDate', customEndDate);
      }
      
      const response = await apiRequest('GET', `/api/expenses/stats/summary/analysis?${params.toString()}`);
      const data = await response.json();
      return data;
    },
    enabled: !!effectiveShopId,
    refetchOnMount: 'always',
    staleTime: 0,
    gcTime: 0
  });

  // Create expense category inline (from the Add Expense dialog)
  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest('POST', '/api/expense-categories', {
        name: name.trim(),
        shopId: effectiveShopId,
      });
      return response.json();
    },
    onSuccess: (created: any) => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      const newId = created?._id || created?.id;
      if (newId) {
        setFormData((prev) => ({ ...prev, category: newId }));
      }
      setNewCategoryName('');
      setIsAddingCategory(false);
      toast({ title: 'Category added', description: created?.name || 'New category created' });
    },
    onError: (err: any) => {
      toast({
        title: 'Could not add category',
        description: err?.message || 'Try again',
        variant: 'destructive',
      });
    },
  });

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      const expenseData = {
        description: data.description.trim(),
        amount: parseFloat(data.amount),
        category: data.category,
        attendantId: attendantId,
        shopId: effectiveShopId,
        frequency: data.frequency || null,
        autoSave: data.autoSave
      };
      
      try {
        const response = await apiRequest('POST', '/api/expenses', expenseData);
        return await response.json();
      } catch (err) {
        // Transport failure only — queue the expense for sync on reconnect.
        if ((err as any)?.status !== undefined || !isNetworkError(err)) throw err;
        await offlineStorage.addToSyncQueue('expense', expenseData);
        return { _offline: true };
      }
    },
    onSuccess: (result: any) => {
      // Invalidate both expenses list and statistics cache
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      
      setIsDialogOpen(false);
      setFormData({
        description: '',
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        vendor: '',
        paymentMethod: 'cash',
        receiptNumber: '',
        notes: '',
        isRecurring: false,
        recurringPeriod: ''
      });
      toast({
        title: result?._offline ? "Saved offline" : "Success",
        description: result?._offline
          ? "Expense saved on this device — it will sync when the connection returns."
          : "Expense created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create expense",
        variant: "destructive",
      });
    },
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      const response = await apiRequest('DELETE', `/api/expenses/${expenseId}`);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate both expenses list and statistics cache
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      
      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete expense",
        variant: "destructive",
      });
    },
  });

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((cat: ExpenseCategory) => cat._id === categoryId);
    return category?.name || categoryId;
  };

  // Since API now handles filtering, we just use the returned data directly
  const sortedExpenses = useMemo(() => {
    return expenses.sort((a, b) => {
      const dateA = new Date(a.createAt || 0);
      const dateB = new Date(b.createAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [expenses]);

  // Pagination
  const paginatedExpenses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      data: sortedExpenses.slice(startIndex, endIndex),
      totalItems: sortedExpenses.length,
      totalPages: Math.ceil(sortedExpenses.length / itemsPerPage)
    };
  }, [sortedExpenses, currentPage, itemsPerPage]);

  const handleEdit = (expense: Expense) => {
    console.log('Editing expense:', expense);
    setSelectedExpense(expense);
    
    // Format date properly from API response
    let formattedDate = '';
    if (expense.createAt) {
      try {
        formattedDate = new Date(expense.createAt).toISOString().split('T')[0];
      } catch (error) {
        console.warn('Date parsing error:', error);
        formattedDate = new Date().toISOString().split('T')[0];
      }
    } else {
      formattedDate = new Date().toISOString().split('T')[0];
    }
    
    setFormData({
      description: expense.description || '',
      amount: expense.amount?.toString() || '',
      category: expense.category?._id || expense.category || '',
      date: formattedDate,
      vendor: '',
      paymentMethod: expense.paymentMethod || 'cash',
      receiptNumber: expense.receiptNumber || '',
      notes: expense.notes || '',
      isRecurring: expense.isRecurring || false,
      recurringPeriod: expense.recurringPeriod || ''
    });
    
    console.log('Form data set:', {
      category: expense.category?._id || expense.category,
      categoryObject: expense.category,
      date: formattedDate,
      description: expense.description
    });
    
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedExpense(null);
    setFormData({
      description: '',
      amount: '',
      category: '',
      date: new Date().toISOString().split('T')[0],
      vendor: '',
      paymentMethod: 'cash',
      receiptNumber: '',
      notes: '',
      isRecurring: false,
      recurringPeriod: ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Description is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Valid amount is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.category) {
      toast({
        title: "Validation Error",
        description: "Category is required",
        variant: "destructive",
      });
      return;
    }
    
    const expenseData = {
      description: formData.description,
      amount: formData.amount,
      category: formData.category,
      frequency: formData.recurringPeriod || null,
      autoSave: formData.isRecurring
    };
    
    createExpenseMutation.mutate(expenseData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRecurringPeriodText = (period?: string) => {
    switch (period) {
      case 'daily': return 'Daily';
      case 'friday': return 'Every Friday';
      case 'saturday': return 'Every Saturday';
      case 'start_of_month': return 'Start of Month';
      case 'end_of_month': return 'End of Month';
      default: return '';
    }
  };

  const totalAmount = sortedExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <DashboardLayout title="Expenses">
      <div className="space-y-3 sm:space-y-5">
        <PageHeader
          title="Expenses"
          backHref={dashboardRoute}
          actions={<>
            <Link href={window.location.pathname.includes('/attendant/') ? '/attendant/expense-categories' : '/expense-categories'}>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <Settings className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Categories</span>
              </Button>
            </Link>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNew} size="sm" className="h-8 text-xs">
                  <Plus className="w-3.5 h-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Add </span>Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{selectedExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor="category">Category</Label>
                      {!isAddingCategory && (
                        <button
                          type="button"
                          className="text-xs text-purple-600 hover:text-purple-800 underline"
                          onClick={() => setIsAddingCategory(true)}
                          data-testid="button-add-new-category"
                        >
                          + New Category
                        </button>
                      )}
                    </div>
                    {isAddingCategory ? (
                      <div className="flex gap-2">
                        <Input
                          autoFocus
                          placeholder="New category name"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newCategoryName.trim()) createCategoryMutation.mutate(newCategoryName);
                            } else if (e.key === 'Escape') {
                              setIsAddingCategory(false);
                              setNewCategoryName('');
                            }
                          }}
                          data-testid="input-new-category-name"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => createCategoryMutation.mutate(newCategoryName)}
                          disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                          data-testid="button-save-new-category"
                        >
                          {createCategoryMutation.isPending ? 'Saving…' : 'Save'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => { setIsAddingCategory(false); setNewCategoryName(''); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category: ExpenseCategory) => (
                            <SelectItem key={category._id} value={category._id}>{category.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select value={formData.paymentMethod} onValueChange={(value: any) => setFormData({...formData, paymentMethod: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="receiptNumber">Receipt Number</Label>
                    <Input
                      id="receiptNumber"
                      value={formData.receiptNumber}
                      onChange={(e) => setFormData({...formData, receiptNumber: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isRecurring"
                    checked={formData.isRecurring}
                    onCheckedChange={(checked) => setFormData({...formData, isRecurring: checked as boolean})}
                  />
                  <Label htmlFor="isRecurring">Recurring Expense</Label>
                </div>
                
                {formData.isRecurring && (
                  <div>
                    <Label htmlFor="recurringPeriod">Recurring Period</Label>
                    <Select value={formData.recurringPeriod} onValueChange={(value: any) => setFormData({...formData, recurringPeriod: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="friday">Every Friday</SelectItem>
                        <SelectItem value="saturday">Every Saturday</SelectItem>
                        <SelectItem value="start_of_month">Start of Month</SelectItem>
                        <SelectItem value="end_of_month">End of Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {selectedExpense ? 'Update' : 'Add'} Expense
                  </Button>
                </div>
              </form>
            </DialogContent>
            </Dialog>
          </>}
        />

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-1.5">
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500 leading-tight">Count</div>
              <div className="text-sm sm:text-base font-bold">{expenseStats?.summary?.totalCount || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500 leading-tight">Total</div>
              <div className="text-xs sm:text-sm font-bold truncate text-red-600">{currency} {(expenseStats?.summary?.totalAmount || 0).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500 leading-tight">Categories</div>
              <div className="text-sm sm:text-base font-bold">{expenseStats?.byCategory?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <div className="text-[10px] text-gray-500 leading-tight">Top</div>
              <div className="text-xs font-bold truncate leading-tight">{expenseStats?.byCategory?.[0]?.category || '—'}</div>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown - Collapsible */}
        {expenseStats?.byCategory && expenseStats.byCategory.length > 0 && (
          <Card>
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors py-2 px-3"
              onClick={() => setShowCategoryBreakdown(!showCategoryBreakdown)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Expense by Category</CardTitle>
                {showCategoryBreakdown ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </CardHeader>
            {showCategoryBreakdown && (
              <CardContent className="pt-0 px-3 pb-3">
                <div className="divide-y divide-gray-100 border rounded-lg overflow-hidden">
                  {expenseStats.byCategory.map((categoryData: any, index: number) => (
                    <div key={index} className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate">{categoryData.category}</div>
                          <div className="text-[10px] text-gray-400">{categoryData.count} item{categoryData.count !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="text-xs font-semibold">{currency} {categoryData.totalAmount.toLocaleString()}</div>
                        <div className="text-[10px] text-gray-400">
                          {expenseStats.summary.totalAmount > 0 ? Math.round((categoryData.totalAmount / expenseStats.summary.totalAmount) * 100) : 0}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Filters */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 p-2.5 bg-gray-50 rounded-lg border">
            <div className="flex items-center gap-1.5 min-w-0">
              <label className="text-xs font-medium text-gray-600 whitespace-nowrap">From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 h-7"
              />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <label className="text-xs font-medium text-gray-600 whitespace-nowrap">To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 h-7"
              />
            </div>
            <ShopFilter />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-7 text-xs w-36">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Array.isArray(categories) && categories.map((category: ExpenseCategory) => (
                  <SelectItem key={category._id} value={category._id}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(customStartDate || customEndDate || selectedCategory !== 'all') && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-500"
                onClick={() => { setCustomStartDate(''); setCustomEndDate(''); setSelectedCategory('all'); }}>
                Clear
              </Button>
            )}
          </div>

          {/* Active Filters Display */}
          {(customStartDate || customEndDate || selectedCategory !== 'all') && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-gray-500">Filters:</span>
              {customStartDate && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800">
                  From: {new Date(customStartDate).toLocaleDateString()}
                </span>
              )}
              {customEndDate && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800">
                  To: {new Date(customEndDate).toLocaleDateString()}
                </span>
              )}
              {selectedCategory !== 'all' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-green-100 text-green-800">
                  {categories.find((cat: ExpenseCategory) => cat._id === selectedCategory)?.name || selectedCategory}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Expenses Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-xs py-2">Description</TableHead>
                  <TableHead className="text-xs py-2 hidden sm:table-cell">Category</TableHead>
                  <TableHead className="text-xs py-2 hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-xs py-2 hidden md:table-cell">Frequency</TableHead>
                  <TableHead className="text-xs py-2 text-right">Amount</TableHead>
                  <TableHead className="text-xs py-2 w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedExpenses.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500 text-sm">
                      No expenses found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedExpenses.data.map((expense) => (
                    <TableRow key={expense._id}>
                      <TableCell className="py-2 px-2 sm:px-4">
                        <div className="font-medium text-xs sm:text-sm">{expense.description}</div>
                        <div className="sm:hidden text-[10px] text-gray-400 mt-0.5 space-y-0.5">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                            {typeof expense.category === 'string' ? getCategoryName(expense.category) : expense.category?.name || 'Unknown'}
                          </span>
                          {expense.createAt && <DateTime value={expense.createAt} dateOptions={{ month: 'short', day: '2-digit', year: 'numeric' }} className="block" />}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 hidden sm:table-cell">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">
                          {typeof expense.category === 'string' ? getCategoryName(expense.category) : expense.category?.name || 'Unknown'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-xs hidden sm:table-cell">
                        {expense.createAt ? <DateTime value={expense.createAt} dateOptions={{ month: 'short', day: '2-digit', year: 'numeric' }} /> : '-'}
                      </TableCell>
                      <TableCell className="py-2 hidden md:table-cell">
                        {expense.frequency ? (
                          <div className="flex items-center gap-1 text-xs">
                            <RefreshCw className="w-3 h-3" />
                            <span className="capitalize">{expense.frequency}</span>
                          </div>
                        ) : <span className="text-xs text-gray-400">One-time</span>}
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:px-4 text-right">
                        <span className="text-xs sm:text-sm font-medium text-red-600">
                          {currency} {expense.amount.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:px-4">
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(expense)} className="h-7 w-7 p-0">
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-red-600 hover:text-red-700">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this expense? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteExpenseMutation.mutate(expense._id)} className="bg-red-600 hover:bg-red-700">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {paginatedExpenses.totalPages > 1 && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="w-16 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-gray-500">/ page</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
                Prev
              </Button>
              <span className="text-xs text-gray-500">{currentPage}/{paginatedExpenses.totalPages}</span>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs"
                onClick={() => setCurrentPage(Math.min(paginatedExpenses.totalPages, currentPage + 1))} disabled={currentPage === paginatedExpenses.totalPages}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
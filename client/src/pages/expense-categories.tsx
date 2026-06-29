import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Tag, Search, Loader2, ArrowLeft } from "lucide-react";
import { Link } from 'wouter';
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { useAuth } from "@/features/auth/useAuth";
import { useAttendantAuth } from "@/contexts/AttendantAuthContext";
import { apiRequest } from "@/lib/queryClient";
import { DateTime } from "@/components/date-time";

interface ExpenseCategory {
  _id: string;
  name: string;
  shopId: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function ExpenseCategories() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '' });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedShopId } = useSelector((state: RootState) => state.shop);
  const { admin } = useAuth();
  const { attendant } = useAttendantAuth();

  // Get effective shop ID (support both admin and attendant contexts)
  const effectiveShopId = selectedShopId || 
    (typeof admin?.primaryShop === 'string' ? admin.primaryShop : admin?.primaryShop?._id) ||
    (typeof attendant?.shopId === 'string' ? attendant.shopId : attendant?.shopId?._id);

  // Fetch expense categories
  const { data: categories = [], isLoading } = useQuery({
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

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      const categoryData = {
        name: data.name.trim(),
        shopId: effectiveShopId
      };
      
      const response = await apiRequest('POST', '/api/expense-categories', categoryData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      setIsCreateDialogOpen(false);
      setNewCategory({ name: '' });
      toast({
        title: "Success",
        description: "Expense category created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create expense category",
        variant: "destructive",
      });
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async (data: ExpenseCategory) => {
      const categoryData = {
        name: data.name.trim(),
        shopId: data.shopId
      };
      
      const response = await apiRequest('PUT', `/api/expense-categories/${data._id}`, categoryData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      setEditingCategory(null);
      toast({
        title: "Success",
        description: "Expense category updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update expense category",
        variant: "destructive",
      });
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const response = await apiRequest('DELETE', `/api/expense-categories/${categoryId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast({
        title: "Success",
        description: "Expense category deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete expense category",
        variant: "destructive",
      });
    },
  });

  // Filter categories by search query
  const filteredCategories = categories.filter((category: ExpenseCategory) =>
    category.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCategory = () => {
    if (!newCategory.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }
    
    createCategoryMutation.mutate(newCategory);
  };

  const handleUpdateCategory = () => {
    if (!editingCategory || !editingCategory.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }
    
    updateCategoryMutation.mutate(editingCategory);
  };

  const handleDeleteCategory = (categoryId: string) => {
    deleteCategoryMutation.mutate(categoryId);
  };

  const handleEdit = (category: ExpenseCategory) => {
    setEditingCategory(category);
  };

  if (!effectiveShopId) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center">
          <div className="text-center">
            <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Shop Selected</h3>
            <p className="text-gray-500">Please select a shop to manage expense categories.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-3 sm:space-y-5">
        <PageHeader
          title="Expense Categories"
          backHref={window.location.pathname.includes('/attendant/') ? '/attendant/expenses' : '/expenses'}
          actions={
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 text-xs">
                  <Plus className="h-3.5 w-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Add </span>Category
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Expense Category</DialogTitle>
                <DialogDescription>
                  Create a new category to organize your expenses
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Category Name *</Label>
                  <Input
                    id="name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    placeholder="Enter category name"
                    className="mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateCategory}
                  disabled={createCategoryMutation.isPending}
                >
                  {createCategoryMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Category
                </Button>
              </DialogFooter>
            </DialogContent>
            </Dialog>
          }
        />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-xs"
          />
        </div>

        {/* Categories Table */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm font-semibold">Categories ({filteredCategories.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Loading...</span>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="text-center py-8">
                <Tag className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-700 mb-1">
                  {searchQuery ? 'No categories found' : 'No categories yet'}
                </h3>
                <p className="text-xs text-gray-400 mb-3">
                  {searchQuery ? 'Try adjusting your search' : 'Create your first expense category'}
                </p>
                {!searchQuery && (
                  <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />Add Category
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs py-2">Category Name</TableHead>
                    <TableHead className="text-xs py-2 hidden sm:table-cell">Created</TableHead>
                    <TableHead className="text-xs py-2 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category: ExpenseCategory) => (
                    <TableRow key={category._id}>
                      <TableCell className="py-2 px-2 sm:px-4">
                        <div className="flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-xs sm:text-sm">{category.name}</span>
                        </div>
                        <div className="sm:hidden text-[10px] text-gray-400 mt-0.5 pl-5">
                          {category.createdAt ? <DateTime value={category.createdAt} /> : '—'}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 text-xs hidden sm:table-cell">
                        {category.createdAt ? <DateTime value={category.createdAt} /> : '—'}
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(category)} className="h-7 w-7 p-0">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-red-600 hover:text-red-700">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{category.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteCategory(category._id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Expense Category</DialogTitle>
              <DialogDescription>
                Update the category information
              </DialogDescription>
            </DialogHeader>
            {editingCategory && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Category Name *</Label>
                  <Input
                    id="edit-name"
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    placeholder="Enter category name"
                    className="mt-1"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingCategory(null)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateCategory}
                disabled={updateCategoryMutation.isPending}
              >
                {updateCategoryMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
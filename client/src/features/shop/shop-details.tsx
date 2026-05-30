import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Trash2, Download, Settings, Shield, FileText, AlertTriangle, Smartphone } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { apiCall } from "@/lib/api-config";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Link } from "wouter";
import AlertModal from "@/components/ui/alert-modal";

interface Shop {
  _id: string;
  name: string;
  category: string;
  address: string;
  phone?: string;
  email?: string;
  currency: string;
  allowOnlineSelling: boolean;
  adminId: string;
  createdAt: string;
  updatedAt: string;
}

interface ShopCategory {
  _id: string;
  name: string;
}

export default function ShopDetails() {
  const { id } = useParams();
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  
  // Debug admin data to check primary shop status
  useEffect(() => {
    console.log('Current admin:', admin);
    console.log('Primary shop ID:', admin?.primaryShop);
    console.log('Current shop ID:', id);
    console.log('Has primary shop:', !!admin?.primaryShop);
  }, [admin, id]);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("general");
  
  // Alert modal state
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: "warning" | "danger" | "input";
    title: string;
    description: string;
    confirmText?: string;
    inputPlaceholder?: string;
    requiredInput?: string;
    onConfirm: (inputValue?: string) => void;
  }>({
    isOpen: false,
    type: "warning",
    title: "",
    description: "",
    onConfirm: () => {},
  });

  // Shop settings form state
  const [formData, setFormData] = useState({
    name: "",
    receiptemail: "",
    tax: 0,
    shopCategoryId: "",
    address: "",
    currency: "KES",
    allownegativeselling: false,
    trackbatches: false,
    useWarehouse: false,
    allowOnlineSelling: true,
    showstockonline: false,
    showpriceonline: false,
    deletewarning: 0,
    backupInterval: "end_of_month",
    allowBackup: true,
    warehouse: false,
    production: false,
    // Receipt customization fields
    contact: "",
    paybill_till: "",
    paybill_account: "",
    address_receipt: "",
  });

  // Fetch categories from API
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await apiCall("/api/shop/category", {
        method: "GET",
      });
      const data = await response.json();
      console.log('Categories loaded from API:', data);
      return data;
    },
  });

  // Fetch shop details from /shop/:id
  const { data: shop, isLoading } = useQuery({
    queryKey: ["shop", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await apiCall(`/api/shop/${id}`, {
        method: "GET",
      });
      if (!response.ok) {
        // Upstream/proxy failure — throw so React Query keeps the last good
        // data and retries instead of blanking the form with an error body.
        throw new Error(`Failed to load shop (${response.status})`);
      }
      const shop = await response.json();
      console.log('Shop data loaded:', shop);
      return shop;
    },
    enabled: !!id,
    // Seed instantly from the already-loaded shops list so the form populates
    // immediately instead of showing a blank loading page. The full record
    // still refetches in the background to fill any extra fields.
    initialData: () => {
      const cached = queryClient.getQueryData<any[]>(["shops", admin?._id]);
      if (Array.isArray(cached)) {
        return cached.find((s) => s?._id === id);
      }
      return undefined;
    },
  });

  // Update form data when shop loads. Only populate from a valid shop record
  // (a single object with an _id) — never from [] or an error payload, which
  // would wipe the form fields (name, category, etc.).
  useEffect(() => {
    if (shop && !Array.isArray(shop) && shop._id) {
      console.log('Shop data loaded:', shop);
      console.log('Shop category:', shop.shopCategoryId?.name);
      setFormData({
        name: shop.name || "",
        receiptemail: shop.receiptemail || shop.email_receipt || "",
        tax: shop.tax || 0,
        shopCategoryId: shop.shopCategoryId?._id || "",
        address: shop.address || "",
        currency: shop.currency || "KES",
        allownegativeselling: shop.allownegativeselling || false,
        trackbatches: shop.trackbatches || false,
        useWarehouse: shop.useWarehouse || false,
        allowOnlineSelling: shop.allowOnlineSelling || true,
        showstockonline: shop.showstockonline || false,
        showpriceonline: shop.showpriceonline || false,
        deletewarning: shop.deletewarning || 0,
        backupInterval: shop.backupInterval || "end_of_month",
        allowBackup: shop.allowBackup || true,
        warehouse: shop.warehouse || false,
        production: shop.production || false,
        contact: shop.contact || "",
        paybill_till: shop.paybill_till || "",
        paybill_account: shop.paybill_account || "",
        address_receipt: shop.address_receipt || "",
      });
    }
  }, [shop]);

  // Debug: Log form data changes
  useEffect(() => {
    console.log('Form data updated:', formData);
  }, [formData]);

  // Update shop mutation
  const updateShopMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiCall(`/api/shop/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["shop", id] });
      queryClient.invalidateQueries({ queryKey: ["shops"] });
      
      toast({
        title: "Shop Updated",
        description: "Shop settings have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update shop settings.",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    // Guard against saving before a valid shop has loaded. Without this, an
    // intermittent failed fetch could leave the form blank and saving would
    // overwrite the real shop name/category with empty values.
    if (!shop || Array.isArray(shop) || !shop._id || !formData.name.trim()) {
      toast({
        title: "Shop not loaded",
        description: "Shop details are still loading. Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }

    const updateData = {
      name: formData.name,
      receiptemail: formData.receiptemail,
      shopCategoryId: formData.shopCategoryId,
      address: formData.address,
      tax: formData.tax,
      currency: formData.currency,
      allownegativeselling: formData.allownegativeselling,
      trackbatches: formData.trackbatches,
      useWarehouse: formData.useWarehouse,
      allowOnlineSelling: formData.allowOnlineSelling,
      showstockonline: formData.showstockonline,
      showpriceonline: formData.showpriceonline,
      deletewarning: formData.deletewarning,
      backupInterval: formData.backupInterval,
      allowBackup: formData.allowBackup,
      warehouse: formData.warehouse,
      production: formData.production,
      contact: formData.contact,
      paybill_till: formData.paybill_till,
      paybill_account: formData.paybill_account,
      address_receipt: formData.address_receipt,
    };
    
    console.log('Saving shop data:', updateData);
    updateShopMutation.mutate(updateData);
  };

  const handleDeleteShopData = () => {
    setAlertModal({
      isOpen: true,
      type: "input",
      title: "Delete Shop Data",
      description: "This will permanently remove all products, transactions, and sales data for this shop. This action cannot be undone. Type 'DELETE' to confirm.",
      confirmText: "Delete Data",
      requiredInput: "DELETE",
      inputPlaceholder: "Type DELETE to confirm",
      onConfirm: () => {
        // Call the delete shop data API
        apiCall(`/api/shop/data/${id}`, {
          method: 'DELETE',
        }).then(() => {
          toast({
            title: "Shop data deleted",
            description: "All shop data has been permanently deleted.",
            variant: "default",
          });
        }).catch((error) => {
          console.error('Error deleting shop data:', error);
          toast({
            title: "Error",
            description: "Failed to delete shop data. Please try again.",
            variant: "destructive",
          });
        });
      },
    });
  };

  const handleDeleteShop = () => {
    console.log('=== DELETE SHOP DEBUG ===');
    console.log('Admin data:', admin);
    console.log('Primary shop:', admin?.primaryShop);
    console.log('Current shop ID:', id);
    console.log('Admin exists:', !!admin);
    console.log('Primary shop exists:', !!admin?.primaryShop);
    console.log('========================');
    
    // Check if this is the primary shop
    if (admin?.primaryShop === id) {
      toast({
        title: "Cannot Delete Primary Shop",
        description: "This is your primary shop and cannot be deleted. Please set another shop as primary first, or contact support if this is your only shop.",
        variant: "destructive",
      });
      return;
    }

    // Check if user has no primary shop - redirect to onboarding
    if (!admin?.primaryShop) {
      toast({
        title: "No Primary Shop",
        description: "You need to create a primary shop first.",
        variant: "destructive",
      });
      setLocation('/onboarding');
      return;
    }

    setAlertModal({
      isOpen: true,
      type: "input",
      title: "Delete Entire Shop",
      description: "This will permanently delete the entire shop and ALL associated data including products, sales, customers, and settings. This action is irreversible. Type 'DELETE SHOP' to confirm.",
      confirmText: "Delete Shop",
      requiredInput: "DELETE SHOP",
      inputPlaceholder: "Type DELETE SHOP to confirm",
      onConfirm: () => {
        // Call the delete shop API
        apiCall(`/shop/${id}`, {
          method: 'DELETE',
        }).then(() => {
          toast({
            title: "Shop deleted",
            description: "The shop has been permanently deleted.",
            variant: "default",
          });
          // Invalidate cache and redirect to homepage
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['/api/shop'] });
            setLocation('/');
          }, 1000);
        }).catch((error) => {
          console.error('Error deleting shop:', error);
          toast({
            title: "Error",
            description: "Failed to delete shop. Please try again.",
            variant: "destructive",
          });
        });
      },
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600">Loading shop details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!shop) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Shop Not Found</h3>
            <p className="text-gray-600 mb-4">The shop you're looking for doesn't exist.</p>
            <Link href="/shops">
              <Button>Back to Shops</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }



  return (
    <DashboardLayout>
      <div className="h-full bg-gray-50">
        {/* Compact Header */}
        <div className="bg-white border-b shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Link href="/shops">
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-gray-900 truncate">{shop.name}</h1>
                <p className="text-xs text-gray-500">Shop Settings</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleSaveSettings}
              disabled={updateShopMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 flex-shrink-0"
            >
              {updateShopMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Content — tabbed sections */}
        <div className="px-3 py-3 space-y-3 w-full">

          {/* M-Pesa setup prompt — only when settlement target is missing */}
          {!formData.paybill_till && (
            <Card className="shadow-sm border-emerald-200 bg-emerald-50">
              <CardContent className="px-4 py-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-emerald-900">M-Pesa is ready — finish setup</p>
                  <p className="text-xs text-emerald-800/90 mt-0.5">
                    Add the Paybill or Till number you'd like us to settle M-Pesa
                    collections to. Until this is set, customer M-Pesa payments
                    can't be routed to your account.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 flex-shrink-0"
                  onClick={() => setActiveTab("mpesa")}
                  data-testid="button-mpesa-setup"
                >
                  Set up
                </Button>
              </CardContent>
            </Card>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex w-full justify-start gap-1 overflow-x-auto h-auto p-1">
              <TabsTrigger value="general" className="gap-1.5" data-testid="tab-general">
                <Settings className="w-3.5 h-3.5" /> General
              </TabsTrigger>
              <TabsTrigger value="mpesa" className="gap-1.5" data-testid="tab-mpesa">
                <Smartphone className="w-3.5 h-3.5" /> M-Pesa
              </TabsTrigger>
              <TabsTrigger value="operations" className="gap-1.5" data-testid="tab-operations">
                <Shield className="w-3.5 h-3.5" /> Operations
              </TabsTrigger>
              <TabsTrigger value="receipt" className="gap-1.5" data-testid="tab-receipt">
                <FileText className="w-3.5 h-3.5" /> Receipt
              </TabsTrigger>
              <TabsTrigger value="backup" className="gap-1.5" data-testid="tab-backup">
                <Download className="w-3.5 h-3.5" /> Backup
              </TabsTrigger>
              <TabsTrigger value="danger" className="gap-1.5 data-[state=active]:text-red-700" data-testid="tab-danger">
                <AlertTriangle className="w-3.5 h-3.5" /> Danger
              </TabsTrigger>
            </TabsList>

            {/* Basic Info */}
            <TabsContent value="general">
              <Card className="shadow-sm">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Basic Info</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="shopName" className="text-xs font-medium text-gray-600">Shop Name</Label>
                      <Input
                        id="shopName"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Shop name"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="businessType" className="text-xs font-medium text-gray-600">Business Category</Label>
                      <Select
                        value={formData.shopCategoryId}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, shopCategoryId: value }))}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category: ShopCategory) => (
                            <SelectItem key={category._id} value={category._id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="location" className="text-xs font-medium text-gray-600">Address</Label>
                      <Input
                        id="location"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Shop address"
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="currency" className="text-xs font-medium text-gray-600">Currency</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="tax" className="text-xs font-medium text-gray-600">Tax Rate (%)</Label>
                      <Input
                        id="tax"
                        type="number"
                        step="0.01"
                        value={formData.tax}
                        onChange={(e) => setFormData(prev => ({ ...prev, tax: parseFloat(e.target.value) || 0 }))}
                        placeholder="0.0"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* M-Pesa Settlement */}
            <TabsContent value="mpesa">
              <Card className="shadow-sm" id="mpesa-section">
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">M-Pesa Settlement</CardTitle>
                    {formData.paybill_till ? (
                      <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">Configured</span>
                    ) : (
                      <span className="text-[10px] font-medium text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">Not set</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <p className="text-xs text-gray-600">
                    Tell us where to settle the M-Pesa payments your customers
                    make. We'll route collections to this Paybill or Till on your
                    behalf.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-600">Paybill or Till Number <span className="text-red-500">*</span></Label>
                      <Input
                        value={formData.paybill_till}
                        onChange={(e) => setFormData(prev => ({ ...prev, paybill_till: e.target.value }))}
                        placeholder="e.g. 247247 or 5076543"
                        inputMode="numeric"
                        className="h-9 text-sm"
                        data-testid="input-paybill-till"
                      />
                      <p className="text-[11px] text-gray-500">Your Safaricom Paybill or Buy Goods Till.</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-600">Account Number</Label>
                      <Input
                        value={formData.paybill_account}
                        onChange={(e) => setFormData(prev => ({ ...prev, paybill_account: e.target.value }))}
                        placeholder="Required for Paybill only"
                        className="h-9 text-sm"
                        data-testid="input-paybill-account"
                      />
                      <p className="text-[11px] text-gray-500">Leave blank if you're using a Till number.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Operational Toggles */}
            <TabsContent value="operations">
              <Card className="shadow-sm">
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Operational Settings</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="divide-y divide-gray-100">
                    {[
                      { key: "allownegativeselling", label: "Negative Selling", desc: "Allow out-of-stock sales" },
                      { key: "trackbatches",         label: "Batch Tracking",   desc: "Track product batches" },
                      { key: "useWarehouse",          label: "Warehouse Mode",   desc: "Use warehouse system" },
                      { key: "allowOnlineSelling",    label: "Online Selling",   desc: "Enable e-commerce" },
                      { key: "showstockonline",       label: "Show Stock Online", desc: "Display stock levels online" },
                      { key: "showpriceonline",       label: "Show Prices Online", desc: "Display prices on online store" },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between py-2.5">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{label}</p>
                          <p className="text-xs text-gray-500">{desc}</p>
                        </div>
                        <Switch
                          checked={!!(formData as any)[key]}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, [key]: checked }))}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Receipt Settings */}
            <TabsContent value="receipt">
              <Card className="shadow-sm">
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Receipt Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-600">Receipt Email</Label>
                      <Input value={formData.receiptemail} onChange={(e) => setFormData(prev => ({ ...prev, receiptemail: e.target.value }))} placeholder="email@company.com" type="email" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-gray-600">Contact</Label>
                      <Input value={formData.contact} onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))} placeholder="Contact info" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs font-medium text-gray-600">Receipt Address</Label>
                      <Input value={formData.address_receipt} onChange={(e) => setFormData(prev => ({ ...prev, address_receipt: e.target.value }))} placeholder="Address shown on receipts" className="h-9 text-sm" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Backup Settings */}
            <TabsContent value="backup">
              <Card className="shadow-sm">
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-gray-500" />
                    <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Backup Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Auto Backup</p>
                      <p className="text-xs text-gray-500">Automatically back up shop data</p>
                    </div>
                    <Switch checked={formData.allowBackup} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowBackup: checked }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">Backup Email</Label>
                    <Input type="email" value={admin?.email || ''} readOnly className="h-9 text-sm bg-gray-50" />
                    <p className="text-xs text-gray-400">Uses your admin email</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-gray-600">Interval</Label>
                    <Select value={formData.backupInterval} onValueChange={(value) => setFormData(prev => ({ ...prev, backupInterval: value }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Every day</SelectItem>
                        <SelectItem value="weekly">Every End of Week</SelectItem>
                        <SelectItem value="end_of_month">Every End of Month</SelectItem>
                        <SelectItem value="yearly">Every End of Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Danger Zone */}
            <TabsContent value="danger">
              <Card className="shadow-sm border-red-200">
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <CardTitle className="text-sm font-semibold text-red-700 uppercase tracking-wide">Danger Zone</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-red-800">Delete Shop Data</p>
                      <p className="text-xs text-red-600">Remove all products, sales &amp; transactions</p>
                    </div>
                    <Button variant="outline" size="sm" className="ml-3 flex-shrink-0 border-red-300 text-red-700 hover:bg-red-100" onClick={handleDeleteShopData}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Delete Data
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-100 rounded-lg border border-red-300">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-red-900">Delete Entire Shop</p>
                      <p className="text-xs text-red-700">Permanently remove this shop</p>
                    </div>
                    <Button variant="destructive" size="sm" className="ml-3 flex-shrink-0" onClick={handleDeleteShop}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Delete Shop
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>

        </div>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={alertModal.onConfirm}
        title={alertModal.title}
        description={alertModal.description}
        type={alertModal.type}
        confirmText={alertModal.confirmText}
        inputPlaceholder={alertModal.inputPlaceholder}
        requiredInput={alertModal.requiredInput}
      />
    </DashboardLayout>
  );
}
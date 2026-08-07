import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Store, Plus, Search, Edit, Eye } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { apiCall } from "@/lib/api-config";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Link } from "wouter";

interface Shop {
  _id: string;
  name: string;
  shopCategoryId: {
    _id: string;
    name: string;
    active: boolean;
  };
  address: string;
  contact?: string;
  currency: string;
  allowOnlineSelling: boolean;
  adminId: string;
  createAt: string;
  __v: number;
  subscription?: {
    packageId: {
      title: string;
      type: string;
    };
    status: boolean;
    endDate: string;
  };
}

export default function Shops() {
  const { admin } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Get primary shop ID from admin data (could be string or object)
  const getPrimaryShopId = () => {
    if (!admin?.primaryShop) return null;
    if (typeof admin.primaryShop === 'string') return admin.primaryShop;
    return admin.primaryShop._id || admin.primaryShop.id || null;
  };

  const primaryShopId = getPrimaryShopId();

  // Fetch shops
  const { data: shopsResponse, isLoading, error } = useQuery({
    queryKey: ["shops", admin?._id],
    queryFn: async () => {
      if (!admin?._id) return [];
      const response = await apiCall(`/api/shop/admin/${admin._id}`, {
        method: "GET",
      });
      const data = await response.json();
      return Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : []);
    },
    enabled: !!admin?._id,
    retry: false,
  });

  const shops = Array.isArray(shopsResponse) ? shopsResponse : [];
  console.log("Processed shops:", shops, "Length:", shops.length);

  // Filter shops based on search query
  const filteredShops = shops.filter((shop: Shop) =>
    shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shop.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <DashboardLayout title="My Shops">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600">Loading shops...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="My Shops">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Shops</h3>
            <p className="text-gray-600">Failed to load your shops. Please try again.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Shops">
      <div className="h-full bg-gray-50">
        <PageHeader
          title="My Shops"
          subtitle={`${shops.length} shop${shops.length !== 1 ? 's' : ''}`}
          actions={
            <Link href="/shop-setup">
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-1" />
                Add Shop
              </Button>
            </Link>
          }
        />

        {/* Content */}
        <div className="px-3 py-3">
          {/* Search Bar */}
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search shops..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          {/* Shops Grid */}
          {filteredShops.length === 0 ? (
            <div className="text-center py-12">
              <Store className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {searchQuery ? "No shops found" : "No shops yet"}
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                {searchQuery ? "Try adjusting your search" : "Create your first shop to get started"}
              </p>
              {!searchQuery && (
                <Link href="/shop-setup">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-1" />
                    Create Shop
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {filteredShops.map((shop: Shop) => (
                <Link key={shop._id} href={`/shop/${shop._id}`}>
                  <div className="bg-white rounded-lg border hover:shadow-md hover:border-purple-200 transition-all duration-150 p-3 cursor-pointer">
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">{shop.name}</p>
                          {admin?.primaryShop === shop._id && (
                            <Badge className="bg-purple-100 text-purple-700 border-0 text-[10px] px-1.5 py-0 h-4 flex-shrink-0">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 flex items-center gap-0.5 mt-0.5 truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {shop.address}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{shop.shopCategoryId?.name || 'N/A'}</span>
                      <span className="text-gray-300">·</span>
                      <span>{shop.currency}</span>
                      {shop.subscription && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span className={shop.subscription.status ? "text-green-600 font-medium" : "text-gray-400"}>
                            {shop.subscription.status ? "Active" : "Inactive"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Summary Stats */}
          {filteredShops.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="bg-white p-3 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Total Shops</p>
                    <p className="text-xl font-bold text-gray-900">{shops.length}</p>
                  </div>
                  <Store className="w-6 h-6 text-purple-500" />
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Primary</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {shops.find((shop: Shop) => shop._id === primaryShopId)?.name || "None"}
                    </p>
                  </div>
                  <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">P</Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
import { useState } from "react";
import { Search, Filter, Plus, Eye, CheckCircle, XCircle, Clock, Truck, Phone, Mail, MapPin, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import DashboardLayout from "@/components/layout/dashboard-layout";
import type { Order } from "@shared/schema";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  preparing: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  ready: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  delivered: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const sourceColors = {
  website: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  app: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  phone: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  whatsapp: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
};

// Dummy orders data
const ordersData: Order[] = [
  {
    id: 1,
    customerName: "Sarah Johnson",
    customerPhone: "+254712345678",
    customerEmail: "sarah@email.com",
    items: [
      { productName: "Laptop Stand", quantity: 1, unitPrice: 2500, totalPrice: 2500 },
      { productName: "Wireless Mouse", quantity: 2, unitPrice: 800, totalPrice: 1600 }
    ],
    totalAmount: 4100,
    orderDate: "2025-06-19T10:30:00Z",
    status: "pending",
    orderSource: "website",
    deliveryAddress: "123 Main St, Nairobi",
    notes: "Please call before delivery"
  },
  {
    id: 2,
    customerName: "John Kamau",
    customerPhone: "+254723456789",
    items: [
      { productName: "Bluetooth Headphones", quantity: 1, unitPrice: 3200, totalPrice: 3200 }
    ],
    totalAmount: 3200,
    orderDate: "2025-06-19T09:15:00Z",
    status: "confirmed",
    orderSource: "app",
    deliveryAddress: "456 Oak Ave, Nairobi"
  },
  {
    id: 3,
    customerName: "Mary Wanjiku",
    customerPhone: "+254734567890",
    customerEmail: "mary@email.com",
    items: [
      { productName: "Phone Case", quantity: 3, unitPrice: 500, totalPrice: 1500 },
      { productName: "Screen Protector", quantity: 3, unitPrice: 200, totalPrice: 600 }
    ],
    totalAmount: 2100,
    orderDate: "2025-06-19T08:45:00Z",
    status: "preparing",
    orderSource: "whatsapp"
  },
  {
    id: 4,
    customerName: "David Mwangi",
    customerPhone: "+254745678901",
    items: [
      { productName: "Power Bank", quantity: 1, unitPrice: 1800, totalPrice: 1800 }
    ],
    totalAmount: 1800,
    orderDate: "2025-06-19T08:00:00Z",
    status: "ready",
    orderSource: "phone",
    deliveryAddress: "789 Pine St, Nairobi",
    notes: "Customer prefers evening delivery"
  }
];

export default function OrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = ordersData.filter(order => {
    const matchesSearch = 
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPhone?.includes(searchTerm) ||
      order.id.toString().includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesSource = sourceFilter === "all" || order.orderSource === sourceFilter;
    
    return matchesSearch && matchesStatus && matchesSource;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return `KSh ${amount.toLocaleString()}`;
  };

  const updateOrderStatus = (orderId: number, newStatus: Order['status']) => {
    // In a real app, this would make an API call
    console.log(`Updating order ${orderId} to status: ${newStatus}`);
  };

  const convertToSale = (orderId: number) => {
    // In a real app, this would convert the order to a sale
    console.log(`Converting order ${orderId} to sale`);
  };

  return (
    <DashboardLayout title="Orders">
      <div className="space-y-6 w-full">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Online Orders</h2>
            <p className="text-gray-600 dark:text-gray-400">Manage customer orders from online channels</p>
          </div>
          <Button className="sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Manual Order
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search orders by customer, phone, or order ID..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="preparing">Preparing</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="app">Mobile App</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="grid gap-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  
                  {/* Order Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">Order #{order.id}</h3>
                      <Badge className={statusColors[order.status]}>
                        {order.status}
                      </Badge>
                      <Badge variant="outline" className={sourceColors[order.orderSource]}>
                        {order.orderSource}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <ShoppingBag className="h-4 w-4" />
                        <span>{order.customerName}</span>
                      </div>
                      {order.customerPhone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          <span>{order.customerPhone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatDate(order.orderDate)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {order.items.length} item(s)
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Order #{selectedOrder?.id} Details</DialogTitle>
                        </DialogHeader>
                        {selectedOrder && (
                          <div className="space-y-6">
                            {/* Customer Info */}
                            <div>
                              <h4 className="font-semibold mb-3">Customer Information</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <ShoppingBag className="h-4 w-4 text-gray-400" />
                                  <span>{selectedOrder.customerName}</span>
                                </div>
                                {selectedOrder.customerPhone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                    <span>{selectedOrder.customerPhone}</span>
                                  </div>
                                )}
                                {selectedOrder.customerEmail && (
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                    <span>{selectedOrder.customerEmail}</span>
                                  </div>
                                )}
                                {selectedOrder.deliveryAddress && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    <span>{selectedOrder.deliveryAddress}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <Separator />

                            {/* Order Items */}
                            <div>
                              <h4 className="font-semibold mb-3">Order Items</h4>
                              <div className="space-y-3">
                                {selectedOrder.items.map((item, index) => (
                                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div>
                                      <div className="font-medium">{item.productName}</div>
                                      <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
                                      </div>
                                    </div>
                                    <div className="font-semibold">
                                      {formatCurrency(item.totalPrice)}
                                    </div>
                                  </div>
                                ))}
                                <div className="flex justify-between items-center pt-3 border-t">
                                  <span className="font-semibold">Total</span>
                                  <span className="font-bold text-lg text-green-600 dark:text-green-400">
                                    {formatCurrency(selectedOrder.totalAmount)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {selectedOrder.notes && (
                              <>
                                <Separator />
                                <div>
                                  <h4 className="font-semibold mb-2">Notes</h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedOrder.notes}</p>
                                </div>
                              </>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 pt-4">
                              <Button onClick={() => convertToSale(selectedOrder.id)} className="flex-1">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Convert to Sale
                              </Button>
                              <Select onValueChange={(value) => updateOrderStatus(selectedOrder.id, value as Order['status'])}>
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue placeholder="Update Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="confirmed">Confirmed</SelectItem>
                                  <SelectItem value="preparing">Preparing</SelectItem>
                                  <SelectItem value="ready">Ready</SelectItem>
                                  <SelectItem value="delivered">Delivered</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    {order.status === "ready" && (
                      <Button size="sm" onClick={() => convertToSale(order.id)}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Convert to Sale
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No orders found</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm || statusFilter !== "all" || sourceFilter !== "all" 
                  ? "Try adjusting your filters to see more orders." 
                  : "Online orders will appear here once customers place them."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
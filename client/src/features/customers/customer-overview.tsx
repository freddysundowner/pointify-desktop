import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, User, CreditCard, ShoppingBag, Calendar, DollarSign, TrendingUp, FileText, Phone, Mail, MapPin, ArrowLeft, Filter, ChevronLeft, ChevronRight, Wallet, Plus, Download } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { useAuth } from '@/features/auth/useAuth';
import { useAttendantAuth } from '@/contexts/AttendantAuthContext';
import { apiCall, rawApiFetch } from '@/lib/api-config';
import { apiRequest } from '@/lib/queryClient';
import { useNavigationRoute } from '@/lib/navigation-utils';
import { DateTime } from "@/components/date-time";

interface CustomerTransaction {
  _id: string;
  date: string;
  type: 'purchase' | 'payment' | 'refund' | 'credit';
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'cancelled';
  referenceNumber: string;
}

interface Sale {
  _id: string;
  receiptno: string;
  customerId?: string;
  customerName?: string;
  items: Array<{
    productName?: string;
    product?: { name: string };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  amountPaid: number;
  outstandingBalance: number;
  paymentTag: string;
  status: string;
  saleDate: string;
  createdAt: string;
  attendantId?: {
    username: string;
  };
  shopId?: {
    currency: string;
    name: string;
  };
}

interface CustomerPurchase {
  _id: string;
  date: string;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  totalAmount: number;
  paymentMethod: string;
  status: 'completed' | 'pending' | 'cancelled';
  receiptNumber: string;
}

interface CustomerOverviewData {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  balance: number;
  totalPurchases: number;
  totalSpent: number;
  joinDate: string;
  lastPurchase?: string;
  status: 'active' | 'inactive';
  customerType: 'regular' | 'vip' | 'wholesale';
  creditLimit: number;
  loyaltyPoints: number;
}

// Dummy data for customer overview
const dummyCustomer: CustomerOverviewData = {
  _id: '1',
  name: 'John Smith',
  email: 'john.smith@email.com',
  phone: '+1 (555) 123-4567',
  address: '123 Main Street, Anytown, ST 12345',
  balance: -150.00,
  totalPurchases: 47,
  totalSpent: 2850.75,
  joinDate: '2023-03-15',
  lastPurchase: '2024-06-15',
  status: 'active',
  customerType: 'vip',
  creditLimit: 500.00,
  loyaltyPoints: 285
};

const dummyTransactions: CustomerTransaction[] = [
  {
    _id: '1',
    date: '2024-06-15',
    type: 'purchase',
    amount: 89.50,
    description: 'Store Purchase - Receipt #R2024-0615-001',
    status: 'completed',
    referenceNumber: 'TXN2024061501'
  },
  {
    _id: '2',
    date: '2024-06-10',
    type: 'credit',
    amount: -200.00,
    description: 'Cash Payment - Account Credit',
    status: 'completed',
    referenceNumber: 'PAY2024061001'
  },
  {
    _id: '3',
    date: '2024-06-08',
    type: 'purchase',
    amount: 156.25,
    description: 'Store Purchase - Receipt #R2024-0608-003',
    status: 'completed',
    referenceNumber: 'TXN2024060801'
  },
  {
    _id: '4',
    date: '2024-06-05',
    type: 'refund',
    amount: -25.00,
    description: 'Product Return - Defective Item',
    status: 'completed',
    referenceNumber: 'REF2024060501'
  },
  {
    _id: '5',
    date: '2024-06-01',
    type: 'purchase',
    amount: 78.90,
    description: 'Store Purchase - Receipt #R2024-0601-002',
    status: 'completed',
    referenceNumber: 'TXN2024060101'
  },
  {
    _id: '6',
    date: '2024-05-28',
    type: 'credit',
    amount: -150.00,
    description: 'Store Credit Applied',
    status: 'completed',
    referenceNumber: 'CRD2024052801'
  },
  {
    _id: '7',
    date: '2024-05-25',
    type: 'refund',
    amount: -45.75,
    description: 'Return - Wrong Size',
    status: 'completed',
    referenceNumber: 'REF2024052501'
  },
  {
    _id: '8',
    date: '2024-05-20',
    type: 'purchase',
    amount: 234.80,
    description: 'Store Purchase - Receipt #R2024-0520-007',
    status: 'completed',
    referenceNumber: 'TXN2024052001'
  },
  {
    _id: '9',
    date: '2024-05-15',
    type: 'credit',
    amount: -100.00,
    description: 'Account Credit - Loyalty Reward',
    status: 'completed',
    referenceNumber: 'CRD2024051501'
  },
  {
    _id: '10',
    date: '2024-05-10',
    type: 'purchase',
    amount: 67.25,
    description: 'Store Purchase - Receipt #R2024-0510-003',
    status: 'completed',
    referenceNumber: 'TXN2024051001'
  },
  {
    _id: '11',
    date: '2024-05-05',
    type: 'refund',
    amount: -89.90,
    description: 'Return - Damaged Product',
    status: 'completed',
    referenceNumber: 'REF2024050501'
  },
  {
    _id: '12',
    date: '2024-05-01',
    type: 'purchase',
    amount: 125.40,
    description: 'Store Purchase - Receipt #R2024-0501-002',
    status: 'completed',
    referenceNumber: 'TXN2024050101'
  }
];

const dummyPurchases: CustomerPurchase[] = [
  {
    _id: '1',
    date: '2024-06-15',
    items: [
      { productName: 'Premium Coffee Beans', quantity: 2, price: 24.99, total: 49.98 },
      { productName: 'Organic Milk', quantity: 1, price: 4.50, total: 4.50 },
      { productName: 'Artisan Bread', quantity: 3, price: 12.00, total: 36.00 }
    ],
    totalAmount: 89.50,
    paymentMethod: 'Credit Card',
    status: 'completed',
    receiptNumber: 'R2024-0615-001'
  },
  {
    _id: '2',
    date: '2024-06-08',
    items: [
      { productName: 'Fresh Vegetables Pack', quantity: 1, price: 28.75, total: 28.75 },
      { productName: 'Olive Oil', quantity: 2, price: 15.99, total: 31.98 },
      { productName: 'Pasta Variety Pack', quantity: 4, price: 8.99, total: 35.96 },
      { productName: 'Parmesan Cheese', quantity: 1, price: 18.50, total: 18.50 }
    ],
    totalAmount: 156.25,
    paymentMethod: 'Cash',
    status: 'completed',
    receiptNumber: 'R2024-0608-003'
  },
  {
    _id: '3',
    date: '2024-06-01',
    items: [
      { productName: 'Seasonal Fruits', quantity: 2, price: 22.45, total: 44.90 },
      { productName: 'Honey', quantity: 1, price: 12.99, total: 12.99 },
      { productName: 'Nuts Mix', quantity: 1, price: 21.01, total: 21.01 }
    ],
    totalAmount: 78.90,
    paymentMethod: 'Debit Card',
    status: 'completed',
    receiptNumber: 'R2024-0601-002'
  }
];

export default function CustomerOverview() {
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState("sales");
  const [salesFilter, setSalesFilter] = useState("all");
  const customersRoute = useNavigationRoute('customers');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [isDebtPaymentDialogOpen, setIsDebtPaymentDialogOpen] = useState(false);
  const [debtPaymentAmount, setDebtPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [statementFilter, setStatementFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(125.50);
  const [walletTransactions, setWalletTransactions] = useState([
    {
      _id: 'w1',
      date: '2024-06-10',
      type: 'deposit',
      amount: 100.00,
      description: 'Wallet deposit - Cash',
      balance: 225.50
    },
    {
      _id: 'w2',
      date: '2024-06-08',
      type: 'spend',
      amount: -75.00,
      description: 'Purchase - Receipt #R2024-0608-003',
      balance: 125.50
    },
    {
      _id: 'w3',
      date: '2024-06-05',
      type: 'deposit',
      amount: 50.00,
      description: 'Wallet deposit - Card',
      balance: 200.50
    }
  ]);
  
  const { toast } = useToast();
  const { selectedShopId } = useSelector((state: RootState) => state.shop);
  const { admin } = useAuth();
  const { attendant } = useAttendantAuth();
  
  // Get customer ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const customerId = urlParams.get('id');
  
  // Check for passed customer data from customers page
  const [passedCustomerData, setPassedCustomerData] = useState<any>(null);
  
  useEffect(() => {
    const customerData = (window as any).__customerData;
    if (customerData && customerData._id === customerId) {
      setPassedCustomerData(customerData);
      // Clear the data after use
      delete (window as any).__customerData;
    }
  }, [customerId]);
  
  
  // If no customer ID, log error
  if (!customerId) {
    console.error('No customer ID found in URL. Expected format: /customer-overview?id=CUSTOMER_ID');
    console.error('Full URL:', window.location.href);
  }
  
  if (customerId && !selectedShopId) {
  }
  
  if (customerId && selectedShopId) {
  }
  
  // Effect to log when shop state changes
  useEffect(() => {
    if (customerId && selectedShopId) {
    }
  }, [selectedShopId, customerId]);
  


  // Use passed customer data or minimal fallback - avoid redundant API calls
  const customerData = passedCustomerData || (customerId ? { _id: customerId, name: 'Customer', wallet: 0 } : null);
  const customerLoading = false;

  // Fetch customer-specific sales data. Resolve in the same precedence as the
  // rest of the app (selectedShopId → attendant's assigned shop → admin's shop)
  // instead of falling back to a hardcoded shop ID belonging to a different shop,
  // which silently returned zero sales for every attendant session.
  // /receipt/:id only exists under the admin-authenticated route tree; attendants
  // must use /attendant/receipt/:id or clicking "View Receipt" bounces to login.
  const receiptBasePath = attendant ? '/attendant/receipt' : '/receipt';
  const attendantShopId =
    typeof attendant?.shopId === 'object' ? (attendant.shopId as any)?._id : attendant?.shopId;
  const adminShopId =
    typeof (admin as any)?.shopId === 'object' ? (admin as any)?.shopId?._id : (admin as any)?.shopId;
  const effectiveShopId = selectedShopId || attendantShopId || adminShopId || (admin as any)?.primaryShop;
  
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['/api/sales/filter', customerId, effectiveShopId, salesFilter],
    enabled: !!customerId, // Only need customer ID
    queryFn: async () => {
      
      if (!customerId) {
        console.error('Cannot fetch sales: No customer ID available');
        return { data: [] };
      }
      
      const params = new URLSearchParams();
      params.append('shopId', effectiveShopId);
      params.append('customerId', customerId);
      params.append('customer', customerId); // Try both parameter names
      params.append('paginated', 'true');
      params.append('page', '1');
      params.append('limit', '100');
      
      // Always add paymentTag parameter as requested
      if (salesFilter === 'credit') {
        params.append('paymentTag', 'credit');
      } else if (salesFilter === 'cash') {
        params.append('paymentTag', 'cash');
      } else {
        // Always include paymentTag, even for 'all' filter
        params.append('paymentTag', '');
      }
      
      const url = `/api/sales/filter?${params.toString()}`;
      
      const token = localStorage.getItem('token') || localStorage.getItem('attendantToken');
      const response = await rawApiFetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        console.error('API call failed:', response.status, response.statusText);
        return { data: [], count: 0, totalPages: 0, currentPage: 1 };
      }
      
      const result = await response.json();
      
      return result;

    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false, // Don't retry to see immediate errors
  });

  // Fetch customer payment history
  const { data: customerPayments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['/api/customers/payments', customerId, statementFilter],
    queryFn: async () => {
      if (!customerId) return [];
      
      const token = localStorage.getItem('token') || localStorage.getItem('attendantToken');
      const url = `/api/customers/payments/${customerId}?type=${statementFilter}`;
      
      const response = await rawApiFetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        console.error('Customer payments API failed:', response.status, response.statusText);
        throw new Error('Failed to fetch customer payments');
      }
      
      const result = await response.json();
      
      return result;
    },
    enabled: !!customerId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Debt payment mutation
  const debtPaymentMutation = useMutation({
    mutationFn: async (paymentData: { amount: number; paymentMethod: string; notes: string }) => {
      if (!customerId || !customerData) {
        throw new Error('Customer data not available');
      }

      const currentWallet = customerData.wallet || 0;
      const newWalletBalance = paymentData.amount; // Set wallet to the payment amount directly

      // Get attendantId based on user type
      let attendantId = null;
      const attendantData = localStorage.getItem("attendantData");
      
      if (attendantData) {
        // If attendant is logged in, use their _id
        const parsedAttendantData = JSON.parse(attendantData);
        attendantId = parsedAttendantData._id;
      } else if (admin) {
        // If admin is logged in, get attendantId from localStorage or sales data
        const storedAttendantId = localStorage.getItem("attendantId");
        attendantId = storedAttendantId || 
                     salesData?.data?.[0]?.attendantId || 
                     salesData?.data?.[0]?.items?.[0]?.attendantId ||
                     admin._id;
      }
      
      const updateData = {
        wallet: newWalletBalance,
        shopId: effectiveShopId,
        attendantId: attendantId
      };


      // Create a timeout promise to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - please try again')), 30000); // 30 second timeout
      });

      // Race between the API request and timeout
      const response = await Promise.race([
        apiRequest('PUT', `/api/customers/${customerId}`, updateData),
        timeoutPromise
      ]) as Response;

      if (!response.ok) {
        throw new Error('Failed to record payment');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all customer-related queries with the specific keys used in this component
      queryClient.invalidateQueries({ queryKey: ['/api/sales/filter', customerId, effectiveShopId, salesFilter] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers/payments', customerId, statementFilter] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      
      // Invalidate customers list page queries with proper shopId and userType
      const userType = localStorage.getItem("attendantData") ? 'attendant' : 'admin';
      queryClient.invalidateQueries({ queryKey: ['customers', effectiveShopId, userType] });
      queryClient.invalidateQueries({ queryKey: ['customer-analysis', effectiveShopId, userType] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['customer-data'] });
      
      // Also invalidate any other customer-related queries
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = String(query.queryKey[0] || '');
          return key.includes('/api/customers') || key.includes('customer');
        }
      });
      
      toast({
        title: "Payment Recorded",
        description: `Customer debt payment of ${currency} ${debtPaymentAmount} has been recorded successfully.`,
      });
      setIsDebtPaymentDialogOpen(false);
      setDebtPaymentAmount("");
      setPaymentNotes("");
    },
    onError: (error: any) => {
      // Log error for debugging
      console.error('Debt payment error:', error);
      
      let errorMessage = "Failed to record debt payment";
      
      // Handle different types of errors
      if (error.message?.includes('timeout')) {
        errorMessage = "Request timed out. Please check your connection and try again.";
      } else if (error.message?.includes('504')) {
        errorMessage = "Server temporarily unavailable. Please try again in a moment.";
      } else if (error.message?.includes('Network')) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Reset dialog state even on error to prevent hanging
      setIsDebtPaymentDialogOpen(false);
      setDebtPaymentAmount("");
      setPaymentNotes("");
    },
  });

  // Use actual customer data including passed data from customers page
  const customerOverviewData = customerData ? {
    _id: customerData._id,
    name: customerData.name || 'Customer',
    email: customerData.email || '',
    phone: customerData.phonenumber || customerData.phone || '',
    address: customerData.address || '',
    totalPurchases: salesData?.data?.length || 0,
    totalSpent: passedCustomerData?.totalSpent || salesData?.data?.reduce((sum: number, sale: any) => sum + (sale.totalAmount || 0), 0) || 0,
    outstandingBalance: passedCustomerData?.totalOutstanding || Math.abs(customerData.wallet || 0),
    creditBalance: customerData.wallet || 0,
    lastPurchaseDate: salesData?.data?.[0]?.createdAt || '',
    memberSince: customerData.createdAt || '',
    status: 'Active',
    vipStatus: false,
    customerType: customerData.customerType || 'Regular'
  } : {
    _id: customerId || '',
    name: customerLoading ? 'Loading...' : 'Customer Not Found',
    email: '',
    phone: '',
    address: '',
    totalPurchases: 0,
    totalSpent: 0,
    outstandingBalance: 0,
    creditBalance: 0,
    lastPurchaseDate: '',
    memberSince: '',
    status: 'Active',
    vipStatus: false,
    customerType: 'Regular'
  };

  // Convert sales data to transactions format
  const salesTransactions = (salesData?.data || []).map((sale: Sale) => {
    // Generate receipt number from sale ID or use available receiptno field
    const receiptNumber = (sale as any).receiptno || 
                         (sale as any).receiptNo || 
                         `R${sale._id?.slice(-8) || 'N/A'}`;
    
    return {
      _id: sale._id,
      date: sale.saleDate || sale.createdAt,
      type: sale.paymentTag === 'credit' ? 'credit' : 'purchase' as const,
      amount: (sale as any).totalWithDiscount || sale.totalAmount, // Use totalWithDiscount if available, fallback to totalAmount
      description: `${sale.items?.map(item => item.productName || item.product?.name).join(', ') || 'Sale'}`,
      status: sale.status === 'cashed' ? 'completed' : sale.status as 'completed' | 'pending' | 'cancelled',
      referenceNumber: receiptNumber,
      outstandingBalance: sale.outstandingBalance || 0,
      paymentMethod: sale.paymentTag,
      currency: sale.shopId?.currency || 'KES'
    };
  });

  // Calculate pagination
  const totalPages = Math.ceil(salesTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = salesTransactions.slice(startIndex, startIndex + itemsPerPage);

  // Reset current page when filter changes
  const handleFilterChange = (value: string) => {
    setSalesFilter(value);
    setCurrentPage(1);
  };

  // Get currency from customer data
  const currency = customerData?.shopId?.currency || 'KES';

  // Wallet deposit mutation
  const depositMutation = useMutation({
    mutationFn: async (depositData: { amount: number; paymentMethod: string; notes: string }) => {
      if (!customerId || !customerData) {
        throw new Error('Customer data not available');
      }

      // Get attendantId based on user type
      let attendantId = null;
      const attendantData = localStorage.getItem("attendantData");
      
      if (attendantData) {
        const parsedAttendantData = JSON.parse(attendantData);
        attendantId = parsedAttendantData._id;
      } else if (admin) {
        const storedAttendantId = localStorage.getItem("attendantId");
        attendantId = storedAttendantId || 
                     salesData?.data?.[0]?.attendantId || 
                     salesData?.data?.[0]?.items?.[0]?.attendantId ||
                     admin._id;
      }

      // Send only the deposit amount — the API adds it to the existing balance
      const updateData = {
        wallet: depositData.amount,
        shopId: effectiveShopId,
        attendantId: attendantId
      };

      const token = localStorage.getItem("token") || localStorage.getItem("attendantToken");
      const response = await rawApiFetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Deposit failed: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: (updatedCustomer) => {
      toast({
        title: "Deposit Successful",
        description: `${currency} ${depositAmount} has been added to the wallet`,
      });
      setDepositAmount("");
      setIsDepositDialogOpen(false);
      // Update local customer state so wallet balance reflects immediately
      if (updatedCustomer && passedCustomerData) {
        setPassedCustomerData({ ...passedCustomerData, wallet: updatedCustomer.wallet ?? updatedCustomer.data?.wallet ?? passedCustomerData.wallet });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers/payments', customerId] });
    },
    onError: (error: any) => {
      toast({
        title: "Deposit Failed",
        description: error.message || "Could not process the deposit",
        variant: "destructive",
      });
    },
  });

  // Handle wallet deposit
  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid deposit amount",
        variant: "destructive",
      });
      return;
    }

    depositMutation.mutate({
      amount,
      paymentMethod: 'cash',
      notes: `Wallet deposit - ${currency} ${amount}`
    });
  };

  // Download customer statement as CSV
  const downloadStatementCSV = () => {
    const customerName = customerOverviewData.name;
    const currentDate = new Date().toLocaleDateString();
    
    if (!customerPayments || customerPayments.length === 0) {
      toast({
        title: "No Payment History",
        description: "No payment history available for this customer",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare CSV data
    let csvContent = `Customer Statement\n`;
    csvContent += `Customer: ${customerName}\n`;
    csvContent += `Generated: ${currentDate}\n`;
    csvContent += `\n`;
    csvContent += `Date,Type,Amount,Receipt No,Attendant,Balance\n`;
    
    customerPayments.forEach((payment: any) => {
      const date = new Date(payment.createdAt).toLocaleDateString();
      const type = payment.type.charAt(0).toUpperCase() + payment.type.slice(1);
      const amount = payment.totalAmount || 0;
      const receiptNo = payment.paymentNo || 'N/A';
      const attendant = payment.attendantId?.username || 'System';
      const balance = payment.balance !== undefined ? payment.balance : (payment.customerId?.wallet || 0);
      
      const sign = payment.type === 'withdraw' ? '-' : '+';
      csvContent += `${date},"${type}",${sign}${amount.toFixed(2)},"${receiptNo}","${attendant}",${balance.toFixed(2)}\n`;
    });
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${customerName.replace(/\s+/g, '_')}_Statement_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "CSV Downloaded",
      description: "Customer statement CSV has been downloaded successfully",
    });
  };

  // Download customer statement as PDF
  const downloadStatementPDF = () => {
    const customerName = customerOverviewData.name;
    const currentDate = new Date().toLocaleDateString();
    const shopName = (typeof admin?.primaryShop === 'object' ? (admin.primaryShop as any)?.name : null) || 'Shop';

    const allSales: any[] = salesData?.data || [];
    const allPayments: any[] = (customerPayments as any[]) || [];

    if (allSales.length === 0 && allPayments.length === 0) {
      toast({
        title: "No History",
        description: "No transaction history available for this customer",
        variant: "destructive",
      });
      return;
    }

    // Build unified transaction list
    type TxRow = { ts: number; date: string; description: string; ref: string; attendant: string; debit: number; credit: number; };
    const rows: TxRow[] = [];

    // Add sales
    allSales.forEach((sale: any) => {
      const ts = new Date(sale.createdAt || sale.saleDate).getTime();
      const ref = sale.receiptNo || sale.receiptno || sale._id?.slice(-8) || 'N/A';
      const attendant = sale.attendantId?.username || '';
      const amount = Number(sale.totalWithDiscount || sale.totalAmount || 0);
      const tag = (sale.paymentTag || '').toLowerCase();
      const productNames = (sale.items || []).map((i: any) => i.productName || i.name || 'Item').join(', ');
      const description = `Sale${productNames ? ': ' + productNames.substring(0, 60) : ''}`;
      const payLabel = tag === 'credit' ? 'Credit' : tag === 'wallet' ? 'Wallet' : tag === 'mpesa' ? 'M-Pesa' : tag === 'bank' ? 'Bank' : 'Cash';

      if (tag === 'credit') {
        // Credit sale — customer owes this amount
        rows.push({ ts, date: new Date(ts).toLocaleDateString(), description: `${description} [${payLabel}]`, ref, attendant, debit: amount, credit: 0 });
      } else if (tag === 'wallet') {
        // Paid from wallet — deducted from wallet
        rows.push({ ts, date: new Date(ts).toLocaleDateString(), description: `${description} [${payLabel}]`, ref, attendant, debit: amount, credit: 0 });
      } else {
        // Cash/M-Pesa/Bank paid sale — show as informational, 0 impact on balance
        rows.push({ ts, date: new Date(ts).toLocaleDateString(), description: `${description} [${payLabel} - Paid]`, ref, attendant, debit: 0, credit: 0 });
      }
    });

    // Add wallet transactions
    allPayments.forEach((payment: any) => {
      const ts = new Date(payment.createdAt).getTime();
      const ref = payment.paymentNo || payment._id?.slice(-8) || 'N/A';
      const attendant = payment.attendantId?.username || 'System';
      const amount = Number(payment.totalAmount || 0);
      const isDeposit = payment.type === 'deposit';
      rows.push({
        ts, date: new Date(ts).toLocaleDateString(),
        description: isDeposit ? 'Wallet Deposit' : 'Wallet Withdrawal',
        ref, attendant,
        debit: isDeposit ? 0 : amount,
        credit: isDeposit ? amount : 0,
      });
    });

    // Sort by date ascending
    rows.sort((a, b) => a.ts - b.ts);

    // Compute running balance (positive = customer has credit, negative = customer owes)
    let runningBalance = 0;
    const transactionRows = rows.map(row => {
      runningBalance += row.credit - row.debit;
      const balanceColor = runningBalance < 0 ? '#dc2626' : '#059669';
      const balanceText = `${currency} ${Math.abs(runningBalance).toFixed(2)}${runningBalance < 0 ? ' (DR)' : ''}`;
      const debitCell = row.debit > 0
        ? `<span style="color:#dc2626;font-weight:600;">${currency} ${row.debit.toFixed(2)}</span>`
        : `<span style="color:#9ca3af;">-</span>`;
      const creditCell = row.credit > 0
        ? `<span style="color:#059669;font-weight:600;">${currency} ${row.credit.toFixed(2)}</span>`
        : `<span style="color:#9ca3af;">-</span>`;
      return `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${row.date}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-size:12px;">${row.description}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${row.ref}<br/><span style="font-size:11px;color:#6b7280;">${row.attendant}</span></td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${debitCell}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${creditCell}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:${balanceColor};">${balanceText}</td>
        </tr>
      `;
    }).join('');

    // Summary
    const totalDebits = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredits = rows.reduce((s, r) => s + r.credit, 0);
    const closingBalance = totalCredits - totalDebits;

    // Create print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Customer Statement - ${customerName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 40px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 20px;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 10px;
            }
            .statement-title {
              font-size: 20px;
              margin-bottom: 20px;
            }
            .customer-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              background-color: #f8fafc;
              padding: 20px;
              border-radius: 8px;
            }
            .info-section {
              flex: 1;
            }
            .info-label {
              font-weight: bold;
              color: #374151;
              margin-bottom: 5px;
            }
            .info-value {
              color: #6b7280;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background-color: #2563eb;
              color: white;
              padding: 12px 8px;
              text-align: left;
              font-weight: 600;
            }
            th:last-child, td:last-child {
              text-align: right;
            }
            .summary {
              margin-top: 30px;
              padding: 20px;
              background-color: #f0f9ff;
              border-radius: 8px;
              border-left: 4px solid #2563eb;
            }
            .summary-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #2563eb;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
            }
            .summary-item {
              text-align: center;
            }
            .summary-value {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .summary-label {
              color: #6b7280;
              font-size: 14px;
            }
            @media print {
              body { margin: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${shopName}</div>
            <div class="statement-title">Customer Account Statement</div>
          </div>
          
          <div class="customer-info">
            <div class="info-section">
              <div class="info-label">Customer Name:</div>
              <div class="info-value">${customerName}</div>
            </div>
            <div class="info-section">
              <div class="info-label">Statement Date:</div>
              <div class="info-value">${currentDate}</div>
            </div>
            <div class="info-section">
              <div class="info-label">Phone:</div>
              <div class="info-value">${(customerData as any)?.phonenumber || (customerData as any)?.phone || 'N/A'}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:90px;">Date</th>
                <th>Description</th>
                <th style="width:120px;">Reference</th>
                <th style="text-align:right;width:100px;">Debit</th>
                <th style="text-align:right;width:100px;">Credit</th>
                <th style="text-align:right;width:110px;">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${transactionRows}
            </tbody>
            <tfoot>
              <tr style="background:#f1f5f9;font-weight:700;">
                <td colspan="3" style="padding:10px 8px;border-top:2px solid #2563eb;">Totals</td>
                <td style="padding:10px 8px;border-top:2px solid #2563eb;text-align:right;color:#dc2626;">${currency} ${totalDebits.toFixed(2)}</td>
                <td style="padding:10px 8px;border-top:2px solid #2563eb;text-align:right;color:#059669;">${currency} ${totalCredits.toFixed(2)}</td>
                <td style="padding:10px 8px;border-top:2px solid #2563eb;text-align:right;color:${closingBalance < 0 ? '#dc2626' : '#059669'};">
                  ${currency} ${Math.abs(closingBalance).toFixed(2)}${closingBalance < 0 ? ' (DR)' : ' (CR)'}
                </td>
              </tr>
            </tfoot>
          </table>

          <div class="summary">
            <div class="summary-title">Account Summary</div>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-value" style="color:#dc2626;">${currency} ${totalDebits.toFixed(2)}</div>
                <div class="summary-label">Total Debits</div>
              </div>
              <div class="summary-item">
                <div class="summary-value" style="color:#059669;">${currency} ${totalCredits.toFixed(2)}</div>
                <div class="summary-label">Total Credits</div>
              </div>
              <div class="summary-item">
                <div class="summary-value" style="color:${closingBalance < 0 ? '#dc2626' : '#059669'};">
                  ${currency} ${Math.abs(closingBalance).toFixed(2)}
                </div>
                <div class="summary-label">${closingBalance < 0 ? 'Outstanding (DR)' : 'Credit Balance (CR)'}</div>
              </div>
            </div>
          </div>

        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Trigger print after content loads
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 600);

    toast({
      title: "Statement Ready",
      description: "Customer statement is opening for print/save",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case 'vip': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'wholesale': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'regular': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'purchase': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'payment': return 'bg-green-100 text-green-800 border-green-200';
      case 'refund': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'credit': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };



  return (
    <DashboardLayout title="Customer Overview">
      <div className="space-y-3 sm:space-y-5">
        <PageHeader title="Customer Overview" backHref={customersRoute} />

        {/* Customer Header - Mobile Responsive */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold truncate">{customerOverviewData.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge className={`text-xs ${getStatusColor(customerOverviewData.status || 'Active')}`}>
                      {(customerOverviewData.status || 'Active').charAt(0).toUpperCase() + (customerOverviewData.status || 'Active').slice(1)}
                    </Badge>
                    <Badge className={`text-xs ${getCustomerTypeColor(customerOverviewData.customerType || 'VIP')}`}>
                      {(customerOverviewData.customerType || 'VIP').toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-center sm:text-right border-t sm:border-t-0 pt-4 sm:pt-0">
                <div className="text-xl sm:text-2xl font-bold text-blue-600">
                  {customerData?.wallet ? 
                    `${currency} ${customerData.wallet.toLocaleString()}` : 
                    `${currency} 0`
                  }
                </div>
                <div className={`text-sm ${(customerData?.wallet || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {(customerData?.wallet || 0) < 0 ? 'Outstanding Balance' : 'Wallet Balance'}
                </div>
                {customerData && (
                  <Button
                    onClick={() => (customerData.wallet || 0) < 0 ? setIsDebtPaymentDialogOpen(true) : setIsDepositDialogOpen(true)}
                    size="sm"
                    className={`mt-2 ${(customerData.wallet || 0) < 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    {(customerData.wallet || 0) < 0 ? 'Pay Debt' : 'Deposit'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deposit Dialog */}
        <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
          <DialogContent className="w-[calc(100%-1.5rem)] max-w-sm rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-base">Deposit to Wallet</DialogTitle>
              <DialogDescription className="text-xs">Add money to the customer's wallet balance</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div>
                <Label htmlFor="amount" className="text-xs font-medium mb-1 block">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-9" onClick={() => setIsDepositDialogOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 h-9"
                onClick={handleDeposit}
                disabled={depositMutation.isPending || !depositAmount || parseFloat(depositAmount) <= 0}
              >
                {depositMutation.isPending ? "Processing..." : `Deposit ${currency} ${depositAmount || '0.00'}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>



        {/* Detailed Information Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="statement">Statement</TabsTrigger>
            <TabsTrigger value="contact">Contact Info</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4">
            <Card>
              <CardHeader className="py-3">
                <div className="flex justify-between items-center gap-2">
                  <CardTitle className="text-sm">Sales History</CardTitle>
                  <Select value={salesFilter} onValueChange={handleFilterChange}>
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sales</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0 lg:p-6 lg:pt-0">
                {salesLoading ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">Loading sales data...</div>
                ) : paginatedTransactions.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-500">No sales found for this customer</div>
                ) : (
                  <>
                    {/* Mobile cards */}
                    <div className="divide-y lg:hidden">
                      {paginatedTransactions.map((transaction) => (
                        <div key={transaction._id} className="px-3 py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <Badge className={`text-[10px] ${getTransactionTypeColor(transaction.type)}`}>
                                {transaction.paymentMethod?.charAt(0)?.toUpperCase() + transaction.paymentMethod?.slice(1) || transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                              </Badge>
                              <DateTime value={transaction.date} inline className="text-[11px] text-muted-foreground" />
                            </div>
                            <p className="text-xs text-gray-500 truncate">{transaction.referenceNumber}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-semibold text-green-600">{transaction.currency} {transaction.amount.toLocaleString()}</span>
                            <Link
                              href={`${receiptBasePath}/${transaction._id}`}
                              onClick={() => { const s = salesData?.data?.find((sale: any) => sale._id === transaction._id); if (s) (window as any).__receiptData = s; }}
                            >
                              <Button variant="outline" size="sm" className="h-7 text-xs px-2">Receipt</Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden lg:block rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs py-2">Date</TableHead>
                            <TableHead className="text-xs py-2">Type</TableHead>
                            <TableHead className="text-xs py-2">Receipt No</TableHead>
                            <TableHead className="text-xs py-2 text-right">Amount</TableHead>
                            <TableHead className="text-xs py-2">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedTransactions.map((transaction) => (
                            <TableRow key={transaction._id}>
                              <TableCell className="text-xs py-2"><DateTime value={transaction.date} /></TableCell>
                              <TableCell className="py-2">
                                <Badge className={`text-[10px] ${getTransactionTypeColor(transaction.type)}`}>
                                  {transaction.paymentMethod?.charAt(0)?.toUpperCase() + transaction.paymentMethod?.slice(1) || transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs py-2 text-gray-500">{transaction.referenceNumber}</TableCell>
                              <TableCell className="text-xs py-2 text-right font-medium text-green-600">{transaction.currency} {transaction.amount.toLocaleString()}</TableCell>
                              <TableCell className="py-2">
                                <Link href={`${receiptBasePath}/${transaction._id}`} onClick={() => { const s = salesData?.data?.find((sale: any) => sale._id === transaction._id); if (s) (window as any).__receiptData = s; }}>
                                  <Button variant="outline" size="sm" className="h-7 text-xs">View Receipt</Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}

                {/* Pagination */}
                {paginatedTransactions.length > 0 && (
                  <div className="flex items-center justify-between px-3 lg:px-0 py-3 border-t">
                    <p className="text-[11px] text-muted-foreground">
                      {startIndex + 1}–{Math.min(startIndex + itemsPerPage, salesTransactions.length)} of {salesTransactions.length}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
                        <ChevronLeft className="h-3.5 w-3.5" />Prev
                      </Button>
                      <span className="text-xs text-muted-foreground">{currentPage}/{totalPages}</span>
                      <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>
                        Next<ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statement" className="space-y-4">
            <Card>
              <CardHeader className="py-3">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <CardTitle className="text-sm">Account Statement</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={statementFilter} onValueChange={setStatementFilter}>
                      <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Filter" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="deposit">Deposit</SelectItem>
                        <SelectItem value="withdraw">Withdraw</SelectItem>
                        <SelectItem value="payment">Payment</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={downloadStatementCSV} variant="outline" size="sm" className="h-8 text-xs px-2">
                      <Download className="h-3.5 w-3.5 mr-1" />CSV
                    </Button>
                    <Button onClick={downloadStatementPDF} variant="outline" size="sm" className="h-8 text-xs px-2">
                      <Download className="h-3.5 w-3.5 mr-1" />PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 lg:p-6 lg:pt-0">
                {isLoadingPayments ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">Loading payment history...</div>
                ) : !customerPayments || customerPayments.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-500">No payment history found</div>
                ) : (
                  <>
                    {/* Mobile cards */}
                    <div className="divide-y lg:hidden">
                      {customerPayments.map((payment: any) => {
                        const type = payment.type.charAt(0).toUpperCase() + payment.type.slice(1);
                        const amount = payment.totalAmount || 0;
                        const paymentNo = payment.paymentNo || 'N/A';
                        const balance = payment.balance !== undefined ? payment.balance : (payment.customerId?.wallet || 0);
                        const attendant = payment.attendantId?.username || 'System';
                        return (
                          <div key={payment._id} className="px-3 py-3 flex items-center justify-between gap-3 cursor-pointer active:bg-muted/50" onClick={() => setSelectedPayment(payment)}>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <Badge variant={payment.type === 'deposit' ? 'default' : payment.type === 'withdraw' ? 'destructive' : 'secondary'} className="text-[10px]">{type}</Badge>
                                <DateTime value={payment.createdAt} inline className="text-[11px] text-muted-foreground" />
                              </div>
                              <p className="text-xs text-gray-500">{paymentNo} · {attendant}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-sm font-semibold ${payment.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                                {payment.type === 'withdraw' ? '-' : '+'}{currency} {amount.toFixed(2)}
                              </p>
                              <p className={`text-[11px] font-medium ${balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                Bal: {currency} {Math.abs(balance).toFixed(2)}{balance < 0 ? ' DR' : ''}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden lg:block rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs py-2">Date</TableHead>
                            <TableHead className="text-xs py-2">Type</TableHead>
                            <TableHead className="text-xs py-2 text-right">Amount</TableHead>
                            <TableHead className="text-xs py-2">Receipt & Attendant</TableHead>
                            <TableHead className="text-xs py-2 text-right">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerPayments.map((payment: any) => {
                            const type = payment.type.charAt(0).toUpperCase() + payment.type.slice(1);
                            const amount = payment.totalAmount || 0;
                            const paymentNo = payment.paymentNo || 'N/A';
                            const balance = payment.balance !== undefined ? payment.balance : (payment.customerId?.wallet || 0);
                            const attendant = payment.attendantId?.username || 'System';
                            return (
                              <TableRow key={payment._id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedPayment(payment)}>
                                <TableCell className="text-xs py-2"><DateTime value={payment.createdAt} /></TableCell>
                                <TableCell className="py-2">
                                  <Badge variant={payment.type === 'deposit' ? 'default' : payment.type === 'withdraw' ? 'destructive' : 'secondary'} className="text-[10px]">{type}</Badge>
                                </TableCell>
                                <TableCell className="text-xs py-2 text-right">
                                  <span className={`font-medium ${payment.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                                    {payment.type === 'withdraw' ? '-' : '+'}{currency} {amount.toFixed(2)}
                                  </span>
                                </TableCell>
                                <TableCell className="py-2">
                                  <div className="flex flex-col">
                                    <span className="text-xs">{paymentNo}</span>
                                    <span className="text-[11px] text-gray-500">{attendant}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs py-2 text-right font-medium">
                                  <span className={balance < 0 ? 'text-red-600' : 'text-green-600'}>
                                    {currency} {Math.abs(balance).toFixed(2)}{balance < 0 && <span className="ml-1">(DR)</span>}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="contact" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>

              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Email Address</p>
                        <p className="font-medium">{customerOverviewData.email || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Phone Number</p>
                        <p className="font-medium">{customerOverviewData.phone || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600">Address</p>
                        <p className="font-medium">{customerOverviewData.address || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Debt Payment Dialog */}
        <Dialog open={isDebtPaymentDialogOpen} onOpenChange={setIsDebtPaymentDialogOpen}>
          <DialogContent className="w-[calc(100%-1.5rem)] max-w-sm rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-base">Record Debt Payment</DialogTitle>
              <DialogDescription className="text-xs">Record a payment to reduce the customer's outstanding debt.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="debt-amount" className="text-xs font-medium mb-1 block">Payment Amount</Label>
                <Input
                  id="debt-amount"
                  type="number"
                  step="0.01"
                  value={debtPaymentAmount}
                  onChange={(e) => setDebtPaymentAmount(e.target.value)}
                  placeholder="Enter payment amount"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="payment-method" className="text-xs font-medium mb-1 block">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="payment-notes" className="text-xs font-medium mb-1 block">Notes (Optional)</Label>
                <Input
                  id="payment-notes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Payment notes or reference"
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-9" onClick={() => setIsDebtPaymentDialogOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 h-9 bg-green-600 hover:bg-green-700"
                onClick={() => {
                  const amount = parseFloat(debtPaymentAmount);
                  if (amount > 0) {
                    debtPaymentMutation.mutate({ amount, paymentMethod, notes: paymentNotes });
                  }
                }}
                disabled={!debtPaymentAmount || parseFloat(debtPaymentAmount) <= 0 || debtPaymentMutation.isPending}
              >
                {debtPaymentMutation.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Payment Receipt Dialog */}
        {selectedPayment && (() => {
          const p = selectedPayment;
          const amount = p.totalAmount || 0;
          const balance = p.balance !== undefined ? p.balance : (p.customerId?.wallet || 0);
          const paymentNo = p.paymentNo || p._id?.slice(-8) || 'N/A';
          const attendant = p.attendantId?.username || 'System';
          const type = (p.type || '').charAt(0).toUpperCase() + (p.type || '').slice(1);
          const shopName = (typeof admin?.primaryShop === 'object' ? (admin.primaryShop as any)?.name : null) || 'Shop';
          const isDeposit = p.type === 'deposit';
          const dateTime = new Date(p.createdAt);

          const handlePrint = () => {
            const printWindow = window.open('', '_blank', 'width=400,height=600');
            if (!printWindow) return;
            printWindow.document.write(`
              <!DOCTYPE html><html><head><title>Receipt ${paymentNo}</title>
              <style>
                body { font-family: 'Courier New', monospace; max-width: 320px; margin: 0 auto; padding: 16px; font-size: 12px; }
                .center { text-align: center; }
                .divider { border-top: 1px dashed #999; margin: 8px 0; }
                .row { display: flex; justify-content: space-between; margin: 4px 0; }
                .bold { font-weight: bold; }
                .large { font-size: 18px; font-weight: bold; }
              </style></head><body>
              <div class="center bold" style="font-size:15px;">${shopName}</div>
              <div class="center" style="margin-bottom:6px;">Wallet ${type} Receipt</div>
              <div class="divider"></div>
              <div class="row"><span>Receipt No:</span><span>${paymentNo}</span></div>
              <div class="row"><span>Date:</span><span>${dateTime.toLocaleDateString()}</span></div>
              <div class="row"><span>Time:</span><span>${dateTime.toLocaleTimeString()}</span></div>
              <div class="row"><span>Customer:</span><span>${customerOverviewData.name}</span></div>
              <div class="row"><span>Attendant:</span><span>${attendant}</span></div>
              <div class="divider"></div>
              <div class="row"><span>Transaction:</span><span>${type}</span></div>
              <div class="row bold large"><span>${isDeposit ? 'Deposited:' : 'Withdrawn:'}</span><span>${currency} ${amount.toFixed(2)}</span></div>
              <div class="row"><span>New Balance:</span><span>${currency} ${Math.abs(balance).toFixed(2)}${balance < 0 ? ' DR' : ' CR'}</span></div>
              <div class="divider"></div>
              <div class="center" style="margin-top:8px;">Thank you!</div>
              </body></html>
            `);
            printWindow.document.close();
            setTimeout(() => { printWindow.focus(); printWindow.print(); }, 400);
          };

          return (
            <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
              <DialogContent className="w-[calc(100%-1.5rem)] max-w-xs rounded-xl p-0 overflow-hidden">
                {/* Receipt header */}
                <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white px-5 py-4 text-center">
                  <p className="text-xs font-medium opacity-80 uppercase tracking-wide">{shopName}</p>
                  <p className="text-sm font-semibold mt-0.5">Wallet {type} Receipt</p>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-1 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receipt No</span>
                    <span className="font-semibold">{paymentNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span>{dateTime.toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time</span>
                    <span>{dateTime.toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="truncate max-w-[160px] text-right">{customerOverviewData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Attendant</span>
                    <span>{attendant}</span>
                  </div>

                  <div className="border-t border-dashed my-2" />

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction</span>
                    <span>
                      <Badge variant={isDeposit ? 'default' : 'destructive'} className="text-[10px]">{type}</Badge>
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">{isDeposit ? 'Deposited' : 'Withdrawn'}</span>
                    <span className={`text-base font-bold ${isDeposit ? 'text-green-600' : 'text-red-600'}`}>
                      {isDeposit ? '+' : '-'}{currency} {amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">New Balance</span>
                    <span className={`font-semibold ${balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {currency} {Math.abs(balance).toFixed(2)} {balance < 0 ? 'DR' : 'CR'}
                    </span>
                  </div>

                  <div className="border-t border-dashed mt-2" />
                  <p className="text-center text-muted-foreground pt-1">Thank you!</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 px-5 pb-4">
                  <Button variant="outline" className="flex-1 h-9 text-xs" onClick={() => setSelectedPayment(null)}>Close</Button>
                  <Button className="flex-1 h-9 text-xs" onClick={handlePrint}>
                    Print Receipt
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          );
        })()}
      </div>
    </DashboardLayout>
  );
}
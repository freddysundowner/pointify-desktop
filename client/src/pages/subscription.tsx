import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Check, Store, Clock, Users, Zap, Crown, Star, ArrowLeft, Phone, CreditCard, Smartphone, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Define types for better TypeScript support
interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  amount: number;
  duration: string;
  maxShops: number;
  features: string[];
  popular: boolean;
  current: boolean;
  color: string;
  type?: string;
  description?: string;
  daysRemaining?: number | null;
}

interface Shop {
  id: string;
  name: string;
  type: string;
  location: string;
}

export default function SubscriptionPage() {
  const [location, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const { toast } = useToast();
  const [step, setStep] = useState(1); // 1: Plans, 2: Shop Selection, 3: Payment
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedShops, setSelectedShops] = useState<Shop[]>([]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: ""
  });
  const [paymentMethod, setPaymentMethod] = useState("mpesa");
  const [isProcessing, setIsProcessing] = useState(false);

  // Get admin data from localStorage to check current subscription
  const getAdminData = () => {
    try {
      const adminData = localStorage.getItem('adminData');
      return adminData ? JSON.parse(adminData) : null;
    } catch (error) {
      return null;
    }
  };

  const adminData = getAdminData();

  // Use the ID from the route param if provided, otherwise fall back to adminData._id
  const resolvedUserId = params.id || adminData?._id;

  // Fetch packages from API
  const { data: packagesData, isLoading: isLoadingPackages, error: packagesError, refetch: refetchPackages } = useQuery({
    queryKey: ['/api/packages', resolvedUserId],
    queryFn: () => fetch(`/api/packages?page=1&limit=20&id=${resolvedUserId}`).then(res => res.json()),
  });

  // Fetch real shops data from API
  const { data: shopsData, isLoading: isLoadingShops } = useQuery({
    queryKey: ['/api/shop/admin', resolvedUserId],
    queryFn: () => {
      if (!resolvedUserId) return Promise.resolve([]);
      return fetch(`/api/shop/admin/${resolvedUserId}`).then(res => res.json());
    },
    enabled: !!resolvedUserId,
  });
  
  // Get current subscription from primaryShop
  const currentSubscription = adminData?.primaryShop?.subscription;
  
  // Calculate days remaining for current subscription
  const calculateDaysRemaining = (subscriptionEndDate: string) => {
    if (!subscriptionEndDate) return null;
    const endDate = new Date(subscriptionEndDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays; // Return actual difference, including negative values for expired
  };

  // Transform API data to match component expectations
  const subscriptionPlans = packagesData?.data?.map((pkg: any, index: number) => {
    // Check if this is the current subscription plan by comparing with primaryShop subscription
    const isCurrentPlan = currentSubscription?.packageId?._id === pkg._id;
    
    // Calculate days remaining if this is the current plan
    const daysRemaining = isCurrentPlan && currentSubscription?.endDate 
      ? calculateDaysRemaining(currentSubscription.endDate)
      : null;
    
    return {
      id: pkg._id,
      name: pkg.title,
      price: pkg.amount,
      duration: `${pkg.durationValue} ${pkg.durationUnit}`,
      maxShops: pkg.maxShops,
      features: pkg.features?.length > 0 ? pkg.features : [
        pkg.type === 'trial' ? 'Trial access' : 'Full access',
        'Basic inventory management',
        'Sales tracking',
        'Basic reports',
        'Customer management',
        pkg.type === 'trial' ? 'Limited support' : 'Email support'
      ],
      popular: index === 1,
      current: isCurrentPlan,
      color: pkg.type === 'trial' ? 'green' : 'blue',
      type: pkg.type,
      description: pkg.description,
      daysRemaining: daysRemaining
    };
  }) || [];

  // Transform real shops data for shop selection
  const availableShops: Shop[] = (shopsData || []).map((shop: any) => ({
    id: shop._id,
    name: shop.name,
    type: shop.shopCategoryId?.name || 'General Store',
    location: shop.address || 'No address set'
  }));

  const handlePlanSelect = (plan) => {
    // Don't allow trial plans to be selected for subscription flow
    if (plan.type === 'trial') {
      toast({
        title: "Trial Plan",
        description: "Trial plans don't require subscription. Contact support to activate a trial.",
        variant: "default",
      });
      return;
    }
    
    setSelectedPlan(plan);
    setSelectedShops([]);
    setStep(2);
  };

  const handleShopToggle = (shop) => {
    setSelectedShops(prev => {
      const isSelected = prev.find(s => s.id === shop.id);
      if (isSelected) {
        return prev.filter(s => s.id !== shop.id);
      } else {
        if (prev.length < selectedPlan.maxShops) {
          return [...prev, shop];
        } else {
          toast({
            title: "Shop Limit Reached",
            description: `This plan allows only ${selectedPlan.maxShops} shops.`,
            variant: "destructive",
          });
          return prev;
        }
      }
    });
  };

  const handleProceedToPayment = () => {
    if (selectedShops.length === 0) {
      toast({
        title: "Select Shops",
        description: "Please select at least one shop to continue.",
        variant: "destructive",
      });
      return;
    }
    setStep(3);
  };

  const handlePayment = async () => {
    // Validate based on payment method
    if (paymentMethod === 'mpesa') {
      if (!phoneNumber.trim()) {
        toast({
          title: "Phone Number Required",
          description: "Please enter your M-Pesa phone number to proceed.",
          variant: "destructive",
        });
        return;
      }

      if (!/^(?:\+254|254|0)?([71][0-9]{8})$/.test(phoneNumber.replace(/\s/g, ''))) {
        toast({
          title: "Invalid Phone Number",
          description: "Please enter a valid Kenyan phone number for M-Pesa.",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Validate card details
      if (!cardDetails.number.trim() || !cardDetails.expiry.trim() || !cardDetails.cvv.trim() || !cardDetails.name.trim()) {
        toast({
          title: "Card Details Required",
          description: "Please fill in all card details to proceed.",
          variant: "destructive",
        });
        return;
      }

      // Basic card number validation (16 digits)
      if (!/^\d{16}$/.test(cardDetails.number.replace(/\s/g, ''))) {
        toast({
          title: "Invalid Card Number",
          description: "Please enter a valid 16-digit card number.",
          variant: "destructive",
        });
        return;
      }

      // Basic expiry validation (MM/YY format)
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardDetails.expiry)) {
        toast({
          title: "Invalid Expiry Date",
          description: "Please enter expiry date in MM/YY format.",
          variant: "destructive",
        });
        return;
      }

      // Basic CVV validation (3 digits)
      if (!/^\d{3}$/.test(cardDetails.cvv)) {
        toast({
          title: "Invalid CVV",
          description: "Please enter a valid 3-digit CVV code.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsProcessing(true);

    try {
      // Prepare the subscription payload
      const subscriptionPayload = {
        userId: resolvedUserId,
        shops: selectedShops.map((shop) => shop.id),
        email: adminData.email,
        phonenumber: phoneNumber,
        package: selectedPlan.id,
        paymentType: paymentMethod,
        shop: selectedShops[0]?.id, // Primary shop for subscription
        amount: selectedPlan.price
      };

      console.log('Creating subscription:', subscriptionPayload);

      const response = await fetch(`/api/subscriptions/${resolvedUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subscription');
      }

      const subscriptionData = await response.json();
      console.log('Subscription created successfully:', subscriptionData);

      // Handle different response scenarios
      if (subscriptionData.subscriptionid) {
        if (subscriptionData.message === "waiting" || (subscriptionData.status === 200 && paymentMethod === 'mpesa')) {
          // M-Pesa payment initiated - redirect to waiting page with state
          const paymentData = {
            subscriptionId: subscriptionData.subscriptionid,
            planName: selectedPlan?.name || 'Subscription',
            amount: selectedPlan?.amount || selectedPlan?.price || 0,
            phoneNumber: phoneNumber || '',
            shopCount: selectedShops.length
          };
          
          setIsProcessing(false);
          setLocation('/payment-waiting', { state: paymentData });
        } else if (subscriptionData.status === false && subscriptionData.message) {
          // Subscription created but with a message (other cases)
          toast({
            title: "Subscription Created",
            description: subscriptionData.message + ` Subscription ID: ${subscriptionData.subscriptionid}`,
            variant: "default",
          });
          setIsProcessing(false);
          setLocation('/dashboard');
        } else {
          // Successful subscription (immediate success)
          toast({
            title: "Payment Successful",
            description: `Your ${selectedPlan?.name} subscription has been activated for ${selectedShops.length} shops.`,
          });
          setIsProcessing(false);
          setLocation('/dashboard');
        }
      } else {
        // Handle other success cases
        toast({
          title: "Subscription Processed",
          description: `Your subscription request has been submitted.`,
        });
        
        setIsProcessing(false);
        setLocation('/dashboard');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to process subscription. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'starter':
        return <Store className="h-6 w-6" />;
      case '3months':
        return <Users className="h-6 w-6" />;
      case '6months':
        return <Zap className="h-6 w-6" />;
      case '12months':
        return <Crown className="h-6 w-6" />;
      default:
        return <Store className="h-6 w-6" />;
    }
  };

  const getGradientClass = (color: string) => {
    switch (color) {
      case 'green':
        return 'from-green-500 to-green-600';
      case 'blue':
        return 'from-blue-500 to-blue-600';
      case 'purple':
        return 'from-purple-500 to-purple-600';
      case 'gold':
        return 'from-yellow-500 to-orange-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const stepLabels = ['Plans', 'Shops', 'Payment'];

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6 px-2">
      <div className="flex items-center">
        {[1, 2, 3].map((stepNum) => (
          <div key={stepNum} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-colors ${
                step >= stepNum ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > stepNum ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : stepNum}
              </div>
              <span className={`mt-1 text-[10px] sm:text-xs font-medium ${
                step >= stepNum ? 'text-blue-500' : 'text-gray-400'
              }`}>{stepLabels[stepNum - 1]}</span>
            </div>
            {stepNum < 3 && (
              <div className={`w-10 sm:w-16 h-0.5 mb-4 mx-1 sm:mx-2 transition-colors ${step > stepNum ? 'bg-blue-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderPlanSelection = () => (
    <>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Choose Your Plan</h1>
          <p className="text-sm text-gray-600 mt-2">Select the perfect subscription for your business</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setLocation('/dashboard')}
          className="hover:bg-gray-100 flex-shrink-0"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Subscription Plans */}
      {isLoadingPackages ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <span className="ml-2 text-gray-600">Loading subscription plans...</span>
        </div>
      ) : packagesError ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Failed to load subscription plans</p>
          <Button onClick={() => refetchPackages()} variant="outline">
            Try Again
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {subscriptionPlans.map((plan: SubscriptionPlan, planIndex: number) => (
          <Card 
            key={plan.id} 
            className={`relative transition-all duration-300 hover:shadow-lg cursor-pointer ${
              plan.popular ? 'ring-2 ring-blue-500 shadow-lg sm:scale-105' : ''
            } ${
              plan.current ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-300' : ''
            }`}
            onClick={() => handlePlanSelect(plan)}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-500 text-white px-3 py-1 text-xs font-medium whitespace-nowrap">
                  <Star className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
            )}

            {plan.current && (
              <div className="absolute -top-3 right-4">
                <Badge className="bg-green-500 text-white px-3 py-1 text-xs font-medium">
                  Active
                </Badge>
              </div>
            )}

            <CardHeader className="pb-3 pt-5 px-4">
              <div className="flex items-center gap-3 sm:block">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-r ${getGradientClass(plan.color)} flex items-center justify-center text-white sm:mb-4 flex-shrink-0`}>
                  {getPlanIcon(plan.id)}
                </div>
                <div className="sm:block">
                  <CardTitle className="text-lg sm:text-xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="text-gray-600 text-xs sm:text-sm mt-0.5">
                    {plan.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 px-4 pb-4">
              <div className="flex items-center justify-between sm:block sm:text-center">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {formatCurrency(plan.price)}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600">for {plan.duration}</p>
                </div>
                {plan.current && plan.daysRemaining !== null && (
                  <div className="sm:mt-2">
                    <Badge 
                      variant="outline" 
                      className={plan.daysRemaining > 0 
                        ? "bg-green-50 text-green-700 border-green-200 text-xs" 
                        : "bg-red-50 text-red-700 border-red-200 text-xs"
                      }
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {plan.daysRemaining > 0 
                        ? `${plan.daysRemaining}d left`
                        : 'Expired'
                      }
                    </Badge>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Store className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">
                  {planIndex === subscriptionPlans.length - 1 ? '11+ shops' : `${plan.maxShops} ${plan.maxShops === 1 ? 'shop' : 'shops'} max`}
                </span>
              </div>

              <div className="space-y-1.5">
                {plan.features.filter((f: string) => !/\d+\s+shop/i.test(f)).map((feature, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-gray-700 leading-snug">{feature}</span>
                  </div>
                ))}
              </div>

              {plan.type !== 'trial' && (
                <Button 
                  className={`w-full transition-all duration-200 text-sm ${
                    plan.current 
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 shadow-md'
                  }`}
                  variant={plan.current ? 'default' : 'default'}
                >
                  {plan.current ? 'Current Plan' : 'Subscribe Now'}
                </Button>
              )}
              {plan.type === 'trial' && (
                <div className="w-full text-center py-2.5 px-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-center space-x-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-green-700 font-medium text-xs sm:text-sm">Trial — No Payment Required</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        </div>
      )}
    </>
  );

  const renderShopSelection = () => (
    <>
      <div className="flex items-start justify-between mb-6 sm:mb-8 gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Select Your Shops</h1>
          <p className="text-sm text-gray-600 mt-2">
            Choose up to {selectedPlan.maxShops} shops for your {selectedPlan.name} plan
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setStep(1)}
          className="hover:bg-gray-100 flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
      </div>

      {/* Selected Plan Summary */}
      <Card className="mb-4 sm:mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-blue-900">{selectedPlan.name}</h3>
              <p className="text-sm text-blue-700">
                {formatCurrency(selectedPlan.amount || selectedPlan.price)} • Up to {selectedPlan.maxShops} {selectedPlan.maxShops === 1 ? 'shop' : 'shops'}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-medium text-blue-600">{selectedShops.length}/{selectedPlan.maxShops} selected</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shop Selection Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6 sm:mb-8">
        {isLoadingShops ? (
          // Loading state
          Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))
        ) : availableShops.length === 0 ? (
          // Empty state
          <div className="col-span-full text-center py-8">
            <Store className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Shops Available</h3>
            <p className="text-gray-500">Create some shops first to proceed with subscription.</p>
          </div>
        ) : (
          // Shop selection cards
          availableShops.map((shop) => {
            const isSelected = selectedShops.find(s => s.id === shop.id);
            const isDisabled = !isSelected && selectedShops.length >= selectedPlan.maxShops;
          
          return (
            <Card 
              key={shop.id}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 
                isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'
              }`}
              onClick={() => !isDisabled && handleShopToggle(shop)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{shop.name}</h4>
                    <p className="text-sm text-gray-600">{shop.type}</p>
                    <p className="text-xs text-gray-500">{shop.location}</p>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 ${
                    isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                  } flex items-center justify-center`}>
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
          })
        )}
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={handleProceedToPayment}
          disabled={selectedShops.length === 0}
          className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600"
        >
          Proceed to Payment
        </Button>
      </div>
    </>
  );

  const renderPayment = () => (
    <>
      <div className="flex items-start justify-between mb-6 sm:mb-8 gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Payment Details</h1>
          <p className="text-sm text-gray-600 mt-2">Complete your subscription purchase</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setStep(2)}
          className="hover:bg-gray-100 flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </Button>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Order Summary */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 px-4 pt-4 sm:px-6 sm:pt-6">
            <CardTitle className="text-base sm:text-lg">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-gray-600">Plan: <span className="font-medium text-gray-900">{selectedPlan.name}</span></span>
              <span className="font-medium">{formatCurrency(selectedPlan.amount || selectedPlan.price)}</span>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-gray-600">Selected Shops:</span>
              <span className="font-medium">{selectedShops.length} {selectedShops.length === 1 ? 'shop' : 'shops'}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between text-base sm:text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(selectedPlan.amount || selectedPlan.price)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 px-4 pt-4 sm:px-6 sm:pt-6">
            <CardTitle className="text-base sm:text-lg">Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="grid gap-4">
              <div 
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  paymentMethod === 'mpesa' ? 'border-green-500 bg-green-50' : 'border-gray-200'
                }`}
                onClick={() => setPaymentMethod('mpesa')}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    paymentMethod === 'mpesa' ? 'border-green-500 bg-green-500' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'mpesa' && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />}
                  </div>
                  <Smartphone className="h-5 w-5 text-green-600" />
                  <span className="font-medium">M-Pesa</span>
                </div>
              </div>
              
              <div 
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  paymentMethod === 'card' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
                onClick={() => setPaymentMethod('card')}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    paymentMethod === 'card' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}>
                    {paymentMethod === 'card' && <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />}
                  </div>
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Credit/Debit Card</span>
                </div>
              </div>
            </div>

            {/* Payment Details Input */}
            {paymentMethod === 'mpesa' ? (
              <div className="space-y-2">
                <Label htmlFor="phone">M-Pesa Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-10"
                    placeholder="+254 712 345 678"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Enter the M-Pesa registered phone number
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Card Number */}
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="cardNumber"
                      type="text"
                      value={cardDetails.number}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 16);
                        const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
                        setCardDetails(prev => ({ ...prev, number: formatted }));
                      }}
                      className="pl-10"
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                    />
                  </div>
                </div>

                {/* Card Holder Name */}
                <div className="space-y-2">
                  <Label htmlFor="cardName">Cardholder Name</Label>
                  <Input
                    id="cardName"
                    type="text"
                    value={cardDetails.name}
                    onChange={(e) => setCardDetails(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>

                {/* Expiry and CVV */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input
                      id="expiry"
                      type="text"
                      value={cardDetails.expiry}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                        const formatted = value.replace(/^(\d{2})/, '$1/');
                        setCardDetails(prev => ({ ...prev, expiry: formatted }));
                      }}
                      placeholder="MM/YY"
                      maxLength={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      type="text"
                      value={cardDetails.cvv}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 3);
                        setCardDetails(prev => ({ ...prev, cvv: value }));
                      }}
                      placeholder="123"
                      maxLength={3}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Complete Payment Button */}
        <Button 
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full bg-blue-500 hover:bg-blue-600 h-11 sm:h-12 text-sm sm:text-base font-semibold"
        >
          {isProcessing ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Processing Payment...</span>
            </div>
          ) : (
            `Pay ${formatCurrency(selectedPlan.amount || selectedPlan.price)} via ${paymentMethod === 'mpesa' ? 'M-Pesa' : 'Card'}`
          )}
        </Button>
      </div>
    </>
  );

  return (
    <DashboardLayout title="Subscription">
      <div className="max-w-7xl mx-auto py-4 sm:py-6">
        {renderStepIndicator()}
        
        {step === 1 && renderPlanSelection()}
        {step === 2 && renderShopSelection()}
        {step === 3 && renderPayment()}
      </div>
    </DashboardLayout>
  );
}
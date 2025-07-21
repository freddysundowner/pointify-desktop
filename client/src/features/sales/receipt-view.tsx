import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import ReceiptHeader from "@/components/ui/receipt-header";
import { Download, Mail, Printer, ArrowLeft } from "lucide-react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { useRoute, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/features/auth/useAuth";
import type { Sale } from "@shared/schema";
import { apiCall } from "@/lib/api-config";
import { toast } from "@/hooks/use-toast";

export default function ReceiptView() {
  // Try both admin and attendant routes
  const [adminMatch, adminParams] = useRoute("/receipt/:id");
  const [attendantMatch, attendantParams] = useRoute("/attendant/receipt/:id");
  
  // Extract sale ID from whichever route matched
  const match = adminMatch || attendantMatch;
  const params = adminParams || attendantParams;
  const saleId = params?.id;
    const adminData = localStorage.getItem('adminData');
  const admin = adminData ? JSON.parse(adminData) : null;
  
  // Primary shop is nested under admin data
  const primaryShop = admin?.primaryShop;

  // Get sale data from navigation state or fallback to API
  const [sale, setSale] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!saleId) {
      setError('Sale ID is required');
      setIsLoading(false);
      return;
    }

    // Try to get data from window object first (passed from customer overview)
    const passedData = (window as any).__receiptData;
    if (passedData && passedData._id === saleId) {
      console.log('Using passed receipt data:', passedData);
      setSale(passedData);
      setIsLoading(false);
      // Clear the data after use
      delete (window as any).__receiptData;
      return;
    }

    // Fallback to API call if no navigation state
    const fetchSaleData = async () => {
      try {
        const response = await fetch(`/api/sales/single/receipt/${saleId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch sale data');
        }

        const data = await response.json();
        setSale(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch sale data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSaleData();
  }, [saleId]);

  if (isLoading) {
    return (
      <DashboardLayout title="Loading Receipt...">
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading receipt details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !sale) {
    return (
      <DashboardLayout title="Receipt Not Found">
        <div className="p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Receipt Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            The requested receipt could not be found.
          </p>
          <Button className="mt-4" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }
  console.log('sale', sale);
 const printThermal = async (receiptData = getPrintData()) => {
  console.log('Thermal print data:', receiptData);
  if (receiptData && typeof receiptData.preventDefault === 'function') {
    receiptData = getPrintData();
  }
  if (!receiptData) {
    receiptData = getPrintData();
  }
  try {
    const response = await apiCall('/api/printer/salereceipt', {
      method: 'POST',
      body: JSON.stringify(receiptData)
    });
    const respo = await response.json();
    if (respo.success) {
      toast({
        title: "Receipt Printed",
        description: "Thermal receipt printed successfully",
      });
    } else {
      throw new Error(respo.message || 'Print failed');
    } 
  } catch (error) {
    console.error('Thermal printing error:', error);
    toast({
      title: "Print Failed",
      description: error instanceof Error ? error.message : "Failed to print thermal receipt",
      variant: "destructive",
    });
  } 
};
   const getPrintData = () => {
    const date = new Date(sale?.createdAt);

    const readableDate = date.toLocaleDateString(); // e.g. "7/14/2025"
    const readableTime = date.toLocaleTimeString(); // e.g. "2:01:41 PM"
    const receiptData = {
        shopName: primaryShop?.name || 'Business Name',
        shopAddress: primaryShop?.address || '',
        receiptNumber: sale?.receiptNo.toString(),
        date: `${readableDate} ${readableTime}`,
        currency: primaryShop.currency,
        items: sale?.items.map((item: { name: any; quantity: any; price: any; total: any; }) => ({
          name: item?.product?.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.unitPrice * item.quantity
        })),
        subtotal: sale?.items.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
        tax: sale?.totaltax,
        total: sale?.totalWithDiscount,
        paymentMethod: sale?.paymentType,
        customerName: sale?.customerId?.name || 'Walk-in',
        attendant: sale?.attendantId?.username,
        // Handle split payments
        splitPayment: sale?.paymentType === 'split' ? {
          cash: sale?.amountPaid || 0,
          mpesa: sale?.mpesaTotal || 0,
          bank: sale?.bankTotal || 0
        } : ''
      };
      return receiptData;
  }
  const handlePrint = () => {
    // window.print();
    printThermal();
  };

  const handleDownload = () => {
    if (!saleData) return;

    // Create clean HTML for PDF
    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt #${saleData.receiptNo}</title>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.4;
              color: #333;
            }
            .receipt-header { 
              text-center; 
              border-bottom: 2px solid #ccc; 
              padding-bottom: 15px; 
              margin-bottom: 20px; 
            }
            .shop-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
            .shop-details { font-size: 12px; color: #666; }
            .receipt-details { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 20px; 
              margin-bottom: 20px; 
              font-size: 14px;
            }
            .section-title { font-weight: bold; margin-bottom: 8px; }
            .items-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px; 
              font-size: 12px;
            }
            .items-table th, .items-table td { 
              border: 1px solid #ddd; 
              padding: 8px; 
              text-align: left; 
            }
            .items-table th { 
              background-color: #f5f5f5; 
              font-weight: bold;
            }
            .items-table .text-right { text-align: right; }
            .items-table .text-center { text-align: center; }
            .totals { 
              margin-top: 20px; 
              font-size: 14px;
            }
            .total-row { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 5px;
            }
            .total-final { 
              border-top: 2px solid #000; 
              font-weight: bold; 
              font-size: 16px;
              padding-top: 8px;
            }
            .footer { 
              text-align: center; 
              margin-top: 30px; 
              font-size: 12px; 
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="receipt-header">
            <div class="shop-name">${saleData.shop?.name || 'Shop Name'}</div>
            <div class="shop-details">
              ${saleData.shop?.address ? `<div>${saleData.shop.address}</div>` : ''}
              ${saleData.shop?.contact ? `<div>Phone: ${saleData.shop.contact}</div>` : ''}
              ${saleData.shop?.receiptemail ? `<div>Email: ${saleData.shop.receiptemail}</div>` : ''}
            </div>
            <h2 style="margin: 15px 0;">Sales Receipt</h2>
          </div>
          
          <div class="receipt-details">
            <div>
              <div class="section-title">Receipt Details</div>
              <div>Receipt #: ${saleData.receiptNo}</div>
              <div>Date: ${new Date(saleData.saleDate).toLocaleDateString()}</div>
              <div>Time: ${new Date(saleData.saleDate).toLocaleTimeString()}</div>
              <div>Status: ${saleData.status?.toUpperCase()}</div>
            </div>
            <div>
              <div class="section-title">Transaction Information</div>
              <div>Customer: ${saleData.customerName}</div>
              <div>Payment: ${saleData.paymentTag}</div>
              <div>Sale Type: ${saleData.saleType}</div>
              <div>Attendant: ${saleData.attendantName}</div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${saleData.items?.map(item => `
                <tr>
                  <td>${item.productName}</td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-right">${saleData.shop?.currency} ${item.unitPrice.toFixed(2)}</td>
                  <td class="text-right">${saleData.shop?.currency} ${item.totalPrice.toFixed(2)}</td>
                </tr>
              `).join('') || ''}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${saleData.shop?.currency} ${saleData.totalAmount?.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Tax:</span>
              <span>${saleData.shop?.currency} ${(saleData.totaltax || 0)?.toFixed(2)}</span>
            </div>
            <div class="total-row total-final">
              <span>Total:</span>
              <span>${saleData.shop?.currency} ${((saleData.totalAmount || 0) + (saleData.totaltax || 0))?.toFixed(2)}</span>
            </div>
            ${saleData.paymentTag === 'split' ? `
              <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd;">
                <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">Payment Breakdown:</div>
                ${(sale as any)?.amountPaid > 0 ? `
                  <div class="total-row" style="font-size: 12px;">
                    <span>Cash:</span>
                    <span>${saleData.shop?.currency} ${((sale as any)?.amountPaid || 0).toFixed(2)}</span>
                  </div>
                ` : ''}
                ${(sale as any)?.mpesaNewTotal > 0 ? `
                  <div class="total-row" style="font-size: 12px;">
                    <span>M-Pesa:</span>
                    <span>${saleData.shop?.currency} ${((sale as any)?.mpesaNewTotal || 0).toFixed(2)}</span>
                  </div>
                ` : ''}
                ${(sale as any)?.bankTotal > 0 ? `
                  <div class="total-row" style="font-size: 12px;">
                    <span>Bank:</span>
                    <span>${saleData.shop?.currency} ${((sale as any)?.bankTotal || 0).toFixed(2)}</span>
                  </div>
                ` : ''}
              </div>
            ` : ''}
          </div>

          <div class="footer">
            <div>Thank you for your business!</div>
          </div>
        </body>
      </html>
    `;

    // Open print dialog for PDF saving only
    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      
      // Wait for content to load, then print
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleEmail = async () => {
    // Try to get customer email from sale data or prompt user
    const customerEmail = prompt('Enter customer email address:');
    if (!customerEmail) {
      return;
    }

    const emailSubject = `Receipt #${saleData?.receiptNo} - ${saleData?.shop?.name}`;
    const emailBody = `
Dear ${saleData?.customerName},

Thank you for your purchase at ${saleData?.shop?.name}!

Receipt Details:
- Receipt #: ${saleData?.receiptNo}
- Date: ${new Date(saleData?.saleDate).toLocaleDateString()}
- Time: ${new Date(saleData?.saleDate).toLocaleTimeString()}
- Total: ${saleData?.shop?.currency} ${((saleData?.totalAmount || 0) + (saleData?.totaltax || 0))?.toFixed(2)}
- Payment: ${saleData?.paymentTag}
- Attendant: ${saleData?.attendantName}

Items purchased:
${saleData?.items?.map(item => 
  `- ${item.productName} x${item.quantity} @ ${saleData?.shop?.currency} ${item.unitPrice.toFixed(2)} = ${saleData?.shop?.currency} ${item.totalPrice.toFixed(2)}`
).join('\n')}

Shop Information:
${saleData?.shop?.name}
${saleData?.shop?.address}
${saleData?.shop?.contact ? `Phone: ${saleData.shop.contact}` : ''}
${saleData?.shop?.receiptemail ? `Email: ${saleData.shop.receiptemail}` : ''}

Thank you for your business!
    `;

    // Create mailto link with customer email
    const mailtoLink = `mailto:${customerEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoLink);
  };

  // Transform API data to match expected format
  const saleData = sale ? {
    id: (sale as any)._id || (sale as any).id,
    receiptNo: (sale as any).receiptNo || (sale as any)._id,
    customerName: (sale as any).customerId?.name || 'Walk-in',
    totalAmount: (sale as any).totalAmount || 0,
    totalWithDiscount: (sale as any).totalWithDiscount || (sale as any).totalAmount || 0,
    totaltax: (sale as any).totaltax || 0,
    saleDate: (sale as any).createdAt || (sale as any).saleDate,
    status: (sale as any).status === 'cashed' ? 'completed' : (sale as any).status,
    paymentTag: (sale as any).paymentTag || 'cash',
    saleType: (sale as any).saleType || 'Retail',
    items: ((sale as any).items || []).map((item: any) => ({
      productName: item.product?.name || item.productName || 'Unknown Product',
      quantity: item.quantity || 0,
      unitPrice: item.unitPrice || 0,
      totalPrice: (item.quantity || 0) * (item.unitPrice || 0)
    })),
    attendantName: (sale as any).attendantId?.username || 'Unknown',
    // Extract shop details from sale record to match POS receipt format
    shop: {
      name: (sale as any).shopId?.name || (sale as any).shopId?.shopName || 'Shop',
      address: (sale as any).shopId?.address || '',
      address_receipt: (sale as any).shopId?.address_receipt || '',
      contact: (sale as any).shopId?.contact || (sale as any).shopId?.phone || (sale as any).shopId?.phoneNumber || '',
      receiptemail: (sale as any).shopId?.receiptemail || (sale as any).shopId?.email || '',
      paybill_account: (sale as any).shopId?.paybill_account || (sale as any).shopId?.paybill || '',
      paybill_till: (sale as any).shopId?.paybill_till || (sale as any).shopId?.tillNumber || '',
      currency: (sale as any).shopId?.currency || 'KES'
    }
  } : null;

  return (
    <DashboardLayout title={`Receipt #${saleData?.receiptNo}`}>
      <div className="p-6 w-full">
        {/* Action Buttons */}
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sales
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleEmail}>
              <Mail className="mr-2 h-4 w-4" />
              Email
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        {/* Receipt */}
        <Card className="print:shadow-none print:border-none receipt-content">
          <CardHeader className="text-center border-b">
            <ReceiptHeader 
              shopData={saleData?.shop || {}}
              title="Sales Receipt"
            />
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Receipt Header */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold mb-2">Receipt Details</h3>
                <p className="text-sm"><span className="font-medium">Receipt #:</span> {saleData?.receiptNo}</p>
                <p className="text-sm"><span className="font-medium">Date:</span> {new Date(saleData?.saleDate).toLocaleDateString()}</p>
                <p className="text-sm"><span className="font-medium">Time:</span> {new Date(saleData?.saleDate).toLocaleTimeString()}</p>
                <div className="mt-2">
                  <Badge variant={saleData?.status === "completed" ? "default" : "secondary"}>
                    {saleData?.status?.toUpperCase()}
                  </Badge>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Transaction Information</h3>
                <p className="text-sm"><span className="font-medium">Customer:</span> {saleData?.customerName}</p>
                <p className="text-sm"><span className="font-medium">Payment:</span> {saleData?.paymentTag}</p>
                <p className="text-sm"><span className="font-medium">Type:</span> {saleData?.saleType}</p>
                <p className="text-sm"><span className="font-medium">Attendant:</span> {saleData?.attendantName}</p>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Items Table */}
            <div className="mb-6">
              <h3 className="font-semibold mb-4">Items Purchased</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Item</th>
                      <th className="text-center py-2 font-medium">Qty</th>
                      <th className="text-right py-2 font-medium">Unit Price</th>
                      <th className="text-right py-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleData?.items?.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3">{item.productName}</td>
                        <td className="py-3 text-center">{item.quantity}</td>
                        <td className="py-3 text-right">{saleData?.shop?.currency} {item.unitPrice.toFixed(2)}</td>
                        <td className="py-3 text-right font-medium">{saleData?.shop?.currency} {item.totalPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{saleData?.shop?.currency} {saleData?.totalAmount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{saleData?.shop?.currency} {(saleData?.totaltax || 0)?.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{saleData?.shop?.currency} {((saleData?.totalAmount || 0) + (saleData?.totaltax || 0))?.toFixed(2)}</span>
              </div>
              
              {/* Split payment breakdown */}
              {saleData?.paymentTag === 'split' && (
                <div className="mt-4 pt-3 border-t space-y-2">
                  <div className="text-sm font-medium text-gray-700 mb-2">Payment Breakdown:</div>
                  {(sale as any)?.amountPaid > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Cash:</span>
                      <span>{saleData?.shop?.currency} {((sale as any)?.amountPaid || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {(sale as any)?.mpesaNewTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>M-Pesa:</span>
                      <span>{saleData?.shop?.currency} {((sale as any)?.mpesaNewTotal || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {(sale as any)?.bankTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Bank:</span>
                      <span>{saleData?.shop?.currency} {((sale as any)?.bankTotal || 0).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator className="my-6" />

            {/* Payment Information */}
            <div className="text-center text-sm text-muted-foreground">
              <p className="mb-2">Payment Method: {saleData?.paymentTag}</p>
              <p className="mb-4">Transaction ID: {saleData?.receiptNo}</p>
              <p className="font-medium">Thank you for your business!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
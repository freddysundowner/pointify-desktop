import { X, Printer, Mail, Plus, Check, Download } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Transaction, CartItem } from "@shared/schema";
import { jsPDF } from 'jspdf';
import { useToast } from "@/hooks/use-toast";
import { apiCall } from "@/lib/api-config";
import { useEffect, useState } from "react";
import { usbPrinter } from "@/lib/usb-printer";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onNewTransaction: () => void;
}

export default function ReceiptModal({
  isOpen,
  onClose,
  transaction,
  onNewTransaction,
}: ReceiptModalProps) {
  if (!transaction) return null;
  
  const { toast } = useToast();

  // Get admin and shop data from localStorage
  const adminData = localStorage.getItem('adminData');
  const admin = adminData ? JSON.parse(adminData) : null;
  
  // Primary shop is nested under admin data
  const primaryShop = admin?.primaryShop;
  
  // Get attendant name from attendantId or fallback to admin username
  const attendantName = admin?.attendantId?.username || admin?.username || 'Staff';

  const items = transaction.items as CartItem[];
  const transactionDate = new Date();
  const shopTaxRate = primaryShop?.tax || 0;
  const getPrintData = () => {
    const receiptData = {
        shopName: primaryShop?.name || 'Business Name',
        shopAddress: primaryShop?.address || '',
        receiptNumber: transaction.id.toString(),
        date: transactionDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        currency: primaryShop.currency,
        items: items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          total: item.total,
          serialnumber: item?.serialnumber || ''
        })),
        subtotal: transaction.subtotal,
        tax: transaction.tax,
        total: transaction.total,
        paymentMethod: transaction.paymentMethod,
        customerName: transaction.customerName || 'Walk-in',
        attendant: attendantName,
        // Handle split payments
        splitPayment: transaction.paymentMethod === 'split' ? {
          cash: transaction.amountPaid || 0,
          mpesa: transaction.mpesaTotal || 0,
          bank: transaction.bankTotal || 0
        } : undefined
      };
      return receiptData;
  }
  useEffect(() => {
  if(isOpen && transaction && admin?.autoPrint === true) {
    printThermal();
  }
}, [isOpen, transaction]);


  // Browser print fallback — opens a clean receipt window
  const browserPrint = () => {
    const cur = primaryShop?.currency || 'KES';
    const html = `<!DOCTYPE html><html><head><title>Receipt</title>
<style>
  body{font-family:monospace;font-size:12px;width:280px;margin:0 auto;padding:8px}
  .center{text-align:center} .bold{font-weight:bold}
  .row{display:flex;justify-content:space-between}
  hr{border:none;border-top:1px dashed #000;margin:6px 0}
  @media print{@page{size:80mm auto;margin:0}body{width:72mm}}
</style></head><body>
<div class="center bold">${primaryShop?.name || 'Business Name'}</div>
${primaryShop?.address ? `<div class="center">${primaryShop.address}</div>` : ''}
<div class="center bold">SALES RECEIPT</div>
<hr/>
<div class="row"><span>Receipt #</span><span>${transaction.id}</span></div>
<div class="row"><span>Date</span><span>${transactionDate.toLocaleDateString()}</span></div>
<div class="row"><span>Customer</span><span>${transaction.customerName || 'Walk-in'}</span></div>
<div class="row"><span>By</span><span>${attendantName}</span></div>
<hr/>
${items.map(item => `
<div>${item.name}</div>
<div class="row"><span>  ${item.quantity} x ${cur} ${Number(item.price).toFixed(2)}</span><span>${cur} ${Number(item.total).toFixed(2)}</span></div>
${Number(item.discount) > 0 ? `<div class="row"><span>  Discount</span><span>-${cur} ${(Number(item.discount)*item.quantity).toFixed(2)}</span></div>` : ''}
`).join('')}
<hr/>
<div class="row"><span>Subtotal</span><span>${cur} ${Number(transaction.subtotal).toFixed(2)}</span></div>
<div class="row"><span>Tax</span><span>${cur} ${Number(transaction.tax).toFixed(2)}</span></div>
<div class="row bold"><span>TOTAL</span><span>${cur} ${Number(transaction.total).toFixed(2)}</span></div>
<div class="row"><span>Payment</span><span>${transaction.paymentMethod}</span></div>
<hr/>
<div class="center">Thank you for your business!</div>
</body></html>`;
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
  };

  // Thermal print function — tries server first, falls back to browser print
  const printThermal = async (receiptData = getPrintData()) => {
    if (receiptData && typeof receiptData.preventDefault === 'function') {
      receiptData = getPrintData();
    }
    if (!receiptData) receiptData = getPrintData();

    try {
      // Check printer config first
      const statusRes = await fetch('/api/printer/status');
      const status = statusRes.ok ? await statusRes.json() : null;

      // No printer configured — skip silently
      if (!status?.initialized) return;

      // WEBUSB mode — send directly from browser via Web USB
      if (status?.config?.type === 'WEBUSB') {
        // Try to auto-reconnect to previously-granted device before failing
        if (!usbPrinter.isConnected()) {
          await usbPrinter.reconnect();
        }
        if (!usbPrinter.isConnected()) {
          // Printer was configured but isn't available — fall back silently to browser print
          browserPrint();
          return;
        }
        try {
          await usbPrinter.printReceipt({
            shopName: receiptData.shopName,
            shopAddress: receiptData.shopAddress,
            receiptNumber: receiptData.receiptNumber,
            date: receiptData.date,
            currency: receiptData.currency,
            items: receiptData.items.map((i: any) => ({
              name: i.name,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              total: i.total,
              discount: i.discount,
            })),
            subtotal: receiptData.subtotal,
            tax: receiptData.tax,
            total: receiptData.total,
            paymentMethod: receiptData.paymentMethod,
            customerName: receiptData.customerName,
            attendant: receiptData.attendant,
            splitPayment: receiptData.splitPayment,
          });
          toast({ title: "Receipt Printed", description: "Sent to USB printer" });
        } catch (usbErr: any) {
          toast({ title: "USB Print Failed", description: usbErr.message, variant: "destructive" });
        }
        return;
      }

      // BROWSER mode — skip server, go straight to browser print
      if (status?.config?.type === 'BROWSER') {
        browserPrint();
        return;
      }

      const response = await apiCall('/api/printer/salereceipt', {
        method: 'POST',
        body: JSON.stringify(receiptData)
      });
      const respo = await response.json();
      if (respo.success) {
        toast({ title: "Receipt Printed", description: "Sent to printer successfully" });
      } else {
        // Server failed — fall back to browser print
        browserPrint();
      }
    } catch (error) {
      // Network/server error — fall back to browser print
      browserPrint();
    }
  };


  // PDF generation function
  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(primaryShop?.name || 'Store Name', 105, 20, { align: 'center' });
    
    // Shop details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (primaryShop?.address) {
      doc.text(primaryShop.address, 105, 30, { align: 'center' });
    }
    if (primaryShop?.contact) {
      doc.text(`Phone: ${primaryShop.contact}`, 105, 35, { align: 'center' });
    }
    const shopEmailForReceipt =
      (primaryShop as any)?.email_receipt ||
      primaryShop?.receiptemail ||
      (primaryShop as any)?.email;
    if (shopEmailForReceipt) {
      doc.text(`Email: ${shopEmailForReceipt}`, 105, 40, { align: 'center' });
    }
    
    // Receipt title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SALES RECEIPT', 105, 55, { align: 'center' });
    
    // Receipt details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Receipt #: ${transaction.id}`, 20, 70);
    doc.text(`Date: ${transactionDate.toLocaleDateString()}`, 20, 75);
    doc.text(`Time: ${transactionDate.toLocaleTimeString()}`, 20, 80);
    doc.text(`Attendant: ${attendantName}`, 20, 85);
    doc.text(`Customer: ${transaction.customerName || 'Walk-in'}`, 20, 90);
    
    // Items table
    let yPos = 105;
    doc.setFont('helvetica', 'bold');
    doc.text('Item', 20, yPos);
    doc.text('Qty', 100, yPos);
    doc.text('Price', 130, yPos);
    doc.text('Total', 160, yPos);
    
    // Line separator
    doc.setLineWidth(0.5);
    doc.line(20, yPos + 2, 190, yPos + 2);
    
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    
    items.forEach((item) => {
      doc.text(item.name.substring(0, 20), 20, yPos);
      doc.text(item.quantity.toString(), 100, yPos);
      doc.text(`${primaryShop?.currency || 'KES'} ${item.price.toFixed(2)}`, 130, yPos);
      doc.text(`${primaryShop?.currency || 'KES'} ${item.total.toFixed(2)}`, 160, yPos);
      yPos += 8;
    });
    
    // Totals section
    yPos += 10;
    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
    
    doc.text(`Subtotal: ${primaryShop?.currency || 'KES'} ${transaction.subtotal.toFixed(2)}`, 130, yPos);
    yPos += 8;
    doc.text(`Tax (${shopTaxRate}%): ${primaryShop?.currency || 'KES'} ${transaction.tax.toFixed(2)}`, 130, yPos);
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${primaryShop?.currency || 'KES'} ${transaction.total.toFixed(2)}`, 130, yPos);
    
    // Split payment breakdown
    if (transaction.paymentMethod === 'split') {
      yPos += 15;
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Breakdown:', 20, yPos);
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      
      if ((transaction as any).amountPaid > 0) {
        doc.text(`Cash: ${primaryShop?.currency || 'KES'} ${((transaction as any).amountPaid).toFixed(2)}`, 20, yPos);
        yPos += 6;
      }
      if ((transaction as any).mpesaNewTotal > 0) {
        doc.text(`M-Pesa: ${primaryShop?.currency || 'KES'} ${((transaction as any).mpesaNewTotal).toFixed(2)}`, 20, yPos);
        yPos += 6;
      }
      if ((transaction as any).bankTotal > 0) {
        doc.text(`Bank: ${primaryShop?.currency || 'KES'} ${((transaction as any).bankTotal).toFixed(2)}`, 20, yPos);
        yPos += 6;
      }
    } else {
      yPos += 15;
      doc.setFont('helvetica', 'normal');
      doc.text(`Payment Method: ${transaction.paymentMethod}`, 20, yPos);
    }
    
    // Footer
    yPos += 20;
    doc.setFontSize(10);
    doc.text('Thank you for your business!', 105, yPos, { align: 'center' });
    
    // Save PDF
    const fileName = `receipt-${transaction.id}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };


  const currency = primaryShop?.currency || 'KES';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full max-h-[92dvh] bg-white border-0 shadow-2xl flex flex-col overflow-hidden p-0">

        {/* Fixed header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Transaction Complete
          </h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
            <X className="h-3.5 w-3.5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">

          {/* Success strip */}
          <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shrink-0">
              <Check className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Payment Successful!</p>
              <p className="text-xs text-gray-500">{transactionDate.toLocaleDateString()} · {transactionDate.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
            </div>
            <span className="ml-auto text-xs font-mono text-gray-400">#{transaction.id || 'N/A'}</span>
          </div>

          {/* Receipt card */}
          <div className="border border-gray-200 rounded-xl overflow-hidden text-sm">

            {/* Store header */}
            <div className="bg-gray-50 px-4 py-3 text-center border-b border-gray-200">
              <p className="font-bold text-gray-900">{primaryShop?.name || 'Store Name'}</p>
              {primaryShop?.address && <p className="text-xs text-gray-500 mt-0.5">{primaryShop.address}</p>}
              <div className="flex flex-wrap justify-center gap-x-3 mt-0.5">
                {primaryShop?.contact && <span className="text-xs text-gray-500">📞 {primaryShop.contact}</span>}
                {((primaryShop as any)?.email_receipt || primaryShop?.receiptemail) && (
                  <span className="text-xs text-gray-500">✉ {(primaryShop as any)?.email_receipt || primaryShop?.receiptemail}</span>
                )}
              </div>
              {(primaryShop?.paybill_account || primaryShop?.paybill_till) && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {primaryShop?.paybill_account ? `Paybill: ${primaryShop.paybill_account}` : `Buy Goods: ${primaryShop.paybill_till}`}
                  {primaryShop?.paybill_account && primaryShop?.paybill_till && ` · Acc: ${primaryShop.paybill_till}`}
                </p>
              )}
            </div>

            {/* Transaction meta */}
            <div className="px-4 py-2.5 border-b border-dashed border-gray-200 grid grid-cols-2 gap-y-1">
              <span className="text-gray-500">Transaction</span>
              <span className="text-right font-medium">#{transaction.id || 'N/A'}</span>
              <span className="text-gray-500">Served by</span>
              <span className="text-right font-medium">{attendantName}</span>
            </div>

            {/* Items */}
            <div className="px-4 py-2.5 border-b border-dashed border-gray-200 space-y-1.5">
              {items.map((item, index) => (
                <div key={`${item.id}-${index}`}>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-800 flex-1 truncate pr-2">{item.name}
                      <span className="text-gray-400 font-normal"> x{item.quantity} @ {currency} {Number(item.price).toFixed(2)}</span>
                    </span>
                    <span className="font-semibold shrink-0">{currency} {Number(item.total).toFixed(2)}</span>
                  </div>
                  {Number(item.discount) > 0 && (
                    <div className="flex justify-between text-xs text-green-600 pl-2">
                      <span>Discount</span>
                      <span>-{currency} {(Number(item.discount) * Number(item.quantity)).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="px-4 py-2.5 space-y-1">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium">{currency} {Number(transaction.subtotal).toFixed(2)}</span>
              </div>
              {items.some(item => Number(item.discount) > 0) && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span className="font-medium">-{currency} {items.reduce((s, i) => s + (Number(i.discount) || 0) * i.quantity, 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Tax ({shopTaxRate}%)</span>
                <span className="font-medium">{currency} {Number(transaction.tax).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1.5 border-t border-gray-200 mt-1">
                <span>Total</span>
                <span className="text-primary">{currency} {Number(transaction.total).toFixed(2)}</span>
              </div>

              {/* Payment method */}
              {transaction.paymentMethod !== 'split' ? (
                <div className="flex justify-between text-gray-500 text-xs pt-1">
                  <span>Payment Method</span>
                  <span className="capitalize font-medium">{transaction.paymentMethod}</span>
                </div>
              ) : (
                <div className="pt-1 space-y-0.5">
                  <p className="text-xs text-gray-500 font-medium">Split Payment</p>
                  {transaction.amountPaid > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">Cash</span><span>{currency} {Number(transaction.amountPaid).toFixed(2)}</span></div>}
                  {(transaction as any).mpesaNewTotal > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">M-Pesa</span><span>{currency} {Number((transaction as any).mpesaNewTotal).toFixed(2)}</span></div>}
                  {(transaction as any).bankTotal > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">Bank</span><span>{currency} {Number((transaction as any).bankTotal).toFixed(2)}</span></div>}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-2 text-center border-t border-gray-200">
              <p className="text-xs text-gray-400">Thank you for your business!</p>
            </div>
          </div>
        </div>

        {/* Fixed action buttons */}
        <div className="px-5 pb-4 pt-2 space-y-2 shrink-0 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" className="h-9 rounded-xl text-xs" onClick={printThermal}>
              <Printer className="mr-1 h-3.5 w-3.5" /> Print
            </Button>
            <Button variant="outline" className="h-9 rounded-xl text-xs" onClick={generatePDF}>
              <Download className="mr-1 h-3.5 w-3.5" /> PDF
            </Button>
            <Button variant="outline" className="h-9 rounded-xl text-xs">
              <Mail className="mr-1 h-3.5 w-3.5" /> Email
            </Button>
          </div>
          <Button
            onClick={onNewTransaction}
            className="w-full h-10 rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 font-semibold text-sm"
          >
            <Plus className="mr-1 h-4 w-4" /> New Transaction
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}

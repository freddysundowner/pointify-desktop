import { exec } from 'child_process';
import { Request, Response } from 'express';
import fs from 'fs';

const CONFIG_FILE = 'printer-config.json';

interface PrinterConfig {
  type: 'TCP' | 'USB' | 'SERIAL' | 'SYSTEM';
  interface: string;
  width?: number;
  characterSet?: string;
}

let currentPrinterConfig: PrinterConfig = {
  type: 'SYSTEM',
  interface: '',
  width: 32,
  characterSet: 'PC437_USA',
};

// Load config at startup
if (fs.existsSync(CONFIG_FILE)) {
  try {
    currentPrinterConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    console.log('✅ Loaded printer config:', currentPrinterConfig);
  } catch (err) {
    console.error('❌ Failed to load printer config:', err);
  }
} else {
  console.log('ℹ️ No config file found, using default.');
}

// ----------------------
// List system printers
// ----------------------
export const getPrinters = (req: Request, res: Response): void => {
  exec('wmic printer get name', (err, stdout) => {
    if (err) {
      console.error('Error fetching printers:', err);
      return res.status(500).json({ error: err.message });
    }
    const lines = stdout.split('\r\n').map(line => line.trim()).filter(Boolean);
    const printers = lines.slice(1); // skip header
    res.json({ printers });
  });
};

// ----------------------
// Return printer status
// ----------------------
export const getPrinterStatus = (req: Request, res: Response): void => {
  res.json({
    initialized: !!currentPrinterConfig.interface,
    config: currentPrinterConfig,
  });
};

// ----------------------
// Save printer config
// ----------------------
export const initializePrinter = (req: Request, res: Response): void => {
  const { type, interface: printerName, width, characterSet } = req.body;

  if (!printerName) {
    return res.status(400).json({ success: false, message: 'Printer name is required' });
  }

  currentPrinterConfig = { type, interface: printerName, width, characterSet };
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentPrinterConfig, null, 2));
    console.log('💾 Config saved:', currentPrinterConfig);
    res.json({ success: true, message: `Printer initialized: ${printerName}` });
  } catch (err) {
    console.error('Failed to save config:', err);
    res.status(500).json({ success: false, message: 'Failed to save config' });
  }
}; 

const padLine = (text: string, width = 32) => {
  if (text.length >= width) return text;
  const padding = Math.floor((width - text.length) / 2);
  return ' '.repeat(padding) + text;
};
 
export const printReceipt = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      shopName,
      shopAddress,
      receiptNumber,
      date,
      items,
      subtotal,
      tax,
      total,
      paymentMethod,
      customerName,
      attendant,
      splitPayment,currency
    } = req.body;

    console.log(req.body);

    let receiptContent = '';
    receiptContent += padLine(shopName || 'Business Name') + '\n';
    if (shopAddress) receiptContent += padLine(shopAddress) + '\n';
    if (req.body.paybill_account) {
      receiptContent += padLine(`Paybill: ${req.body.paybill_account}`) + '\n';
      if (req.body.paybill_till) {
        receiptContent += padLine(`Account: ${req.body.paybill_till}`) + '\n';
      }
    } else if (req.body.paybill_till) {
      receiptContent += padLine(`Buy Goods: ${req.body.paybill_till}`) + '\n';
    }
    receiptContent += padLine('SALES RECEIPT') + '\n';
    receiptContent += '-------------------------------\n';
    receiptContent += `Receipt #: ${receiptNumber}\n`;
    receiptContent += `Date: ${date}\n`;
    receiptContent += `Customer: ${customerName}\n`;
    receiptContent += `Attendant: ${attendant}\n`;
    receiptContent += '-------------------------------\n';

    items.forEach((item: { name: string | any[]; serialnumber: string; quantity: number; unitPrice: number; total: number; discount: number; }) => {
      // First line with item name
      receiptContent += `${item.name.slice(0,20)}\n ${'srn: '+item.serialnumber}\n`;
      // Second line with qty x unit price = total
      receiptContent += `  ${item.quantity} x ${currency ?? 'KES'} ${item.unitPrice.toFixed(2)} = ${currency?? "KES"}${item.total.toFixed(2)}\n`;

      // Discount line if applicable
      if (item.discount && item.discount > 0) {
        receiptContent += `  Discount: -${currency ?? 'KES'}${(item.discount * item.quantity).toFixed(2)}\n`;
      }
    });

    receiptContent += '-------------------------------\n';
    receiptContent += `Subtotal:      ${currency??"KES"}${subtotal.toFixed(2)}\n`;
    if (items.some((item: { discount: number; }) => item.discount && item.discount > 0)) {
      const totalDiscount = items.reduce((sum: number, i: { discount: any; quantity: number; }) => sum + ((i.discount || 0) * i.quantity), 0);
      receiptContent += `Discount:     -${currency??"KES"}${totalDiscount.toFixed(2)}\n`;
    }
    receiptContent += `Tax:           ${currency??"KES"}${tax.toFixed(2)}\n`;
    receiptContent += `TOTAL:         ${currency??"KES"}${total.toFixed(2)}\n`;

    if (paymentMethod === 'split' && splitPayment) {
      receiptContent += '\nPayment Breakdown:\n';
      if (splitPayment.cash > 0) {
        receiptContent += `  Cash:    ${currency??"KES"}${splitPayment.cash.toFixed(2)}\n`;
      }
      if (splitPayment.mpesa > 0) {
        receiptContent += `  M-Pesa:  ${currency??"KES"}${splitPayment.mpesa.toFixed(2)}\n`;
      }
      if (splitPayment.bank > 0) {
        receiptContent += `  Bank:    ${currency??"KES"}${splitPayment.bank.toFixed(2)}\n`;
      }
    } else { 
      receiptContent += `\nPayment Method: ${paymentMethod}\n`;
    }

    receiptContent += '\n';
    receiptContent += padLine('Thank you for your business!') + '\n';
    receiptContent += padLine('Visit us again soon') + '\n';
    receiptContent += '\n\n\n\n'; // Feed extra paper

    const contentBuffer = Buffer.from(receiptContent, 'utf8');
    const cutBuffer = Buffer.from([0x1B, 0x69]); // Full cut
    const finalBuffer = Buffer.concat([contentBuffer, cutBuffer]);

    fs.writeFileSync('receipt.txt', finalBuffer);

    exec(`copy /b receipt.txt \\\\localhost\\${currentPrinterConfig.interface}`, (err, stdout, stderr) => {
      if (err) {
        console.error(`❌ Print failed: ${err.message}`);
        return res.status(500).json({ success: false, message: `Print failed: ${err.message}` });
      }
      console.log(`✅ Receipt sent to printer.`);
      res.json({ success: true, message: 'Receipt printed successfully' });
    });

  } catch (err: any) {
    console.error('Unexpected error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};
// ----------------------
// Test print
// ----------------------
export const testPrint = (req: Request, res: Response): void => {
  console.log(currentPrinterConfig)
  if (!currentPrinterConfig.interface) {
    return res.status(400).json({ success: false, message: 'Printer not configured' });
  }

  const content = `Test Print\nPrinter: ${currentPrinterConfig.interface}\nDate: ${new Date().toLocaleString()}`;
  const filename = `test-receipt-${Date.now()}.txt`;

  fs.writeFileSync(filename, content);

  exec(`notepad /p ${filename}`, (err, stdout, stderr) => {
    if (err) {
      console.error('Print failed:', err);
      console.error(stderr);
      return res.status(500).json({ success: false, message: err.message });
    }
    console.log(`🖨️ Test print sent via Notepad to default printer`);
    res.json({ success: true, message: `Test print sent to default printer` });
  });
};

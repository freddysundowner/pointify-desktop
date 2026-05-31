import { exec } from 'child_process';
import { Request, Response } from 'express';
import fs from 'fs';
import net from 'net';
import os from 'os';
import path from 'path';

const CONFIG_FILE = 'printer-config.json';
const isWindows = os.platform() === 'win32';

interface PrinterConfig {
  type: 'TCP' | 'USB' | 'SERIAL' | 'SYSTEM' | 'BROWSER';
  interface: string;
  port?: number;
  baudRate?: number;
  width?: number;
  characterSet?: string;
}

let currentPrinterConfig: PrinterConfig = {
  type: 'SYSTEM',
  interface: '',
  port: 9100,
  baudRate: 9600,
  width: 32,
  characterSet: 'PC437_USA',
};

if (fs.existsSync(CONFIG_FILE)) {
  try {
    currentPrinterConfig = { ...currentPrinterConfig, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
    console.log('✅ Loaded printer config:', currentPrinterConfig);
  } catch (err) {
    console.error('❌ Failed to load printer config:', err);
  }
}

// ─── ESC/POS helpers ──────────────────────────────────────────────────────────
const ESC = 0x1b;
const GS  = 0x1d;

const ESC_INIT    = Buffer.from([ESC, 0x40]);
const ESC_BOLD_ON = Buffer.from([ESC, 0x45, 0x01]);
const ESC_BOLD_OFF= Buffer.from([ESC, 0x45, 0x00]);
const ESC_CENTER  = Buffer.from([ESC, 0x61, 0x01]);
const ESC_LEFT    = Buffer.from([ESC, 0x61, 0x00]);
const ESC_FEED    = Buffer.from([ESC, 0x64, 0x04]);
const ESC_CUT     = Buffer.from([GS,  0x56, 0x41, 0x00]);

function buildReceiptBuffer(text: string): Buffer {
  const parts: Buffer[] = [
    ESC_INIT,
    ESC_LEFT,
    Buffer.from(text, 'utf8'),
    ESC_FEED,
    ESC_CUT,
  ];
  return Buffer.concat(parts);
}

// ─── Printer detection ────────────────────────────────────────────────────────
function detectSystemPrinters(): Promise<string[]> {
  return new Promise((resolve) => {
    if (isWindows) {
      exec('wmic printer get name', (err, stdout) => {
        if (err) return resolve([]);
        const lines = stdout.split('\r\n').map(l => l.trim()).filter(Boolean);
        resolve(lines.slice(1));
      });
    } else {
      exec("lpstat -a 2>/dev/null | awk '{print $1}'", (err, stdout) => {
        if (err || !stdout.trim()) {
          exec("lpstat -p 2>/dev/null | grep 'printer' | awk '{print $2}'", (err2, stdout2) => {
            if (err2 || !stdout2.trim()) return resolve([]);
            resolve(stdout2.split('\n').map(l => l.trim()).filter(Boolean));
          });
        } else {
          resolve(stdout.split('\n').map(l => l.trim()).filter(Boolean));
        }
      });
    }
  });
}

// ─── TCP printing ─────────────────────────────────────────────────────────────
function printViaTCP(ip: string, port: number, data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(8000);
    socket.connect(port, ip, () => {
      socket.write(data, (err) => {
        if (err) { socket.destroy(); return reject(err); }
        setTimeout(() => { socket.end(); resolve(); }, 300);
      });
    });
    socket.on('timeout', () => { socket.destroy(); reject(new Error('TCP connection timed out')); });
    socket.on('error', (err) => reject(err));
  });
}

// ─── USB / device-file printing ───────────────────────────────────────────────
function printViaUSB(devicePath: string, data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.writeFile(devicePath, data, (err) => {
      if (err) reject(new Error(`USB write failed: ${err.message}`));
      else resolve();
    });
  });
}

// ─── Serial printing ──────────────────────────────────────────────────────────
function printViaSerial(port: string, baudRate: number, data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(os.tmpdir(), `receipt_${Date.now()}.bin`);
    fs.writeFileSync(tmpFile, data);
    if (isWindows) {
      exec(`mode ${port}: baud=${baudRate} parity=n data=8 stop=1 && copy /b "${tmpFile}" ${port}`, (err, _, stderr) => {
        fs.unlinkSync(tmpFile);
        if (err) reject(new Error(stderr || err.message)); else resolve();
      });
    } else {
      exec(`stty -F ${port} ${baudRate} raw -echo && cat "${tmpFile}" > ${port}`, (err, _, stderr) => {
        fs.unlinkSync(tmpFile);
        if (err) reject(new Error(stderr || err.message)); else resolve();
      });
    }
  });
}

// ─── System printer printing ─────────────────────────────────────────────────
function printViaSystem(printerName: string, data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(os.tmpdir(), `receipt_${Date.now()}.bin`);
    fs.writeFileSync(tmpFile, data);
    let cmd: string;
    if (isWindows) {
      cmd = `copy /b "${tmpFile}" "\\\\localhost\\${printerName}"`;
    } else {
      cmd = `lp -d "${printerName}" -o raw "${tmpFile}"`;
    }
    exec(cmd, (err, _, stderr) => {
      try { fs.unlinkSync(tmpFile); } catch (_) {}
      if (err) reject(new Error(stderr || err.message)); else resolve();
    });
  });
}

// ─── Route handlers ───────────────────────────────────────────────────────────
export const getPrinters = async (req: Request, res: Response): Promise<void> => {
  try {
    const printers = await detectSystemPrinters();
    res.json({ success: true, printers, platform: os.platform() });
  } catch (err: any) {
    res.status(500).json({ success: false, printers: [], error: err.message });
  }
};

export const getPrinterStatus = (req: Request, res: Response): void => {
  res.json({
    initialized: !!(currentPrinterConfig.interface || currentPrinterConfig.type === 'BROWSER' || currentPrinterConfig.type === 'WEBUSB'),
    config: currentPrinterConfig,
    platform: os.platform(),
  });
};

export const initializePrinter = (req: Request, res: Response): void => {
  const { type, interface: iface, port, baudRate, width, characterSet } = req.body;

  if (type !== 'BROWSER' && type !== 'WEBUSB' && !iface) {
    res.status(400).json({ success: false, message: 'Printer interface/address is required' });
    return;
  }

  currentPrinterConfig = {
    type: type || 'SYSTEM',
    interface: iface || '',
    port: port ? Number(port) : 9100,
    baudRate: baudRate ? Number(baudRate) : 9600,
    width: width ? Number(width) : 32,
    characterSet: characterSet || 'PC437_USA',
  };

  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentPrinterConfig, null, 2));
    console.log('💾 Printer config saved:', currentPrinterConfig);
    res.json({ success: true, message: `Printer configured: ${type} — ${iface || 'browser'}`, config: currentPrinterConfig });
  } catch (err: any) {
    console.error('Failed to save printer config:', err);
    res.status(500).json({ success: false, message: 'Failed to save config: ' + err.message });
  }
};

export const testPrint = async (req: Request, res: Response): Promise<void> => {
  const cfg = currentPrinterConfig;

  if (!cfg.interface && cfg.type !== 'BROWSER') {
    res.status(400).json({ success: false, message: 'Printer not configured' });
    return;
  }

  const testText = [
    '================================\n',
    '         TEST PRINT\n',
    '================================\n',
    `Type:    ${cfg.type}\n`,
    `Target:  ${cfg.interface || 'browser'}\n`,
    `Date:    ${new Date().toLocaleString()}\n`,
    '================================\n',
    '   Printer is working correctly\n',
    '================================\n',
    '\n\n\n',
  ].join('');

  try {
    await sendToPrinter(cfg, testText);
    res.json({ success: true, message: 'Test print sent successfully' });
  } catch (err: any) {
    console.error('Test print failed:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const printReceipt = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      shopName, shopAddress, receiptNumber, date, items,
      subtotal, tax, total, paymentMethod, customerName,
      attendant, splitPayment, currency, extraCharge, mpesaRef,
    } = req.body;

    const w = currentPrinterConfig.width || 32;
    const div = '-'.repeat(w);

    const center = (text: string) => {
      if (text.length >= w) return text + '\n';
      const pad = Math.floor((w - text.length) / 2);
      return ' '.repeat(pad) + text + '\n';
    };

    const lr = (left: string, right: string) => {
      const gap = w - left.length - right.length;
      return left + (gap > 0 ? ' '.repeat(gap) : ' ') + right + '\n';
    };

    const cur = currency || 'KES';
    let txt = '';

    txt += center(shopName || 'Business Name');
    if (shopAddress) txt += center(shopAddress);
    if (req.body.paybill_account) {
      txt += center(`Paybill: ${req.body.paybill_account}`);
      if (req.body.paybill_till) txt += center(`Account: ${req.body.paybill_till}`);
    } else if (req.body.paybill_till) {
      txt += center(`Buy Goods Till: ${req.body.paybill_till}`);
    }
    txt += center('SALES RECEIPT');
    txt += div + '\n';
    txt += `Receipt: ${receiptNumber}\n`;
    txt += `Date:    ${date}\n`;
    txt += `Customer:${customerName}\n`;
    txt += `By:      ${attendant}\n`;
    txt += div + '\n';

    items.forEach((item: any) => {
      txt += `${String(item.name).slice(0, w)}\n`;
      if (item.serialnumber) txt += `  SN: ${item.serialnumber}\n`;
      txt += `  ${item.quantity} x ${cur} ${Number(item.unitPrice).toFixed(2)} = ${cur} ${Number(item.total).toFixed(2)}\n`;
      if (item.discount && item.discount > 0) {
        txt += `  Disc: -${cur} ${(item.discount * item.quantity).toFixed(2)}\n`;
      }
    });

    txt += div + '\n';
    txt += lr('Subtotal:', `${cur} ${Number(subtotal).toFixed(2)}`);

    const totalDiscount = items.reduce((s: number, i: any) => s + ((i.discount || 0) * i.quantity), 0);
    if (totalDiscount > 0) txt += lr('Discount:', `-${cur} ${totalDiscount.toFixed(2)}`);

    txt += lr('Tax:', `${cur} ${Number(tax).toFixed(2)}`);
    if (extraCharge) txt += lr(`${extraCharge.label}:`, `${cur} ${Number(extraCharge.amount).toFixed(2)}`);
    txt += lr('TOTAL:', `${cur} ${Number(total).toFixed(2)}`);

    if (paymentMethod === 'split' && splitPayment) {
      txt += '\nPayment:\n';
      if (splitPayment.cash  > 0) txt += `  Cash:   ${cur} ${Number(splitPayment.cash).toFixed(2)}\n`;
      if (splitPayment.mpesa > 0) txt += `  M-Pesa: ${cur} ${Number(splitPayment.mpesa).toFixed(2)}\n`;
      if (splitPayment.bank  > 0) txt += `  Bank:   ${cur} ${Number(splitPayment.bank).toFixed(2)}\n`;
    } else {
      txt += `\nPayment: ${paymentMethod}\n`;
    }
    if (mpesaRef) txt += `M-Pesa Ref: ${mpesaRef}\n`;

    txt += '\n';
    txt += center('Thank you for your business!');
    txt += center('Visit us again soon');
    txt += '\n\n\n\n';

    await sendToPrinter(currentPrinterConfig, txt);
    res.json({ success: true, message: 'Receipt printed successfully' });
  } catch (err: any) {
    console.error('Receipt print error:', err);
    res.status(500).json({ success: false, message: err.message || 'Print failed' });
  }
};

// ─── Unified send dispatcher ──────────────────────────────────────────────────
async function sendToPrinter(cfg: PrinterConfig, text: string): Promise<void> {
  const data = buildReceiptBuffer(text);

  switch (cfg.type) {
    case 'TCP': {
      const [ip, portStr] = cfg.interface.includes(':')
        ? cfg.interface.split(':')
        : [cfg.interface, String(cfg.port || 9100)];
      await printViaTCP(ip.trim(), parseInt(portStr) || 9100, data);
      break;
    }
    case 'USB':
      await printViaUSB(cfg.interface, data);
      break;
    case 'SERIAL':
      await printViaSerial(cfg.interface, cfg.baudRate || 9600, data);
      break;
    case 'SYSTEM':
      await printViaSystem(cfg.interface, data);
      break;
    case 'BROWSER':
      throw new Error('BROWSER mode: use the browser Print button on the receipt page');
    default:
      throw new Error(`Unknown printer type: ${cfg.type}`);
  }
}

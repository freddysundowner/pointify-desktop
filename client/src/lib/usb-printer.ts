const ESC = 0x1B;
const GS  = 0x1D;
const LF  = 0x0A;
const WIDTH = 42; // 80mm paper @ 42 chars/line

export interface KitchenTicketPrintData {
  shopName: string;
  orderNumber: string;
  date: string;
  customerName?: string;
  attendant?: string;
  note?: string;
  items: Array<{
    name: string;
    quantity: number;
  }>;
}

export interface ReceiptPrintData {
  shopName: string;
  shopAddress?: string;
  receiptNumber: string;
  date: string;
  currency: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    discount?: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  customerName?: string;
  attendant?: string;
  splitPayment?: { cash?: number; mpesa?: number; bank?: number };
  extraCharge?: { label: string; amount: number };
  mpesaRef?: string;
}

function pad(left: string, right: string, w = WIDTH): string {
  const spaces = w - left.length - right.length;
  return left + ' '.repeat(Math.max(1, spaces)) + right;
}

function center(text: string, w = WIDTH): string {
  const p = Math.max(0, Math.floor((w - text.length) / 2));
  return ' '.repeat(p) + text;
}

function wrap(text: string, w = WIDTH): string[] {
  const lines: string[] = [];
  while (text.length > w) { lines.push(text.slice(0, w)); text = text.slice(w); }
  if (text) lines.push(text);
  return lines;
}

class USBThermalPrinter {
  private device: USBDevice | null = null;
  private endpointNumber = 1;

  isConnected(): boolean {
    return !!(this.device && this.device.opened);
  }

  getDeviceName(): string | null {
    return this.device?.productName || null;
  }

  async connect(): Promise<string> {
    if (!('usb' in navigator)) throw new Error('Web USB is not supported in this browser. Use Chrome or Edge.');

    const device = await (navigator as any).usb.requestDevice({ filters: [] });

    try {
      await device.open();
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('access') || msg.includes('denied') || msg.includes('failed to execute')) {
        throw new Error('WINDOWS_ACCESS_DENIED');
      }
      throw err;
    }

    if (device.configuration === null) {
      try {
        await device.selectConfiguration(1);
      } catch {}
    }

    const interfaces: USBInterface[] = device.configuration?.interfaces ?? [];
    if (interfaces.length === 0) throw new Error('No USB interfaces found on this device.');

    let claimedIface: USBInterface | null = null;
    let claimError: any = null;

    for (const iface of interfaces) {
      try {
        await device.claimInterface(iface.interfaceNumber);
        claimedIface = iface;
        break;
      } catch (err: any) {
        claimError = err;
        const msg = (err?.message || '').toLowerCase();
        if (msg.includes('access') || msg.includes('denied')) {
          throw new Error('WINDOWS_ACCESS_DENIED');
        }
      }
    }

    if (!claimedIface) {
      const msg = (claimError?.message || '').toLowerCase();
      if (msg.includes('access') || msg.includes('denied')) {
        throw new Error('WINDOWS_ACCESS_DENIED');
      }
      throw new Error(claimError?.message || 'Could not claim any USB interface on this device.');
    }

    const ep = claimedIface.alternate.endpoints.find((e: USBEndpoint) => e.direction === 'out');
    if (!ep) throw new Error('No output endpoint found on this USB device.');

    this.endpointNumber = ep.endpointNumber;
    this.device = device;
    return device.productName || 'USB Printer';
  }

  async disconnect(): Promise<void> {
    try { if (this.device?.opened) await this.device.close(); } catch {}
    this.device = null;
  }

  async reconnect(): Promise<string | null> {
    if (!('usb' in navigator)) return null;
    if (this.isConnected()) return this.device!.productName || 'USB Printer';
    try {
      const devices: USBDevice[] = await (navigator as any).usb.getDevices();
      if (devices.length === 0) return null;
      const device = devices[0];
      try {
        await device.open();
      } catch (err: any) {
        const msg = (err?.message || '').toLowerCase();
        if (msg.includes('access') || msg.includes('denied') || msg.includes('failed to execute')) {
          throw new Error('WINDOWS_ACCESS_DENIED');
        }
        return null;
      }
      if (device.configuration === null) {
        try { await device.selectConfiguration(1); } catch {}
      }
      const interfaces: USBInterface[] = device.configuration?.interfaces ?? [];
      for (const iface of interfaces) {
        try {
          await device.claimInterface(iface.interfaceNumber);
          const ep = iface.alternate.endpoints.find((e: USBEndpoint) => e.direction === 'out');
          if (ep) {
            this.endpointNumber = ep.endpointNumber;
            this.device = device;
            return device.productName || 'USB Printer';
          }
        } catch {}
      }
      return null;
    } catch {
      return null;
    }
  }

  private async write(data: Uint8Array): Promise<void> {
    if (!this.device?.opened) throw new Error('USB printer not connected');
    const CHUNK = 64;
    for (let i = 0; i < data.length; i += CHUNK) {
      await this.device.transferOut(this.endpointNumber, data.slice(i, i + CHUNK));
    }
  }

  private enc(s: string): number[] {
    return Array.from(new TextEncoder().encode(s));
  }

  async printReceipt(data: ReceiptPrintData): Promise<void> {
    const b: number[] = [];
    const cmd = (...v: number[]) => b.push(...v);
    const txt = (s: string) => b.push(...this.enc(s));
    const nl  = () => b.push(LF);
    const divider = () => { txt('-'.repeat(WIDTH)); nl(); };

    cmd(ESC, 0x40);                   // initialize

    // Shop name — centered, bold, double height
    cmd(ESC, 0x61, 0x01);             // center
    cmd(ESC, 0x45, 0x01);             // bold on
    cmd(GS,  0x21, 0x10);             // double height
    txt(data.shopName); nl();
    cmd(GS,  0x21, 0x00);             // normal
    cmd(ESC, 0x45, 0x00);             // bold off

    if (data.shopAddress) { txt(center(data.shopAddress)); nl(); }
    nl();

    cmd(ESC, 0x61, 0x00);             // left align
    divider();

    txt(pad('Receipt #:', data.receiptNumber)); nl();
    txt(pad('Date:', data.date)); nl();
    txt(pad('Customer:', data.customerName || 'Walk-in')); nl();
    if (data.attendant) { txt(pad('Served by:', data.attendant)); nl(); }

    divider();

    // Column header
    cmd(ESC, 0x45, 0x01);
    txt(pad('Item', `${data.currency} Amount`)); nl();
    cmd(ESC, 0x45, 0x00);
    divider();

    // Items
    for (const item of data.items) {
      const nameLines = wrap(item.name, WIDTH - 10);
      txt(nameLines[0]); nl();
      for (let i = 1; i < nameLines.length; i++) { txt(nameLines[i]); nl(); }
      txt(pad(`  ${item.quantity} x ${Number(item.unitPrice).toFixed(2)}`, `${data.currency} ${Number(item.total).toFixed(2)}`)); nl();
      if (Number(item.discount) > 0) {
        txt(pad('  Discount:', `-${data.currency} ${(Number(item.discount) * item.quantity).toFixed(2)}`)); nl();
      }
    }

    divider();

    txt(pad('Subtotal:', `${data.currency} ${Number(data.subtotal).toFixed(2)}`)); nl();
    txt(pad('Tax:',      `${data.currency} ${Number(data.tax).toFixed(2)}`)); nl();
    if (data.extraCharge) {
      txt(pad(`${data.extraCharge.label}:`, `${data.currency} ${Number(data.extraCharge.amount).toFixed(2)}`)); nl();
    }

    cmd(ESC, 0x45, 0x01);
    cmd(GS,  0x21, 0x10);
    txt(pad('TOTAL:', `${data.currency} ${Number(data.total).toFixed(2)}`)); nl();
    cmd(GS,  0x21, 0x00);
    cmd(ESC, 0x45, 0x00);

    // Payment
    if (data.paymentMethod === 'split' && data.splitPayment) {
      txt('Payment: Split'); nl();
      if (data.splitPayment.cash)  { txt(pad('  Cash:',  `${data.currency} ${Number(data.splitPayment.cash).toFixed(2)}`)); nl(); }
      if (data.splitPayment.mpesa) { txt(pad('  M-Pesa:', `${data.currency} ${Number(data.splitPayment.mpesa).toFixed(2)}`)); nl(); }
      if (data.splitPayment.bank)  { txt(pad('  Bank:',  `${data.currency} ${Number(data.splitPayment.bank).toFixed(2)}`)); nl(); }
    } else {
      txt(pad('Payment:', data.paymentMethod)); nl();
    }
    if (data.mpesaRef) { txt(pad('M-Pesa Ref:', data.mpesaRef)); nl(); }

    divider();

    // Footer
    cmd(ESC, 0x61, 0x01);
    txt(center('Thank you for your business!')); nl();
    nl(); nl(); nl();

    // Cut
    cmd(GS, 0x56, 0x42, 0x00);

    await this.write(new Uint8Array(b));
  }

  // Kitchen order ticket: items + quantities only, no prices/totals — this
  // goes to the kitchen, not the customer.
  async printKitchenTicket(data: KitchenTicketPrintData): Promise<void> {
    const b: number[] = [];
    const cmd = (...v: number[]) => b.push(...v);
    const txt = (s: string) => b.push(...this.enc(s));
    const nl  = () => b.push(LF);
    const divider = () => { txt('='.repeat(WIDTH)); nl(); };

    cmd(ESC, 0x40); // initialize

    cmd(ESC, 0x61, 0x01); // center
    cmd(ESC, 0x45, 0x01); // bold on
    cmd(GS,  0x21, 0x11); // double height + width
    txt('KITCHEN ORDER'); nl();
    cmd(GS,  0x21, 0x00);
    cmd(ESC, 0x45, 0x00);
    txt(center(data.shopName)); nl();
    nl();

    cmd(ESC, 0x61, 0x00); // left align
    divider();

    cmd(ESC, 0x45, 0x01);
    cmd(GS,  0x21, 0x10); // double height
    txt(`Order #: ${data.orderNumber}`); nl();
    cmd(GS,  0x21, 0x00);
    cmd(ESC, 0x45, 0x00);
    txt(pad('Time:', data.date)); nl();
    if (data.customerName) { txt(pad('Customer:', data.customerName)); nl(); }
    if (data.attendant) { txt(pad('Waiter:', data.attendant)); nl(); }

    divider();

    cmd(ESC, 0x45, 0x01);
    cmd(GS, 0x21, 0x10); // double height for items — kitchen legibility
    for (const item of data.items) {
      const line = `${item.quantity}x  ${item.name}`;
      const wrapped = wrap(line, WIDTH / 2 - 1);
      for (const l of wrapped) { txt(l); nl(); }
    }
    cmd(GS, 0x21, 0x00);
    cmd(ESC, 0x45, 0x00);

    divider();

    if (data.note) {
      txt('Note:'); nl();
      for (const l of wrap(data.note, WIDTH)) { txt(l); nl(); }
      divider();
    }

    nl(); nl(); nl();
    cmd(GS, 0x56, 0x42, 0x00); // cut

    await this.write(new Uint8Array(b));
  }

  async testPrint(): Promise<void> {
    const b: number[] = [];
    const cmd = (...v: number[]) => b.push(...v);
    const txt = (s: string) => b.push(...this.enc(s));
    const nl  = () => b.push(LF);

    cmd(ESC, 0x40);
    cmd(ESC, 0x61, 0x01);
    cmd(ESC, 0x45, 0x01);
    cmd(GS,  0x21, 0x10);
    txt('*** TEST PRINT ***'); nl();
    cmd(GS,  0x21, 0x00);
    cmd(ESC, 0x45, 0x00);
    txt(center('USB Printer OK')); nl();
    txt(center(new Date().toLocaleString())); nl();
    nl(); nl(); nl();
    cmd(GS, 0x56, 0x42, 0x00);

    await this.write(new Uint8Array(b));
  }
}

export const usbPrinter = new USBThermalPrinter();

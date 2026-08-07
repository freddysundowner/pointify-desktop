import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Printer, Settings, TestTube, CheckCircle, XCircle, RefreshCw, Wifi, Usb, Monitor, Globe, Link, Unlink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usbPrinter } from "@/lib/usb-printer";
import { agentAvailable, agentTestPrint, parseTcpTarget } from "@/lib/print-agent";
import { rawApiFetch } from "@/lib/api-config";

interface PrinterConfig {
  type: 'TCP' | 'USB' | 'SERIAL' | 'SYSTEM' | 'BROWSER' | 'WEBUSB';
  interface: string;
  port?: number;
  baudRate?: number;
  width?: number;
  characterSet?: string;
}

interface PrinterStatus {
  initialized: boolean;
  config: PrinterConfig | null;
  platform?: string;
}

const TYPE_INFO: Record<string, { icon: React.ReactNode; label: string; hint: string; placeholder: string }> = {
  TCP:     { icon: <Wifi className="h-4 w-4" />,    label: 'Network (TCP/IP)',  hint: 'Printer connected via Wi-Fi or LAN. Needs an IP address.',           placeholder: '192.168.1.100' },
  WEBUSB:  { icon: <Usb className="h-4 w-4" />,     label: 'USB (Direct)',      hint: 'Connect your USB thermal printer directly from Chrome — no drivers required.', placeholder: '' },
  USB:     { icon: <Usb className="h-4 w-4" />,     label: 'USB (Server)',      hint: 'Linux: /dev/usb/lp0   Windows: USB001  (server must run on this PC)', placeholder: '/dev/usb/lp0' },
  SERIAL:  { icon: <Settings className="h-4 w-4" />,label: 'Serial / COM Port', hint: 'Linux: /dev/ttyUSB0   Windows: COM3',                               placeholder: '/dev/ttyUSB0' },
  SYSTEM:  { icon: <Monitor className="h-4 w-4" />, label: 'System Printer',    hint: 'Printer installed in your OS. Works when server runs on your PC.',   placeholder: 'Printer name' },
  BROWSER: { icon: <Globe className="h-4 w-4" />,   label: 'Browser Print',     hint: 'Use the browser\'s built-in print dialog. Works from any device, no setup needed.', placeholder: '' },
};

const BAUD_RATES = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];

export function PrinterConfigDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<PrinterConfig>({
    type: 'BROWSER',
    interface: '',
    port: 9100,
    baudRate: 9600,
    width: 32,
    characterSet: 'PC437_USA',
  });
  const [status, setStatus] = useState<PrinterStatus>({ initialized: false, config: null });
  const [isLoading, setIsLoading] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [usbConnected, setUsbConnected] = useState(false);
  const [usbDeviceName, setUsbDeviceName] = useState<string | null>(null);
  const [usbWindowsError, setUsbWindowsError] = useState(false);
  const [agentConnected, setAgentConnected] = useState<boolean | null>(null);
  const { toast } = useToast();

  // Detect the local print agent whenever the TCP option is relevant
  useEffect(() => {
    if (config.type !== 'TCP' && status.config?.type !== 'TCP') return;
    let cancelled = false;
    agentAvailable().then(ok => { if (!cancelled) setAgentConnected(ok); });
    return () => { cancelled = true; };
  }, [isOpen, config.type, status.config?.type]);

  useEffect(() => {
    setUsbConnected(usbPrinter.isConnected());
    setUsbDeviceName(usbPrinter.getDeviceName());
  }, [isOpen]);

  // Auto-reconnect to previously-granted USB printer on mount
  useEffect(() => {
    usbPrinter.reconnect().then(name => {
      if (name) {
        setUsbConnected(true);
        setUsbDeviceName(name);
      }
    });
  }, []);

  useEffect(() => { loadPrinterStatus(); }, []);

  useEffect(() => {
    if (isOpen && config.type === 'SYSTEM') discoverPrinters();
  }, [isOpen, config.type]);

  const loadPrinterStatus = async () => {
    try {
      const res = await rawApiFetch('/api/printer/status', { auth: 'none' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStatus(data);
      if (data.config) setConfig(data.config);
    } catch {
      setStatus({ initialized: false, config: null });
    }
  };

  const discoverPrinters = async () => {
    setIsDiscovering(true);
    try {
      const res = await rawApiFetch('/api/printers', { auth: 'none' });
      const data = await res.json();
      setAvailablePrinters(data.printers || []);
    } catch {
      setAvailablePrinters([]);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const res = await rawApiFetch('/api/printer/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        auth: 'none',
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Printer Configured", description: data.message });
        await loadPrinterStatus();
        setIsOpen(false);
      } else {
        throw new Error(data.message || 'Configuration failed');
      }
    } catch (err) {
      toast({
        title: "Configuration Failed",
        description: err instanceof Error ? err.message : "Failed to configure printer",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectUSB = async () => {
    setIsLoading(true);
    setUsbWindowsError(false);
    try {
      const name = await usbPrinter.connect();
      setUsbConnected(true);
      setUsbDeviceName(name);
      toast({ title: "USB Printer Connected", description: `Connected to: ${name}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'WINDOWS_ACCESS_DENIED') {
        setUsbWindowsError(true);
      } else {
        toast({
          title: "USB Connection Failed",
          description: msg || "Could not connect to USB printer",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectUSB = async () => {
    await usbPrinter.disconnect();
    setUsbConnected(false);
    setUsbDeviceName(null);
    toast({ title: "USB Printer Disconnected" });
  };

  const handleTest = async () => {
    if (!status.initialized) {
      toast({ title: "Not Configured", description: "Save a printer config first", variant: "destructive" });
      return;
    }
    if (status.config?.type === 'BROWSER') {
      window.print();
      return;
    }
    if (status.config?.type === 'WEBUSB') {
      if (!usbPrinter.isConnected()) {
        toast({ title: "Not Connected", description: "Connect the USB printer first", variant: "destructive" });
        return;
      }
      setIsLoading(true);
      try {
        await usbPrinter.testPrint();
        toast({ title: "Test Successful", description: "Test receipt printed via USB" });
      } catch (err) {
        toast({ title: "Test Failed", description: err instanceof Error ? err.message : "USB print failed", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
      return;
    }
    setIsLoading(true);
    try {
      // Network printers: prefer the local print agent — the cloud server
      // can't reach a printer on the shop's own LAN, but the agent can.
      if (status.config?.type === 'TCP') {
        const target = parseTcpTarget(status.config);
        if (target && (await agentAvailable())) {
          setAgentConnected(true);
          await agentTestPrint(target);
          toast({ title: "Test Successful", description: "Test receipt printed via the local print agent" });
          return;
        }
        setAgentConnected(false);
      }
      const res = await rawApiFetch('/api/printer/test', { method: 'POST', auth: 'none' });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Test Successful", description: "Test print sent successfully" });
      } else {
        if (status.config?.type === 'TCP') {
          throw new Error(
            (data.message || 'Test failed') +
            " — for network printers, the Pointify Print Agent must be running on this computer (see the agent folder / ask your provider)."
          );
        }
        throw new Error(data.message || 'Test failed');
      }
    } catch (err) {
      toast({
        title: "Test Failed",
        description: err instanceof Error ? err.message : "Test print failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const info = TYPE_INFO[config.type];

  return (
    <div className="space-y-4">
      {/* Status card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            <Printer className="h-4 w-4" />
            <CardTitle className="text-sm font-medium">Printer Status</CardTitle>
          </div>
          {status.initialized ? (
            <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1">
              <XCircle className="h-3 w-3" /> Not Configured
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              {status.config && (
                <div className="text-sm text-muted-foreground font-medium">
                  {TYPE_INFO[status.config.type]?.label} — {status.config.interface || 'Browser'}
                  {status.config.type === 'TCP' && status.config.port && `:${status.config.port}`}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-0.5">
                {status.initialized ? 'Ready for printing' : 'Configure printer to enable receipt printing'}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleTest} disabled={!status.initialized || isLoading}>
                <TestTube className="h-3 w-3 mr-1" /> Test
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
                <Settings className="h-3 w-3 mr-1" /> Configure
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Config form */}
      {isOpen && (
        <Card className="w-full max-w-2xl mx-auto mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" /> Printer Configuration
            </CardTitle>
            <CardDescription>Choose how receipts are sent to your printer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Connection type */}
            <div className="space-y-2">
              <Label>Connection Type</Label>
              <Select value={config.type} onValueChange={(v: any) => setConfig({ ...config, type: v, interface: '' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_INFO).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {val.icon} {val.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{info.hint}</p>
            </div>

            {/* Interface / address — hidden for BROWSER and WEBUSB */}
            {config.type !== 'BROWSER' && config.type !== 'WEBUSB' && (
              <div className="space-y-2">
                <Label>
                  {config.type === 'TCP'    && 'IP Address'}
                  {config.type === 'USB'    && 'USB Device Path'}
                  {config.type === 'SERIAL' && 'Serial Port'}
                  {config.type === 'SYSTEM' && 'Printer Name'}
                </Label>
                <Input
                  value={config.interface}
                  onChange={e => setConfig({ ...config, interface: e.target.value })}
                  placeholder={info.placeholder}
                />
              </div>
            )}

            {/* TCP port */}
            {config.type === 'TCP' && (
              <div className="space-y-2">
                <Label>Port <span className="text-xs text-muted-foreground">(default 9100)</span></Label>
                <Input
                  type="number"
                  value={config.port || 9100}
                  onChange={e => setConfig({ ...config, port: parseInt(e.target.value) || 9100 })}
                  placeholder="9100"
                />
                <div className="flex items-center gap-2 pt-1" data-testid="status-print-agent">
                  {agentConnected === true ? (
                    <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Print agent connected
                    </Badge>
                  ) : agentConnected === false ? (
                    <Badge variant="outline" className="text-amber-700 border-amber-300 flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> Print agent not detected
                    </Badge>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    Network printing needs the Pointify Print Agent running on this computer.
                  </span>
                </div>
              </div>
            )}

            {/* Serial baud rate */}
            {config.type === 'SERIAL' && (
              <div className="space-y-2">
                <Label>Baud Rate</Label>
                <Select
                  value={String(config.baudRate || 9600)}
                  onValueChange={v => setConfig({ ...config, baudRate: parseInt(v) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BAUD_RATES.map(b => (
                      <SelectItem key={b} value={String(b)}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* System printer discovery */}
            {config.type === 'SYSTEM' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Available Printers</Label>
                  <Button variant="ghost" size="sm" onClick={discoverPrinters} disabled={isDiscovering}>
                    <RefreshCw className={`h-3 w-3 mr-1 ${isDiscovering ? 'animate-spin' : ''}`} />
                    {isDiscovering ? 'Scanning…' : 'Refresh'}
                  </Button>
                </div>
                {availablePrinters.length > 0 ? (
                  <div className="border rounded divide-y max-h-48 overflow-y-auto">
                    {availablePrinters.map(p => (
                      <div
                        key={p}
                        className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted text-sm ${config.interface === p ? 'bg-purple-50' : ''}`}
                        onClick={() => setConfig({ ...config, interface: p })}
                      >
                        <div className="flex items-center gap-2">
                          <Printer className="h-4 w-4 text-muted-foreground" />
                          <span>{p}</span>
                        </div>
                        {config.interface === p && <CheckCircle className="h-4 w-4 text-purple-600" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {isDiscovering ? 'Scanning for printers…' : 'No printers found. Make sure the server runs on your PC, then click Refresh.'}
                  </p>
                )}
              </div>
            )}

            {/* Paper width */}
            {config.type !== 'BROWSER' && (
              <div className="space-y-2">
                <Label>Paper Width <span className="text-xs text-muted-foreground">(characters per line)</span></Label>
                <Select
                  value={String(config.width || 32)}
                  onValueChange={v => setConfig({ ...config, width: parseInt(v) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="32">32 chars — 58mm paper</SelectItem>
                    <SelectItem value="42">42 chars — 80mm paper</SelectItem>
                    <SelectItem value="48">48 chars — 80mm wide</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* WEBUSB connect panel */}
            {config.type === 'WEBUSB' && (
              <div className="space-y-3">
                {/* Status banner */}
                <div className={`rounded-md border p-3 text-sm ${usbConnected ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                  {usbConnected ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      <span>Connected to <strong>{usbDeviceName || 'USB Printer'}</strong> — ready to print!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 shrink-0" />
                      <span>Not connected. Click <strong>Connect USB Printer</strong> below, then select your printer from the browser prompt.</span>
                    </div>
                  )}
                </div>

                {/* Windows "Access Denied" help panel */}
                {usbWindowsError && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900 space-y-2">
                    <p className="font-semibold flex items-center gap-1.5">
                      <XCircle className="h-4 w-4 shrink-0" /> Access Denied — Windows driver conflict
                    </p>
                    <p>Windows has already claimed this printer with its own driver, blocking browser access. You need to replace the driver with <strong>WinUSB</strong> using the free tool <strong>Zadig</strong>:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs leading-relaxed">
                      <li>Download <strong>Zadig</strong> from <span className="font-mono">zadig.akeo.ie</span> and run it.</li>
                      <li>Click <strong>Options → List All Devices</strong>, then select your printer from the dropdown.</li>
                      <li>Make sure the replacement driver on the right is set to <strong>WinUSB</strong>.</li>
                      <li>Click <strong>Replace Driver</strong> and wait for it to finish.</li>
                      <li>Unplug and re-plug the printer, then click <strong>Connect USB Printer</strong> again.</li>
                    </ol>
                    <p className="text-xs text-red-700">Note: this will remove the standard Windows print driver for this printer. To undo it, open Device Manager → find the printer → Update driver → Search automatically.</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {!usbConnected ? (
                    <Button onClick={handleConnectUSB} disabled={isLoading} className="flex-1">
                      <Link className="h-4 w-4 mr-2" />
                      {isLoading ? 'Connecting…' : 'Connect USB Printer'}
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={handleDisconnectUSB} className="flex-1">
                      <Unlink className="h-4 w-4 mr-2" /> Disconnect
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Prints silently via ESC/POS — no print dialog. Works in Chrome and Edge only. You must click Connect each time the page is reloaded.
                </p>
              </div>
            )}

            {/* BROWSER note */}
            {config.type === 'BROWSER' && (
              <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
                With Browser Print, clicking <strong>Print</strong> on a receipt opens your system print dialog.
                Works on any device with any printer — no extra configuration needed.
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleTest} disabled={!status.initialized || isLoading}>
                  <TestTube className="h-4 w-4 mr-1" /> Test
                </Button>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? 'Saving…' : 'Save Configuration'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

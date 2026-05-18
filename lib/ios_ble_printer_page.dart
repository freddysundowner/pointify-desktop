import 'dart:async';
import 'dart:math';
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

class IosBlePrinterPage extends StatefulWidget {
  const IosBlePrinterPage({super.key});

  @override
  State<IosBlePrinterPage> createState() => _IosBlePrinterPageState();
}

class _IosBlePrinterPageState extends State<IosBlePrinterPage> {
  final List<ScanResult> devices = [];
  BluetoothDevice? connectedDevice;
  BluetoothCharacteristic? writeChar;

  bool scanning = false;
  bool connecting = false;
  String message = "";

  StreamSubscription<List<ScanResult>>? scanSub;

  @override
  void initState() {
    super.initState();

    scanSub = FlutterBluePlus.scanResults.listen((results) {
      for (final r in results) {
        final name = r.device.platformName.toLowerCase();

        final exists =
            devices.any((d) => d.device.remoteId == r.device.remoteId);

        if (!exists &&
            (name.contains("p58") ||
                name.contains("printer") ||
                name.isNotEmpty)) {
          setState(() {
            devices.add(r);
          });
        }
      }
    });

    Future.delayed(const Duration(milliseconds: 500), () {
      reconnectSavedPrinter();
    });
  }

  Future<void> reconnectSavedPrinter() async {
    final prefs = await SharedPreferences.getInstance();
    final savedId = prefs.getString("ios_ble_printer_id");

    if (savedId == null || savedId.isEmpty) {
      setState(() {
        message = "No saved printer. Search and connect first.";
      });
      return;
    }

    setState(() {
      connecting = true;
      message = "Reconnecting saved printer...";
    });

    try {
      final device = BluetoothDevice.fromId(savedId);

      await device.connect(
        timeout: const Duration(seconds: 12),
        autoConnect: false,
        license: License.free,
      );

      final services = await device.discoverServices();

      BluetoothCharacteristic? found;

      for (final service in services) {
        for (final c in service.characteristics) {
          if (c.properties.write || c.properties.writeWithoutResponse) {
            found = c;
            break;
          }
        }
        if (found != null) break;
      }

      if (found == null) {
        setState(() {
          connecting = false;
          message = "Connected but no writable channel found.";
        });
        return;
      }

      setState(() {
        connectedDevice = device;
        writeChar = found;
        connecting = false;
        message = "Saved printer reconnected";
      });
    } catch (e) {
      setState(() {
        connecting = false;
        message = "Reconnect failed: $e";
      });
    }
  }

  @override
  void dispose() {
    scanSub?.cancel();
    FlutterBluePlus.stopScan();
    super.dispose();
  }

  Future<void> startScan() async {
    setState(() {
      devices.clear();
      scanning = true;
      message = "Scanning...";
    });

    await FlutterBluePlus.stopScan();

    await FlutterBluePlus.startScan(
      timeout: const Duration(seconds: 8),
    );

    await Future.delayed(const Duration(seconds: 8));

    if (!mounted) return;
    setState(() {
      scanning = false;
      message = devices.isEmpty ? "No BLE printer found" : "Select printer";
    });
  }

  Future<void> connectPrinter(BluetoothDevice device) async {
    setState(() {
      connecting = true;
      message = "Connecting...";
    });

    try {
      await FlutterBluePlus.stopScan();

      await device.connect(
        timeout: const Duration(seconds: 12),
        autoConnect: false,
        license: License.free,
      );

      final services = await device.discoverServices();

      BluetoothCharacteristic? found;

      for (final service in services) {
        for (final c in service.characteristics) {
          if (c.properties.write || c.properties.writeWithoutResponse) {
            found = c;
            break;
          }
        }
        if (found != null) break;
      }

      if (found == null) {
        setState(() {
          message = "Connected but no writable printer channel found";
          connecting = false;
        });
        return;
      }

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString("ios_ble_printer_id", device.remoteId.str);
      await prefs.setString("ios_ble_printer_name", device.platformName);

      setState(() {
        connectedDevice = device;
        writeChar = found;
        connecting = false;
        message = "Connected to ${device.platformName}";
      });
    } catch (e) {
      setState(() {
        connecting = false;
        message = "Connection failed: $e";
      });
    }
  }

  Future<void> printTest() async {
    if (connectedDevice == null || writeChar == null) {
      setState(() {
        message = "Connect printer first";
      });
      return;
    }

    final profile = await CapabilityProfile.load();
    final prefs = await SharedPreferences.getInstance();

    final paperSize = prefs.getString('printer_paper_size') ?? '58 mm';

    final generator = Generator(
      paperSize == '80 mm' ? PaperSize.mm80 : PaperSize.mm58,
      profile,
    );
    List<int> bytes = [];

    bytes += generator.reset();
    bytes += generator.text(
      "Pointify",
      styles: const PosStyles(
        align: PosAlign.center,
        bold: true,
        height: PosTextSize.size2,
        width: PosTextSize.size2,
      ),
    );
    bytes += generator.text(
      "iPhone BLE Test Print",
      styles: const PosStyles(align: PosAlign.center),
    );
    bytes += generator.text("-" * 32);
    bytes += generator.text("Milk          2   50.00");
    bytes += generator.text("Bread         1   35.00");
    bytes += generator.text("-" * 32);
    bytes += generator.text(
      "TOTAL: KES 135.00",
      styles: const PosStyles(align: PosAlign.right, bold: true),
    );
    bytes += generator.feed(2);
    bytes += generator.cut();

    await _writeInChunks(bytes);

    setState(() {
      message = "Print sent";
    });
  }

  Future<void> _writeInChunks(List<int> bytes) async {
    const int chunkSize = 180;

    for (int i = 0; i < bytes.length; i += chunkSize) {
      final chunk = bytes.sublist(i, min(i + chunkSize, bytes.length));

      await writeChar!.write(
        chunk,
        withoutResponse: writeChar!.properties.writeWithoutResponse,
      );

      await Future.delayed(const Duration(milliseconds: 40));
    }
  }

  Future<void> disconnect() async {
    try {
      await connectedDevice?.disconnect();
    } catch (_) {}

    setState(() {
      connectedDevice = null;
      writeChar = null;
      message = "Disconnected";
    });
  }

  @override
  Widget build(BuildContext context) {
    final isConnected = connectedDevice != null && writeChar != null;

    return Scaffold(
      appBar: AppBar(
        title: const Text("iPhone BLE Printer"),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text(message),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: scanning ? null : startScan,
                    child: Text(scanning ? "Scanning..." : "Search Printer"),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: isConnected ? printTest : null,
                    child: const Text("Test Print"),
                  ),
                ),
              ],
            ),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: connecting ? null : reconnectSavedPrinter,
                child: Text(
                    connecting ? "Connecting..." : "Reconnect Saved Printer"),
              ),
            ),
            const SizedBox(height: 10),
            if (isConnected)
              ElevatedButton(
                onPressed: disconnect,
                child: const Text("Disconnect"),
              ),
            const SizedBox(height: 16),
            Expanded(
              child: ListView.builder(
                itemCount: devices.length,
                itemBuilder: (_, index) {
                  final result = devices[index];
                  final device = result.device;
                  final name = device.platformName.isEmpty
                      ? "Unknown BLE Device"
                      : device.platformName;

                  return ListTile(
                    title: Text(name),
                    subtitle: Text(device.remoteId.str),
                    trailing: connecting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : null,
                    onTap: connecting ? null : () => connectPrinter(device),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

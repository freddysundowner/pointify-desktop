import 'dart:async';

import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:pointify/widgets/alert.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:shared_preferences/shared_preferences.dart';

class BluetoothReceiptPrinter extends StatefulWidget {
  const BluetoothReceiptPrinter({super.key});

  @override
  BluetoothReceiptPrinterState createState() => BluetoothReceiptPrinterState();
}

class BluetoothReceiptPrinterState extends State<BluetoothReceiptPrinter> {
  String _info = "";
  String _msj = '';
  bool connected = false;
  List<BluetoothInfo> items = [];

  String _selectSize = "2";
  bool _progress = false;
  String _msjprogress = "";

  String optionprinttype = "58 mm";
  List<String> options = ["58 mm", "80 mm"];

  @override
  void initState() {
    super.initState();
    initPlatformState();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Printer Setup')),
      body: Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          spacing: 3,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text("Printing Type "),
                const SizedBox(width: 10),
                DropdownButton<String>(
                  value: optionprinttype,
                  items: options.map((String option) {
                    return DropdownMenuItem<String>(
                      value: option,
                      child: Text(option),
                    );
                  }).toList(),
                  onChanged: (String? newValue) async {
                    if (newValue == null) return;

                    final prefs = await SharedPreferences.getInstance();

                    await prefs.setString(
                      'printer_paper_size',
                      newValue,
                    );

                    setState(() {
                      optionprinttype = newValue;
                    });
                  },
                ),
              ],
            ),
            if (connected == false)
              Expanded(
                child: Column(
                  children: [
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        spacing: 5,
                        children: [
                          ElevatedButton(
                            onPressed: () {
                              getBluetoots();
                            },
                            child: Row(
                              children: [
                                Visibility(
                                  visible: _progress,
                                  child: const SizedBox(
                                    width: 25,
                                    height: 25,
                                    child: CircularProgressIndicator.adaptive(
                                      strokeWidth: 1,
                                      backgroundColor: Colors.blue,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 5),
                                Text(_progress ? _msjprogress : "Search"),
                              ],
                            ),
                          ),
                          ElevatedButton(
                            onPressed: connected ? disconnect : null,
                            child: const Text("Disconnect"),
                          ),
                          ElevatedButton(
                            onPressed: connected ? printTest : null,
                            child: const Text("Test"),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      child: ListView.builder(
                        itemCount: items.isNotEmpty ? items.length : 0,
                        itemBuilder: (context, index) {
                          return ListTile(
                            onTap: () {
                              String mac = items[index].macAdress;
                              connect(mac);
                            },
                            title: Text('Name: ${items[index].name}'),
                            subtitle: Text(
                              "macAddress: ${items[index].macAdress}",
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            if (connected == true)
              Expanded(
                child: Center(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text("There is a printer connected"),
                      ElevatedButton(
                        onPressed: disconnect,
                        child: const Text("Disconnect"),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  // Future<void> checkPrinterConnection() async {
  //   final bool? isConnected = await PrintBluetoothThermal.connectionStatus;
  //   await PrintBluetoothThermal.pairedBluetooths;
  //   if (isConnected == true && mounted) {
  //     setState(() {
  //       connected = true;
  //     });
  //   }
  // }

  // Future<void> initPlatformState() async {
  //   String platformVersion;
  //   int porcentbatery = 0;

  //   try {
  //     platformVersion = await PrintBluetoothThermal.platformVersion;
  //     porcentbatery = await PrintBluetoothThermal.batteryLevel;
  //   } on PlatformException {
  //     platformVersion = 'Failed to get platform version.';
  //   }

  //   final bool isBtEnabled = await PrintBluetoothThermal.bluetoothEnabled;
  //   await checkPrinterConnection();
  //   if (isBtEnabled) {
  //     _msj = "Bluetooth enabled, checking saved printer...";

  //     // ✅ Try reconnect to saved printer
  //     final prefs = await SharedPreferences.getInstance();
  //     final savedMac = prefs.getString('saved_printer_mac');

  //     if (savedMac != null) {
  //       final bool result = await PrintBluetoothThermal.connect(
  //         macPrinterAddress: savedMac,
  //       );
  //       if (result && mounted) {
  //         setState(() {
  //           connected = true;
  //         });

  //         print("Auto-reconnected to $savedMac");
  //       }
  //     }
  //   } else {
  //     _msj = "Bluetooth not enabled";
  //   }

  //   if (!mounted) return;

  //   setState(() {
  //     _info = "$platformVersion ($porcentbatery% battery)";
  //   });
  // }

  Future<void> initPlatformState() async {
    String platformVersion;
    int porcentbatery = 0;

    try {
      platformVersion = await PrintBluetoothThermal.platformVersion;
      porcentbatery = await PrintBluetoothThermal.batteryLevel;
    } on PlatformException {
      platformVersion = 'Failed to get platform version.';
    }

    final bool isBtEnabled = await PrintBluetoothThermal.bluetoothEnabled;

    if (!mounted) return;

    setState(() {
      _info = "$platformVersion ($porcentbatery% battery)";
      _msj = isBtEnabled
          ? "Bluetooth enabled, checking saved printer..."
          : "Bluetooth not enabled";
    });

    if (!isBtEnabled) return;

    final prefs = await SharedPreferences.getInstance();
    final savedPaperSize = prefs.getString('printer_paper_size');

    if (savedPaperSize != null && mounted) {
      setState(() {
        optionprinttype = savedPaperSize;
      });
    }
    final savedMac = prefs.getString('saved_printer_mac');

    if (savedMac == null || savedMac.isEmpty) {
      return;
    }

    final bool alreadyConnected = await PrintBluetoothThermal.connectionStatus;

    if (alreadyConnected) {
      if (!mounted) return;
      setState(() {
        connected = true;
      });
      return;
    }

    if (!mounted) return;
    setState(() {
      _progress = true;
      _msjprogress = "Connecting...";
    });

    final bool result = await PrintBluetoothThermal.connect(
      macPrinterAddress: savedMac,
    );

    if (!mounted) return;
    setState(() {
      connected = result;
      _progress = false;
      _msj = result
          ? "Printer connected automatically"
          : "Saved printer found but failed to connect";
    });
  }

  Future<void> getBluetoots() async {
    setState(() {
      _progress = true;
      _msjprogress = "Wait";
      items = [];
    });
    final List<BluetoothInfo> listResult =
        await PrintBluetoothThermal.pairedBluetooths;

    setState(() {
      _progress = false;
    });

    if (listResult.length == 0) {
      _msj =
          "There are no bluetoohs linked, go to settings and link the printer";
    } else {
      _msj = "Touch an item in the list to connect";
    }
    generalAlert(title: "Error", message: _msj, function: () {});

    setState(() {
      items = listResult;
    });
  }

  Future<void> connect(String mac) async {
    setState(() {
      _progress = true;
      _msjprogress = "Connecting...";
      connected = false;
    });

    await Future.delayed(const Duration(milliseconds: 800));

    final bool result = await PrintBluetoothThermal.connect(
      macPrinterAddress: mac,
    );

    if (!mounted) return;

    if (result) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('saved_printer_mac', mac);
    }

    setState(() {
      connected = result;
      _progress = false;
      _msj = result ? "Printer connected" : "Failed to connect printer";
    });

    print("result status connect: $result");
  }

  Future<void> disconnect() async {
    final bool status = await PrintBluetoothThermal.disconnect;
    setState(() {
      connected = false;
    });
    print("status disconnect $status");
  }

  Future<void> printTest() async {
    bool conexionStatus = await PrintBluetoothThermal.connectionStatus;
    if (conexionStatus) {
      bool result = false;
      List<int> ticket = await testTicket(
        items: [
          {'name': 'Milk', 'qty': 2, 'price': 50.0},
          {'name': 'Bread', 'qty': 1, 'price': 35.0},
          {'name': 'Eggs', 'qty': 12, 'price': 12.0},
        ],
      );
      result = await PrintBluetoothThermal.writeBytes(ticket);
    } else {
      setState(() {
        disconnect();
      });
    }
  }

  Future<List<int>> testTicket({
    String storeName = "Pointify Limited",
    String phone = "Phone: 0720 044 055",
    String email = "Email: pointifypos@gmail.com",
    String paymentType = "M-Pesa",
    String receiptUrl = "https://pointifypos.com/receipt/INV12345678",
    required List<Map<String, dynamic>> items,
  }) async {
    List<int> bytes = [];

    final profile = await CapabilityProfile.load();
    final generator = Generator(
      optionprinttype == "80 mm" ? PaperSize.mm80 : PaperSize.mm58,
      profile,
    );

    bytes += generator.reset();
    bytes += generator.text(
      storeName,
      styles: const PosStyles(
        align: PosAlign.center,
        bold: true,
        height: PosTextSize.size2,
        width: PosTextSize.size2,
      ),
    );

    bytes += generator.text(
      phone,
      styles: const PosStyles(align: PosAlign.center),
    );
    bytes += generator.text(
      email,
      styles: const PosStyles(align: PosAlign.center),
    );
    bytes += generator.text(
      'Date: ${DateTime.now().toLocal()}',
      styles: const PosStyles(align: PosAlign.center),
    );

    bytes += generator.text(
      'Item        Qty  Price   Total',
      styles: const PosStyles(align: PosAlign.left, bold: true),
    );
    bytes += generator.text(
      optionprinttype == "80 mm" ? '-' * 48 : '-' * 32,
    );
    double subtotal = 0;

    for (var item in items) {
      final name = item['name'] ?? '';
      final qty = item['qty'] ?? 0;
      final price = item['price'] ?? 0.0;
      final total = qty * price;
      subtotal += total;

      if (optionprinttype == "80 mm") {
        final nameStr = name.toString().padRight(20).substring(
              0,
              name.toString().length > 20 ? 20 : name.toString().length,
            );

        final qtyStr = qty.toString().padLeft(4);
        final priceStr = price.toStringAsFixed(2).padLeft(10);
        final totalStr = total.toStringAsFixed(2).padLeft(12);

        final line = '$nameStr$qtyStr$priceStr$totalStr';
        bytes += generator.text(line);
      } else {
        final nameStr = name.toString().padRight(12).substring(
              0,
              name.toString().length > 12 ? 12 : name.toString().length,
            );

        final qtyStr = qty.toString().padLeft(3);
        final priceStr = price.toStringAsFixed(2).padLeft(7);
        final totalStr = total.toStringAsFixed(2).padLeft(10);

        final line = '$nameStr$qtyStr$priceStr$totalStr';
        bytes += generator.text(line);
      }
    }

    bytes += generator.text(
      optionprinttype == "80 mm" ? '-' * 48 : '-' * 32,
    );
    double vat = subtotal * 0.16;
    double totalDue = subtotal + vat;

    bytes += generator.text(
      'Sub Total:     KES${subtotal.toStringAsFixed(2)}',
      styles: const PosStyles(align: PosAlign.right),
    );
    bytes += generator.text(
      'VAT (16%):     KES${vat.toStringAsFixed(2)}',
      styles: const PosStyles(align: PosAlign.right),
    );
    bytes += generator.text(
      'TOTAL: KES${totalDue.toStringAsFixed(2)}',
      styles: const PosStyles(align: PosAlign.right, bold: true),
    );

    bytes += generator.text('Payment: $paymentType');

    // QR Code
    bytes += generator.qrcode(receiptUrl);

    bytes += generator.text(
      'Thank you!',
      styles: const PosStyles(align: PosAlign.center, bold: true),
    );
    bytes += generator.text(
      'System by Pointify,\nwebsite: pointifypos.com',
      styles: const PosStyles(align: PosAlign.center),
    );
    bytes += generator.cut();

    return bytes;
  }
}

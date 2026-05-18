import 'dart:async';

import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/extra_charge.dart';
import 'package:pointify/widgets/alert.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:shared_preferences/shared_preferences.dart';

class PrinterController extends GetxController {
  Future<List<int>> printSalesReceipt({
    String storeName = "",
    String phone = "",
    String customer = "",
    String address = "",
    String currency = "KES",
    String email = "",
    String paybill = "",
    String date = "",
    String paybillAccount = "",
    String paymentType = "",
    String receiptUrl = "",
    bool is80mm = false,
    required List<Map<String, dynamic>> items,
    List<ExtraCharge>? extraCharges,
  }) async {
    List<int> bytes = [];

    final itemWidth = is80mm ? 5 : 6;
    final qtyWidth = 2;
    final priceWidth = is80mm ? 2 : 2;
    final totalWidth = is80mm ? 3 : 2;

    final itemCharLimit = is80mm ? 26 : 18;

    final profile = await CapabilityProfile.load();

    final generator = Generator(
      is80mm ? PaperSize.mm80 : PaperSize.mm58,
      profile,
    );

    bytes += generator.reset();

    // HEADER
    bytes += generator.text(
      storeName.toUpperCase(),
      styles: const PosStyles(
        align: PosAlign.center,
        bold: true,
        height: PosTextSize.size1,
        width: PosTextSize.size1,
      ),
    );

    if (phone.isNotEmpty) {
      bytes += generator.text(
        "Phone: $phone",
        styles: const PosStyles(
          align: PosAlign.center,
        ),
      );
    }

    if (email.isNotEmpty) {
      bytes += generator.text(
        "Email: $email",
        styles: const PosStyles(
          align: PosAlign.center,
        ),
      );
    }

    if (address.isNotEmpty) {
      bytes += generator.text(
        "Location: $address",
        styles: const PosStyles(
          align: PosAlign.center,
        ),
      );
    }

    if (paybill.isNotEmpty && paybillAccount.isNotEmpty) {
      bytes += generator.text(
        'Paybill: $paybill',
        styles: const PosStyles(
          align: PosAlign.center,
        ),
      );
    }

    if (paybill.isNotEmpty && paybillAccount.isEmpty) {
      bytes += generator.text(
        'Till No.: $paybill',
        styles: const PosStyles(
          align: PosAlign.center,
        ),
      );
    }

    if (paybillAccount.isNotEmpty) {
      bytes += generator.text(
        'Account: $paybillAccount',
        styles: const PosStyles(
          align: PosAlign.center,
        ),
      );
    }

    if (customer.isNotEmpty) {
      bytes += generator.text(
        'Customer: $customer',
        styles: const PosStyles(
          align: PosAlign.center,
        ),
      );
    }

    if (date.isNotEmpty) {
      bytes += generator.text(
        'Date: ${DateFormat("MMM dd yyyy hh:mm a").format(DateTime.parse(date).toUtc())}',
        styles: const PosStyles(
          align: PosAlign.center,
        ),
      );
    }

    bytes += generator.feed(1);

    // TABLE HEADER
    bytes += generator.hr(ch: '=');

    bytes += generator.row([
      PosColumn(
        text: "Item",
        width: itemWidth,
        styles: const PosStyles(
          bold: true,
        ),
      ),
      PosColumn(
        text: "Qty",
        width: qtyWidth,
        styles: const PosStyles(
          align: PosAlign.center,
          bold: true,
        ),
      ),
      PosColumn(
        text: "Price",
        width: priceWidth,
        styles: const PosStyles(
          align: PosAlign.right,
          bold: true,
        ),
      ),
      PosColumn(
        text: "Total",
        width: totalWidth,
        styles: const PosStyles(
          align: PosAlign.right,
          bold: true,
        ),
      ),
    ]);

    bytes += generator.hr();

    // ITEMS
    double subtotal = 0;

    for (var item in items) {
      final name = item['name'] ?? '';
      final qty = item['qty'] ?? 0;
      final price = (item['price'] ?? 0).toDouble();
      final total = price * qty;

      subtotal += total;

      bytes += generator.row([
        PosColumn(
          text: name.length > itemCharLimit
              ? name.substring(0, itemCharLimit)
              : name,
          width: itemWidth,
        ),
        PosColumn(
          text: "$qty",
          width: qtyWidth,
          styles: const PosStyles(
            align: PosAlign.center,
          ),
        ),
        PosColumn(
          text: price.toStringAsFixed(0),
          width: priceWidth,
          styles: const PosStyles(
            align: PosAlign.right,
          ),
        ),
        PosColumn(
          text: total.toStringAsFixed(0),
          width: totalWidth,
          styles: const PosStyles(
            align: PosAlign.right,
          ),
        ),
      ]);
    }

    bytes += generator.hr(ch: '=');

    // TOTALS
    double vat = 0;

    double extraChargesTotal = 0;

    if (extraCharges != null && extraCharges.isNotEmpty) {
      extraChargesTotal = extraCharges.fold<double>(
        0,
        (sum, item) => sum + ((item.amount ?? 0).toDouble()),
      );
    }

    double totalDue = subtotal + vat + extraChargesTotal;

    bytes += generator.row([
      PosColumn(
        text: 'Sub Total',
        width: 6,
      ),
      PosColumn(
        text: '$currency ${subtotal.toStringAsFixed(2)}',
        width: 6,
        styles: const PosStyles(
          align: PosAlign.right,
        ),
      ),
    ]);

    bytes += generator.row([
      PosColumn(
        text:
            'VAT (${userController.currentUser.value?.primaryShop?.tax ?? 0}%)',
        width: 6,
      ),
      PosColumn(
        text: '$currency ${vat.toStringAsFixed(2)}',
        width: 6,
        styles: const PosStyles(
          align: PosAlign.right,
        ),
      ),
    ]);

    if (extraCharges != null && extraCharges.isNotEmpty) {
      bytes += generator.feed(1);

      bytes += generator.hr();

      bytes += generator.text(
        'EXTRA CHARGES',
        styles: const PosStyles(
          bold: true,
          align: PosAlign.center,
        ),
      );

      bytes += generator.hr();

      for (final charge in extraCharges) {
        final chargeName = charge.name ?? '';
        final chargeAmount = (charge.amount ?? 0).toDouble();

        bytes += generator.row([
          PosColumn(
            text: chargeName,
            width: 6,
          ),
          PosColumn(
            text: '$currency ${chargeAmount.toStringAsFixed(2)}',
            width: 6,
            styles: const PosStyles(
              align: PosAlign.right,
            ),
          ),
        ]);
      }
      bytes += generator.feed(1);

      bytes += generator.hr(ch: '=');

      bytes += generator.feed(1);
    }
    bytes += generator.row([
      PosColumn(
        text: 'TOTAL',
        width: 5,
        styles: const PosStyles(
          bold: true,
          height: PosTextSize.size2,
          width: PosTextSize.size2,
        ),
      ),
      PosColumn(
        text: '$currency ${totalDue.toStringAsFixed(2)}',
        width: 7,
        styles: const PosStyles(
          align: PosAlign.right,
          bold: true,
          height: PosTextSize.size2,
          width: PosTextSize.size2,
        ),
      ),
    ]);

    bytes += generator.feed(1);

    // PAYMENT
    if (paymentType.isNotEmpty) {
      bytes += generator.text(
        'Payment: $paymentType',
        styles: const PosStyles(
          bold: true,
        ),
      );
    }

    bytes += generator.feed(1);

    // QR
    if (receiptUrl.isNotEmpty) {
      bytes += generator.qrcode(
        receiptUrl,
        size: is80mm ? QRSize.size4 : QRSize.size2,
        cor: QRCorrection.H,
      );
    }

    bytes += generator.feed(1);

    // FOOTER
    bytes += generator.text(
      'Thank you!',
      styles: const PosStyles(
        align: PosAlign.center,
        bold: true,
      ),
    );

    bytes += generator.text(
      'System by Pointify',
      styles: const PosStyles(
        align: PosAlign.center,
      ),
    );

    bytes += generator.text(
      'pointifypos.com',
      styles: const PosStyles(
        align: PosAlign.center,
      ),
    );

    bytes += generator.feed(3);

    bytes += generator.cut();

    return bytes;
  }

  Future<bool> ensurePrinterConnected() async {
    try {
      final bool isConnected = await PrintBluetoothThermal.connectionStatus;

      if (isConnected) {
        return true;
      }

      final prefs = await SharedPreferences.getInstance();
      final savedMac = prefs.getString('saved_printer_mac');

      if (savedMac == null || savedMac.isEmpty) {
        return false;
      }

      final bool result = await PrintBluetoothThermal.connect(
        macPrinterAddress: savedMac,
      );

      return result;
    } catch (e) {
      return false;
    }
  }

  Future<bool> printIosBleBytes(List<int> bytes) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedId = prefs.getString("ios_ble_printer_id");

      if (savedId == null || savedId.isEmpty) {
        generalAlert(
          title: "Printer Error",
          message:
              "No iPhone printer saved. Go to printer setup and connect first.",
          function: () {},
        );
        return false;
      }

      final device = BluetoothDevice.fromId(savedId);

      await device.connect(
        license: License.free,
        timeout: const Duration(seconds: 12),
        autoConnect: false,
      );

      final services = await device.discoverServices();

      BluetoothCharacteristic? writeChar;

      for (final service in services) {
        for (final c in service.characteristics) {
          if (c.properties.write || c.properties.writeWithoutResponse) {
            writeChar = c;
            break;
          }
        }
        if (writeChar != null) break;
      }

      if (writeChar == null) {
        generalAlert(
          title: "Printer Error",
          message: "Printer connected but no writable channel found.",
          function: () {},
        );
        return false;
      }

      const int chunkSize = 180;

      for (int i = 0; i < bytes.length; i += chunkSize) {
        final chunk = bytes.sublist(
          i,
          i + chunkSize > bytes.length ? bytes.length : i + chunkSize,
        );

        await writeChar.write(
          chunk,
          withoutResponse: writeChar.properties.writeWithoutResponse,
        );

        await Future.delayed(const Duration(milliseconds: 40));
      }

      await Future.delayed(const Duration(milliseconds: 500));
      await device.disconnect();

      return true;
    } catch (e) {
      print("iOS BLE print failed: $e");
      generalAlert(
        title: "Printer Error",
        message: "iPhone printer failed: $e",
        function: () {},
      );
      return false;
    }
  }
}

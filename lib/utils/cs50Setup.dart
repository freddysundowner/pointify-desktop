import 'dart:io';

import 'package:cs50sdkupdate/cs50sdkupdate.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/utils/app_config.dart';

import '../functions/functions.dart';
import '../main.dart';
import '../models/salemodel.dart';
import 'constants.dart';

class Cs50PrinterSetup {
  final _cs50sdkupdatePlugin = Cs50sdkupdate();

  Future<void> _initPrinter() async {
    try {
      await _cs50sdkupdatePlugin.printInit();
    } catch (e) {}
  }

  Future<void> _printText(String str) async {
    try {
      await _cs50sdkupdatePlugin.printStr('$str\n');
    } catch (e) {
      _showSnackBar('Failed to print text: $e');
    }
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(Get.context!).showSnackBar(SnackBar(
      content: Text(message),
      duration: const Duration(seconds: 3),
    ));
  }

  Future<void> _printQRCode(text) async {
    try {
      await _cs50sdkupdatePlugin.printQrCode(text, 200, 200, 'QR_CODE');
    } catch (e) {
      _showSnackBar('Failed to print QR Code: $e');
    }
  }

  // 👉 ADD helper for formatting columns
  String col(String text, int width, {bool rightAlign = false}) {
    if (text.length > width) {
      return text.substring(0, width - 1) + " ";
    }
    return rightAlign ? text.padLeft(width) : text.padRight(width);
  }

  // print one structure
  Future<void> printReceipt(
      {required SaleModel saleModel, String? receiptTitle}) async {
    await _initPrinter();

    await _cs50sdkupdatePlugin.printSetAlign(1);
    await _printText(receiptTitle ?? "Cash Receipt");
    await _printText(
      userController.currentUser.value?.primaryShop?.name ?? "Pointify",
    );
    await _printText("Phone No: ${saleModel.shopId?.owner?.phone ?? "000000"}");
    await _printText(
        "Email: ${saleModel.shopId?.owner?.email ?? "email@email.com"}");
    if (saleModel.shopId?.owner?.primaryShop?.paybillAccount != null) {
      await _printText(
          "A/C: ${saleModel.shopId?.owner?.primaryShop?.paybillAccount}");
      await _printText(
          "Paybill: ${saleModel.shopId?.owner?.primaryShop?.paybillTill}");
    } else if (saleModel.shopId?.owner?.primaryShop?.paybillTill != null) {
      await _printText(
          "Till Number: ${saleModel.shopId?.owner?.primaryShop?.paybillTill}");
    }
    await _printText("Receipt No: ${saleModel.receiptNo ?? "000000"}");
    await _printText(
        "Date: ${DateFormat("MMM dd yyyy hh:mm a").format(DateTime.parse(saleModel.createdAt ?? "0000-00-00 00:00:00").toUtc())} ");
    if (saleModel.customerId?.name != null) {
      await _printText("Customer: ${saleModel.customerId?.name}");
    }

    await _printText(" ");
    await _printText(" ");

    // 👉 NEW aligned columns
    const int productWidth = 16;
    const int qtyWidth = 8;
    const int priceWidth = 8;

    String header = col("Product", productWidth) +
        col("Qty", qtyWidth, rightAlign: true) +
        col("Price", priceWidth, rightAlign: true);
    await _cs50sdkupdatePlugin.printStr(header);
    await _cs50sdkupdatePlugin
        .printStr('-' * (productWidth + qtyWidth + priceWidth));

    for (var item in saleModel.items ?? []) {
      String product = col(item.product?.name ?? "", productWidth);
      String qty = col(item.quantity.toString(), qtyWidth, rightAlign: true);
      String price =
          col(item.totalLinePrice.toString(), priceWidth, rightAlign: true);

      await _cs50sdkupdatePlugin.printStr('$product$qty$price');
    }

    await _cs50sdkupdatePlugin.printSetAlign(0);
    await _cs50sdkupdatePlugin.printSetAlign(2);
    await _printText(" ");
    await _printText(" ");
    await _printText("Sub total:".padRight(32 - 10) +
        htmlPrice(saleModel.totalAmount).padLeft(10));
    await _printText("Discount:".padRight(32 - 10) +
        htmlPrice(saleModel.totalDiscount).padLeft(10));
    await _printText(
        "Tax:".padRight(32 - 10) + htmlPrice(saleModel.totaltax).padLeft(10));
    await _printText("Total:".padRight(32 - 10) +
        htmlPrice(saleModel.totalWithDiscount).padLeft(10));
    await _printText(" ");
    await _printText(" ");
    await _cs50sdkupdatePlugin.printSetAlign(1);
    String url = "";
    if (Platform.isAndroid) {
      url = AppConfig.androidLink;
    } else if (Platform.isIOS) {
      url = AppConfig.iosLink;
    }
    if (url != "") {
      await _printQRCode(url);
    }
    await _printText("Paid by: ${saleModel.paymentType?.toUpperCase()}");
    await _printText("Served By: ${saleModel.attendant?.username ?? "admin"}");
    await _printText("Thank you for shopping with us");
    await _printText("Powered by Pointify POS");
    await _printText("contacts  ${settingsData["contact"]}");
    await _printText(" ");
    await _printText(" ");
    await _printText(" ");
    await _printText(" ");
    await _cs50sdkupdatePlugin.printStart();
  }
}

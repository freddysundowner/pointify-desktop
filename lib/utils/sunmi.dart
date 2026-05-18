import 'dart:io';

import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/salemodel.dart';
import 'package:pointify/utils/app_config.dart';
import 'package:sunmi_printer_plus/column_maker.dart';
import 'package:sunmi_printer_plus/enums.dart';
import 'package:sunmi_printer_plus/sunmi_printer_plus.dart';
import 'package:sunmi_printer_plus/sunmi_style.dart';

import 'constants.dart';

class Sunmi {
  // initialize sunmi printer
  Future<void> initialize() async {
    await SunmiPrinter.bindingPrinter();
    await SunmiPrinter.initPrinter();
    await SunmiPrinter.setAlignment(SunmiPrintAlign.CENTER);
  }

  // print image
  Future<void> printLogoImage() async {
    await SunmiPrinter.lineWrap(1); // creates one line space
    Uint8List byte = await _getImageFromAsset('assets/flutter_black_white.png');
    await SunmiPrinter.printImage(byte);
    await SunmiPrinter.lineWrap(1); // creates one line space
  }

  Future<Uint8List> readFileBytes(String path) async {
    ByteData fileData = await rootBundle.load(path);
    Uint8List fileUnit8List = fileData.buffer
        .asUint8List(fileData.offsetInBytes, fileData.lengthInBytes);
    return fileUnit8List;
  }

  Future<Uint8List> _getImageFromAsset(String iconPath) async {
    return await readFileBytes(iconPath);
  }

  // print text passed as parameter
  Future<void> printText(String text) async {
    await SunmiPrinter.printText(text,
        style: SunmiStyle(
          fontSize: SunmiFontSize.MD,
          bold: true,
          align: SunmiPrintAlign.CENTER,
        ));
  }

  // print text as qrcode
  Future<void> printQRCode(String text) async {
    // set alignment center
    await SunmiPrinter.setAlignment(SunmiPrintAlign.CENTER);
    await SunmiPrinter.lineWrap(1); // creates one line space
    await SunmiPrinter.printQRCode(text);
  }

  // print row and 2 columns
  Future<void> printRowAndColumns(
      {String? column1 = "column 1",
      String? column2 = "column 2",
      String? column3 = "column 3"}) async {
    await SunmiPrinter.setAlignment(SunmiPrintAlign.CENTER);
    await SunmiPrinter.printRow(cols: [
      ColumnMaker(
        text: "$column1",
        width: 10,
        align: SunmiPrintAlign.LEFT,
      ),
      ColumnMaker(
        text: "$column2",
        width: 10,
        align: SunmiPrintAlign.CENTER,
      ),
      ColumnMaker(
        text: "$column3",
        width: 10,
        align: SunmiPrintAlign.RIGHT,
      ),
    ]);
    // await SunmiPrinter.lineWrap(1); // creates one line space
  }

  /* its important to close the connection with the printer once you are done */
  Future<void> closePrinter() async {
    await SunmiPrinter.unbindingPrinter();
  }

  // print one structure
  Future<void> printReceipt(
      {required SaleModel saleModel, String? receiptTitle}) async {
    await initialize();
    await SunmiPrinter.lineWrap(1);
    await SunmiPrinter.lineWrap(1);
    await SunmiPrinter.printText(receiptTitle ?? "Pointify Receipt",
        style: SunmiStyle(
          fontSize: SunmiFontSize.XL,
          bold: true,
          align: SunmiPrintAlign.CENTER,
        ));
    await SunmiPrinter.printText(
        userController.currentUser.value?.primaryShop?.name ?? "Pointify",
        style: SunmiStyle(
          fontSize: SunmiFontSize.LG,
          bold: true,
          align: SunmiPrintAlign.CENTER,
        ));
    if (saleModel.shopId?.owner?.primaryShop?.contact != null) {
      await printText(
          "Phone No: ${saleModel.shopId?.owner?.primaryShop?.contact}");
    } else {
      await printText(
          "Phone No: ${saleModel.shopId?.owner?.phone ?? "000000"}");
    }
    if (saleModel.shopId?.owner?.primaryShop?.receiptemail != null) {
      await printText(
          "Email: ${saleModel.shopId?.owner?.primaryShop?.receiptemail}");
    }
    if (saleModel.shopId?.owner?.primaryShop?.paybillAccount != null) {
      await printText(
          "A/C: ${saleModel.shopId?.owner?.primaryShop?.paybillAccount}");
      await printText(
          "Paybill: ${saleModel.shopId?.owner?.primaryShop?.paybillTill}");
    } else if (saleModel.shopId?.owner?.primaryShop?.paybillTill != null) {
      await printText(
          "Till Number: ${saleModel.shopId?.owner?.primaryShop?.paybillTill}");
    }
    await printText("Receipt No: ${saleModel.receiptNo}");
    await printText(
        "Date: ${DateFormat("MMM dd yyyy hh:mm a").format(DateTime.parse(saleModel.createdAt ?? "0000-00-00 00:00:00").toLocal())} ");
    if (saleModel.customerId?.name != null) {
      await printText("Customer: ${saleModel.customerId?.name}");
    }
    await printText("Served By: ${saleModel.attendant?.username}");

    await SunmiPrinter.lineWrap(1);

    await printRowAndColumns(
        column1: "Product", column2: "Quantity", column3: "Price");
    for (var item in saleModel.items!) {
      await printRowAndColumns(
          column1: "${item.product?.name} - ${item.product?.measureUnit}",
          column2: "${item.quantity.toString()} x ${item.unitPrice.toString()}",
          column3: htmlPrice(item.totalLinePrice.toString()));
    }
    await SunmiPrinter.lineWrap(1);
    await SunmiPrinter.line(ch: '-');
    await printRowAndColumns(
        column1: "Sub total",
        column2: "",
        column3: htmlPrice(saleModel.totalAmount));
    await printRowAndColumns(
        column1: "Discount",
        column2: "",
        column3: htmlPrice(saleModel.totalDiscount));
    if (saleModel.totaltax != null) {
      await printRowAndColumns(
          column1: "Tax", column2: "", column3: htmlPrice(saleModel.totaltax));
    }
    if (saleModel.paymentTag == "split" && saleModel.amountPaid! > 0) {
      await printRowAndColumns(
          column1: "Cash",
          column2: "",
          column3: htmlPrice(saleModel.totalAmount));
    }
    if (saleModel.paymentTag == "split" && saleModel.mpesatotal! > 0) {
      await printRowAndColumns(
          column1: "Mpesa",
          column2: "",
          column3: htmlPrice(saleModel.mpesatotal));
    }
    if (saleModel.paymentTag == "split" && saleModel.banktotal! > 0) {
      await printRowAndColumns(
          column1: "Bank",
          column2: "",
          column3: htmlPrice(saleModel.banktotal));
    }

    await SunmiPrinter.line(ch: '-');
    await printRowAndColumns(
        column1: "Total",
        column2: "",
        column3: htmlPrice(saleModel.totalWithDiscount));
    await SunmiPrinter.line(ch: '-');
    String url = "";
    if (Platform.isAndroid) {
      url = AppConfig.androidLink;
    } else if (Platform.isIOS) {
      url = AppConfig.iosLink;
    }
    if (url != "") {
      await printQRCode(url);
    }
    await SunmiPrinter.lineWrap(1); // creates one line space
    await printText(
        "Paid by: ${saleModel.paymentTag?.toUpperCase() ?? saleModel.paymentType?.toUpperCase()}");
    await SunmiPrinter.lineWrap(1); // creates one line space
    await SunmiPrinter.printText("Thank you for shopping with us");
    await printText("Powered by Pointify POS");
    await SunmiPrinter.lineWrap(1);
    await SunmiPrinter.lineWrap(1);
    await SunmiPrinter.lineWrap(1);
    await SunmiPrinter.cut();
    await SunmiPrinter.submitTransactionPrint();
    await closePrinter();
  }
}

import 'dart:typed_data';

import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart';
import 'package:pointify/controllers/salescontroller.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/shop.dart';

import '../../../../controllers/reports_controller.dart';

Future<Uint8List> salesReportPdf(String printby, String type) async {
  Shop shop = userController.currentUser.value!.primaryShop!;
  ReportsController reportsController = Get.find<ReportsController>();
  SalesController salesController = Get.find<SalesController>();
  final pdf = Document();
  pdf.addPage(
    Page(
      pageFormat: PdfPageFormat.a4,
      build: (context) {
        return Container(
          padding: const EdgeInsets.all(10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(shop.name!.toUpperCase(),
                  style: TextStyle(fontSize: 21, fontWeight: FontWeight.bold)),
              Text(shop.location ?? "",
                  style: const TextStyle(fontSize: 13),
                  softWrap: true,
                  maxLines: 2),
              SizedBox(height: 10),
              Text(
                  "Between ${reportsController.filterStartDate.value} and ${reportsController.filterEndDate.value}",
                  style: const TextStyle(fontSize: 13)),
              SizedBox(height: 20),
              Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Center(
                        child: Text(type,
                            style: TextStyle(
                                fontSize: 26, fontWeight: FontWeight.bold),
                            textAlign: TextAlign.center)),
                  ]),
              SizedBox(height: 20),
              if (printby == "dues")
                TableHelper.fromTextArray(
                    border: TableBorder.all(width: 1), //table border
                    headers: [
                      "Receipt No",
                      "Date Due",
                      "Total",
                      "Dues",
                    ],
                    data: salesController.allSales
                        .map((e) => [
                              e.receiptNo,
                              DateFormat("MMM dd yyyy")
                                  .format(DateTime.parse(e.dueDate!)),
                              htmlPrice(e.totalAmount),
                              htmlPrice(e.outstandingBalance),
                            ])
                        .toList()),
              if (printby == "receipts")
                TableHelper.fromTextArray(
                    border: TableBorder.all(width: 1), //table border
                    headers: [
                      "Receipt No",
                      "Count",
                      "Cashier",
                      "Total",
                    ],
                    data: salesController.allSales
                        .map((e) => [
                              e.receiptNo,
                              e.items!.fold(
                                  0.0,
                                  (previousValue, element) =>
                                      previousValue + element.quantity!),
                              e.attendant!.username,
                              htmlPrice(e.totalAmount! * e.items!.length),
                            ])
                        .toList()),
              if (printby == "products")
                TableHelper.fromTextArray(
                    border: TableBorder.all(width: 1), //table border
                    headers: [
                      "Product Name",
                      "Qty",
                      "Unit Price",
                      "Total",
                    ],
                    data: salesController.productSales
                        .map((e) => [
                              e?.product?.name,
                              e?.quantity,
                              e?.unitPrice,
                              htmlPrice(e!.unitPrice! * e.quantity!),
                            ])
                        .toList()),
              SizedBox(height: 10),
              Align(
                alignment: Alignment.topRight,
                child: SizedBox(
                    width: 200,
                    child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          if (printby == "receipts")
                            Text(
                              "Mpesa ${htmlPrice(salesController.cashsalesfilterTotals['mpesa'] ?? 0.0)}",
                              style: TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                          if (printby == "receipts")
                            Text(
                              "Bank ${htmlPrice(salesController.cashsalesfilterTotals['bank'] ?? 0.0)}",
                              style: TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                          if (printby == "receipts")
                            Text(
                              "Cash ${htmlPrice(salesController.cashsalesfilterTotals['cash'] ?? 0.0)}",
                              style: TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                          Divider(
                              thickness: 1,
                              color: const PdfColor.fromInt(0xFF000000)),
                          if (printby == "receipts")
                            Text(
                              "Totals ${htmlPrice(salesController.allSales.fold(0.0, (previousValue, element) => previousValue + element.totalAmount!))}",
                              style: TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                          if (printby == "products")
                            Text(
                              "Totals ${htmlPrice(salesController.productSales.fold(0.0, (previousValue, element) => previousValue + (element!.unitPrice! * element.quantity!)))}",
                              style: TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                          Divider(
                              thickness: 1,
                              color: const PdfColor.fromInt(0xFF000000))
                        ])),
              ),
              SizedBox(height: 10),
              Text(
                  "Printed by : ${userController.currentUser.value!.username ?? ""}"),
              Spacer(),
              Align(
                  alignment: Alignment.center,
                  child:
                      Text("Thank you!", style: const TextStyle(fontSize: 28)))
            ],
          ),
        );
      },
    ),
  );
  return pdf.save();
}

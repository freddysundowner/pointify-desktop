import 'dart:typed_data';

import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:pointify/functions/functions.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/shop.dart';

import '../../../../controllers/reports_controller.dart';

Future<Uint8List> ProductsalesReportPdf(String printby, String type) async {
  Shop shop = userController.currentUser.value!.primaryShop!;
  ReportsController reportsController = Get.find<ReportsController>();
  final pdf = pw.Document();

  // Pagination setup
  const int rowsPerPage = 25;
  final dataChunks = List.generate(
    (reportsController.productsReportFiltered.length / rowsPerPage).ceil(),
    (index) => reportsController.productsReportFiltered
        .skip(index * rowsPerPage)
        .take(rowsPerPage)
        .toList(),
  );

  for (var chunk in dataChunks) {
    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(10),
        build: (context) => [
          pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              pw.Text(shop.name!.toUpperCase(),
                  style: pw.TextStyle(
                      fontSize: 21, fontWeight: pw.FontWeight.bold)),
              pw.Text(shop.location ?? "", style: pw.TextStyle(fontSize: 13)),
              pw.SizedBox(height: 10),
              pw.Text(
                "Between ${reportsController.filterStartDate.value} and ${reportsController.filterEndDate.value}",
                style: pw.TextStyle(fontSize: 13),
              ),
              pw.SizedBox(height: 20),
              pw.Center(
                child: pw.Text(type,
                    style: pw.TextStyle(
                        fontSize: 26, fontWeight: pw.FontWeight.bold)),
              ),
              pw.SizedBox(height: 20),
              pw.Table.fromTextArray(
                border: pw.TableBorder.all(width: 1),
                headers: ["Receipt No", "Date", "Sale", "Total"],
                data: chunk
                    .map((e) => [
                          e.receiptNo,
                          DateFormat("MMM dd yyyy HH:mm")
                              .format(DateTime.parse(e.createdAt!)),
                          '${e.quantity!} x ${e.unitPrice!}',
                          htmlPrice(e.totalLinePrice?.toStringAsFixed(2)),
                        ])
                    .toList(),
              ),
              pw.SizedBox(height: 10),
              pw.Align(
                alignment: pw.Alignment.topRight,
                child: pw.SizedBox(
                  width: 200,
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      if (printby == "receipts")
                        pw.Text(
                          "Mpesa ${htmlPrice(reportsController.filterPaymentTypeTotals['mpesa'] ?? 0.0)}",
                          style: pw.TextStyle(
                              fontWeight: pw.FontWeight.bold, fontSize: 16),
                        ),
                      if (printby == "receipts")
                        pw.Text(
                          "Bank ${htmlPrice(reportsController.filterPaymentTypeTotals['bank'] ?? 0.0)}",
                          style: pw.TextStyle(
                              fontWeight: pw.FontWeight.bold, fontSize: 16),
                        ),
                      if (printby == "receipts")
                        pw.Text(
                          "Cash ${htmlPrice(reportsController.filterPaymentTypeTotals['cash'] ?? 0.0)}",
                          style: pw.TextStyle(
                              fontWeight: pw.FontWeight.bold, fontSize: 16),
                        ),
                      pw.Divider(),
                      pw.Text(
                        "Totals ${htmlPrice(printby == "receipts" ? reportsController.productsReport.fold(0.0, (prev, el) => prev + double.parse(el.totalLinePrice!.toStringAsFixed(2))) : reportsController.productsReport.fold(0.0, (prev, el) => prev + (double.parse(el.unitPrice!.toStringAsFixed(2)) * el.quantity!)))}",
                        style: pw.TextStyle(
                            fontWeight: pw.FontWeight.bold, fontSize: 16),
                      ),
                      pw.Divider(),
                    ],
                  ),
                ),
              ),
              pw.SizedBox(height: 10),
              pw.Text(
                  "Printed by : ${userController.currentUser.value!.username ?? ""}"),
              pw.SizedBox(height: 20),
              pw.Center(
                child: pw.Text("Thank you!", style: pw.TextStyle(fontSize: 28)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  return pdf.save();
}

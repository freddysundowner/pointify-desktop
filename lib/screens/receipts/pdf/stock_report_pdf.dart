import 'dart:typed_data';

import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:pointify/functions/functions.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/shop.dart';
import 'package:pointify/models/stockreport.dart';

Future<Uint8List> stockReportPdf(
  List<StockReport> stockReports,
  String type,
) async {
  Shop shop = userController.currentUser.value!.primaryShop!;
  final pdf = pw.Document();

  pdf.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(10),
      build:
          (context) => [
            pw.Center(
              child: pw.Column(
                children: [
                  pw.Text(shop.name ?? "", style: pw.TextStyle(fontSize: 21)),
                  pw.Text(
                    shop.location ?? "",
                    style: pw.TextStyle(fontSize: 21),
                  ),
                  pw.SizedBox(height: 10),
                  pw.Text(
                    type,
                    style: pw.TextStyle(
                      fontSize: 26,
                      fontWeight: pw.FontWeight.bold,
                    ),
                  ),
                  pw.SizedBox(height: 5),
                  pw.Text(
                    "ON ${DateFormat("yyyy-MM-dd").format(DateTime.now().toLocal())}",
                  ),
                  pw.SizedBox(height: 20),
                ],
              ),
            ),
            pw.Table.fromTextArray(
              border: pw.TableBorder.all(width: 1),
              headers: ["Product", "Sold", "Remaining", "Sales", "Profit"],
              data:
                  stockReports
                      .map(
                        (e) => [
                          e.name!,
                          e.totalSoldQuantity.toString(),
                          e.inStockQuantity.toString(),
                          htmlPrice(e.totalSales),
                          htmlPrice(e.totalProfit),
                        ],
                      )
                      .toList(),
            ),
            pw.SizedBox(height: 10),
            pw.Align(
              alignment: pw.Alignment.centerRight,
              child: pw.Container(
                width: 200,
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.end,
                  children: [
                    pw.Text(
                      "Total Sold ${htmlPrice(stockReports.fold(0.0, (prev, e) => prev + e.totalSales!))}",
                      style: pw.TextStyle(
                        fontSize: 16,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                    pw.Divider(thickness: 1, color: PdfColors.black),
                    pw.Text(
                      "Total Profit ${htmlPrice(stockReports.fold(0.0, (prev, e) => prev + e.totalProfit!))}",
                      style: pw.TextStyle(
                        fontSize: 16,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                    pw.Divider(thickness: 1, color: PdfColors.black),
                  ],
                ),
              ),
            ),
            pw.SizedBox(height: 10),
            pw.Text(
              "Printed by : ${userController.currentUser.value!.username ?? ""}",
            ),
            pw.SizedBox(height: 20),
            pw.Center(
              child: pw.Text("Thank you!", style: pw.TextStyle(fontSize: 28)),
            ),
          ],
    ),
  );

  return pdf.save();
}

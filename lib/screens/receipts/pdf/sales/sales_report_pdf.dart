import 'dart:typed_data';

import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart';
import 'package:pointify/controllers/salescontroller.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/saleitem.dart';
import 'package:pointify/models/shop.dart';

import '../../../../controllers/reports_controller.dart';

Future<Uint8List> allSalesReportPdf(String printby, String type) async {
  Shop shop = userController.currentUser.value!.primaryShop!;
  ReportsController reportsController = Get.find<ReportsController>();
  SalesController salesController = Get.find<SalesController>();
  final pdf = Document();

  // Collect all sale items
  List<SaleItem> sales = [];
  for (var element in salesController.allSales) {
    sales.addAll(element.items!);
  }

  pdf.addPage(
    MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const EdgeInsets.all(10),
      header: (context) => Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            shop.name!.toUpperCase(),
            style: TextStyle(fontSize: 21, fontWeight: FontWeight.bold),
          ),
          Text(
            shop.location ?? "",
            style: const TextStyle(fontSize: 13),
            softWrap: true,
            maxLines: 2,
          ),
          SizedBox(height: 10),
          Text(
            "Between ${reportsController.filterStartDate.value} and ${reportsController.filterEndDate.value}",
            style: const TextStyle(fontSize: 13),
          ),
          SizedBox(height: 10),
          Text(
            type,
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
        ],
      ),
      build: (context) => [
        Table.fromTextArray(
          border: TableBorder.all(width: 1), // Table border
          headers: [
            "Product",
            "Cost",
            "Date",
            "Total",
          ],
          data: sales.map((e) {
            return [
              e.product?.name ?? "N/A",
              e.unitPrice.toString(),
              DateFormat('yyyy-MM-dd hh:mm')
                  .format(DateTime.parse(e.createdAt!)),
              htmlPrice(e.totalLinePrice),
            ];
          }).toList(),
        ),
      ],
      footer: (context) => Text(
        "Printed by: $printby",
        style: const TextStyle(fontSize: 12),
        textAlign: TextAlign.right,
      ),
    ),
  );

  return pdf.save();
}

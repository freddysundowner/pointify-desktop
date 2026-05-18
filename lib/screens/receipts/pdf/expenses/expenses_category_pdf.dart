import 'dart:typed_data';

import 'package:get/get.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/shop.dart';

import '../../../../controllers/reports_controller.dart';
import '../../../../models/expensecategory.dart';

Future<Uint8List> expensesCategoryPdf(
    List<ExpenseCategory> expenses, type) async {
  Shop shop = userController.currentUser.value!.primaryShop!;
  ReportsController reportsController = Get.find<ReportsController>();
  final pdf = Document();

  // Splitting table rows if they exceed one page
  final tableHeaders = ["Category", "Amount"];
  final tableData = expenses
      .map((e) => [
            e.name,
            htmlPrice(e.totalAmount),
          ])
      .toList();

  pdf.addPage(
    MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const EdgeInsets.all(10),
      build: (context) => [
        Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Text("Shop : ${shop.name!}", style: const TextStyle(fontSize: 14)),
            Text("Address: ${shop.location ?? ""}",
                style: const TextStyle(fontSize: 14)),
            SizedBox(height: 10),
            Text(
              type,
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 10),
            Text(
              "Between ${reportsController.filterStartDate.value} and ${reportsController.filterEndDate.value}",
            ),
            SizedBox(height: 20),
          ],
        ),
        Row(children: [
          Text(
              "Printed by : ${userController.currentUser.value!.username ?? ""}"),
          SizedBox(height: 20),
          Align(
            alignment: Alignment.topRight,
            child: Text(
              "Totals ${htmlPrice(expenses.fold(0, (previousValue, element) => previousValue + element.totalAmount!))}",
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
          )
        ], mainAxisAlignment: MainAxisAlignment.spaceBetween),
        SizedBox(height: 10),
        Table.fromTextArray(
          border: TableBorder.all(width: 1),
          headers: tableHeaders,
          data: tableData,
        ),
      ],
    ),
  );

  return pdf.save();
}

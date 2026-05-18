import 'dart:typed_data';

import 'package:get/get.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/shop.dart';

import '../../../../controllers/reports_controller.dart';
import '../../../../models/productcount.dart';

Future<Uint8List> salesTakeReportPdf(
    List<Item> productsCount, String type) async {
  Shop shop = userController.currentUser.value!.primaryShop!;
  ReportsController reportsController = Get.find<ReportsController>();
  final pdf = Document();

  pdf.addPage(
    MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const EdgeInsets.all(20),
      build: (context) => [
        Container(
          padding: const EdgeInsets.all(10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Text(" ${shop.name!}",
                          style: const TextStyle(fontSize: 21)),
                      Text(" ${shop.location ?? ""}",
                          style: const TextStyle(fontSize: 21)),
                    ],
                  ),
                ],
              ),
              SizedBox(height: 10),
              Center(
                child: Text(
                  type,
                  style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
              ),
              SizedBox(height: 10),
              Text(
                "Between ${reportsController.filterStartDate.value} and ${reportsController.filterEndDate.value}",
              ),
              SizedBox(height: 20),
            ],
          ),
        ),
        Table.fromTextArray(
          border: TableBorder.all(width: 1), // Table border
          headers: ["Item", "System Count", "Physical Count", "Variance"],
          data: productsCount
              .map((e) => [
                    e.name!,
                    e.initialCount!.toString(),
                    e.physicalCount!.toString(),
                    e.physicalCount! - e.initialCount! > 0
                        ? "+${e.variance!}"
                        : "-${e.variance!}",
                  ])
              .toList(),
        ),
        SizedBox(height: 10),
        Text("Printed by: ${userController.currentUser.value!.username ?? ""}"),
        Align(
          alignment: Alignment.center,
          child: Text("Thank you!", style: const TextStyle(fontSize: 28)),
        ),
      ],
    ),
  );

  return pdf.save();
}

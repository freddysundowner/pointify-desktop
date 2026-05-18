import 'dart:typed_data';

import 'package:get/get.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/shop.dart';

import '../../../../controllers/reports_controller.dart';
import '../../../../models/analysis.dart';

Future<Uint8List> netprofitPdf(Analysis analysis, type) async {
  Shop shop = userController.currentUser.value!.primaryShop!;
  ReportsController reportsController = Get.find<ReportsController>();
  final pdf = Document();
  pdf.addPage(
    Page(
      pageFormat: PdfPageFormat.a4,
      build: (context) {
        return Container(
          padding: const EdgeInsets.all(10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    children: [
                      Text(shop.name!,
                          style: const TextStyle(fontSize: 21)),
                      Text(" ${shop.location ?? ""}",
                          style: const TextStyle(fontSize: 21))
                    ],
                    crossAxisAlignment: CrossAxisAlignment.center,
                  ),
                ],
              ),
              Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Center(
                        child: Text(type,
                            style: TextStyle(
                                fontSize: 26, fontWeight: FontWeight.bold),
                            textAlign: TextAlign.center)),
                    SizedBox(height: 10),
                    Text(
                      "Between ${reportsController.filterStartDate.value} and ${reportsController.filterEndDate.value}",
                    ),
                  ]),
              SizedBox(height: 10),
              Align(
                alignment: Alignment.center,
                child: SizedBox(
                    width: 200,
                    child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Text(
                            "Net Profit ${htmlPrice(analysis.net + analysis.totalTaxes)}",
                            style: TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          Text(
                            "After Taxes ${htmlPrice(analysis.net)}",
                            style: const TextStyle(
                                fontSize: 12,
                                color: PdfColor.fromInt(0xFFC62828)),
                          ),
                          Divider(
                              thickness: 1,
                              color: const PdfColor.fromInt(0xFF000000))
                        ])),
              ),
              SizedBox(height: 20),
              Expanded(
                  child: TableHelper.fromTextArray(
                      border: TableBorder.all(width: 1), //table border
                      headers: [
                    "Item",
                    "Description",
                    "Amount",
                  ],
                      data: [
                    [
                      "Profit on  sales",
                      "profit generated from sales",
                      htmlPrice(analysis.gross),
                    ],
                    [
                      "Taxable Sales",
                      "taxes",
                      htmlPrice(analysis.totalTaxes),
                    ],
                    [
                      "Exenses",
                      "All expeses",
                      htmlPrice(analysis.totalExpenses),
                    ]
                  ])),
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

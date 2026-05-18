import 'dart:typed_data';

import 'package:get/get.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/shop.dart';
import 'package:pointify/models/wahoureinvoice.dart';

import '../../../../controllers/reports_controller.dart';

Future<Uint8List> warehouseRequestsReportPdf(String printby, String type,
    List<WareHouseInvoice> warehouseInvoices) async {
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
              //   TableHelper.fromTextArray(
              //       border: TableBorder.all(width: 1), //table border
              //       headers: [
              //         "Invoice No",
              //         "Status",
              //         "Item",
              //         "Quantity",
              //       ],
              //       data: warehouseInvoices
              //           .map((e) => [
              //                 "",
              //                 e?.inventory?["status"] ?? "",
              //                 e.product?['name'],
              //                 // e?.quantity,
              //                 // e?.unitPrice,
              //                 // htmlPrice(e!.unitPrice! * e.quantity!),
              //               ])
              //           .toList()),
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

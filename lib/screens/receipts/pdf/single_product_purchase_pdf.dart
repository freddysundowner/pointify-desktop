import 'dart:typed_data';

import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/shop.dart';

import '../../../models/invoice.dart';

Future<Uint8List> singleProductStockPurchases(
    List<InvoiceItem> invoiceItem, type) async {
  Shop shop = userController.currentUser.value!.primaryShop!;
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
                      Text(" ${shop.name!}",
                          style: const TextStyle(fontSize: 21)),
                      Text(shop.location ?? "",
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
                      "As of ${DateFormat("yyyy-MM-dd").format(DateTime.now().toLocal())}",
                    ),
                  ]),
              SizedBox(height: 20),
              TableHelper.fromTextArray(
                  border: TableBorder.all(width: 1), //table border
                  headers: [
                    "Qty",
                    "Date",
                    "by",
                    "Unit Price",
                    "Total",
                  ],
                  data: invoiceItem
                      .map((e) => [
                            e.quantity!,
                            DateFormat("yyyy-MM-dd")
                                .format(DateTime.parse(e.createdAt!).toLocal())
                                .toString(),
                            e.attendant!.username!,
                            htmlPrice(e.unitPrice!),
                            htmlPrice(e.quantity! * e.unitPrice!),
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
                          Text(
                            "Total ${htmlPrice(invoiceItem.fold(0.0, (previousValue, element) => previousValue + element.unitPrice! * element.quantity!))}",
                            style: TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          Divider(
                              thickness: 1,
                              color: const PdfColor.fromInt(0xFF000000)),
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

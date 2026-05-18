import 'dart:typed_data';

import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/models/salereturn.dart';

import '../../../../main.dart';
import '../../../../models/shop.dart';

Future<Uint8List> salesReturnedReceipt(SaleRetuns invoice, type) async {
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
                    mainAxisAlignment: MainAxisAlignment.start,
                    children: [
                      Text(shop.name!, style: const TextStyle(fontSize: 14)),
                      if (shop.location?.isNotEmpty == true)
                        Text(" ${shop.location ?? ""}",
                            style: const TextStyle(fontSize: 14))
                    ],
                    crossAxisAlignment: CrossAxisAlignment.center,
                  ),
                ],
              ),
              Center(
                  child: Text(type,
                      style:
                          TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center)),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Column(children: [
                  Text(
                      "Date ${DateFormat("yyy-MM-dd").format(DateTime.parse(invoice.createdAt!))}")
                ]),
                Row(children: [
                  Text("No:"),
                  Text(invoice.saleReturnNo!.toUpperCase(),
                      style:
                          TextStyle(fontWeight: FontWeight.bold, fontSize: 16))
                ])
              ]),
              SizedBox(height: 20),
              if (invoice.customerId != null)
                Row(children: [
                  Text("No:"),
                  Text(invoice.customerId!.name!.toUpperCase(),
                      style:
                          TextStyle(fontWeight: FontWeight.bold, fontSize: 16))
                ]),
              SizedBox(height: 20),
              TableHelper.fromTextArray(
                  border: TableBorder.all(width: 0), //table border
                  headers: [
                    "Item",
                    "Qty",
                    "Price",
                    "Total",
                  ],
                  data: invoice.items!
                      .map((e) => [
                            "${e.product!.name}",
                            e.quantity,
                            e.unitPrice,
                            htmlPrice(e.unitPrice! * e.quantity!),
                          ])
                      .toList()),
              SizedBox(height: 10),
              Align(
                alignment: Alignment.topRight,
                child: SizedBox(
                    width: 200,
                    child: Column(children: [
                      Column(
                          mainAxisAlignment: MainAxisAlignment.start,
                          children: [
                            Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    "Sub Total :",
                                    style: const TextStyle(fontSize: 16),
                                  ),
                                  Text(
                                    htmlPrice(invoice.refundAmount!),
                                    style: const TextStyle(fontSize: 16),
                                  )
                                ]),
                            Divider(
                                thickness: 1,
                                color: const PdfColor.fromInt(0xFF000000))
                          ]),
                      Column(
                          mainAxisAlignment: MainAxisAlignment.start,
                          children: [
                            Row(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    "VAT : ",
                                    style: const TextStyle(fontSize: 16),
                                  ),
                                  Text(
                                    htmlPrice(0),
                                    style: const TextStyle(fontSize: 16),
                                  )
                                ]),
                            Divider(
                                thickness: 1,
                                color: const PdfColor.fromInt(0xFF000000))
                          ]),
                      Column(
                          mainAxisAlignment: MainAxisAlignment.start,
                          children: [
                            Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    "Total :",
                                    style: const TextStyle(fontSize: 16),
                                  ),
                                  Text(
                                    htmlPrice(invoice.refundAmount!),
                                    style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16),
                                  )
                                ]),
                            Divider(
                                thickness: 1,
                                color: const PdfColor.fromInt(0xFF000000)),
                            Divider(
                                height: 0.1,
                                thickness: 1,
                                color: const PdfColor.fromInt(0xFF000000))
                          ]),
                    ])),
              ),
              SizedBox(height: 10),
              Text("Served by : ${invoice.attendantId!.username ?? ""}"),
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

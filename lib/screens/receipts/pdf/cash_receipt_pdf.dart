import 'dart:typed_data';

import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/payment.dart';
import 'package:pointify/models/shop.dart';

Future<Uint8List> cashReceiptPdf(List<Payment> payment, type) async {
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
              SizedBox(height: 10),
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
                      "Dated ${DateFormat("yyyy-MM-dd HH:mm").format(DateTime.parse(payment.first.date!).toLocal())}",
                    ),
                    if (payment.first.recieptNumber != null)
                      Row(children: [
                        Text("No:"),
                        Text(payment.first.recieptNumber ?? "".toUpperCase(),
                            style: TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 16))
                      ]),
                    SizedBox(height: 10),
                    if (payment.first.customerId != null)
                      Text(
                        "Paid by ${payment.first.customerId?.name ?? ""}",
                      ),
                  ]),
              SizedBox(height: 20),
              TableHelper.fromTextArray(
                  border: TableBorder.all(width: 1), //table border
                  headers: [
                    "Description",
                    "Amount",
                  ],
                  data: payment
                      .map((e) => [
                            e.type?.toUpperCase(),
                            htmlPrice(e.amount),
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
                            "Totals ${htmlPrice(payment.fold(0, (previousValue, element) => previousValue + element.amount!))}",
                            style: TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          Divider(
                              thickness: 1,
                              color: const PdfColor.fromInt(0xFF000000))
                        ])),
              ),
              SizedBox(height: 10),
              Text("Served by : ${payment.first.attendantId!.username ?? ""}"),
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

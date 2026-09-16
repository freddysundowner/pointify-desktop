import 'dart:typed_data';

import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/shop.dart';

import '../../../models/salemodel.dart';

Future<Uint8List> deliveryNotePdf(SaleModel stockReports, type) async {
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
              Column(
                children: [
                  Text(
                      "To: ${stockReports.customerId?.name ?? "......................."}",
                      style: const TextStyle(fontSize: 18)),
                  Text(
                      "Address: ${stockReports.customerId?.address ?? "......................."}",
                      style: const TextStyle(fontSize: 18)),
                  Text(
                      "Contact: ${stockReports.customerId?.phoneNumber ?? "......................."}",
                      style: const TextStyle(fontSize: 18))
                ],
                crossAxisAlignment: CrossAxisAlignment.start,
              ),
              SizedBox(height: 20),
              Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Center(
                        child: Text(type,
                            style: TextStyle(
                                fontSize: 26, fontWeight: FontWeight.bold),
                            textAlign: TextAlign.center)),
                    SizedBox(height: 10),
                  ]),
              SizedBox(height: 20),
              TableHelper.fromTextArray(
                  border: TableBorder.all(width: 1), //table border
                  headers: [
                    "Product",
                    "Qty",
                  ],
                  data: stockReports.items!
                      .map((e) => [
                            e.product!.name,
                            e.quantity.toString(),
                          ])
                      .toList()),
              SizedBox(height: 10),
              if (stockReports.attendant != null)
                Text("Served by : ${stockReports.attendant!.username ?? " "}"),
              SizedBox(height: 10),
              SizedBox(height: 30),
              Row(children: [
                Column(
                    mainAxisAlignment: MainAxisAlignment.start,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                          "Dispatched by..............................................."),
                      SizedBox(height: 10),
                      Text(
                          "Sign..............................................."),
                      SizedBox(height: 10),
                      Text(
                          "Date & Time..............................................."),
                    ]),
                SizedBox(width: 30),
                Column(
                    mainAxisAlignment: MainAxisAlignment.start,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                          "Received by..............................................."),
                      SizedBox(height: 10),
                      Text(
                          "Date & Time..............................................."),
                      SizedBox(height: 10),
                      Text(
                          "Sign..............................................."),
                    ]),
              ]),
              Spacer(),
              Align(
                  alignment: Alignment.center,
                  child: Text("Thank you for your order!",
                      style: const TextStyle(fontSize: 18))),
              SizedBox(height: 20),
              Text(
                  "Printed by : ${userController.currentUser.value!.username ?? ""} on ${DateFormat("yyyy-MM-dd HH:mm").format(DateTime.now().toLocal())}",
                  style: TextStyle(fontStyle: FontStyle.italic)),
              SizedBox(height: 20),
              Text("From: ${shop.name!} of address ${shop.location ?? ""}",
                  style: TextStyle(fontStyle: FontStyle.italic)),
            ],
          ),
        );
      },
    ),
  );
  return pdf.save();
}

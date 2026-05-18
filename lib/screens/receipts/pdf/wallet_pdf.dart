import 'dart:typed_data';

import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart';
import 'package:pointify/controllers/customercontroller.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/shop.dart';

import '../../../models/payment.dart';

Future<Uint8List> customerStatement(List<Payment> payments, type) async {
  Shop shop = userController.currentUser.value!.primaryShop!;
  CustomerController customerController = Get.find<CustomerController>();
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
                      Text(shop.name!, style: const TextStyle(fontSize: 21)),
                      Text(shop.location ?? "",
                          style: const TextStyle(fontSize: 21))
                    ],
                    crossAxisAlignment: CrossAxisAlignment.start,
                  ),
                ],
              ),
              Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Center(
                        child: Text(
                            "${customerController.currentCustomer.value!.name!.toUpperCase()} ${type.toString().toUpperCase()} STATEMENT",
                            style: TextStyle(
                                fontSize: 18, fontWeight: FontWeight.bold),
                            textAlign: TextAlign.center)),
                    if (customerController
                        .currentCustomer.value!.phoneNumber!.isNotEmpty)
                      Text(
                          "Phone Number ${customerController.currentCustomer.value!.phoneNumber!}"),
                    if (customerController
                        .currentCustomer.value!.email!.isNotEmpty)
                      Text(
                          "Email ${customerController.currentCustomer.value!.email!}"),
                    if (customerController
                        .currentCustomer.value!.address!.isNotEmpty)
                      Text(
                          "Address ${customerController.currentCustomer.value!.address!}"),
                    SizedBox(height: 10),
                    Text(
                      "ON ${DateFormat("yyyy-MM-dd").format(DateTime.now().toLocal())}",
                    ),
                  ]),
              SizedBox(height: 20),
              if (type == "Full")
                TableHelper.fromTextArray(
                    border: TableBorder.all(width: 1), //table border
                    headers: [
                      "Date",
                      "In",
                      "Out",
                    ],
                    data: payments
                        .map((e) => [
                              DateFormat("yyyy-MM-dd HH:mm:ss")
                                  .format(DateTime.parse(e.date!).toLocal()),
                              htmlPrice(e.type == "deposit" ? e.amount : 0),
                              htmlPrice(e.type == "payment" ? e.amount : 0),
                            ])
                        .toList()),
              if (type != "Full")
                TableHelper.fromTextArray(
                    border: TableBorder.all(width: 1), //table border
                    headers: [
                      "Date",
                      "Amount",
                    ],
                    data: payments
                        .map((e) => [
                              DateFormat("yyyy-MM-dd HH:mm:ss")
                                  .format(DateTime.parse(e.date!).toLocal()),
                              htmlPrice(e.amount),
                            ])
                        .toList()),
              SizedBox(height: 10),
              if (type != "Full")
                Align(
                  alignment: Alignment.centerRight,
                  child:
                      Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                    Text(
                      "Total ${htmlPrice(payments.fold(0, (previousValue, element) => previousValue + element.amount!))}",
                      style:
                          TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    Divider(
                        thickness: 1, color: const PdfColor.fromInt(0xFF000000))
                  ]),
                ),
              if (type == "Full")
                Align(
                  alignment: Alignment.centerRight,
                  child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          "Total Deposits ${htmlPrice(payments.fold(0, (previousValue, element) => previousValue + (element.type == "deposit" ? element.amount as int : 0)))}",
                          style: TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        Text(
                          "Total Usage ${htmlPrice(payments.fold(0, (previousValue, element) => previousValue + (element.type == "payment" ? element.amount as int : 0)))}",
                          style: TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        Divider(
                            thickness: 1,
                            color: const PdfColor.fromInt(0xFF000000))
                      ]),
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

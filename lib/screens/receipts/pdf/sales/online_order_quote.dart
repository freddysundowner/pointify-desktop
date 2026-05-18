import 'dart:typed_data';

import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart';
import 'package:pointify/main.dart';

import '../../../../models/salemodel.dart';

Future<Uint8List> onlineQuote(SaleModel invoice, type, {print = false}) async {
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
                      Text(invoice.shopId!.name!,
                          style: const TextStyle(fontSize: 14)),
                      if (invoice.shopId?.location?.isNotEmpty == true ||
                          invoice.shopId?.addressReceipt?.isNotEmpty == true)
                        Text(
                            invoice.shopId?.addressReceipt ??
                                invoice.shopId?.location ??
                                "",
                            style: const TextStyle(fontSize: 14)),
                      if (invoice.shopId?.contact?.isNotEmpty == true)
                        Text(" ${invoice.shopId?.contact ?? ""}",
                            style: const TextStyle(fontSize: 14)),
                      if (invoice.shopId?.paybillTill?.isNotEmpty == true)
                        Text(
                            "PayBill/Till: ${invoice.shopId?.paybillTill ?? ""}",
                            style: const TextStyle(fontSize: 14)),
                      if (invoice.shopId?.paybillAccount?.isNotEmpty == true)
                        Text(invoice.shopId?.paybillAccount ?? "",
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
                  Text(invoice.receiptNo!.toUpperCase(),
                      style:
                          TextStyle(fontWeight: FontWeight.bold, fontSize: 16))
                ])
              ]),
              SizedBox(height: 20),
              if (invoice.customerId != null)
                Row(children: [
                  Text("Customer: "),
                  Text(invoice.customerId!.name!.toUpperCase(),
                      style:
                          TextStyle(fontWeight: FontWeight.bold, fontSize: 16))
                ]),
              SizedBox(height: 20),
              TableHelper.fromTextArray(
                  border: TableBorder.all(width: 0), //table border
                  headers: ["Item", "Qty", "Cost@", "Total"],
                  data: invoice.items!
                      .map((e) => ["${e.product!.name}", e.quantity, "", ""])
                      .toList()),
              SizedBox(height: 10),
              if (invoice.attendant != null)
                Text("Served by : ${invoice.attendant!.username ?? ""}"),
              SizedBox(height: 10),
              Text(
                  "Prepared by : ${userController.currentUser.value?.username ?? ""}"),
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

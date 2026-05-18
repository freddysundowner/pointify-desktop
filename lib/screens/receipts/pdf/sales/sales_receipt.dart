import 'dart:typed_data';

import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart';
import 'package:pointify/functions/functions.dart';

import '../../../../models/salemodel.dart';

Future<Uint8List> salesReceipt(SaleModel invoice, type, {print = false}) async {
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
                            htmlPrice(e.unitPrice! + e.lineDiscount!),
                            htmlPrice(
                                (e.unitPrice! * e.quantity!) + e.lineDiscount!),
                          ])
                      .toList()),
              SizedBox(height: 10),
              if (invoice.outstandingBalance! > 0 &&
                  invoice.saleType != "Order")
                Align(
                  alignment: Alignment.topRight,
                  child: SizedBox(
                      width: 200,
                      child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Text(
                              "Unpaid ${htmlPrice(invoice.outstandingBalance!)}",
                              style: TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            Divider(
                                thickness: 1,
                                color: const PdfColor.fromInt(0xFF000000))
                          ])),
                ),
              if (invoice.outstandingBalance! > 0)
                Align(
                  alignment: Alignment.topRight,
                  child: SizedBox(
                      width: 200,
                      child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Text(
                              "Total paid ${htmlPrice(invoice.totalWithDiscount! - invoice.outstandingBalance!)}",
                              style: TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            Divider(
                                thickness: 1,
                                color: const PdfColor.fromInt(0xFF000000))
                          ])),
                ),
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
                                    htmlPrice(invoice.totalAmount! -
                                        invoice.totaltax!),
                                    style: const TextStyle(fontSize: 16),
                                  )
                                ]),
                            Divider(
                                thickness: 1,
                                color: const PdfColor.fromInt(0xFF000000))
                          ]),
                      if (invoice.totalDiscount != null &&
                          invoice.totalDiscount! > 0)
                        Column(
                            mainAxisAlignment: MainAxisAlignment.start,
                            children: [
                              Row(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      "Discount : ",
                                      style: const TextStyle(fontSize: 16),
                                    ),
                                    Text(
                                      htmlPrice(invoice.totalDiscount!),
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
                                    htmlPrice(invoice.totaltax),
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
                                    htmlPrice(invoice.totalWithDiscount!),
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
              if (invoice.attendant != null)
                Text("Served by : ${invoice.attendant!.username ?? ""}"),
              SizedBox(height: 10),
              Text(
                  "Paid via : ${invoice.paymentTag ?? invoice.paymentType ?? ""}"),
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

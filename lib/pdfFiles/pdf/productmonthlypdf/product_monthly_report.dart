import 'dart:typed_data';

import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart';

import '../../../controllers/productcontroller.dart';
import '../../../functions/functions.dart';
import '../../../main.dart';
import '../../../models/badstock.dart';
import '../../../models/invoice.dart';
import '../../../models/product.dart';

Future<Uint8List> productMonthlyReport(data,
    {required Product product, String? title, double? total}) async {
  ProductController productController = Get.find<ProductController>();
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
              Center(
                  child: Text(
                      userController.currentUser.value!.primaryShop!.name!,
                      style:
                          TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center)),
              Center(
                  child: Text(title ?? "",
                      style:
                          TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center)),
              SizedBox(height: 10),
              Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                        "as of ${DateFormat("yyy-MM-dd").format(DateTime.parse(productController.filterStartDate.value).toUtc())}"),
                    SizedBox(height: 10),
                    Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text("Total: "),
                          Text(htmlPrice(total ?? 0),
                              style: TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 16))
                        ]),
                  ]),
              SizedBox(height: 20),
              Expanded(
                  child: Column(children: [
                TableHelper.fromTextArray(
                    border: TableBorder.all(width: 1), //table border
                    headers: [
                      "MONTH",
                      "TOTAL",
                    ],
                    data: data)
              ])),
              SizedBox(height: 10),
            ],
          ),
        );
      },
    ),
  );
  return pdf.save();
}

getSalesTotal(String month, data, {String? type}) {
  if (type != null) {
    if (type == "stockin") {
      List<InvoiceItem> invoices = data as List<InvoiceItem>;
      return invoices
          .where((p0) =>
              getDate("MMMM",
                  DateTime.parse(p0.createdAt!).millisecondsSinceEpoch) ==
              month)
          .fold(
              0.0,
              (previousValue, element) =>
                  previousValue + (element.quantity! * element.unitPrice!));
    }
    if (type == "badstock") {
      List<BadStock> invoices = data as List<BadStock>;
      return invoices
          .where((p0) =>
              getDate("MMMM",
                  DateTime.parse(p0.createdAt!).millisecondsSinceEpoch) ==
              month)
          .fold(
              0.0,
              (previousValue, element) =>
                  previousValue +
                  (element.quantity! * element.product!.buyingPrice!));
    }
  }
  return data
      .where((p0) => getDate("MMMM", p0.soldOn!) == month)
      .fold(0, (previousValue, element) => previousValue + element.total!);
}

getDate(String format, int date) {
  return DateFormat(format).format(DateTime.fromMillisecondsSinceEpoch(date));
}

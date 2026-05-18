import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/screens/receipts/view/invoice_screen.dart';
import 'package:pointify/widgets/minor_title.dart';

import '../../models/invoice.dart';
import '../../widgets/major_title.dart';
import '../../widgets/normal_text.dart';

Widget invoiceCard({required Invoice invoice, String? tab, String? type}) {
  return InkWell(
    onTap: () {
      Get.to(() => InvoiceScreen(invoice: invoice, type: type));
    },
    child: Container(
      margin: const EdgeInsets.all(5),
      padding: const EdgeInsets.all(10),
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.grey.withOpacity(0.2),
        borderRadius: BorderRadius.circular(5),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                majorTitle(
                  title: "Invoice #${(invoice.purchaseNo)?.toUpperCase()}",
                  color: Colors.black,
                  size: 12.0,
                ),
                const SizedBox(height: 3),
                normalText(
                  title:
                      "Total: ${htmlPrice(invoice.items!.fold(0.0, (previousValue, element) => previousValue + element.quantity! * element.unitPrice!))}",
                  color: Colors.black,
                  size: 14.0,
                ),

                if (invoice.outstandingBalance! > 0)
                  minorTitle(
                    title: "Unpaid: ${htmlPrice(invoice.outstandingBalance)}",
                    color: Colors.red,
                  ),
                minorTitle(
                  title:
                      "On :${DateFormat("yyyy-MM-dd hh:mm a").format(DateTime.parse(invoice.createdAt!).toLocal())}",
                  color: Colors.black,
                  size: 11.0,
                ),
              ],
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 3),
                if (invoice.attendantId != null)
                  minorTitle(
                    title:
                        "Cashier: ${invoice.attendantId?.username?.capitalize}",
                    color: Colors.black,
                  ),
                const SizedBox(height: 3),
                minorTitle(
                  title: "Paid via: ${invoice.paymentType}",
                  color: Colors.black,
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

String chechPayment(Invoice salesModel) {
  if (salesModel.invoiceType == "return") return "RETURNED";
  if (salesModel.outstandingBalance == 0) return "PAID";
  if (salesModel.outstandingBalance! > 0) return "NOT PAID";
  return "";
}

Color chechPaymentColor(Invoice invoice) {
  if (invoice.invoiceType == "return") return Colors.red;
  if (invoice.outstandingBalance == 0) return Colors.green;
  if (invoice.outstandingBalance! > 0) return Colors.red;
  return Colors.black;
}

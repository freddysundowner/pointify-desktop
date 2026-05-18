import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/paymentcontroller.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/models/customer.dart';
import 'package:pointify/models/payment.dart';
import 'package:printing/printing.dart';

import '../../../models/salemodel.dart';
import '../../../utils/colors.dart';
import '../../../widgets/alert.dart';
import '../../receipts/pdf/cash_receipt_pdf.dart';

// ignore: must_be_immutable
class CashReceipt extends StatelessWidget {
  final Payment? receipt;
  String? saleId;
  Customer? customer;

  CashReceipt(
      {super.key, required this.receipt, this.saleId, Customer? customer});
  final PaymentController paymentController = Get.find<PaymentController>();
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          color: Colors.black,
          onPressed: () {
            Get.back();
          },
          icon: const Icon(Icons.clear),
        ),
        title: Text(
          "Receipt#${receipt!.recieptNumber}".toUpperCase(),
          style: const TextStyle(color: Colors.black, fontSize: 16),
        ),
        actions: [
          IconButton(
              onPressed: () {
                Get.to(() => Scaffold(
                      appBar: AppBar(
                        title: const Text("Cash Receipt"),
                      ),
                      body: PdfPreview(
                          build: (context) =>
                              cashReceiptPdf([receipt!], "CASH RECEIPT")),
                    ));
              },
              icon: Icon(
                Icons.picture_as_pdf,
                color: AppColors.mainColor,
              )),
          IconButton(
              onPressed: () {
                generalAlert(
                    title: "Warning",
                    positiveText: "Yes",
                    negativeText: "Not now",
                    message: "Are you sure you want to delete receipt?",
                    function: () {
                      Get.back();
                      paymentController.deleteReceiptById(
                          saleId!, receipt!.id!);
                    });
              },
              icon: const Icon(
                Icons.delete,
                color: Colors.red,
              ))
        ],
      ),
      body: Obx(
        () => SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.06),
                  blurRadius: 18,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(30),
                      ),
                      child: const Text(
                        "CASH RECEIPT",
                        style: TextStyle(
                          color: Colors.green,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const Spacer(),
                    Text(
                      DateFormat("yyyy/MM/dd hh:mm")
                          .format(DateTime.parse(receipt!.date!)),
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 22),
                Text(
                  htmlPrice(receipt!.amount),
                  style: const TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.w800,
                    color: Colors.black,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  "Total amount received",
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 22),
                Divider(color: Colors.grey.shade200),
                if (receipt!.customerId != null) ...[
                  _receiptInfoRow(
                    title: "Customer",
                    value: receipt!.customerId!.name!,
                  ),
                  const SizedBox(height: 12),
                ],
                _receiptInfoRow(
                  title: "Receipt No.",
                  value: "#${receipt!.recieptNumber}".toUpperCase(),
                ),
                const SizedBox(height: 12),
                _receiptInfoRow(
                  title: "Payment Type",
                  value: receipt!.type ?? "Cash",
                ),
                const SizedBox(height: 12),
                if (receipt!.date != null)
                  _receiptInfoRow(
                    title: "Date",
                    value: DateFormat("yyyy-MM-dd HH:mm")
                        .format(DateTime.parse(receipt!.date!).toLocal()),
                  ),
                const SizedBox(height: 12),
                _receiptInfoRow(
                  title: "Served by",
                  value: receipt!.attendantId!.username ?? "",
                ),
                const SizedBox(height: 22),
                Divider(color: Colors.grey.shade200),
                Row(
                  children: [
                    const Text(
                      "Amount Paid",
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      htmlPrice(receipt!.amount),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 12,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    Get.to(() => Scaffold(
                          appBar: AppBar(
                            title: const Text("Cash Receipt"),
                          ),
                          body: PdfPreview(
                            build: (context) =>
                                cashReceiptPdf([receipt!], "CASH RECEIPT"),
                          ),
                        ));
                  },
                  icon: const Icon(Icons.print, size: 18),
                  label: const Text("Print Receipt"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.mainColor,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

Widget _receiptInfoRow({
  required String title,
  required String value,
}) {
  return Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      SizedBox(
        width: 110,
        child: Text(
          title,
          style: TextStyle(
            fontSize: 13,
            color: Colors.grey.shade600,
          ),
        ),
      ),
      Expanded(
        child: Text(
          value,
          textAlign: TextAlign.right,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: Colors.black,
          ),
        ),
      ),
    ],
  );
}

onCredit(SaleModel salesModel) => salesModel.outstandingBalance! > 0;

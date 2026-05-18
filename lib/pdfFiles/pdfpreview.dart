import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/screens/receipts/pdf/sales/sales_receipt.dart';
import 'package:pointify/utils/colors.dart';
import 'package:printing/printing.dart';

import '../models/salemodel.dart';

class PdfPreviewPage extends StatelessWidget {
  final SaleModel? invoice;
  final String? type;

  const PdfPreviewPage({Key? key, this.invoice, this.type}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        elevation: 0.1,
        backgroundColor: AppColors.mainColor,
        leading: IconButton(
            onPressed: () {
              Get.back();
            },
            icon: const Icon(Icons.arrow_back_ios, color: Colors.white)),
        title: Text(
          type ?? "",
          style: const TextStyle(color: Colors.white),
        ),
      ),
      body: PdfPreview(
        build: (context) => salesReceipt(invoice!, type ?? ""),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/homecontroller.dart';
import 'package:pointify/pdfFiles/pdf/productmonthlypdf/product_monthly_report.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/utils/colors.dart';
import 'package:printing/printing.dart';

import '../../../models/product.dart';
import '../../../screens/product/product_history.dart';

class MonthlyPreviewPage extends StatelessWidget {
  final List<dynamic>? sales;
  final String? type;
  final String? title;
  final double? total;
  final Product? product;

  const MonthlyPreviewPage(
      {Key? key,
      this.sales,
      this.type,
      required this.product,
      this.title,
      this.total})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
            onPressed: () {
              Get.back();
            },
            icon: Icon(
              Icons.arrow_back_ios,
              color: Colors.white,
            )),
        backgroundColor:
            AppColors.mainColor,
        title: Text(
          type ?? "",
          style: TextStyle(
              color: Colors.white),
        ),
      ),
      body: PdfPreview(
        build: (context) => productMonthlyReport(sales,
            product: product!, title: title, total: total),
      ),
    );
  }
}

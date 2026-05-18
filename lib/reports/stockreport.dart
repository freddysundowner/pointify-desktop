import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/reports_controller.dart';
import 'package:pointify/models/stockreport.dart';
import 'package:printing/printing.dart';

import '../functions/functions.dart';
import '../main.dart';
import '../screens/receipts/pdf/stock_report_pdf.dart';
import '../utils/colors.dart';

class StockReportScreen extends StatelessWidget {
  StockReportScreen({super.key}) {
    reportsController.getStockReport(
        shopid: userController.currentUser.value!.primaryShop!.id);
  }

  final ReportsController reportsController = Get.find<ReportsController>();
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title:  Text(
          "Stock Report",
          style: TextStyle(color: AppColors.mainColor),
        ),
        actions: [
          IconButton(
              onPressed: () {
                Get.to(() => Scaffold(
                      appBar: AppBar(
                        title: const Text("Stock Report"),
                      ),
                      body: PdfPreview(
                        build: (context) => stockReportPdf(
                            reportsController.stockReports, "Stock Report"),
                      ),
                    ));
              },
              icon:  Icon(
                Icons.picture_as_pdf,
                color: AppColors.mainColor,
              ))
        ],
        leading: IconButton(
          onPressed: () {
            Get.back();
          },
          icon:  Icon(
            Icons.clear,
            color: AppColors.mainColor,
          ),
        ),
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
            child: TextFormField(
                controller: reportsController.searchProductController,
                onChanged: (value) {
                  if (value.isEmpty) {
                    reportsController.getStockReport(
                        shopid:
                            userController.currentUser.value?.primaryShop?.id,
                        page: 1,
                        limit: 50);
                  }
                },
                style: const TextStyle(color: Colors.black),
                decoration: InputDecoration(
                  suffixIconConstraints: const BoxConstraints(maxWidth: 100),
                  suffixIcon: Align(
                    alignment: Alignment.centerRight,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          vertical: 15, horizontal: 15),
                      decoration: BoxDecoration(
                        color: AppColors.mainColor,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: InkWell(
                        onTap: () {
                          reportsController.getStockReport(
                              shopid: userController
                                  .currentUser.value?.primaryShop?.id,
                              name: reportsController
                                  .searchProductController.text,
                              page: 1,
                              limit: 50);
                        },
                        child: const Text(
                          "Search",
                          style: TextStyle(color: Colors.white),
                        ),
                      ),
                    ),
                  ),
                  contentPadding: const EdgeInsets.fromLTRB(10, 0, 10, 2),
                  hintText: "Quick Search",
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                )),
          ),
          Expanded(
            child: Obx(
              () => reportsController.isLoadingReports.isTrue
                  ? const Center(child: CircularProgressIndicator())
                  : reportsController.stockReports.isEmpty
                      ? const Center(child: Text("No results found"))
                      : ListView.builder(
                          itemCount: reportsController.stockReports.length,
                          itemBuilder: (context, index) {
                            StockReport? stockReport =
                                reportsController.stockReports.elementAt(index);
                            return Container(
                              decoration: BoxDecoration(
                                border: Border(
                                  bottom: BorderSide(
                                      width: 1.5, color: Colors.grey.shade300),
                                ),
                              ),
                              padding:
                                  const EdgeInsets.only(bottom: 10, top: 10),
                              margin:
                                  const EdgeInsets.symmetric(horizontal: 10),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    stockReport.name!,
                                    style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold),
                                  ),
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                          "Qty: ${stockReport.inStockQuantity}"),
                                      Text(
                                          "Sold: ${stockReport.totalSoldQuantity}"),
                                      Text(
                                          "Sales: ${htmlPrice(stockReport.totalSales)}"),
                                      Text(
                                          "Profit: ${htmlPrice(stockReport.totalProfit)}"),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }
}

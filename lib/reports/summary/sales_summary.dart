import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/paymentcontroller.dart';
import 'package:pointify/controllers/reports_controller.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/reports/sales/sales_report.dart';
import 'package:pointify/reports/sales/salesreturns_report.dart';
import 'package:pointify/utils/colors.dart';
import 'package:pointify/utils/helper.dart';
import 'package:pointify/widgets/filter_dates.dart';
import 'package:pointify/widgets/no_items_found.dart';
import 'package:printing/printing.dart';

import '../../../main.dart';
import '../../controllers/salescontroller.dart';
import '../../screens/cash_flow/payment_history.dart';
import '../../screens/receipts/pdf/sales/sales_summary_pdf.dart';
import '../components/summarycard.dart';

class SalesSummary extends StatelessWidget {
  SalesSummary({super.key}) {
    reportsController.getSalesReport(
      startDate: reportsController.filterStartDate.value,
      toDate: reportsController.filterEndDate.value,
      shopid: userController.currentUser.value!.primaryShop!.id!,
    );
  }

  final ReportsController reportsController = Get.find<ReportsController>();
  final PaymentController paymentController = Get.find<PaymentController>();
  final SalesController salesController = Get.find<SalesController>();

  @override
  Widget build(BuildContext context) {
    return Helper(
      widget: Obx(() {
        return ListView(
          children: [
            Column(
              children: [
                const SizedBox(height: 10),
                filterByDates(onFilter: (start, end, type) {
                  reportsController.activeFilter.value = type;
                  reportsController.filterStartDate.value = DateFormat(
                    "yyyy-MM-dd",
                  ).format(start);
                  reportsController.filterEndDate.value = DateFormat(
                    "yyyy-MM-dd",
                  ).format(end);

                  reportsController.getSalesReport(
                    startDate: reportsController.filterStartDate.value,
                    toDate: reportsController.filterEndDate.value,
                    shopid: userController.currentUser.value!.primaryShop!.id!,
                  );
                }),
                const SizedBox(height: 30),
                Container(
                  width: double.infinity,
                  padding:
                      const EdgeInsets.only(left: 20, right: 20, bottom: 10),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      Container(
                        padding: const EdgeInsets.only(
                            top: 5, bottom: 5, left: 10, right: 15),
                        decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(50),
                            color: AppColors.mainColor),
                        child: Row(
                          children: [
                            const Icon(Icons.credit_card, color: Colors.white),
                            const SizedBox(width: 10),
                            Obx(
                              () => Text(
                                htmlPrice(reportsController.totalSales.value),
                                style: const TextStyle(color: Colors.white),
                              ),
                            )
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 30),
            Card(
              elevation: 5,
              child: Container(
                padding: const EdgeInsets.all(15.0),
                width: double.infinity,
                child: Obx(
                  () => reportsController.isLoadingReports.isTrue
                      ? const Center(
                          child: CircularProgressIndicator(),
                        )
                      : reportsController.salesCard.isEmpty
                          ? noItemsFound(
                              context, reportsController.salesCard.isEmpty)
                          : Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: List.generate(
                                  reportsController.salesCard.length,
                                  (index) => summaryCard(
                                      title: reportsController.salesCard[index]
                                          ["title"],
                                      description: reportsController
                                          .salesCard[index]["description"],
                                      amount: reportsController.salesCard[index]
                                          ["amount"],
                                      key: reportsController.salesCard[index]
                                          ["key"],
                                      onPressed: (key) {
                                        if (key == "cash") {
                                          salesController
                                              .cashsalesfilterSelected
                                              .value = 'cash';
                                          salesController.getSalesByDate(
                                              shop: userController.currentUser
                                                  .value!.primaryShop!.id!,
                                              fromDate: reportsController
                                                  .filterStartDate.value,
                                              status: "cashed",
                                              paymentTag: 'cash',
                                              toDate: reportsController
                                                  .filterEndDate.value);

                                          reportsController
                                              .cashsalesfilterSelected
                                              .value = key;
                                          Get.to(() => SalesReport(
                                                title:
                                                    "All ${key.toString().capitalizeFirst} sales",
                                                keyFrom: key,
                                              ));
                                        }
                                        if (key == "credit" ||
                                            key == "wallet") {
                                          salesController.getSalesByDate(
                                              shop: userController.currentUser
                                                  .value!.primaryShop!.id!,
                                              fromDate: reportsController
                                                  .filterStartDate.value,
                                              paymentType: key,
                                              paymentTag: "cashed",
                                              status: key == "wallet" ||
                                                      key == "cash" ||
                                                      key == "credit"
                                                  ? "cashed"
                                                  : "hold",
                                              toDate: reportsController
                                                  .filterEndDate.value);
                                          reportsController
                                              .cashsalesfilterSelected
                                              .value = key;
                                          Get.to(() => SalesReport(
                                                keyFrom: key,
                                                title:
                                                    "${key.toString().capitalizeFirst} sales",
                                              ));
                                        }
                                        if (key == "hold") {
                                          salesController.getSalesByDate(
                                              shop: userController.currentUser
                                                  .value!.primaryShop!.id!,
                                              fromDate: reportsController
                                                  .filterStartDate.value,
                                              status: key,
                                              toDate: reportsController
                                                  .filterEndDate.value);
                                          Get.to(() => SalesReport(
                                                title:
                                                    "${key.toString().capitalizeFirst} sales",
                                                keyFrom: key,
                                              ));
                                        }

                                        if (key == "returns") {
                                          salesController.getReturns(
                                              fromDate: reportsController
                                                  .filterStartDate.value,
                                              toDate: reportsController
                                                  .filterEndDate.value,
                                              type: "returns",
                                              shopid: userController.currentUser
                                                  .value!.primaryShop!.id!);
                                          Get.to(() => const SalesReturnsReport(
                                                title: "Sales returns",
                                              ));
                                        }
                                        if (key == "debtpaid") {
                                          paymentController
                                              .getPaymentsByShopAndDate(
                                                  userController.currentUser
                                                      .value!.primaryShop!.id!,
                                                  reportsController
                                                      .filterStartDate.value,
                                                  reportsController
                                                      .filterEndDate.value);
                                          Get.to(() => PaymentHistory());
                                        }
                                      }))),
                ),
              ),
            ),
            const SizedBox(height: 25),
          ],
        );
      }),
      appBar: AppBar(
        titleSpacing: 0,
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        title: Text(
          "Sales Report",
          style: TextStyle(color: AppColors.mainColor),
        ),
        actions: [
          IconButton(
              onPressed: () {
                Get.to(() => Scaffold(
                      appBar: AppBar(
                        title: const Text("Sales summary report"),
                      ),
                      body: PdfPreview(
                        build: (context) => salesSummaryPdf(
                            reportsController.salesCard,
                            "SALES SUMMARY REPORT"),
                      ),
                    ));
              },
              icon: Icon(
                Icons.picture_as_pdf,
                color: AppColors.mainColor,
              ))
        ],
        leading: IconButton(
          onPressed: () {
            Get.back();
          },
          icon: Icon(
            Icons.clear,
            color: AppColors.mainColor,
          ),
        ),
      ),
    );
  }
}

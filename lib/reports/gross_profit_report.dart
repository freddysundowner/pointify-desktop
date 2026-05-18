import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/expensecontroller.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/reports/sales/sales_report.dart';
import 'package:pointify/utils/colors.dart';
import 'package:pointify/utils/helper.dart';
import 'package:printing/printing.dart';

import '../controllers/reports_controller.dart';
import '../controllers/salescontroller.dart';
import '../controllers/shopcontroller.dart';
import '../main.dart';
import '../screens/receipts/pdf/profits/grossprofit_summary_pdf.dart';
import '../widgets/filter_dates.dart';
import '../widgets/textbutton.dart';
import 'components/summarycard.dart';

class GrossProfitReport extends StatelessWidget {
  final String? headline;
  final DateTime? firstday;
  final DateTime? lastday;
  final String? page;

  GrossProfitReport(
      {Key? key, this.headline, this.page, this.firstday, this.lastday})
      : super(key: key);

  final SalesController salesController = Get.find<SalesController>();
  final ShopController shopController = Get.find<ShopController>();
  final ExpenseController expenseController = Get.find<ExpenseController>();
  final ReportsController reportsController = Get.find<ReportsController>();

  @override
  Widget build(BuildContext context) {
    return Helper(
      widget: Obx(() {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                const SizedBox(height: 20),
                filterByDates(onFilter: (start, end, type) {
                  reportsController.activeFilter.value = type;
                  reportsController.filterStartDate.value = DateFormat(
                    "yyyy-MM-dd",
                  ).format(start);
                  reportsController.filterEndDate.value = DateFormat(
                    "yyyy-MM-dd",
                  ).format(end);

                  salesController.getNetAnalysis(
                      fromDate: reportsController.filterStartDate.value,
                      toDate: reportsController.filterEndDate.value,
                      shopId:
                          userController.currentUser.value!.primaryShop!.id!);
                }),
                const SizedBox(height: 30),
                const Text('Gross Profit'),
                const SizedBox(
                  height: 5,
                ),
                Align(
                  alignment: Alignment.center,
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 60),
                    padding: const EdgeInsets.only(
                        top: 10, bottom: 10, left: 10, right: 15),
                    decoration: BoxDecoration(
                        border: Border.all(
                          color: AppColors.mainColor,
                        ),
                        borderRadius: BorderRadius.circular(50),
                        color: Colors.white),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                         Icon(Icons.credit_card,
                            color: AppColors.mainColor),
                        const SizedBox(width: 10),
                        Column(
                          children: [
                            Text(
                              htmlPrice(
                                  salesController.analysis.value!.totalSales -
                                      salesController
                                          .analysis.value!.totalPurchases),
                              style:  TextStyle(
                                  color: AppColors.mainColor, fontSize: 21),
                            ),
                          ],
                        )
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Card(
              elevation: 5,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
              child: Container(
                padding: const EdgeInsets.all(15.0),
                width: double.infinity,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    summaryCard(
                        title: "Income on Sales",
                        description: 'Total income from the sales',
                        amount: salesController.analysis.value!.totalSales,
                        key: "sales",
                        onPressed: (key) {
                          salesController.getSalesByDate(
                              shop: userController
                                  .currentUser.value!.primaryShop!.id!,
                              fromDate: reportsController.filterStartDate.value,
                              toDate: reportsController.filterEndDate.value);
                          Get.to(() => SalesReport(
                                keyFrom: '',
                                title:
                                    "${key.toString().capitalizeFirst} sales",
                              ));
                        }),
                    summaryCard(
                        title: "Production Costs ",
                        description: 'Purchase cost of the sold items',
                        amount: salesController.analysis.value!.totalPurchases,
                        key: "gross",
                        onPressed: (key) {}),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 25),
            const Spacer(),
          ],
        );
      }),
      appBar: AppBar(
        titleSpacing: 0,
        elevation: 0,
        backgroundColor: Colors.transparent,
        centerTitle: true,
        title:  Text(
          "Gross Profit Overview",
          style: TextStyle(color: AppColors.mainColor, fontSize: 18),
        ),
        actions: [
          if (userController.currentUser.value?.usertype == "admin")
            Center(
                child: textBtn(
                    vPadding: 5,
                    hPadding: 20,
                    text: "Print",
                    bgColor: AppColors.mainColor,
                    color: Colors.white,
                    onPressed: () {
                      Get.to(() => Scaffold(
                            appBar: AppBar(
                              title: const Text("Gross Profit Report"),
                            ),
                            body: PdfPreview(
                              build: (context) => grossProfitSummaryPdf(
                                  salesController.analysis.value!,
                                  "GROSS PROFIT OVERVIEW"),
                            ),
                          ));
                    })),
          const SizedBox(
            width: 10,
          )
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
    );
  }
}

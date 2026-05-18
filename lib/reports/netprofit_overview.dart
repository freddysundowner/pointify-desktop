import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/expensecontroller.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/utils/colors.dart';
import 'package:pointify/utils/helper.dart';
import 'package:printing/printing.dart';

import '../controllers/reports_controller.dart';
import '../controllers/salescontroller.dart';
import '../controllers/shopcontroller.dart';
import '../main.dart';
import '../screens/receipts/pdf/profits/netprofit_pdf.dart';
import '../widgets/filter_dates.dart';
import '../widgets/textbutton.dart';
import 'components/summarycard.dart';
import 'expenses/expense_page.dart';
import 'gross_profit_report.dart';

class NetProfitOverview extends StatelessWidget {
  final String? headline;
  final DateTime? firstday;
  final DateTime? lastday;
  final  String? page;

  NetProfitOverview(
      {Key? key, this.headline, this.page, this.firstday, this.lastday})
      : super(key: key) ;

  final SalesController salesController = Get.find<SalesController>();
  final  ShopController shopController = Get.find<ShopController>();
  final  ExpenseController expenseController = Get.find<ExpenseController>();
  final  ReportsController reportsController = Get.find<ReportsController>();

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
                const Text('Net Profit'),
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
                              htmlPrice(salesController
                                      .analysis.value!.profitOnSales -
                                  salesController
                                      .analysis.value!.totalExpenses),
                              style:  TextStyle(
                                  color: AppColors.mainColor, fontSize: 21),
                            ),
                            Row(
                              children: [
                                 Text(
                                  "after taxes ",
                                  style: TextStyle(
                                      color: AppColors.mainColor, fontSize: 12),
                                ),
                                Text(
                                  htmlPrice(
                                      salesController.analysis.value!.net),
                                  style: const TextStyle(
                                      color: Colors.red, fontSize: 12),
                                ),
                              ],
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
                        title: "Profit on Sales",
                        description: 'Profit on sales',
                        amount: salesController.analysis.value!.gross,
                        key: "gross",
                        onPressed: (key) {
                          // Get.to(() => PurchasesSummary());

                          Get.to(() => GrossProfitReport(
                                firstday: DateTime.parse(
                                    reportsController.filterStartDate.value),
                                lastday: DateTime.parse(
                                    reportsController.filterEndDate.value),
                              ));
                        }),
                    summaryCard(
                        title: "Total Taxes",
                        description: '',
                        amount: salesController.analysis.value!.totalTaxes,
                        key: "taxes",
                        onPressed: (key) {}),
                    summaryCard(
                        title: "Total Expenses",
                        description: 'All Expenses',
                        amount: salesController.analysis.value!.totalExpenses,
                        key: "gross",
                        onPressed: (key) {
                          Get.to(() => ExpensePage(
                                firstday: DateTime.parse(
                                    reportsController.filterStartDate.value),
                                lastday: DateTime.parse(
                                    reportsController.filterEndDate.value),
                              ));
                        }),
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
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
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
                              title: const Text("NET PROFIT OVERVIEW"),
                            ),
                            body: PdfPreview(
                              build: (context) => netprofitPdf(
                                  salesController.analysis.value!,
                                  "NET PROFIT OVERVIEW"),
                            ),
                          ));
                    })),
          const SizedBox(
            width: 10,
          )
        ],
        title:  Text(
          "Net Profit Overview",
          style: TextStyle(color: AppColors.mainColor),
        ),
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

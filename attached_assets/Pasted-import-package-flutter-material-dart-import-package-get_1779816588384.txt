import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/expensecontroller.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/reports/netprofit_overview.dart';
import 'package:pointify/reports/summary/sales_summary.dart';
import 'package:pointify/utils/colors.dart';
import 'package:pointify/utils/helper.dart';
import 'package:printing/printing.dart';

import '../controllers/productcontroller.dart';
import '../controllers/reports_controller.dart';
import '../controllers/salescontroller.dart';
import '../controllers/shopcontroller.dart';
import '../main.dart';
import '../screens/receipts/pdf/profits/net_summary_pdf.dart';
import '../widgets/filter_dates.dart';
import '../widgets/textbutton.dart';
import 'badstocks.dart';
import 'components/summarycard.dart';
import 'expenses/expense_page.dart';
import 'gross_profit_report.dart';

class NetProfitReport extends StatelessWidget {
  final String? headline;
  final DateTime? firstday;
  final DateTime? lastday;
  final String? page;

  NetProfitReport(
      {Key? key, this.headline, this.page, this.firstday, this.lastday})
      : super(key: key) {
    reportsController.activeFilter.value = 'today';
    reportsController.filterStartDate.value = DateFormat(
      "yyyy-MM-dd",
    ).format(DateTime.now());
    reportsController.filterEndDate.value = DateFormat(
      "yyyy-MM-dd",
    ).format(DateTime.now());

    salesController.getNetAnalysis(
        fromDate: reportsController.filterStartDate.value,
        toDate: reportsController.filterEndDate.value,
        shopId: userController.currentUser.value!.primaryShop!.id!);
  }

  final SalesController salesController = Get.find<SalesController>();
  final ShopController shopController = Get.find<ShopController>();
  final ExpenseController expenseController = Get.find<ExpenseController>();
  final ReportsController reportsController = Get.find<ReportsController>();

  @override
  Widget build(BuildContext context) {
    return Helper(
      widget: Obx(() {
        return salesController.analysis.value == null
            ? const Center()
            : ListView(
                // crossAxisAlignment: CrossAxisAlignment.start,
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
                            shopId: userController
                                .currentUser.value!.primaryShop!.id!);
                      }),
                      const SizedBox(height: 30),
                      const Text('Gross Profit'),
                      const SizedBox(
                        height: 5,
                      ),
                      Align(
                        alignment: Alignment.center,
                        child: Column(
                          children: [
                            Container(
                              margin:
                                  const EdgeInsets.symmetric(horizontal: 60),
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
                                        htmlPrice((salesController.analysis
                                                    .value!.totalCashSales +
                                                salesController
                                                    .analysis.value!.debtPaid) -
                                            salesController
                                                .analysis.value!.totalExpenses),
                                        style: TextStyle(
                                            color: AppColors.mainColor,
                                            fontSize: 21),
                                      ),
                                    ],
                                  )
                                ],
                              ),
                            ),
                            const SizedBox(
                              height: 5,
                            ),
                            Text(
                              "After taxes ${htmlPrice(((salesController.analysis.value!.totalCashSales + salesController.analysis.value!.debtPaid) - salesController.analysis.value!.totalExpenses) - salesController.analysis.value!.totalTaxes)}",
                              style: const TextStyle(
                                  color: Colors.red, fontSize: 12),
                            ),
                          ],
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
                              title: "Total Sales Paid",
                              description: 'Click To View Sales Report',
                              amount: salesController
                                  .analysis.value!.totalCashSales,
                              key: "sales",
                              onPressed: (key) {
                                salesController.getSalesByDate(
                                    shop: userController
                                        .currentUser.value!.primaryShop!.id!,
                                    fromDate:
                                        salesController.filterStartDate.value,
                                    toDate:
                                        salesController.filterEndDate.value);
                                Get.to(() => SalesSummary());
                              }),
                          summaryCard(
                              title: "Debt Collected",
                              description: 'Click To View Sales Report',
                              amount: salesController.analysis.value!.debtPaid,
                              key: "sales",
                              onPressed: (key) {}),
                          summaryCard(
                              title: "Gross Profit",
                              description: 'Profit on sales',
                              amount: salesController.analysis.value!.gross,
                              key: "gross",
                              onPressed: (key) {
                                // Get.to(() => PurchasesSummary());

                                Get.to(() => GrossProfitReport(
                                      firstday: DateTime.parse(reportsController
                                              .filterStartDate.value)
                                          .toUtc(),
                                      lastday: DateTime.parse(reportsController
                                              .filterEndDate.value)
                                          .toUtc(),
                                    ));
                              }),
                          summaryCard(
                              title: "Net Profit",
                              description:
                                  'Click to view more on Gross Profit -  All deductions, taxes & Expenses',
                              amount: salesController.analysis.value!.net,
                              key: "gross",
                              onPressed: (key) {
                                Get.to(() => NetProfitOverview(
                                      firstday: DateTime.parse(reportsController
                                          .filterStartDate.value),
                                      lastday: DateTime.parse(reportsController
                                          .filterEndDate.value),
                                    ));
                              }),
                          summaryCard(
                              title: "Total Taxes",
                              description: '',
                              amount:
                                  salesController.analysis.value!.totalTaxes,
                              key: "taxes",
                              onPressed: (key) {}),
                          summaryCard(
                              title: "Total Expenses",
                              description: 'All Expenses',
                              amount:
                                  salesController.analysis.value!.totalExpenses,
                              key: "gross",
                              onPressed: (key) {
                                Get.to(() => ExpensePage(
                                      firstday: DateTime.parse(reportsController
                                          .filterStartDate.value),
                                      lastday: DateTime.parse(reportsController
                                          .filterEndDate.value),
                                    ));
                              }),
                          summaryCard(
                              title: "Bad stock",
                              description: 'Click to view bad stock',
                              amount:
                                  salesController.analysis.value!.badStockValue,
                              key: "badstock",
                              onPressed: (key) {
                                Get.find<ProductController>().getBadStock(
                                    shopId: userController
                                        .currentUser.value?.primaryShop?.id,
                                    attendant: '',
                                    product: null,
                                    fromDate: DateFormat("yyy-MM-dd")
                                        .format(DateTime.now()),
                                    toDate: DateFormat("yyy-MM-dd").format(
                                        DateTime.now()
                                            .add(const Duration(days: 1))));
                                Get.to(() => BadStockPage(
                                      page: "profitspage",
                                    ));
                              }),
                        ],
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
          "Analysis ",
          style: TextStyle(color: AppColors.mainColor),
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
                              title: const Text("Profit and Expenses Report"),
                            ),
                            body: PdfPreview(
                              build: (context) => netSummaryPdf(
                                  salesController.analysis.value!,
                                  "PROFIT & EXPENSES OVERVIEW"),
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
          icon: Icon(
            Icons.clear,
            color: AppColors.mainColor,
          ),
        ),
      ),
    );
  }
}

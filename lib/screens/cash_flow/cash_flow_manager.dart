import 'package:data_table_2/data_table_2.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/customercontroller.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/main.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/screens/cash_flow/cashout_layout.dart';
import 'package:pointify/utils/colors.dart';

import '../../controllers/cashflowcontroller.dart';
import '../../controllers/expensecontroller.dart';
import '../../controllers/homecontroller.dart';
import '../../controllers/productcontroller.dart';
import '../../controllers/salescontroller.dart';
import '../../controllers/shopcontroller.dart';
import 'banks_transactions.dart';
import 'cash_in_layout.dart';
import 'cashflow_categories.dart';
import 'components/loading_shimmer.dart';

class CashFlowManager extends StatelessWidget {
  final ShopController shopController = Get.find<ShopController>();
  final CashFlowController cashFlowController = Get.find<CashFlowController>();
  final CustomerController customerController = Get.find<CustomerController>();
  final ExpenseController expensesController = Get.find<ExpenseController>();
  final SalesController salesController = Get.find<SalesController>();
  final ProductController productController = Get.find<ProductController>();

  CashFlowManager({Key? key}) : super(key: key) {
    cashFlowController.filteringCashflow.value = false;
    cashFlowController.toDate.value = DateTime.now();
    cashFlowController.fromDate.value = DateTime(
        cashFlowController.toDate.value.year,
        cashFlowController.toDate.value.month,
        1);
    cashFlowController.getCashFlowSummary(
        userController.currentUser.value!.primaryShop!.id!, "deposit");
  }

  Widget transactionWidget(
      {required onPressed,
      required date,
      required name,
      required cashIn,
      required cashOut}) {
    return InkWell(
      onTap: onPressed,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(date, style: TextStyle(color: Colors.black.withOpacity(0.5))),
          Text(name, style: const TextStyle(color: Colors.blue)),
          Text(cashIn, style: TextStyle(color: Colors.black.withOpacity(0.5))),
          Text(cashOut, style: TextStyle(color: Colors.black.withOpacity(0.5))),
        ],
      ),
    );
  }

// sitiweshen  pale bird app
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        elevation: 0.3,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        titleSpacing: 0.0,
        iconTheme: const IconThemeData(color: Colors.black),
        titleTextStyle: const TextStyle(color: Colors.black),
        leading: IconButton(
          onPressed: () {
            Get.back();
          },
          icon: const Icon(
            Icons.arrow_back_ios,
          ),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Cash flow",
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                )),
            Obx(() {
              return Text(
                userController.currentUser.value!.primaryShop == null
                    ? ""
                    : userController
                        .currentUser.value!.primaryShop!.name!.capitalize!,
                style: const TextStyle(
                  fontSize: 10,
                ),
              );
            })
          ],
        ),
        actions: [
          IconButton(onPressed: () {}, icon: const Icon(Icons.download))
        ],
      ),
      body: SafeArea(
        child: Obx(
          () => Column(
            mainAxisAlignment: MainAxisAlignment.start,
            children: [
              cashInHandWidget(context, "small"),
              cashFlowCategory(context),
              if (cashFlowController.isLoadingCashflow.isTrue)
                const Center(child: CircularProgressIndicator()),
              if (cashFlowController.isLoadingCashflow.isFalse)
                Expanded(
                  child: Obx(
                    () => DataTable2(
                        columnSpacing: 5,
                        horizontalMargin: 5,
                        minWidth: 400,
                        columns: const [
                          // Set the name of the colum
                          DataColumn(
                            label: Text('Date'),
                          ),
                          DataColumn(
                            label: Text('Name'),
                          ),
                          DataColumn(
                            label: Text('In'),
                          ),
                          DataColumn(
                            label: Text('Out'),
                          ),
                        ],
                        rows: cashFlowController.cashFlowCategoriesPreviewList
                            .map((element) => element)
                            .toList()),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget cashTotals(String size) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: size == "large"
          ? MainAxisAlignment.center
          : MainAxisAlignment.spaceBetween,
      children: [
        Column(
          children: [
            const Text("Total CashIn"),
            Obx(() {
              return cashFlowController.cashflowmanager.value == null
                  ? cashFlowloadingShimmer()
                  : Text(
                      htmlPrice(cashFlowController
                          .cashflowmanager.value!["cashintotal"]),
                      style: const TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.bold,
                          fontSize: 12));
            })
          ],
        ),
        if (size == "large") const Spacer(),
        Column(
          children: [
            const Text("Total CashOut"),
            Obx(() {
              return cashFlowController.isLoadingCashflow.value
                  ? cashFlowloadingShimmer()
                  : Text(htmlPrice(cashFlowController.totalCashOut.value),
                      style: const TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.bold,
                          fontSize: 12));
            })
          ],
        )
      ],
    );
  }

  Widget cashInHandWidget(context, type) {
    return Container(
      width: type == "small"
          ? double.infinity
          : MediaQuery.of(context).size.width * 0.5,
      margin: const EdgeInsets.all(10),
      decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10), color: Colors.white),
      child: Column(
        children: [
          const SizedBox(height: 5),
          Column(
            children: [
              Obx(
                () => cashFlowController.filteringCashflow.isTrue
                    ? Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          InkWell(
                            onTap: () {
                              cashFlowController.filteringCashflow.value =
                                  false;
                              cashFlowController.toDate.value = DateTime.now();
                              cashFlowController.fromDate.value = DateTime(
                                  cashFlowController.toDate.value.year,
                                  cashFlowController.toDate.value.month,
                                  1);
                              cashFlowController.getCashFlowSummary(
                                  userController
                                      .currentUser.value!.primaryShop!.id!,
                                  "deposit");
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 15, vertical: 5),
                              decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(10),
                                  color: AppColors.mainColor),
                              child: Row(children: [
                                Text(
                                  "${DateFormat("yyyy-MM-dd").format(cashFlowController.fromDate.value)} - ${DateFormat("yyyy-MM-dd").format(cashFlowController.toDate.value)}",
                                  style: const TextStyle(color: Colors.white),
                                ),
                                const SizedBox(
                                  width: 20,
                                ),
                                const Icon(
                                  Icons.cancel_outlined,
                                  color: Colors.white,
                                  size: 20,
                                )
                              ]),
                            ),
                          ),
                          const SizedBox(
                            width: 30,
                          ),
                          InkWell(
                            child: Icon(
                              Icons.filter_list,
                              size: 30,
                              color: AppColors.mainColor,
                            ),
                            onTap: () async {
                              await filterByDate(context);
                            },
                          )
                        ],
                      )
                    : InkWell(
                        onTap: () async {
                          await filterByDate(context);
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 20, vertical: 5),
                          decoration: BoxDecoration(
                              border: Border.all(color: AppColors.mainColor),
                              borderRadius: BorderRadius.circular(5)),
                          child: const Text("Filter by date"),
                        ),
                      ),
              ),
              Divider(
                color: AppColors.mainColor,
              )
            ],
          ),
          const SizedBox(height: 10),
          Center(
              child: Obx(
            () => Text(
                "Cash In Hand as on ${DateFormat("yyy-MM-dd").format(cashFlowController.toDate.value)}"),
          )),
          const SizedBox(height: 10),
          Center(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Obx(() {
                  return Text(
                    htmlPrice(cashFlowController
                        .cashflowmanager.value!["cashathand"]),
                    style: const TextStyle(
                        color: Colors.black, fontWeight: FontWeight.bold),
                  );
                }),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Obx(() {
            return Padding(
              padding: const EdgeInsets.only(left: 30.0, right: 30),
              child: InkWell(
                onTap: () {
                  Get.to(() => BanksTransactions());
                },
                splashColor: Theme.of(context).splashColor,
                child: Container(
                  padding: const EdgeInsets.only(
                      left: 20, right: 20, top: 10, bottom: 10),
                  decoration: BoxDecoration(
                      color: Colors.grey.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10)),
                  child: Column(
                    children: [
                      const Text(
                        "Cash At Bank",
                        style: TextStyle(color: Colors.black54),
                      ),
                      Text(
                        "${htmlPrice(cashFlowController.cashFlowCategotyWithTotals.fold(0, (previousValue, element) => element.name?.toLowerCase() == "bank" ? element.totalAmount! : previousValue))} /=",
                        style: const TextStyle(color: Colors.black),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
          const SizedBox(height: 15),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              TextButton(
                onPressed: () {
                  cashFlowController.getCashFlowCategoryWithTotals("cashin");
                  Get.to(() => CashInLayout());
                },
                child: Container(
                  padding: const EdgeInsets.only(
                      top: 5, bottom: 5, left: 10, right: 10),
                  decoration: BoxDecoration(
                      color: Colors.grey.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20)),
                  child: const Text(
                    "Add Cash In",
                    style: TextStyle(color: Colors.blue),
                  ),
                ),
              ),
              TextButton(
                onPressed: () {
                  cashFlowController.getCashFlowCategoryList("cashout");
                  Get.to(() => CashOutLayout());
                },
                child: Container(
                  padding: const EdgeInsets.only(
                      top: 5, bottom: 5, left: 10, right: 10),
                  decoration: BoxDecoration(
                      color: Colors.grey.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20)),
                  child: const Text(
                    "Add Cash Out",
                    style: TextStyle(color: Colors.redAccent),
                  ),
                ),
              )
            ],
          ),
          const SizedBox(height: 3),
        ],
      ),
    );
  }

  Future<void> filterByDate(context) async {
    final DateTime? d = await showDatePicker(
        context: context,
        lastDate: DateTime(2079),
        firstDate: DateTime(2019),
        builder: (context, child) {
          return Column(
            children: [
              ConstrainedBox(
                constraints: BoxConstraints(
                  maxWidth: MediaQuery.of(context).size.width,
                ),
                child: Container(
                    margin: EdgeInsets.only(
                      left: 0,
                    ),
                    child: child),
              )
            ],
          );
        },
        initialDate: DateTime(
            cashFlowController.toDate.value.year,
            cashFlowController.toDate.value.month,
            cashFlowController.toDate.value.day));
    if (d != null) {
      cashFlowController.filteringCashflow.value = true;
      cashFlowController.toDate.value = d;
      cashFlowController.fromDate.value = DateTime(
          cashFlowController.toDate.value.year,
          cashFlowController.toDate.value.month,
          1);
      cashFlowController.getCashFlowSummary(
          userController.currentUser.value!.primaryShop!.id!, "deposit");
    }
  }

  Widget cashFlowCategory(context) {
    return InkWell(
      onTap: () {
        cashFlowController.getCashFlowCategoryWithTotals("cashin");
        Get.to(() => CashFlowCategories());
      },
      child: Container(
        margin: const EdgeInsets.all(10),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(10)),
        child: const Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Categories",
                  style: TextStyle(color: Colors.black),
                ),
                Text(
                  "Manage Cashflow Categories",
                  style: TextStyle(color: Colors.grey),
                )
              ],
            ),
            Icon(
              Icons.arrow_forward_ios,
              color: Colors.black,
            )
          ],
        ),
      ),
    );
  }
}

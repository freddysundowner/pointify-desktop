import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/expensecontroller.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/main.dart';
import 'package:pointify/reports/expenses/expense_page.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/utils/helper.dart';
import 'package:printing/printing.dart';

import '../../controllers/homecontroller.dart';
import '../../controllers/reports_controller.dart';
import '../../models/expensecategory.dart';
import '../../screens/receipts/pdf/expenses/expenses_category_pdf.dart';
import '../../utils/colors.dart';
import '../../widgets/delete_dialog.dart';
import '../../widgets/filter_dates.dart';
import '../../widgets/textbutton.dart';
import 'expensecategory_transactions.dart';

class ExpensesCategories extends StatelessWidget {
  ExpensesCategories({Key? key}) : super(key: key) {
    expenseController.getExpenseCategoryWithTotals(
      fromDatee: reportsController.filterStartDate.value,
      toDatee: reportsController.filterEndDate.value,
    );
  }
  final ExpenseController expenseController = Get.find<ExpenseController>();

  @override
  Widget build(BuildContext context) {
    return ResponsiveWidget(
      largeScreen: _tabLayout(context),
      smallScreen: _tabLayout(context),
    );
  }

  final ReportsController reportsController = Get.find<ReportsController>();

  _printPdf() {
    Get.to(() => Scaffold(
          appBar: AppBar(
            title: const Text("Category Expenses report"),
          ),
          body: PdfPreview(
            build: (context) => expensesCategoryPdf(
                expenseController.expensesCategotyWithTotals,
                "Category Expenses report"),
          ),
        ));
  }

  Widget _tabLayout(context) {
    return Helper(
      widget: SingleChildScrollView(
        child: ConstrainedBox(
          constraints:
              BoxConstraints(maxHeight: MediaQuery.of(context).size.height),
          child: Obx(
            () => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(
                  height: 20,
                ),
                filterByDates(onFilter: (start, end, type) {
                  reportsController.activeFilter.value = type;
                  reportsController.filterStartDate.value = DateFormat(
                    "yyyy-MM-dd",
                  ).format(start);
                  reportsController.filterEndDate.value = DateFormat(
                    "yyyy-MM-dd",
                  ).format(end);

                  expenseController.getExpenseCategoryWithTotals(
                    fromDatee: reportsController.filterStartDate.value,
                    toDatee: reportsController.filterEndDate.value,
                  );
                }),
                const SizedBox(
                  height: 20,
                ),
                Padding(
                  padding:
                      const EdgeInsets.symmetric(vertical: 25, horizontal: 10),
                  child: Obx(() {
                    return Text(
                      htmlPrice(expenseController.expensesCategotyWithTotals
                          .fold(
                              0,
                              (previousValue, element) =>
                                  previousValue + element.totalAmount!)),
                      style: const TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.bold,
                          fontSize: 21),
                    );
                  }),
                ),
                Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text("Expenses categories"),
                      TextButton(
                        onPressed: () {
                          showDialog(
                              context: context,
                              builder: (context) {
                                return AlertDialog(
                                  title: const Text("Add Category"),
                                  content: Padding(
                                    padding: const EdgeInsets.all(8.0),
                                    child: TextFormField(
                                        controller: expenseController
                                            .textEditingControllerCategoryName,
                                        decoration: InputDecoration(
                                            hintText: "eg.Personal use etc",
                                            hintStyle:
                                                const TextStyle(fontSize: 12),
                                            border: OutlineInputBorder(
                                              borderRadius:
                                                  BorderRadius.circular(10),
                                            ))),
                                  ),
                                  actions: [
                                    TextButton(
                                      onPressed: () {
                                        Navigator.pop(context);
                                      },
                                      child: Text(
                                        "Cancel".toUpperCase(),
                                        style:
                                            const TextStyle(color: Colors.blue),
                                      ),
                                    ),
                                    TextButton(
                                      onPressed: () {
                                        Navigator.pop(context);
                                        expenseController
                                            .createExpensesCategory();
                                      },
                                      child: Text(
                                        "Save now".toUpperCase(),
                                        style:
                                            const TextStyle(color: Colors.blue),
                                      ),
                                    ),
                                  ],
                                );
                              });
                        },
                        child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                                color: const Color.fromARGB(255, 41, 41, 41)
                                    .withOpacity(0.2),
                                borderRadius: BorderRadius.circular(10)),
                            child: const Text(
                              "+ Add",
                              style: TextStyle(color: Colors.green),
                            )),
                      ),
                    ],
                  ),
                ),
                Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Obx(() => Text(
                          "${expenseController.expensesCategotyWithTotals.length} Total",
                          style: TextStyle(
                            color: Colors.grey.shade600,
                          ),
                        ))),
                expenseController.isLoadingExpense.value == true
                    ? const Center(
                        child: CircularProgressIndicator(),
                      )
                    : Expanded(
                        child: GridView.builder(
                            gridDelegate:
                                const SliverGridDelegateWithFixedCrossAxisCount(
                                    childAspectRatio: 2.5,
                                    crossAxisCount: 2,
                                    crossAxisSpacing: 10,
                                    mainAxisSpacing: 10),
                            itemBuilder: (context, index) {
                              ExpenseCategory expensecategory =
                                  expenseController.expensesCategotyWithTotals
                                      .elementAt(index);
                              return Padding(
                                padding: const EdgeInsets.all(8.0),
                                child: InkWell(
                                  onTap: () {
                                    actionsBottomSheet(
                                        context: context,
                                        expenseCategory: expensecategory);
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.only(
                                        left: 10,
                                        right: 10,
                                        top: 10,
                                        bottom: 3),
                                    width: double.infinity,
                                    decoration: BoxDecoration(
                                        color: Colors.white,
                                        border: Border.all(
                                            width: 1, color: Colors.black),
                                        borderRadius: BorderRadius.circular(8)),
                                    child: Row(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Icon(
                                          Icons.account_balance_wallet,
                                          color: Colors.grey,
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                expensecategory.name!,
                                                style: const TextStyle(
                                                    color: Colors.black),
                                              ),
                                              Text(
                                                htmlPrice(expensecategory
                                                    .totalAmount!),
                                                style: const TextStyle(
                                                    color: Colors.black),
                                              ),
                                            ],
                                          ),
                                        )
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            },
                            itemCount: expenseController
                                .expensesCategotyWithTotals.length),
                      )
              ],
            ),
          ),
        ),
      ),
      appBar: AppBar(
        elevation: 0.3,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        titleSpacing: 0.0,
        centerTitle: false,
        iconTheme: const IconThemeData(color: Colors.black),
        titleTextStyle: const TextStyle(color: Colors.black),
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
                    _printPdf();
                  }),
            ),
          const SizedBox(width: 10)
        ],
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Expenses Category",
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                )),
            Obx(() {
              return Text(
                userController.currentUser.value?.primaryShop == null
                    ? ""
                    : userController
                        .currentUser.value!.primaryShop!.name!.capitalize!,
                style: const TextStyle(
                  fontSize: 12,
                ),
              );
            })
          ],
        ),
        leading: IconButton(
            onPressed: () {
              expenseController.getExpenseCategoryWithTotals();
              if (MediaQuery.of(context).size.width > 600) {
                Get.find<HomeController>().selectedWidget.value = ExpensePage(
                    firstday: DateTime.now(), lastday: DateTime.now());
              } else {
                Get.back();
              }
            },
            icon: const Icon(Icons.arrow_back_ios)),
      ),
    );
  }
}

actionsBottomSheet({required context, ExpenseCategory? expenseCategory}) {
  ExpenseController expenseController = Get.find<ExpenseController>();
  expenseController.textEditingControllerDescriotion.text =
      expenseCategory!.name!;

  showModalBottomSheet(
      context: context,
      builder: (_) {
        return SizedBox(
          height: MediaQuery.of(context).size.height * 0.3,
          child: Column(
            children: [
              Container(
                color: AppColors.mainColor.withOpacity(0.1),
                width: double.infinity,
                child: const ListTile(
                  title: Text("Select Action"),
                ),
              ),
              ListTile(
                leading: const Icon(Icons.list),
                onTap: () {
                  Get.back();
                  if (MediaQuery.of(context).size.width > 600) {
                    Get.find<HomeController>().selectedWidget.value =
                        ExpenseCategoryTransactions(
                      expenseCategory: expenseCategory,
                      page: "cashflowcategory",
                    );
                  } else {
                    Get.to(() => ExpenseCategoryTransactions(
                        expenseCategory: expenseCategory));
                  }
                },
                title: const Text("View List"),
              ),
              ListTile(
                leading: const Icon(Icons.edit),
                onTap: () {
                  Get.back();
                  showDialog(
                      context: context,
                      builder: (_) {
                        return Dialog(
                          child: Container(
                            padding: const EdgeInsets.only(
                                left: 15, right: 15, top: 10, bottom: 3),
                            height: MediaQuery.of(context).size.height * 0.2,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text("Edit Category"),
                                const Spacer(),
                                TextFormField(
                                  controller: expenseController
                                      .textEditingControllerCategoryName,
                                  decoration: InputDecoration(
                                      contentPadding: const EdgeInsets.all(10),
                                      fillColor: Colors.white,
                                      filled: true,
                                      focusedBorder: OutlineInputBorder(
                                          borderRadius:
                                              BorderRadius.circular(8),
                                          borderSide: const BorderSide(
                                              color: Colors.grey, width: 0.5)),
                                      enabledBorder: OutlineInputBorder(
                                          borderRadius:
                                              BorderRadius.circular(8),
                                          borderSide: const BorderSide(
                                              color: Colors.grey, width: 0.5))),
                                ),
                                const SizedBox(
                                  height: 10,
                                ),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: [
                                    TextButton(
                                        onPressed: () {
                                          Get.back();
                                        },
                                        child: Text(
                                          "Cancel".toUpperCase(),
                                          style:  TextStyle(
                                              color: AppColors.mainColor),
                                        )),
                                    const SizedBox(
                                      width: 10,
                                    ),
                                    TextButton(
                                        onPressed: () {
                                          Get.back();
                                          if (expenseController
                                              .textEditingControllerCategoryName
                                              .text
                                              .isNotEmpty) {
                                            expenseController
                                                .editExpenseCategory(
                                                    expenseCategory);
                                          }
                                        },
                                        child: Text(
                                          "Save".toUpperCase(),
                                          style:  TextStyle(
                                              color: AppColors.mainColor),
                                        )),
                                  ],
                                )
                              ],
                            ),
                          ),
                        );
                      });
                },
                title: const Text("Edit"),
              ),
              ListTile(
                leading: const Icon(Icons.delete),
                onTap: () {
                  Get.back();
                  deleteDialog(
                      context: context,
                      onPressed: () {
                        expenseController
                            .deleteExpenseCategory(expenseCategory);
                      });
                },
                title: const Text("Delete"),
              )
            ],
          ),
        );
      });
}

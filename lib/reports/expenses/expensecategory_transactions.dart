import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/expensecontroller.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/utils/helper.dart';
import 'package:pointify/widgets/no_items_found.dart';
import 'package:printing/printing.dart';

import '../../controllers/salescontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../main.dart';
import '../../models/expensecategory.dart';
import '../../models/expensestransaction.dart';
import '../../screens/receipts/pdf/expenses/categy_all_expenses_pdf.dart';
import '../../utils/colors.dart';
import '../../widgets/textbutton.dart';

class ExpenseCategoryTransactions extends StatelessWidget {
  final ExpenseCategory? expenseCategory;
  final String? page;
  final ShopController shopController = Get.find<ShopController>();
  final SalesController salesController = Get.find<SalesController>();
  final ExpenseController expenseController = Get.find<ExpenseController>();

  ExpenseCategoryTransactions({Key? key, this.page, this.expenseCategory})
      : super(key: key) {
    expenseController.getExpensesCategorytransactions(expenseCategory!.id!);
  }
  final String title = "";

  @override
  Widget build(BuildContext context) {
    return ResponsiveWidget(
      largeScreen: Scaffold(
        backgroundColor: Colors.white,
        appBar: _appBar("large", context),
        body: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Obx(() {
                  return expenseController.expensesCategoryTransactions.isEmpty
                      ? noItemsFound(context, true)
                      : Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 5, vertical: 10),
                          child: Theme(
                            data: Theme.of(context)
                                .copyWith(dividerColor: Colors.grey),
                            child: DataTable(
                              decoration: BoxDecoration(
                                  border: Border.all(
                                width: 1,
                                color: Colors.black,
                              )),
                              columnSpacing: 30.0,
                              columns: [
                                DataColumn(
                                    label: Text(
                                        'Amount(${userController.currentUser.value!.primaryShop?.currency})',
                                        textAlign: TextAlign.center)),
                                const DataColumn(
                                    label: Text('Date',
                                        textAlign: TextAlign.center)),
                              ],
                              rows: List.generate(
                                  expenseController.expensesCategoryTransactions
                                      .length, (index) {
                                ExpensesTransactionModel cashFlowTransaction =
                                    expenseController
                                        .expensesCategoryTransactions
                                        .elementAt(index);
                                final y = cashFlowTransaction.amount;
                                final x = cashFlowTransaction.createdAt;

                                return DataRow(cells: [
                                  DataCell(Text(y.toString())),
                                  DataCell(Text(DateFormat("yyyy-dd-MM")
                                      .format(DateTime.parse(x!).toUtc()))),
                                ]);
                              }),
                            ),
                          ),
                        );
                }),
                const SizedBox(height: 60),
              ],
            ),
          ),
        ),
      ),
      smallScreen: Helper(
        widget: Obx(() {
          return expenseController.expensesCategoryTransactions.isEmpty
              ? noItemsFound(context, true)
              : ListView.builder(
                  itemCount:
                      expenseController.expensesCategoryTransactions.length,
                  shrinkWrap: true,
                  itemBuilder: (context, index) {
                    ExpensesTransactionModel expensesTransactionModel =
                        expenseController.expensesCategoryTransactions
                            .elementAt(index);
                    return transactionsCard(
                        expensesTransactionModel: expensesTransactionModel);
                  });
        }),
        appBar: _appBar("small", context),
        bottomNavigationBar: BottomAppBar(
          child: Container(
            padding: const EdgeInsets.all(10),
            height: kToolbarHeight,
            color: Colors.white,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  "Total ".capitalize!,
                  style: const TextStyle(color: Colors.black),
                ),
                const SizedBox(
                  width: 20,
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.8),
                      borderRadius: BorderRadius.circular(20)),
                  child: Obx(() => Text(
                        htmlPrice(expenseController.expensesCategoryTransactions
                            .fold(
                                0,
                                (previousValue, element) =>
                                    previousValue + element.amount!)),
                        style: const TextStyle(fontSize: 21),
                      )),
                )
              ],
            ),
          ),
        ),
      ),
    );
  }

  showBottomSheet(BuildContext context) {
    return showModalBottomSheet<void>(
        context: context,
        builder: (BuildContext context) {
          return SizedBox(
              height: 150,
              child: Center(
                  child: Column(
                children: [
                  const Padding(
                    padding: EdgeInsets.all(8.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.start,
                      children: [Text('Download As')],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Row(
                      children: [
                        const Icon(Icons.file_open_outlined),
                        const SizedBox(
                          width: 10,
                        ),
                        Text('PDF'.toUpperCase())
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Row(
                      children: [
                        const Icon(Icons.book),
                        const SizedBox(
                          width: 10,
                        ),
                        Text('Excel'.toUpperCase())
                      ],
                    ),
                  ),
                ],
              )));
        });
  }

  Widget transactionsCard(
      {required ExpensesTransactionModel expensesTransactionModel}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          color: Colors.white,
          width: double.infinity,
          padding: const EdgeInsets.all(10),
          child: Row(
            children: [
               CircleAvatar(
                backgroundColor: AppColors.mainColor,
                child: Icon(Icons.check),
              ),
              const SizedBox(
                width: 10,
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    expensesTransactionModel.description!,
                    style: const TextStyle(
                        color: Colors.grey, fontWeight: FontWeight.w600),
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        "@${htmlPrice(expensesTransactionModel.amount)}",
                        style: const TextStyle(color: Colors.grey),
                      ),
                      const SizedBox(
                        width: 80,
                      ),
                      Text(
                        DateFormat("MMM dd yyyy hh:mm a").format(
                            DateTime.parse(expensesTransactionModel.createdAt!)
                                .toUtc()),
                        style:
                            const TextStyle(color: Colors.grey, fontSize: 11),
                      ),
                    ],
                  ),
                ],
              )
            ],
          ),
        ),
        const Divider(
          thickness: 0.2,
          color: Colors.grey,
        )
      ],
    );
  }

  AppBar _appBar(type, context) {
    return AppBar(
      elevation: 0.3,
      backgroundColor: Colors.white,
      foregroundColor: Colors.black,
      titleSpacing: 0.0,
      centerTitle: false,
      iconTheme: const IconThemeData(color: Colors.black),
      titleTextStyle: const TextStyle(color: Colors.black),
      leading: IconButton(
          onPressed: () {
            Get.back();
          },
          icon: const Icon(
            Icons.arrow_back_ios,
          )),
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title.capitalize!,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
              )),
          const Text(
            "All Records",
            style: TextStyle(
              fontSize: 10,
            ),
          )
        ],
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
                          title: const Text("Sales summary report"),
                        ),
                        body: PdfPreview(
                          build: (context) => categoryAllExpensesPdf(
                              expenseController.expensesCategoryTransactions,
                              "${expenseCategory!.name!.toString().toUpperCase()} EXPENSES REPORT"),
                        ),
                      ));
                }),
          ),
        const SizedBox(width: 10)
      ],
    );
  }
}

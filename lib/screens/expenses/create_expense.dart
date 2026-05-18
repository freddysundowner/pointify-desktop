import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/expensecontroller.dart';
import 'package:pointify/models/expense.dart';
import 'package:pointify/reports/expenses/expense_page.dart';
import 'package:pointify/responsive/responsiveness.dart';

import '../../controllers/homecontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../models/expensecategory.dart';
import '../../utils/colors.dart';
import '../../widgets/major_title.dart';

class CreateExpense extends StatelessWidget {
  final String? from;
  final ExpenseModel? expense;

  CreateExpense({Key? key, this.from, this.expense}) : super(key: key) {
    expenseController.getExpenseCategoryWithTotals();
    if (expense != null) {
      expenseController.textEditingControllerDescriotion.text = expense!.name!;
      expenseController.textEditingControllerAmount.text =
          expense!.amount!.toString();
      expenseController.selectedExpensesCategoty.value = expense!.category!;
      List l = expenseController.autosaveoptions
          .where((p0) => p0["name"] == expense!.frequency)
          .toList();
      expenseController.selectedsaveoption.value = l.isEmpty ? {} : l[0];
    } else {
      expenseController.textEditingControllerCategoryName.clear();
      expenseController.textEditingControllerAmount.clear();
      expenseController.selectedExpensesCategoty.value = null;
      expenseController.selectedsaveoption.value = {};
    }
  }

  final ShopController shopController = Get.find<ShopController>();
  final ExpenseController expenseController = Get.find<ExpenseController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          titleSpacing: 0,
          centerTitle: false,
          backgroundColor: Colors.white,
          elevation: 0.3,
          leading: IconButton(
            onPressed: () {
              Get.back();
            },
            icon: const Icon(
              Icons.arrow_back_ios,
              color: Colors.black,
            ),
          ),
          title: majorTitle(
              title:
                  from == 'CashFlowManager' ? "Add cash out" : " Add Expenses",
              color: Colors.black,
              size: 16.0),
        ),
        body: Container(
          padding: EdgeInsets.symmetric(horizontal: 0).copyWith(right: 0),
          child: ListView(children: [
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: expenseCreateCard(context),
            ),
            const SizedBox(height: 10),
          ]),
        ));
  }

  Widget expenseCreateCard(context) {
    final List<DropdownMenuEntry<ExpenseCategory>> cashFlowCategories =
        <DropdownMenuEntry<ExpenseCategory>>[];
    for (final ExpenseCategory c
        in expenseController.expensesCategotyWithTotals) {
      cashFlowCategories
          .add(DropdownMenuEntry<ExpenseCategory>(value: c, label: c.name!));
    }

    return Form(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                flex: 1,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("Category",
                        style: TextStyle(color: Colors.black)),
                    const SizedBox(height: 10),
                    Container(
                      width: MediaQuery.of(context).size.width,
                      padding: const EdgeInsets.symmetric(
                          vertical: 0, horizontal: 10),
                      decoration: BoxDecoration(
                          border: Border.all(
                            color: Colors.black,
                          ),
                          borderRadius: BorderRadius.circular(10)),
                      child: Obx(
                        () => DropdownMenu<ExpenseCategory>(
                          width: MediaQuery.of(context).size.width * 0.65,
                          enableFilter: true,
                          requestFocusOnTap: true,
                          hintText: expenseController
                                      .selectedExpensesCategoty.value !=
                                  null
                              ? expenseController
                                  .selectedExpensesCategoty.value?.name
                              : 'Select category',
                          dropdownMenuEntries: expenseController
                              .expensesCategotyWithTotals
                              .map((c) => DropdownMenuEntry<ExpenseCategory>(
                                  value: c, label: c.name!))
                              .toList(),
                          inputDecorationTheme: const InputDecorationTheme(
                            filled: false,
                            contentPadding: EdgeInsets.zero,
                            border: InputBorder.none,
                          ),
                          initialSelection: expenseController
                              .selectedExpensesCategoty
                              .value, // Set the default value
                          onSelected: (ExpenseCategory? c) {
                            expenseController.selectedExpensesCategoty.value =
                                c!;
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(top: 20.0),
                child: TextButton(
                  onPressed: () {
                    _addCategory(context);
                  },
                  child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          border:
                              Border.all(color: AppColors.mainColor, width: 2)),
                      child: Text(
                        "+ Add",
                        style: TextStyle(color: AppColors.mainColor),
                      )),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const SizedBox(height: 10),
          Obx(() => Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Description",
                      style: TextStyle(color: Colors.black)),
                  const SizedBox(height: 10),
                  TextField(
                    controller:
                        expenseController.textEditingControllerDescriotion,
                    decoration: InputDecoration(
                        focusedBorder: OutlineInputBorder(
                          borderSide: const BorderSide(color: Colors.black),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        border: OutlineInputBorder(
                            borderSide: const BorderSide(color: Colors.black),
                            borderRadius: BorderRadius.circular(10))),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text("Amount",
                                style: TextStyle(color: Colors.black)),
                            const SizedBox(height: 10),
                            TextField(
                              controller:
                                  expenseController.textEditingControllerAmount,
                              keyboardType: TextInputType.number,
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly
                              ],
                              decoration: InputDecoration(
                                  focusedBorder: OutlineInputBorder(
                                    borderSide:
                                        const BorderSide(color: Colors.black),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  border: OutlineInputBorder(
                                      borderSide:
                                          const BorderSide(color: Colors.black),
                                      borderRadius: BorderRadius.circular(10))),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(
                        width: 20,
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text("Date",
                                style: TextStyle(color: Colors.black)),
                            const SizedBox(height: 10),
                            TextField(
                              controller:
                                  expenseController.textEditingControllerDate,
                              readOnly: true,
                              decoration: InputDecoration(
                                  focusedBorder: OutlineInputBorder(
                                    borderSide:
                                        const BorderSide(color: Colors.black),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  border: OutlineInputBorder(
                                      borderSide:
                                          const BorderSide(color: Colors.black),
                                      borderRadius: BorderRadius.circular(10))),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      const Text("Recurring Expense?",
                          style: TextStyle(fontSize: 18)),
                      Obx(
                        () => CupertinoSwitch(
                          value: expenseController.autoSave.value!,
                          activeColor: AppColors.mainColor,
                          onChanged: (value) {
                            expenseController.autoSave.value = value;
                            expenseController.autoSave.refresh();
                          },
                        ),
                      ),
                    ],
                  ),
                  if (expenseController.autoSave.value == true)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Run Every"),
                        const Text(
                            "Helps you manage this expense automatically on a schedule you choose",
                            style:
                                TextStyle(color: Colors.black, fontSize: 11)),
                        const SizedBox(height: 10),
                        InkWell(
                          onTap: () {
                            showDialog(
                              context: context,
                              builder: (BuildContext context) {
                                return AlertDialog(
                                  title: const Text('Select an option'),
                                  content: SizedBox(
                                    width: double.maxFinite,
                                    child: ListView.builder(
                                      shrinkWrap: true,
                                      itemCount: expenseController
                                          .autosaveoptions.length,
                                      itemBuilder:
                                          (BuildContext context, int index) {
                                        return ListTile(
                                          title: Text(expenseController
                                              .autosaveoptions[index]["value"]),
                                          onTap: () {
                                            // Handle option selection here
                                            Navigator.pop(
                                                context,
                                                expenseController
                                                    .autosaveoptions[index]);
                                            expenseController
                                                    .selectedsaveoption.value =
                                                expenseController
                                                    .autosaveoptions[index];
                                          },
                                        );
                                      },
                                    ),
                                  ),
                                );
                              },
                            );
                          },
                          child: Container(
                            width: MediaQuery.of(context).size.width,
                            padding: const EdgeInsets.symmetric(
                                vertical: 15, horizontal: 10),
                            decoration: BoxDecoration(
                                border: Border.all(
                                  color: Colors.black,
                                ),
                                borderRadius: BorderRadius.circular(10)),
                            child: Obx(
                              () => Text(
                                expenseController.selectedsaveoption['value'] ??
                                    "Select Interval",
                                style: const TextStyle(fontSize: 16),
                              ),
                            ),
                          ),
                        ),
                      ],
                    )
                ],
              )),
          const SizedBox(height: 100),
          Center(
            child: Obx(
              () => expenseController.isCreatingExpense.value == true
                  ? const Center(
                      child: CircularProgressIndicator(),
                    )
                  : InkWell(
                      onTap: () async {
                        await expenseController.createExpenses(
                            expenseController.selectedExpensesCategoty.value!,
                            expenseId: expense?.id ?? "");
                      },
                      child: Container(
                          padding: const EdgeInsets.only(
                              top: 10, bottom: 10, left: 60, right: 60),
                          decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                  color: AppColors.mainColor, width: 2)),
                          child: majorTitle(
                              title: expense == null ? "Save" : "Updated",
                              color: AppColors.mainColor,
                              size: 13.0)),
                    ),
            ),
          )
        ],
      ),
    );
  }

  void _addCategory(context) {
    showDialog(
        context: context,
        builder: (context) {
          return AlertDialog(
            title: const Text("Add Category"),
            content: Padding(
              padding: const EdgeInsets.all(5.0),
              child: TextFormField(
                  controller:
                      expenseController.textEditingControllerCategoryName,
                  decoration: InputDecoration(
                      hintText: "eg, rent",
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                      ))),
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                },
                child: Text(
                  "Cancel".toUpperCase(),
                  style: const TextStyle(color: Colors.blue),
                ),
              ),
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  expenseController.createExpensesCategory();
                },
                child: Text(
                  "Save now".toUpperCase(),
                  style: const TextStyle(color: Colors.blue),
                ),
              ),
            ],
          );
        });
  }
}

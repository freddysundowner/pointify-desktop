import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/main.dart';
import 'package:pointify/services/expenses.dart';
import 'package:pointify/widgets/snackBars.dart';

import '../models/expense.dart';
import '../models/expensecategory.dart';
import '../models/expensestransaction.dart';
import '../widgets/alert.dart';
import 'cashflowcontroller.dart';

class ExpenseController {
  RxList<ExpenseModel> expenses = RxList([]);
  TextEditingController textEditingControllerAmount = TextEditingController();
  TextEditingController textEditingControllerDate = TextEditingController(
    text: DateFormat("yyyy-MM-dd").format(DateTime.now()),
  );
  TextEditingController textEditingControllerDescriotion =
      TextEditingController();
  RxList<ExpensesTransactionModel> expensesCategoryTransactions = RxList([]);
  TextEditingController textEditingControllerCategoryName =
      TextEditingController();
  RxList<ExpenseCategory> expensesCategotyWithTotals = RxList([]);
  Rxn<ExpenseCategory> selectedExpensesCategoty = Rxn(null);

  var fromDate = DateTime.now().obs;
  var toDate = DateTime.now().obs;
  RxInt totalExpenses = RxInt(0);
  RxnBool isCreatingExpense = RxnBool(false);
  RxnBool isLoadingExpense = RxnBool(false);
  RxnBool autoSave = RxnBool(false);
  RxMap selectedsaveoption = RxMap({});

  RxList autosaveoptions = RxList([
    {
      "name": "current_date_of_month",
      "value": "Date ${DateFormat("dd").format(DateTime.now())} of Every Month"
    },
    {"name": "daily", "value": "Every day"},
    {"name": "weekday", "value": "Every Monday - Friday"},
    {"name": "weekend", "value": "Every Saturday - Sunday"},
    {"name": "start_of_month", "value": "Every Start of Month"},
    {"name": "end_of_month", "value": "Every End of Month"},
    {"name": "yearly", "value": "Every End of Year"},
  ]);

  createExpenses(ExpenseCategory expenseCategory, {String? expenseId}) async {
    try {
      if (textEditingControllerAmount.text.isEmpty) {
        showSnackBar(message: "enter amount", color: Colors.red);
        return;
      }
      isCreatingExpense.value = true;
      var data = {
        "description": textEditingControllerDescriotion.text,
        "amount": int.parse(textEditingControllerAmount.text),
        "category": expenseCategory.id,
        "autoSave": autoSave.value,
        "frequency": selectedsaveoption["name"] ?? "",
        "attendantId": userController.currentUser.value!.attendantId,
        "shopId": userController.currentUser.value!.primaryShop?.id
      };
      var response={};
      if (expenseId != null && expenseId.isNotEmpty) {
        data["expenseId"] = expenseId;
        response = await ExpensesServices.updateExpenses(expenseId, data);
      } else {
        response = await ExpensesServices.createExpenses(data);
      }
      if (response["error"] != null) {
        showSnackBar(message: response["error"], color: Colors.red);
        return;
      }
      Get.back();
      Get.find<CashFlowController>().textEditingControllerName.clear();
      textEditingControllerDescriotion.clear();
      textEditingControllerAmount.clear();
      selectedExpensesCategoty.value = null;
      isCreatingExpense.value = false;
      getExpenses();
    } on Exception {
      isCreatingExpense.value = false;
      // TODO
    }
  }

  getExpenses(
      {String? shop = "", String? fromDate = "", String? toDate = ""}) async {
    if (fromDate!.isEmpty) {
      fromDate = DateFormat("yyyy-MM-dd").format(DateTime.now());
      toDate = DateFormat("yyyy-MM-dd").format(DateTime.now());
    }
    List response = await ExpensesServices.getExpenses(
        shop: userController.currentUser.value?.primaryShop!.id,
        fromDate: fromDate,
        toDate: toDate);
    expenses.value = response.map((e) => ExpenseModel.fromJson(e)).toList();
    return response;
  }

  deleteExpenses(String expenseId) async {
    expenses
        .removeAt(expenses.indexWhere((element) => element.id == expenseId));
    await ExpensesServices.deleteExpenses(expenseId);
  }

  getExpensesCategorytransactions(String s) async {
    expensesCategoryTransactions.clear();
    List<dynamic> response = await ExpensesServices.getExpensestransactions(s);
    expensesCategoryTransactions.addAll(
        response.map((e) => ExpensesTransactionModel.fromJson(e)).toList());
    expensesCategoryTransactions.refresh();
  }

  createExpensesCategory() async {
    var data = {
      "name": textEditingControllerCategoryName.text,
      "shopId": userController.currentUser.value?.primaryShop?.id
    };
    var respose = await ExpensesServices.createExpensesCategory(data);
    if (respose["error"] != null) {
      generalAlert(message: respose["error"]);
      return;
    }
    textEditingControllerCategoryName.clear();
    getExpenseCategoryWithTotals();
  }

  getExpenseCategoryWithTotals({
    String? fromDatee = "",
    String? toDatee = "",
  }) async {
    expensesCategotyWithTotals.clear();
    if (fromDatee!.isEmpty) {
      fromDatee = DateFormat("yyyy-MM-dd")
          .format(DateTime(fromDate.value.year, fromDate.value.month, 1));
      toDatee = DateFormat("yyyy-MM-dd").format(toDate.value);
    }
    isLoadingExpense.value = true;
    List<dynamic> response =
        await ExpensesServices.getExpensesCategoryWithTotals(
            userController.currentUser.value?.primaryShop?.id,
            fromDatee,
            toDatee!);
    isLoadingExpense.value = false;
    expensesCategotyWithTotals
        .addAll(response.map((e) => ExpenseCategory.fromJson(e)).toList());
  }

  Future editExpenseCategory(ExpenseCategory expenseCategory) async {
    var data = {
      "name": textEditingControllerCategoryName.text,
    };
    var respose =
        await ExpensesServices.editExpenseCategory(data, expenseCategory.id!);
    if (respose["error"] != null) {
      generalAlert(message: respose["error"]);
      return;
    }
    textEditingControllerCategoryName.clear();
    getExpenseCategoryWithTotals();
  }

  Future<void> deleteExpenseCategory(ExpenseCategory expenseCategory) async {
    await ExpensesServices.deleteExpensesCategory(expenseCategory.id!);
    getExpenseCategoryWithTotals();
    getExpenses();
  }
}

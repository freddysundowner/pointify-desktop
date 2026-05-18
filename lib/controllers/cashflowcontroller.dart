import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/salescontroller.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/cashflow.dart';
import 'package:pointify/models/cashflowcategory.dart';
import 'package:pointify/models/cashflowtransaction.dart';
import 'package:pointify/utils/colors.dart';
import 'package:pointify/widgets/alert.dart';

import '../functions/functions.dart';
import '../models/bank.dart';
import '../screens/sales/all_sales.dart';
import '../services/cashflow.dart';
import '../widgets/snackBars.dart';

class CashFlowController extends GetxController {
  RxList<CashFlowModel> cashflows = RxList([]);
  RxList<CashFlowCategory> cashFlowCategotyWithTotals = RxList([]);
  RxList<CashFlowCategory> cashFlowCategotyLists = RxList([]);
  Rxn<CashFlowCategory> selectedcashFlowCategoty = Rxn(null);
  RxList<BankModel> cashAtBanks = RxList([]);
  RxList<BankModel> bankslist = RxList([]);
  RxBool filteringCashflow = RxBool(false);
  RxString title =RxString("") ;
  Rxn<Map<String, dynamic>> cashflowmanager = Rxn({
    "totalSales": 0,
    "cashintotal": 0,
    "cashoutotal": 0,
    "salesDebtTotalPaid": 0,
    "purchasesTotalPaid": 0,
    "purchasestotal": 0,
    "cashathand": 0,
    "walletTotals": 0,
    "totalExpenses": 0,
    'balForward': 0
  });
  Rxn<BankModel> selectedBank = Rxn(null);
  RxList<CashFlowTransaction> categoryCashflowTransactions = RxList([]);
  TextEditingController textEditingControllerName = TextEditingController();
  TextEditingController textEditingControllerAmount = TextEditingController();
  TextEditingController textEditingControllerBankName = TextEditingController();

  TextEditingController textEditingControllerCategory = TextEditingController();
  var fromDate = DateTime.now().obs;
  var toDate = DateTime.now().obs;
  RxInt totalCashIn = RxInt(0);
  RxInt totalCashOut = RxInt(0);
  RxInt cashatHand = RxInt(0);
  RxInt cashflowcategoriesinitialPage = RxInt(0);
  RxInt purchasedItemsTotal = RxInt(0);
  TextEditingController textEditingControllerCategoryName =
      TextEditingController();

  RxBool isLoadingCashflow = RxBool(false);
  RxBool isLoadingBanksTransactions = RxBool(false);
  RxList<DataRow> cashFlowCategoriesPreviewList = RxList([]);

  RxnBool isCreatingCashFlow = RxnBool(false);
  calculdateCashatHand() {
    totalCashIn.value = 0;
    totalCashOut.value = 0;
    cashatHand.value = totalCashIn.value - totalCashOut.value;
  }

  createCashFlow(CashFlowCategory cashFlowCategory, {String? expenseId}) async {
    if (textEditingControllerAmount.text.isEmpty) {
      showSnackBar(message: "enter amount", color: Colors.red);
      return;
    }
    if (cashFlowCategory.name?.toLowerCase() == "bank") {
      if (selectedBank.value == null) {
        showSnackBar(message: "select bank", color: Colors.red);
        return;
      }
      textEditingControllerName.text = selectedBank.value!.name!;
    } else {
      if (textEditingControllerName.text.isEmpty) {
        showSnackBar(message: "enter name", color: Colors.red);
        return;
      }
    }
    isCreatingCashFlow.value = true;
    var data = {
      "name": Get.find<CashFlowController>().textEditingControllerName.text,
      "amount": int.parse(textEditingControllerAmount.text),
      "category": cashFlowCategory.id,
      "bank": Get.find<CashFlowController>().selectedBank.value?.id!,
      "attendantId": userController.currentUser.value!.attendantId,
      "shopId": userController.currentUser.value!.primaryShop?.id
    };
    var response ={};
    if (expenseId != null && expenseId.isNotEmpty) {
      data["expenseId"] = expenseId;
      response = await CashFlowServices.updateCashFlow(expenseId, data);
    } else {
      response = await CashFlowServices.createCashFlow(data);
    }
    if (response["error"] != null) {
      showSnackBar(message: response["error"], color: Colors.red);
      return;
    }
    Get.back();
    Get.find<CashFlowController>().textEditingControllerName.clear();
    textEditingControllerAmount.clear();
    Get.find<CashFlowController>().selectedcashFlowCategoty.value = null;
    Get.find<CashFlowController>().selectedBank.value = null;
    isCreatingCashFlow.value = false;
    getCashFlow();
  }

  getCashFlow(
      {String? shop = "", String? fromDate = "", String? toDate = ""}) async {
    if (fromDate!.isEmpty) {
      fromDate = DateFormat("yyyy-MM-dd").format(DateTime.now());
      toDate = DateFormat("yyyy-MM-dd").format(DateTime.now());
    }
    List response = await getCashFlow(
        shop: userController.currentUser.value?.primaryShop!.id,
        fromDate: fromDate,
        toDate: toDate);
    cashflows.value = response.map((e) => CashFlowModel.fromJson(e)).toList();
    return response;
  }

  getCashFlowCategoriesPreview() {
    cashFlowCategoriesPreviewList.clear();
    var list = [
      {
        "date": DateFormat("MMM-yyyy").format(DateTime(
            fromDate.value.year, fromDate.value.month - 1, fromDate.value.day)),
        "name": "C.Forward",
        "key": "cf",
        "color": AppColors.mainColor,
        "out": cashflowmanager.value!["balForward"] < 0
            ? cashflowmanager.value!["balForward"]
            : "",
        "in": cashflowmanager.value!["balForward"] >= 0
            ? cashflowmanager.value!["balForward"]
            : "",
      },
      {
        "date": DateFormat("MMM-yyyy").format(fromDate.value),
        "name": "Sales",
        "key": "sales",
        "out": "",
        "in": cashflowmanager.value!["totalSales"],
      },
      {
        "date": DateFormat("MMM-yyyy").format(fromDate.value),
        "name": "Collected",
        "key": "debtcollected",
        "in": cashflowmanager.value!["salesDebtTotalPaid"],
        "out": ''
      },
      {
        "date": DateFormat("MMM-yyyy").format(fromDate.value),
        "name": "Purchases",
        "key": "cashpurchases",
        "in": "",
        "out": cashflowmanager.value!["purchasestotal"],
      },
      {
        "date": DateFormat("MMM-yyyy").format(fromDate.value),
        "name": "Payouts",
        "key": "purchasespaid",
        "in": "",
        "out": cashflowmanager.value!["purchasesTotalPaid"],
      },
      {
        "date": DateFormat("MMM-yyyy").format(fromDate.value),
        "name": "Expenses",
        "key": "expenses",
        "in": "",
        "out": cashflowmanager.value!["totalExpenses"],
      },
      {
        "date": DateFormat("MMM-yyyy").format(fromDate.value),
        "name": "Wallets",
        "key": "cw",
        "in": cashflowmanager.value!["walletTotals"],
        "out": '',
      }
    ];
    list.addAll(cashFlowCategotyWithTotals
        .map((element) => {
              "date": DateFormat("MMM-yyyy")
                  .format(DateTime.parse(element.createdAt!)),
              "key": element.name?.trim().toLowerCase(),
              "name": element.name,
              "in": element.type == "cashin" ? element.totalAmount : '',
              "out": element.type == "cashout" ? element.totalAmount : '',
            })
        .toList());

    for (int i = 0; i < list.length; i++) {
      cashFlowCategoriesPreviewList.add(DataRow(cells: [
        DataCell(
            Text(
                list[i]["key"] == "cf"
                    ? "<<<${list[i]["date"]}"
                    : list[i]["date"],
                style: TextStyle(
                  color: list[i]["color"],
                )), onTap: () {
          if (list[i]["key"] == "cf") {
            fromDate.value =
                DateTime(fromDate.value.year, fromDate.value.month - 1, 1);
            toDate.value = fromDate.value.add(const Duration(days: 30));
            getCashFlowSummary(
                userController.currentUser.value!.primaryShop!.id!, "deposit");
          }
        }),
        DataCell(Text(list[i]["name"]), onTap: () {
          if (list[i]["name"] == "Sales") {
            Get.find<SalesController>().getSalesByDate(
                shop: userController.currentUser.value!.primaryShop!.id!,
                fromDate: DateFormat("yyy-MM-dd").format(
                    DateTime(DateTime.now().year, DateTime.now().month, 1)),
                toDate: DateFormat("yyy-MM-dd")
                    .format(DateTime.now().add(const Duration(days: 1))));
            Get.to(() => const AllSalesPage(
                  page: "Cashflowmanager",
                ));
          }
        }),
        DataCell(Text(
          list[i]['in'].toString(),
          style:  TextStyle(
              color: AppColors.mainColor, fontWeight: FontWeight.bold),
        )),
        DataCell(Text(list[i]['out'].toString())),
      ]));
    }
    cashFlowCategoriesPreviewList.refresh();
    cashflowmanager.refresh();
  }

  createCashFlowCategory(String type) async {
    var data = {
      "type": type,
      "name": textEditingControllerCategory.text,
      "shopId": userController.currentUser.value?.primaryShop?.id
    };
    var respose = await CashFlowServices.createCashFlowCategory(data);
    if (respose["error"] != null) {
      generalAlert(message: respose["error"]);
      return;
    }
    textEditingControllerCategoryName.clear();
    textEditingControllerCategory.clear();
    getCashFlowCategoryWithTotals(type);
    getCashFlowCategoryList("cashout");
  }

  getCashFlowCategoryList(String type) async {
    cashFlowCategotyLists.clear();
    List<dynamic> response = await CashFlowServices.getCashFlowCategoryList(
        userController.currentUser.value?.primaryShop?.id, type);
    cashFlowCategotyLists
        .addAll(response.map((e) => CashFlowCategory.fromJson(e)).toList());

    getCashFlowCategoriesPreview();
  }

  getCashFlowCategoryWithTotals(String type) async {
    cashFlowCategotyWithTotals.clear();
    String from = DateFormat("yyyy-MM-dd")
        .format(DateTime(fromDate.value.year, fromDate.value.month, 1));
    String to = DateFormat("yyyy-MM-dd").format(toDate.value);
    List<dynamic> response =
        await CashFlowServices.getCashFlowCategoryWithTotals(
            userController.currentUser.value?.primaryShop?.id, type, from, to);
    cashFlowCategotyWithTotals
        .addAll(response.map((e) => CashFlowCategory.fromJson(e)).toList());
    getCashFlowCategoriesPreview();
  }

  clearInputs() {
    textEditingControllerName.clear();
    textEditingControllerAmount.clear();
  }

  getCashflowtransactions() async {
    categoryCashflowTransactions.clear();
    List<dynamic> response = await CashFlowServices.getCashflowtransactions(
        userController.currentUser.value?.primaryShop?.id);
    categoryCashflowTransactions
        .addAll(response.map((e) => CashFlowTransaction.fromJson(e)).toList());
    categoryCashflowTransactions.refresh();
  }

  void getBanks() async {
    bankslist.clear();
    isLoadingBanksTransactions.value = true;
    List banks = await CashFlowServices()
        .getBanks(userController.currentUser.value!.primaryShop!.id!);
    isLoadingBanksTransactions.value = false;
    bankslist.addAll(banks.map((e) => BankModel.fromJson(e)).toList());
  }

  void createTransaction({required String type}) {}

  createBankNames() async {
    try {
      var bankdata = {
        "shop": userController.currentUser.value?.primaryShop!.id,
        "name": textEditingControllerBankName.text,
      };
      var response = await CashFlowServices().createBank(bankdata);
      if (response["error"] != null) {
        generalAlert(title: "Error", message: response["error"]);
        return;
      }
      textEditingControllerBankName.clear();
      getBanks();
    } catch (e) {
      debugPrintMessage(e);
    }
  }

  void getCashFlowSummary(String shop, String paymentType) async {
    String startDate = DateFormat("yyyy-MM-dd")
        .format(DateTime(fromDate.value.year, fromDate.value.month, 1));
    String endDate = DateFormat("yyyy-MM-dd").format(toDate.value);

    isLoadingCashflow.value = true;
    var response = await CashFlowServices.getCashFlowSummary(
        shop, startDate, endDate, paymentType);
    cashflowmanager.value = {
      "totalSales": response['totalSales'],
      "cashintotal": response['cashintotal'],
      "cashoutotal": response['cashoutotal'],
      "purchasestotal": response['purchasestotal'],
      "salesDebtTotalPaid": response['salesDebtTotalPaid'],
      "purchasesTotalPaid": response['purchasesTotalPaid'],
      "totalExpenses": response['totalExpenses'],
      "cashathand": response['cashathand'],
      "walletTotals": response['walletTotals'],
      "balForward": response['balForward']
    };
    isLoadingCashflow.value = false;
    getCashFlowCategoryWithTotals("all");
    cashflowmanager.refresh();
  }

  Future<void> getCategoryHistory(CashFlowCategory cashFlowCategory) async {
    categoryCashflowTransactions.clear();
    List response = await CashFlowServices.getCashflowCategoryTransactions(
        cashFlowCategory.id!);
    categoryCashflowTransactions.addAll(response.map((e) {
      return CashFlowTransaction.fromJson(e);
    }));
  }

  Future<void> deleteBank(String s) async {
  await CashFlowServices.deleteBank(s);
    getBanks();
  }

  Future<void> getBankTransactions(BankModel bank) async {
    categoryCashflowTransactions.clear();
    List response = await CashFlowServices.getBankTransactions(bank.id!);
    categoryCashflowTransactions.addAll(response.map((e) {
      return CashFlowTransaction.fromJson(e);
    }));
  }

  Future<void> updatebank(BankModel bankModel) async {
    if (textEditingControllerBankName.text.isNotEmpty) {
      bankModel.name = textEditingControllerBankName.text;
     await CashFlowServices.updateBank(
          bankModel, {"name": textEditingControllerBankName.text});
      textEditingControllerBankName.clear();
      getBanks();
    }
  }

  Future<void> updateCategory(String id) async {
    var response = await CashFlowServices.updateCategory(
        id, {"name": textEditingControllerCategory.text});
    cashFlowCategotyWithTotals[cashFlowCategotyWithTotals
            .indexWhere((element) => element.id == id)]
        .name = response["name"];
    cashFlowCategotyWithTotals.refresh();
    textEditingControllerCategory.clear();
  }

  Future<void> deleteCashflowCategory(CashFlowCategory cashFlowCategory) async {
    await CashFlowServices.deleteCashflowCategory(cashFlowCategory.id!);
    getCashFlowCategoryWithTotals(cashFlowCategory.type!);
  }
}

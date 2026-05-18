import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/expensecontroller.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/widgets/snackBars.dart';

import '../../controllers/cashflowcontroller.dart';
import '../../controllers/homecontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../main.dart';
import '../../models/bank.dart';
import '../../models/cashflowcategory.dart';
import '../../utils/colors.dart';
import '../../widgets/alert.dart';
import '../../widgets/major_title.dart';
import 'cash_flow_manager.dart';

class CashOutLayout extends StatelessWidget {
  final DateTime? date;

  CashOutLayout({Key? key, this.date}) : super(key: key);

  final CashFlowController cashFlowController = Get.find<CashFlowController>();
  final ShopController createShopController = Get.find<ShopController>();
  final ExpenseController expenseController = Get.find<ExpenseController>();

  @override
  Widget build(BuildContext context) {
    return PopScope(
      onPopInvoked: (val) {
        cashFlowController.clearInputs();
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          elevation: 0.3,
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          titleSpacing: 0.0,
          iconTheme: const IconThemeData(color: Colors.black),
          titleTextStyle: const TextStyle(color: Colors.black),
          centerTitle: false,
          title: const Text("Add Cash Out"),
          leading: IconButton(
              onPressed: () {
                if (MediaQuery.of(context).size.width > 600) {
                  Get.find<HomeController>().selectedWidget.value =
                      CashFlowManager();
                } else {
                  Get.back();
                }
                cashFlowController.clearInputs();
              },
              icon: const Icon(Icons.arrow_back_ios)),
        ),
        body: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(10.0),
            child: Container(
                padding: const EdgeInsets.all(20.0),
                width: double.infinity,
                decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(5)),
                child: Form(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text("Category",
                                    style: TextStyle(color: Colors.grey)),
                                const SizedBox(height: 10),
                                Container(
                                  width: MediaQuery.of(context).size.width,
                                  padding: const EdgeInsets.symmetric(
                                      vertical: 0, horizontal: 10),
                                  decoration: BoxDecoration(
                                      border: Border.all(
                                        color: Colors.grey,
                                      ),
                                      borderRadius: BorderRadius.circular(10)),
                                  child: Obx(
                                    () => DropdownMenu<CashFlowCategory>(
                                      width: MediaQuery.of(context).size.width *
                                          0.65,
                                      enableFilter: true,
                                      requestFocusOnTap: true,
                                      hintText: cashFlowController
                                                  .selectedcashFlowCategoty
                                                  .value !=
                                              null
                                          ? cashFlowController
                                              .selectedcashFlowCategoty
                                              .value
                                              ?.name
                                          : 'Select category',
                                      dropdownMenuEntries: cashFlowController
                                          .cashFlowCategotyLists
                                          .map((c) => DropdownMenuEntry<
                                                  CashFlowCategory>(
                                              value: c, label: c.name!))
                                          .toList(),
                                      inputDecorationTheme:
                                          const InputDecorationTheme(
                                        filled: false,
                                        contentPadding: EdgeInsets.zero,
                                        border: InputBorder.none,
                                      ),
                                      initialSelection: cashFlowController
                                          .selectedcashFlowCategoty
                                          .value, // Set the default value
                                      onSelected: (CashFlowCategory? c) {
                                        cashFlowController
                                            .selectedcashFlowCategoty
                                            .value = c!;
                                        if (c.name!.toLowerCase() == "bank") {
                                          cashFlowController.getBanks();
                                        }
                                      },
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 10),
                          Padding(
                            padding: const EdgeInsets.only(top: 10.0),
                            child: TextButton(
                              onPressed: () {
                                _addbank(context);
                              },
                              child: Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                      color: Colors.grey.withOpacity(0.2),
                                      borderRadius: const BorderRadius.only(
                                          topRight: Radius.circular(10),
                                          bottomRight: Radius.circular(10))),
                                  child: const Text(
                                    "+ Add",
                                    style: TextStyle(color: Colors.green),
                                  )),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Obx(() {
                        return cashFlowController
                                        .selectedcashFlowCategoty.value !=
                                    null &&
                                cashFlowController
                                        .selectedcashFlowCategoty.value!.name!
                                        .toLowerCase() ==
                                    "bank"
                            ? showBankSelectionLayout(context)
                            : Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                    const Text("Name",
                                        style: TextStyle(color: Colors.grey)),
                                    const SizedBox(height: 2),
                                    TextField(
                                      controller: cashFlowController
                                          .textEditingControllerName,
                                      decoration: InputDecoration(
                                        border: OutlineInputBorder(
                                          borderSide: const BorderSide(
                                              color: Colors.grey),
                                          borderRadius:
                                              BorderRadius.circular(10),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderSide: const BorderSide(
                                              color: Colors.grey),
                                          borderRadius:
                                              BorderRadius.circular(10),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 5)
                                  ]);
                      }),
                      const SizedBox(height: 20),
                      const Text("Amount",
                          style: TextStyle(color: Colors.grey)),
                      const SizedBox(height: 10),
                      TextField(
                        controller:
                            cashFlowController.textEditingControllerAmount,
                        keyboardType: TextInputType.number,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly
                        ],
                        decoration: InputDecoration(
                          contentPadding: const EdgeInsets.symmetric(
                              vertical: 4, horizontal: 10),
                          border: OutlineInputBorder(
                            borderSide: const BorderSide(color: Colors.grey),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderSide: const BorderSide(color: Colors.grey),
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      ),
                      const SizedBox(height: 80),
                      Center(
                        child: Obx(
                          () => InkWell(
                            onTap: () async {
                              await cashFlowController.createCashFlow(
                                  cashFlowController
                                      .selectedcashFlowCategoty.value!);
                              cashFlowController.getCashFlowSummary(
                                  userController
                                      .currentUser.value!.primaryShop!.id!,
                                  "deposit");
                            },
                            child: cashFlowController
                                        .isCreatingCashFlow.value ==
                                    true
                                ? const Center(
                                    child: CircularProgressIndicator(),
                                  )
                                : Container(
                                    padding: const EdgeInsets.only(
                                        top: 10,
                                        bottom: 10,
                                        left: 60,
                                        right: 60),
                                    decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(20),
                                        border: Border.all(
                                            color: AppColors.mainColor,
                                            width: 2)),
                                    child: majorTitle(
                                        title: "Save",
                                        color: AppColors.mainColor,
                                        size: 13.0)),
                          ),
                        ),
                      )
                    ],
                  ),
                )),
          ),
        ),
      ),
    );
  }

  Row showBankSelectionLayout(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 10),
              Obx(() {
                return cashFlowController.selectedcashFlowCategoty.value !=
                            null &&
                        cashFlowController.selectedcashFlowCategoty.value!.name
                                ?.toLowerCase() ==
                            "bank"
                    ? Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text("Select Bank",
                                    style: TextStyle(color: Colors.grey)),
                                const SizedBox(height: 10),
                                Container(
                                  width: MediaQuery.of(context).size.width,
                                  padding: const EdgeInsets.symmetric(
                                      vertical: 0, horizontal: 10),
                                  decoration: BoxDecoration(
                                      border: Border.all(
                                        color: Colors.grey,
                                      ),
                                      borderRadius: BorderRadius.circular(10)),
                                  child: Obx(
                                    () => DropdownMenu<BankModel>(
                                      width: MediaQuery.of(context).size.width *
                                          0.65,
                                      enableFilter: true,
                                      requestFocusOnTap: true,
                                      hintText: cashFlowController
                                                  .selectedBank.value !=
                                              null
                                          ? cashFlowController
                                              .selectedBank.value?.name
                                          : 'Select category',
                                      dropdownMenuEntries: cashFlowController
                                          .bankslist
                                          .map((c) =>
                                              DropdownMenuEntry<BankModel>(
                                                  value: c, label: c.name!))
                                          .toList(),
                                      inputDecorationTheme:
                                          const InputDecorationTheme(
                                        filled: false,
                                        contentPadding: EdgeInsets.zero,
                                        border: InputBorder.none,
                                      ),
                                      initialSelection: cashFlowController
                                          .selectedBank
                                          .value, // Set the default value
                                      onSelected: (BankModel? c) {
                                        cashFlowController.selectedBank.value =
                                            c!;
                                      },
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          )
                        ],
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                            const Text("Name",
                                style: TextStyle(color: Colors.grey)),
                            const SizedBox(height: 2),
                            TextField(
                              controller:
                                  cashFlowController.textEditingControllerName,
                              decoration: InputDecoration(
                                border: OutlineInputBorder(
                                  borderSide:
                                      const BorderSide(color: Colors.grey),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderSide:
                                      const BorderSide(color: Colors.grey),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                            ),
                            const SizedBox(height: 5)
                          ]);
              }),
            ],
          ),
        ),
        const SizedBox(width: 10),
        Padding(
          padding: const EdgeInsets.only(top: 10.0),
          child: TextButton(
            onPressed: () {
              showDialog(
                  context: context,
                  builder: (context) {
                    return AlertDialog(
                      title: const Text("Add Bank Name"),
                      content: Padding(
                        padding: const EdgeInsets.all(5.0),
                        child: TextFormField(
                            controller: cashFlowController
                                .textEditingControllerBankName,
                            decoration: InputDecoration(
                                hintText: "eg. Equity",
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
                            if (cashFlowController
                                .textEditingControllerBankName.text.isEmpty) {
                              showSnackBar(
                                  message: "Please enter bank name",
                                  color: Colors.black);
                            } else {
                              cashFlowController.createBankNames();
                            }
                          },
                          child: Text(
                            "Save now".toUpperCase(),
                            style: const TextStyle(color: Colors.blue),
                          ),
                        ),
                      ],
                    );
                  });
            },
            child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                    color: Colors.grey.withOpacity(0.2),
                    borderRadius: const BorderRadius.only(
                        topRight: Radius.circular(10),
                        bottomRight: Radius.circular(10))),
                child: const Text(
                  "+ Add",
                  style: TextStyle(color: Colors.green),
                )),
          ),
        ),
      ],
    );
  }

  void _addbank(BuildContext context) {
    showDialog(
        context: context,
        builder: (context) {
          return AlertDialog(
            title: const Text("Add Category"),
            content: Padding(
              padding: const EdgeInsets.all(5.0),
              child: TextFormField(
                  controller: cashFlowController.textEditingControllerCategory,
                  decoration: InputDecoration(
                      hintText: "eg.Personal use etc",
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
                  if (cashFlowController
                      .textEditingControllerCategory.text.isEmpty) {
                    showSnackBar(
                        message: "Please enter category name",
                        color: Colors.black);
                  } else {
                    cashFlowController.createCashFlowCategory("cashout");
                  }
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

  saveFunction({required BuildContext context}) async {
    if (cashFlowController.textEditingControllerAmount.text.isEmpty ||
        (cashFlowController.selectedcashFlowCategoty.value!.name!
                    .toLowerCase() !=
                "bank" &&
            cashFlowController.textEditingControllerName.text.isEmpty)) {
      showSnackBar(message: "please fill all fields", color: Colors.black);
    } else {
      await cashFlowController
          .createCashFlow(cashFlowController.selectedcashFlowCategoty.value!);

      cashFlowController.getCashFlowSummary(
          userController.currentUser.value!.primaryShop!.id!, "deposit");
    }
  }
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/expensecontroller.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/screens/cash_flow/cash_flow_manager.dart';
import 'package:pointify/widgets/alert.dart';
import 'package:pointify/widgets/snackBars.dart';

import '../../controllers/cashflowcontroller.dart';
import '../../controllers/homecontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../main.dart';
import '../../models/cashflowcategory.dart';
import '../../utils/colors.dart';
import '../../widgets/major_title.dart';

class CashInLayout extends StatelessWidget {
  CashInLayout({Key? key}) : super(key: key);

  final ShopController createShopController = Get.find<ShopController>();

  final CashFlowController cashflowController = Get.find<CashFlowController>();
  final ExpenseController expenseController = Get.find<ExpenseController>();
  final ShopController shopController = Get.find<ShopController>();

  final CashFlowController cashFlowController = Get.find<CashFlowController>();
  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: true,
      onPopInvoked: (val) {
        cashflowController.clearInputs();
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          elevation: 0.3,
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          titleSpacing: 0.0,
          centerTitle: false,
          iconTheme: const IconThemeData(color: Colors.black),
          titleTextStyle: const TextStyle(color: Colors.black),
          title: const Text("Add Cash In ", style: TextStyle(fontSize: 14)),
          leading: IconButton(
              onPressed: () {
                cashFlowController.getCashFlowCategoryWithTotals("all");
                if (MediaQuery.of(context).size.width > 600) {
                  Get.find<HomeController>().selectedWidget.value =
                      CashFlowManager();
                } else {
                  Get.back();
                }
                cashflowController.clearInputs();
              },
              icon: const Icon(Icons.arrow_back_ios)),
        ),
        body: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(10.0),
            child: inputFields(context),
          ),
        ),
      ),
    );
  }

  Widget inputFields(context) {
    return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10.0),
        width: double.infinity,
        decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(5)),
        child: Form(
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
                              width: MediaQuery.of(context).size.width * 0.65,
                              enableFilter: true,
                              requestFocusOnTap: true,
                              hintText: cashFlowController
                                          .selectedcashFlowCategoty.value !=
                                      null
                                  ? cashFlowController
                                      .selectedcashFlowCategoty.value?.name
                                  : 'Select category',
                              dropdownMenuEntries: cashFlowController
                                  .cashFlowCategotyWithTotals
                                  .map((c) =>
                                      DropdownMenuEntry<CashFlowCategory>(
                                          value: c, label: c.name!))
                                  .toList(),
                              inputDecorationTheme: const InputDecorationTheme(
                                filled: false,
                                contentPadding: EdgeInsets.zero,
                                border: InputBorder.none,
                              ),
                              initialSelection: cashFlowController
                                  .selectedcashFlowCategoty
                                  .value, // Set the default value
                              onSelected: (CashFlowCategory? c) {
                                cashFlowController
                                    .selectedcashFlowCategoty.value = c!;
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
                        showDialog(
                            context: context,
                            builder: (context) {
                              return AlertDialog(
                                title: const Text("Add Category"),
                                content: Padding(
                                  padding: const EdgeInsets.all(5.0),
                                  child: TextFormField(
                                      controller: cashflowController
                                          .textEditingControllerCategory,
                                      decoration: InputDecoration(
                                          hintText:
                                              "eg.Loan,Capital,Contribution etc",
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
                                      cashflowController
                                          .createCashFlowCategory("cashin");
                                      Navigator.pop(context);
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
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                  color: AppColors.mainColor, width: 2)),
                          child: Text(
                            "+ Add",
                            style: TextStyle(color: AppColors.mainColor),
                          )),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              const Text("Name", style: TextStyle(color: Colors.grey)),
              const SizedBox(height: 10),
              TextField(
                controller: cashflowController.textEditingControllerName,
                decoration: InputDecoration(
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
              const SizedBox(height: 10),
              const Text("Amount", style: TextStyle(color: Colors.grey)),
              const SizedBox(height: 10),
              TextField(
                controller: cashFlowController.textEditingControllerAmount,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  border: OutlineInputBorder(
                      borderSide: const BorderSide(color: Colors.grey),
                      borderRadius: BorderRadius.circular(10)),
                  focusedBorder: OutlineInputBorder(
                      borderSide: const BorderSide(color: Colors.grey),
                      borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 30),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                height: kToolbarHeight * 1.5,
                child: InkWell(
                  onTap: () {
                    saveFunction(context: context);
                  },
                  child: Obx(
                    () => cashFlowController.isCreatingCashFlow.value == true
                        ? const Center(
                            child: CircularProgressIndicator(),
                          )
                        : Container(
                            padding: const EdgeInsets.all(10),
                            width: MediaQuery.of(context).size.width > 600
                                ? 300
                                : double.infinity,
                            decoration: BoxDecoration(
                                border: Border.all(
                                    width: 3, color: AppColors.mainColor),
                                borderRadius: BorderRadius.circular(40)),
                            child: Center(
                                child: majorTitle(
                                    title: "Save",
                                    color: AppColors.mainColor,
                                    size: 18.0)),
                          ),
                  ),
                ),
              )
            ],
          ),
        ));
  }

  saveFunction({required context}) async {
    if (cashflowController.textEditingControllerName.text.isEmpty ||
        cashflowController.textEditingControllerAmount.text.isEmpty) {
      showSnackBar(message: "Please fill all fields", color: Colors.black);
    } else {
      if (cashflowController.selectedcashFlowCategoty.value == null) {
        showSnackBar(message: "Select Category", color: Colors.black);
      } else {
        await cashFlowController.createCashFlow(
          cashflowController.selectedcashFlowCategoty.value!,
        );
        cashFlowController.getCashFlowSummary(
            userController.currentUser.value!.primaryShop!.id!, "deposit");
      }
    }
  }
}

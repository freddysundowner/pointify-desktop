import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/screens/cash_flow/banks_transactions.dart';
import 'package:pointify/screens/cash_flow/category_transactions.dart';
import 'package:pointify/utils/colors.dart';
import 'package:pointify/widgets/delete_dialog.dart';

import '../../../controllers/cashflowcontroller.dart';
import '../../../controllers/homecontroller.dart';
import '../../../models/cashflowcategory.dart';

Widget categoryCard(context, {required CashFlowCategory cashflowCategory}) {
  return Padding(
    padding: const EdgeInsets.all(8.0),
    child: InkWell(
      onTap: () {
        if (cashflowCategory.name?.toLowerCase() == "bank") {
          Get.to(() => BanksTransactions(
                cashFlowCategory: cashflowCategory,
              ));
        } else {
          actionsBottomSheet(
              context: context, cashflowCategory: cashflowCategory);
        }
      },
      child: Container(
        padding: const EdgeInsets.only(left: 10, right: 10, top: 10, bottom: 3),
        width: double.infinity,
        decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(width: 1, color: Colors.black),
            borderRadius: BorderRadius.circular(8)),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(
              Icons.account_balance_wallet,
              color: Colors.grey,
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  cashflowCategory.name!,
                  style: const TextStyle(color: Colors.black),
                ),
                Text(
                  htmlPrice(cashflowCategory.totalAmount!),
                  style: const TextStyle(color: Colors.black),
                ),
              ],
            )
          ],
        ),
      ),
    ),
  );
}

actionsBottomSheet(
    {required context, required CashFlowCategory cashflowCategory}) {
  CashFlowController cashflowController = Get.find<CashFlowController>();
  cashflowController.textEditingControllerCategory.text =
      cashflowCategory.name!;

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
                        CategoryTransactions(
                      cashFlowCategory: cashflowCategory,
                      page: "cashflowcategory",
                    );
                  } else {
                    Get.to(() => CategoryTransactions(
                        cashFlowCategory: cashflowCategory, page: "bank"));
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
                                  controller: cashflowController
                                      .textEditingControllerCategory,
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
                                          if (cashflowController
                                              .textEditingControllerCategory
                                              .text
                                              .isNotEmpty) {
                                            cashflowController.updateCategory(
                                              cashflowCategory.id!,
                                            );
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
                  deleteDialog(
                      context: context,
                      onPressed: () {
                        cashflowController
                            .deleteCashflowCategory(cashflowCategory);
                      });
                },
                title: const Text("Delete"),
              )
            ],
          ),
        );
      });
}

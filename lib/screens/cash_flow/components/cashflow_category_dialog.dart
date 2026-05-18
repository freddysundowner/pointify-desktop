import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/screens/cash_flow/category_transactions.dart';

import '../../../controllers/cashflowcontroller.dart';
import '../../../controllers/homecontroller.dart';
import '../../../models/cashflowcategory.dart';
import '../../../utils/colors.dart';
import '../../../widgets/delete_dialog.dart';

cashFlowCategoryDialog(context, {required CashFlowCategory cashflowCategory}) {
  CashFlowController cashflowController = Get.find<CashFlowController>();
  return PopupMenuButton(
    itemBuilder: (ctx) => [
      PopupMenuItem(
        child: ListTile(
          leading: const Icon(Icons.list),
          onTap: () {
            Get.back();
            Get.find<HomeController>().selectedWidget.value =
                CategoryTransactions(
              cashFlowCategory: cashflowCategory,
              page: "cashflowcategory",
            );
          },
          title: const Text("View List"),
        ),
      ),
      PopupMenuItem(
        child: ListTile(
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
                      width: MediaQuery.of(context).size.width * 0.2,
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
                                    borderRadius: BorderRadius.circular(8),
                                    borderSide: const BorderSide(
                                        color: Colors.grey, width: 0.5)),
                                enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(8),
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
                                    style:
                                         TextStyle(color: AppColors.mainColor),
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
                                      // cashflowController
                                      //     .editCategory(cashflowCategory);
                                    }
                                  },
                                  child: Text(
                                    "Save".toUpperCase(),
                                    style:
                                         TextStyle(color: AppColors.mainColor),
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
      ),
      PopupMenuItem(
        child: ListTile(
          leading: const Icon(Icons.delete),
          onTap: () {
            Get.back();
            deleteDialog(
                context: context,
                onPressed: () {
                  // cashflowController.deleteCategory(cashflowCategory);
                });
          },
          title: const Text("Delete"),
        ),
      ),
    ],
    icon: const Icon(Icons.more_vert),
  );
}

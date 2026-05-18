import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/expensecontroller.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/expense.dart';

import '../../../utils/colors.dart';
import '../../../widgets/delete_dialog.dart';
import '../create_expense.dart';

Widget expenseCard({required context, required ExpenseModel expense}) {
  return GestureDetector(
    onTap: () {
      showBottomSheet(expense);
    },
    child: Padding(
      padding: const EdgeInsets.all(8.0),
      child: Card(
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
        child: Container(
            padding: const EdgeInsets.all(10),
            width: double.infinity,
            color: Colors.white,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    height: 40,
                    width: 40,
                    decoration: BoxDecoration(
                      color: AppColors.mainColor.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Icon(Icons.show_chart, color: Colors.white),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "${expense.name}",
                        style: const TextStyle(
                            color: Colors.black, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.only(left: 10, right: 10),
                            decoration: BoxDecoration(
                                border:
                                    Border.all(width: 0.2, color: Colors.grey),
                                borderRadius: BorderRadius.circular(50)),
                            child: Text(
                              "${expense.category?.name}",
                              style:
                                  const TextStyle(color: Colors.grey, fontSize: 10),
                            ),
                          ),
                          const SizedBox(
                            width: 20,
                          ),
                          if (expense.autoSave == true)
                            Container(
                              padding: const EdgeInsets.only(
                                  left: 10, right: 10, top: 5, bottom: 5),
                              decoration: BoxDecoration(
                                  border: Border.all(
                                      width: 0.2, color: Colors.white),
                                  borderRadius: BorderRadius.circular(50),
                                  color: Colors.amber),
                              child: const Text(
                                "Auto Save",
                                style: TextStyle(
                                    color: Colors.white, fontSize: 10),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        "@ ${expense.amount} ${userController.currentUser.value!.primaryShop?.currency}",
                        style: const TextStyle(
                            color: Colors.grey, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          if (expense.createdAt != null)
                            Expanded(
                              flex: 6,
                              child: Text(
                                DateFormat("yyyy-MM-dd hh:mm a")
                                    .format(DateTime.parse(expense.createdAt!)),
                                style: const TextStyle(color: Colors.grey),
                              ),
                            ),
                          Expanded(
                            flex: 3,
                            child: Text(
                              expense.attendant == null
                                  ? ""
                                  : "By-${expense.attendant!.username}",
                              style: const TextStyle(
                                  color: Color.fromRGBO(158, 158, 158, 1)),
                            ),
                          ),
                        ],
                      )
                    ],
                  ),
                )
              ],
            )),
      ),
    ),
  );
}

showBottomSheet(ExpenseModel expense) {
  return showModalBottomSheet<void>(
      context: Get.context!,
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
                    children: [Text('Manage')],
                  ),
                ),
                InkWell(
                  onTap: () {
                    Navigator.pop(context);
                    Get.to(() => CreateExpense(expense: expense));
                  },
                  child: Container(
                    width: MediaQuery.of(context).size.width,
                    padding: const EdgeInsets.all(8.0),
                    child: const Row(
                      children: [
                        Icon(Icons.edit),
                        SizedBox(
                          width: 10,
                        ),
                        Text('Edit')
                      ],
                    ),
                  ),
                ),
                InkWell(
                  onTap: () {
                    deleteDialog(
                        context: context,
                        onPressed: () {
                          Get.find<ExpenseController>()
                              .deleteExpenses(expense.id!);
                        });
                  },
                  child: Container(
                    width: MediaQuery.of(context).size.width,
                    padding: const EdgeInsets.all(8.0),
                    child: const Row(
                      children: [
                        Icon(Icons.delete_outline_rounded),
                        SizedBox(
                          width: 10,
                        ),
                        Text('Delete')
                      ],
                    ),
                  ),
                ),
              ],
            )));
      });
}

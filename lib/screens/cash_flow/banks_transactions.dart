import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/main.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/screens/cash_flow/cash_flow_manager.dart';
import 'package:pointify/utils/helper.dart';
import 'package:pointify/widgets/no_items_found.dart';

import '../../controllers/cashflowcontroller.dart';
import '../../controllers/homecontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../models/bank.dart';
import '../../models/cashflowcategory.dart';
import '../../utils/colors.dart';
import '../../widgets/delete_dialog.dart';
import 'cashflow_categories.dart';
import 'category_transactions.dart';

class BanksTransactions extends StatelessWidget {
  final CashFlowCategory? cashFlowCategory;
  final String? page;

  BanksTransactions({Key? key, this.cashFlowCategory, this.page})
      : super(key: key) {
    cashflowController.getBanks();
  }

  final ShopController createShopController = Get.find<ShopController>();
  final CashFlowController cashflowController = Get.find<CashFlowController>();

  @override
  Widget build(BuildContext context) {
    return Helper(
      widget: Obx(() {
        return cashflowController.isLoadingBanksTransactions.value
            ? ListView.builder(
                shrinkWrap: true,
                itemBuilder: (context, index) {
                  return loadingShimmer();
                },
                itemCount: 5,
              )
            : cashflowController.bankslist.isEmpty
                ? noItemsFound(context, true)
                : ListView.builder(
                    itemCount: cashflowController.bankslist.length,
                    shrinkWrap: true,
                    scrollDirection: Axis.vertical,
                    itemBuilder: (context, index) {
                      BankModel bankModel =
                          cashflowController.bankslist.elementAt(index);
                      return bankCard(context, bankModel: bankModel);
                    });
      }),
      appBar: _appBar(context),
      bottomNavigationBar: BottomAppBar(
        child: Container(
          padding: const EdgeInsets.all(10),
          height: kToolbarHeight,
          color: Colors.white,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                "Totals",
                style: TextStyle(color: Colors.black),
              ),
              Container(
                padding: const EdgeInsets.all(5),
                decoration: BoxDecoration(
                    color: Colors.grey.withOpacity(0.8),
                    borderRadius: BorderRadius.circular(20)),
                child: Obx(() => Text(htmlPrice(cashflowController.bankslist
                    .fold(
                        0,
                        (previousValue, element) =>
                            element.amount! + previousValue)))),
              )
            ],
          ),
        ),
      ),
    );
  }

  Widget loadingShimmer() {
    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: Container(
        padding: const EdgeInsets.all(15),
        width: double.infinity,
        decoration: BoxDecoration(
          borderRadius: BorderRadiusDirectional.circular(8),
          color: Colors.white,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              height: 4,
              color: Colors.grey.withOpacity(0.3),
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(),
                    const SizedBox(width: 2),
                    Container(
                        width: 50,
                        height: 4,
                        color: Colors.grey.withOpacity(0.3)),
                  ],
                ),
                const Icon(Icons.credit_card, color: Colors.grey)
              ],
            ),
            const SizedBox(height: 4),
            Container(
                width: 100, height: 4, color: Colors.grey.withOpacity(0.3)),
            const SizedBox(height: 10),
            const Divider(
              thickness: 0.5,
              color: Colors.grey,
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                    width: 100, height: 4, color: Colors.grey.withOpacity(0.3)),
                Container(
                    width: 20, height: 4, color: Colors.grey.withOpacity(0.3)),
              ],
            )
          ],
        ),
      ),
    );
  }

  AppBar _appBar(context) {
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
        ),
      ),
      title: const Text("Cash At Bank",
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          )),
    );
  }

  Widget bankCard(BuildContext context, {required BankModel bankModel}) {
    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: Container(
        padding: const EdgeInsets.all(15),
        width: double.infinity,
        decoration: BoxDecoration(
          borderRadius: BorderRadiusDirectional.circular(8),
          color: Colors.white,
        ),
        child: InkWell(
          onTap: () {
            showBottomSheet(context, bankModel);
          },
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                bankModel.name ?? "",
                style: const TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Text(
                        "${userController.currentUser.value!.primaryShop!.currency} ",
                      ),
                      const SizedBox(width: 2),
                      Text(
                        "${bankModel.amount}",
                        style: const TextStyle(
                            color: Colors.black, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const Icon(Icons.credit_card, color: Colors.grey)
                ],
              ),
              const SizedBox(height: 4),
              const Text(
                "**** **** **** ****",
                style: TextStyle(color: Colors.black),
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  InkWell(
                    onTap: () {
                      Get.to(() => CategoryTransactions(
                            cashFlowCategory: cashFlowCategory,
                            page: "bank",
                            bank: bankModel,
                          ));
                    },
                    child: Text(
                      "View Bank Slips",
                      style: TextStyle(color: AppColors.mainColor),
                    ),
                  ),
                  IconButton(
                      onPressed: () {},
                      icon: const Icon(Icons.more_vert, color: Colors.grey)),
                ],
              ),
              const Divider(
                thickness: 0.5,
                color: Colors.grey,
              ),
            ],
          ),
        ),
      ),
    );
  }

  showBottomSheet(BuildContext context, BankModel bankModel) {
    return showModalBottomSheet(
        context: context,
        backgroundColor: Colors.white,
        builder: (_) {
          return Container(
            color: Colors.white,
            height: MediaQuery.of(context).size.height * 0.3,
            margin: EdgeInsets.only(left: 0),
            child: Column(
              children: [
                Container(
                  color: AppColors.mainColor.withOpacity(0.1),
                  width: double.infinity,
                  child: const ListTile(
                    title: Text("Manage Bank"),
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.edit),
                  onTap: () {
                    Get.back();
                    showDialog(
                        context: context,
                        builder: (_) {
                          return AlertDialog(
                            content: Container(
                              padding: const EdgeInsets.only(
                                  left: 15, right: 15, top: 10, bottom: 3),
                              height: MediaQuery.of(context).size.height * 0.2,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text("Edit Bank"),
                                  const Spacer(),
                                  TextFormField(
                                    controller: cashflowController
                                        .textEditingControllerBankName,
                                    decoration: InputDecoration(
                                        contentPadding:
                                            const EdgeInsets.all(10),
                                        fillColor: Colors.white,
                                        filled: true,
                                        focusedBorder: OutlineInputBorder(
                                            borderRadius:
                                                BorderRadius.circular(8),
                                            borderSide: const BorderSide(
                                                color: Colors.grey,
                                                width: 0.5)),
                                        enabledBorder: OutlineInputBorder(
                                            borderRadius:
                                                BorderRadius.circular(8),
                                            borderSide: const BorderSide(
                                                color: Colors.grey,
                                                width: 0.5))),
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
                                            style: TextStyle(
                                                color: AppColors.mainColor),
                                          )),
                                      const SizedBox(
                                        width: 10,
                                      ),
                                      TextButton(
                                          onPressed: () {
                                            Get.back();
                                            cashflowController
                                                .updatebank(bankModel);
                                          },
                                          child: Text(
                                            "Save".toUpperCase(),
                                            style: TextStyle(
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
                          cashflowController.deleteBank(bankModel.id!);
                        });
                  },
                  title: const Text("Delete"),
                ),
                ListTile(
                  leading: const Icon(
                    Icons.clear,
                    color: Colors.red,
                  ),
                  onTap: () {
                    Get.back();
                  },
                  title: const Text("Cancel "),
                ),
              ],
            ),
          );
        });
  }

  Widget showPopUpdialog(context) {
    return PopupMenuButton(
      itemBuilder: (ctx) => [
        PopupMenuItem(
          child: ListTile(
            leading: const Icon(Icons.list),
            onTap: () {
              Get.back();
              Get.find<HomeController>().selectedWidget.value =
                  CategoryTransactions(
                cashFlowCategory: cashFlowCategory,
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
                            const Text("Edit Bank"),
                            const Spacer(),
                            TextFormField(
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
              deleteDialog(context: context, onPressed: () {});
            },
            title: const Text("Delete"),
          ),
        ),
      ],
      icon: const Icon(Icons.more_vert),
    );
  }
}

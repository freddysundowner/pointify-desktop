import 'dart:io';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/productcontroller.dart';
import 'package:pointify/controllers/shopcontroller.dart';
import 'package:pointify/screens/purchases/create_purchase.dart';
import 'package:pointify/screens/usage/extend_usage.dart';
import 'package:pointify/utils/colors.dart';

import '../controllers/homecontroller.dart';
import '../main.dart';
import '../reports/expenses/expense_page.dart';
import '../screens/cash_flow/cash_flow_manager.dart';
import '../screens/home/home.dart';
import '../screens/sales/create_sale.dart';
import '../screens/shop/create_shop.dart';
import 'dart:convert';

void printFull(Object? obj) {
  final text =
      obj is String ? obj : const JsonEncoder.withIndent('  ').convert(obj);
  const chunkSize = 800;
  for (var i = 0; i < text.length; i += chunkSize) {
    debugPrint(
      text.substring(
          i, i + chunkSize > text.length ? text.length : i + chunkSize),
      wrapWidth: 10000,
    );
  }
}
missingValueDialog(context, message) {
  showDialog(
      context: context,
      builder: (_) {
        return AlertDialog(
          content: Text(message),
          actions: [
            TextButton(
                onPressed: () {
                  Get.back();
                },
                child: const Text("Ok"))
          ],
        );
      });
}
Color parseColor(String? hex) {
  if (hex == null || hex.isEmpty) return Colors.grey; // fallback
  hex = hex.replaceAll('#', '');
  if (hex.length == 6) hex = 'FF$hex'; // add opacity if missing
  return Color(int.parse('0x$hex'));
}

class Helper extends StatelessWidget {
  final AppBar? appBar;
  final Widget widget;
  final String? page;
  final Widget? bottomNavigationBar;
  final Widget? floatButton;
  final List pages = [
    "Home",
    "Sell",
    "ReStock",
    "Expenses",
    "Cashflow",
    "Add Shop",
  ];
  final List icons = [
    Icons.home_outlined,
    Icons.arrow_upward,
    Icons.arrow_downward_outlined,
    Icons.account_balance_wallet_outlined,
    Icons.money,
    Icons.add
  ];

  Helper(
      {Key? key,
      required this.widget,
      this.appBar,
      this.bottomNavigationBar,
      this.floatButton,
      this.page})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: appBar,
      floatingActionButton: floatButton != null
          ? Container(
              height: 0,
            )
          : userController.currentUser.value?.usertype == "attendant" ||
                  userController.switcheduser.value != null ||
                  userController.internetConected.isFalse ||
                  userController.currentUser.value!.primaryShop?.warehouse ==
                      true
              ? null
              : FloatingActionButton(
                  backgroundColor: AppColors.secondary_color,
                  onPressed: () {
                    showShortCutBottomSheet(context: context);
                  },
                  child: const Center(
                    child: Icon(Icons.menu, color: Colors.white),
                  ),
                ),
      body: widget,
      bottomNavigationBar: bottomNavigationBar,
    );
  }

  showShortCutBottomSheet({required BuildContext context}) {
    showModalBottomSheet(
        context: context,
        builder: (_) {
          return AnimatedContainer(
            height: MediaQuery.of(context).size.height * 0.3,
            padding: const EdgeInsets.all(10),
            duration: const Duration(milliseconds: 200),
            child: Column(
              children: [
                const Center(
                  child: Text(
                    "ShortCuts",
                    style: TextStyle(
                        color: Colors.black, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(
                  height: 20,
                ),
                Expanded(
                  child: GridView.builder(
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                              childAspectRatio: 1.5,
                              crossAxisCount: 3,
                              crossAxisSpacing: 10,
                              mainAxisSpacing: 10),
                      itemBuilder: (context, index) {
                        return Column(
                          children: [
                            InkWell(
                              onTap: () {
                                if (Get.find<ShopController>()
                                        .checkSubscription() ==
                                    false) {
                                  Get.to(ExtendUsage());
                                  return;
                                }
                                Get.back();
                                switch (index) {
                                  case 0:
                                    {
                                      if (page == null) {
                                        Get.off(() => const Home());
                                      } else {
                                        Get.find<HomeController>()
                                            .selectedIndex
                                            .value = 0;
                                      }
                                    }
                                    break;
                                  case 1:
                                    {
                                      Get.to(() => CreateSale());
                                    }
                                    break;
                                  case 2:
                                    {
                                      Get.to(() => CreatePurchase());
                                    }
                                    break;
                                  case 3:
                                    {
                                      Get.to(() => ExpensePage(
                                          firstday: DateTime(
                                              DateTime.now().year,
                                              DateTime.now().month,
                                              1),
                                          lastday: DateTime(
                                              DateTime.now().year,
                                              DateTime.now().month,
                                              DateTime.now().day)));
                                    }
                                    break;
                                  case 4:
                                    {
                                      Get.to(() => CashFlowManager());
                                    }
                                    break;
                                  case 5:
                                    {
                                      Get.to(() => CreateShop(
                                            page: "shortcut",
                                            clearInputs: true,
                                          ));
                                    }
                                    break;
                                }

                                if (index == 0) {
                                  if (page != null) {
                                    Get.off(() => const Home());
                                  } else {
                                    Get.find<HomeController>()
                                        .selectedIndex
                                        .value = 0;
                                  }
                                }
                              },
                              child: Container(
                                decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: Colors.white,
                                    border: Border.all(
                                        width: 0.5, color: Colors.black)),
                                padding: const EdgeInsets.all(10),
                                child: Center(
                                  child: Icon(icons.elementAt(index)),
                                ),
                              ),
                            ),
                            Text(pages.elementAt(index)),
                          ],
                        );
                      },
                      itemCount: pages.length),
                )
              ],
            ),
          );
        });
  }
}

Future<bool> isConnected() async {
  if (userController.enableOffline.isFalse) {
    return true;
  }
  // return true;
  try {
    final result = await InternetAddress.lookup('google.com');
    return result.isNotEmpty && result[0].rawAddress.isNotEmpty;
  } on SocketException catch (_) {
    return false;
  }
}

generateReportAlert(BuildContext context, String type) {
  ProductController productController = Get.find<ProductController>();
  Dialog errorDialog = Dialog(
    shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12.0)), //this right here
    child: SizedBox(
      width: 300.0,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Container(
            padding: const EdgeInsets.all(10.0),
            child: const Text(
                "Enter your email where you want to receive the report"),
          ),
          Container(
            padding: const EdgeInsets.all(10.0),
            child: TextFormField(
              decoration: const InputDecoration(labelText: 'Enter Email'),
              controller: productController.backupemail,
            ),
          ),
          const SizedBox(
            height: 20.0,
          ),
          TextButton(
              onPressed: () async {
                await productController.generateReport(
                    reportType: "pdf",
                    data: "products",
                    reportStatus: type,
                    email: productController.backupemail);
              },
              child:  Text(
                'Send',
                style: TextStyle(color: AppColors.mainColor, fontSize: 18.0),
              ))
        ],
      ),
    ),
  );
  showDialog(context: context, builder: (BuildContext context) => errorDialog);
}

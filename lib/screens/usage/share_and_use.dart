import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/awards.dart';
import 'package:pointify/utils/colors.dart';

import '../../controllers/authcontroller.dart';
import '../../controllers/paymentcontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../models/shop.dart';
import '../../responsive/responsiveness.dart';
import '../../services/authentication.dart';
import '../../utils/themer.dart';
import '../../widgets/alert.dart';
import '../../widgets/major_title.dart';

class ShareAndUse extends StatelessWidget {
  ShareAndUse({super.key}) {
    paymentController
        .getAwardTransactions(userController.currentUser.value!.id!);

    Authentication.getUser(userController.currentUser.value!.id!)
        .then((value) {
      if (value["error"] != null) {
        return;
      }
      if (value['referalCredit'] == null) {
        userController.currentUser.value!.referalCredit = 0.0;
      } else {
        userController.currentUser.value!.referalCredit =
            isInteger(value['referalCredit'])
                ? (value['referalCredit']).toDouble()
                : value["referalCredit"];
      }
    });
  }
  final PaymentController paymentController = Get.find<PaymentController>();
  final ShopController shopController = Get.find<ShopController>();
  final AuthController authController = Get.find<AuthController>();
  bool isInteger(num value) => value is int || value == value.roundToDouble();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          titleSpacing: 0.0,
          leading: InkWell(
            onTap: () {
              Get.back();
            },
            child:  Icon(
              Icons.clear,
              color: AppColors.mainColor,
            ),
          )),
      body: Center(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              child: Obx(
                () => Text(
                    htmlPrice(userController.currentUser.value!.referalCredit),
                    style: const TextStyle(fontSize: 20)),
              ),
            ),
            Container(
              padding: const EdgeInsets.all(10),
              child: Text(
                  "Equivalent to ${userController.currentUser.value!.freeDays()} days free usage",
                  style: TextStyle(fontSize: 12)),
            ),
            const SizedBox(
              height: 10,
            ),
            Center(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  Obx(() => shopController.gettingShopsLoad.isTrue
                      ? const Center(
                          child: SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator()),
                        )
                      : InkWell(
                          onTap: shopController.gettingShopsLoad.isTrue
                              ? null
                              : () async {
                                  if (userController.currentUser.value!
                                              .referalCredit ==
                                          null ||
                                      userController.currentUser.value!
                                              .referalCredit ==
                                          0) {
                                    generalAlert(
                                      title: "Error",
                                      message:
                                          "Insufficient Credits, share the app to earn more credit",
                                    );
                                    return;
                                  }
                                  await shopController.getShops();
                                  showShopModalBottomSheetUsage(Get.context);
                                },
                          child: Container(
                            padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
                            decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(15),
                                color: AppColors.mainColor),
                            child: const Row(
                              children: [
                                Icon(Icons.refresh, color: Colors.white),
                                Text(
                                  "Redeem Now",
                                  style: TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ),
                        )),
                  InkWell(
                    onTap: () {
                      // DynamicLinkService()
                      //     .generateShareLink(
                      //   userController.currentUser.value!.id!,
                      //   type: "app",
                      //   title:
                      //       "Hello, Check out Pointify to manage your shops, sales, cashflow etc",
                      // )
                      //     .then((value) async {
                      //   await Share.share(value,
                      //       subject:
                      //           "Share ${userController.currentUser.value?.username!} Profile");
                      // });
                    },
                    child: Container(
                      padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
                      decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(15),
                          border:
                              Border.all(width: 1, color: AppColors.mainColor),
                          color: Colors.white),
                      child:  Row(
                        children: [
                          Icon(Icons.share, color: AppColors.mainColor),
                          SizedBox(
                            width: 10,
                          ),
                          Text(
                            "Share App",
                            style: TextStyle(
                                color: AppColors.mainColor,
                                fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(
              height: 20,
            ),
            Obx(() {
              return paymentController.isPaymentLoading.isTrue
                  ? const Center(
                      child: CircularProgressIndicator(),
                    )
                  : paymentController.awardpayments.isEmpty
                      ? const Center(
                          child: Text("No Entries found"),
                        )
                      : ListView.builder(
                          itemCount: paymentController.awardpayments.length,
                          shrinkWrap: true,
                          physics: const ScrollPhysics(),
                          itemBuilder: (context, index) {
                            Awards award = paymentController.awardpayments
                                .elementAt(index);
                            return Container(
                              margin: const EdgeInsets.all(5),
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(8)),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(
                                    award.type == "usage"
                                        ? Icons.arrow_upward
                                        : award.recieptNumber != null
                                            ? Icons.compare_arrows
                                            : Icons.arrow_downward,
                                    color: award.type == "usage"
                                        ? Colors.red
                                        : Colors.green,
                                  ),
                                  const SizedBox(
                                    width: 20,
                                  ),
                                  Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(DateFormat().format(
                                          DateTime.parse(award.date!)
                                              .toLocal())),
                                      const SizedBox(height: 10),
                                      Text(
                                          "From:#${award.shop?.name.toString()}"),
                                    ],
                                  ),
                                  const Spacer(),
                                  Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        htmlPrice(award.amount),
                                        style: TextStyle(
                                          color: award.type == "usage"
                                              ? Colors.red
                                              : Colors.green,
                                        ),
                                      ),
                                      const SizedBox(
                                        height: 5,
                                      ),
                                      Text(
                                        htmlPrice(
                                            award.balance?.toStringAsFixed(2)),
                                        style: const TextStyle(
                                            color: Colors.green, fontSize: 12),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          });
            })
          ],
        ),
      ),
    );
  }
}

showShopModalBottomSheetUsage(context) {
  ShopController shopController = Get.find<ShopController>();
  showModalBottomSheet(
    context: context,
    backgroundColor: isSmallScreen(context) ? Colors.white : Colors.transparent,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.only(
          topRight: Radius.circular(15), topLeft: Radius.circular(15)),
    ),
    builder: (context) => SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.all(8.0),
            child: Text("Pick the shop to redeem usage on",
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: Colors.black,
                )),
          ),
          ListView.builder(
              itemCount: shopController.allShops.length,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemBuilder: (context, index) {
                Shop shopBody = shopController.allShops.elementAt(index);
                return InkWell(
                  onTap: () async {
                    return showDialog(
                        context: Get.context!,
                        builder: (_) {
                          TextEditingController textEditingController =
                              TextEditingController();
                          textEditingController.text = (userController
                                      .currentUser.value!.referalCredit! /
                                  3)
                              .toStringAsFixed(0);
                          return AlertDialog(
                            title: const Text(
                              "How many days?",
                              style: TextStyle(fontSize: 13),
                            ),
                            content: Container(
                              decoration:
                                  ThemeHelper().inputBoxDecorationShaddow(),
                              child: TextFormField(
                                controller: textEditingController,
                                decoration: ThemeHelper()
                                    .textInputDecoration(
                                        'Days', 'Enter days'),
                              ),
                            ),
                            actions: [
                              TextButton(
                                  onPressed: () {
                                    Get.back();
                                  },
                                  child: Text(
                                    "Cancel".toUpperCase(),
                                    style:  TextStyle(
                                        color: AppColors.mainColor),
                                  )),
                              TextButton(
                                  onPressed: () {
                                    shopController.redeemUsage(
                                      shopId: shopBody.id,
                                      days:
                                          int.parse(textEditingController.text),
                                    );
                                  },
                                  child: Text(
                                    "Okay".toUpperCase(),
                                    style:  TextStyle(
                                        color: AppColors.mainColor),
                                  ))
                            ],
                          );
                        });
                  },
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  majorTitle(
                                      title: "${shopBody.name}",
                                      color: Colors.black,
                                      size: 16.0),
                                  shopController.checkDaysRemaining(
                                              shop: shopBody) <=
                                          0
                                      ? Text(
                                          shopBody.subscription == null
                                              ? "Expired "
                                              : "Expired on ${DateFormat('yyyy-MM-dd').format(DateTime.parse(shopBody.subscription!.endDate!))} click here to extend",
                                          style: const TextStyle(
                                              color: Colors.red, fontSize: 12),
                                        )
                                      : Text(
                                          "Expires in ${shopController.checkDaysRemaining(shop: shopBody)} days",
                                          style: const TextStyle(
                                              color: Colors.green,
                                              fontSize: 12),
                                        )
                                ],
                              ),
                            ),
                             Text(
                              "Redeem",
                              style: TextStyle(color: AppColors.mainColor),
                            )
                          ],
                        ),
                        const Divider()
                      ],
                    ),
                  ),
                );
              }),
        ],
      ),
    ),
  );
}

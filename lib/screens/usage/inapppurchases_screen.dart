import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/package.dart';
import 'package:pointify/utils/colors.dart';
import 'package:pointify/widgets/minor_title.dart';
import 'package:pointify/widgets/shop_list_bottomsheet.dart';

import '../../controllers/inapp_purchases.dart';
import '../../controllers/plancontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../models/shop.dart';
import '../../widgets/major_title.dart';
import 'ShopsRenew.dart';

class InAppPurchasesScreen extends StatelessWidget {
  final Shop? shop;
  InAppPurchasesScreen({
    super.key,
    this.shop,
  }) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      userController.phoneController.text =
          userController.currentUser.value!.phone ?? "";
      inappPurchasesController.fetchSubscriptions();
    });
  }

  final ShopController shopController = Get.find<ShopController>();
  InappPurchasesController inappPurchasesController =
      Get.find<InappPurchasesController>();
  PlanController planController = Get.find<PlanController>();
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
            onPressed: () {
              Navigator.of(context).pop();
            },
            icon:  Icon(
              Icons.clear,
              color: AppColors.mainColor,
            )),
        title:  Text(
          "Extend usage",
          style: TextStyle(color: AppColors.mainColor),
        ),
      ),
      body: Column(
        children: [
          shop != null
              ? Column(
                  children: [
                    Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                            vertical: 20, horizontal: 10),
                        child: Text(
                            "Extend Usage for ${shop!.name} for you to be able to switch to this shop.",
                            style: const TextStyle(
                              fontSize: 20,
                            ))),
                    const Divider(
                      thickness: 2,
                    ),
                  ],
                )
              : Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      majorTitle(
                          title: "Current Shop",
                          color: Colors.black,
                          size: 20.0),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Obx(() {
                            return minorTitle(
                                title: userController
                                            .currentUser.value!.primaryShop ==
                                        null
                                    ? ""
                                    : userController
                                        .currentUser.value!.primaryShop!.name,
                                color: AppColors.mainColor);
                          }),
                          Obx(
                            () => InkWell(
                              onTap: shopController.gettingShopsLoad.isTrue
                                  ? null
                                  : () async {
                                      await shopController.getShops();
                                      showShopModalBottomSheet(Get.context);
                                    },
                              child: Container(
                                padding: const EdgeInsets.all(5),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(50),
                                  border: Border.all(
                                      color: AppColors.mainColor, width: 2),
                                ),
                                child: minorTitle(
                                    title: "Switch Shop",
                                    color: AppColors.mainColor),
                              ),
                            ),
                          )
                        ],
                      ),
                    ],
                  ),
                ),
          ElevatedButton(
            onPressed: () async {

              await InappPurchasesController.inAppPurchaseUtilsInstance
                  .restorePurchases();
            },
            child: Text('Restore Purchases'),
          ),
          const Divider(
            thickness: 2,
          ),
          Expanded(
            child: Obx(
              () => ListView.builder(
                  itemCount: planController.plans.length,
                  itemBuilder: (BuildContext c, int i) {
                    Package plan = planController.plans[i];
                    return _usageCard(plan, context);
                  }),
            ),
          )
        ],
      ),
    );
  }

  _usageCard(Package plan, context) {
    return Obx(
      () => InkWell(
        onTap: (shopController.isCurrentPackage(plan) &&
                shopController.checkDaysRemaining(shop: shop) > 0)
            ? null
            : () {
                shopController.shopsRenew.clear();
                shopController.getShops();
                Get.to(() => ShopsToRenew(plan: plan, shop: shop));
              },
        child: Container(
          padding:
              const EdgeInsets.only(bottom: 10, left: 10, right: 10, top: 10),
          decoration: BoxDecoration(
            color: shopController.isCurrentPackage(plan) &&
                    shopController.checkDaysRemaining(shop: shop) > 0
                ? Colors.green
                : Colors.transparent,
            border: const Border(
              bottom: BorderSide(
                color: Colors.black,
                width: 1.0,
              ),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    majorTitle(
                        title: plan.title, color: Colors.black, size: 18.0),
                    Text(
                      plan.displayprice!,
                      style:  TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 23,
                          color: AppColors.mainColor),
                    ),
                    Text(plan.description!),
                    if (shopController.isCurrentPackage(plan) &&
                        shopController.checkDaysRemaining(shop: shop) > 0)
                      Text(
                        "${shopController.checkDaysRemaining(shop: shop)} days remaining",
                        style: const TextStyle(color: Colors.red),
                      ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 15, vertical: 8),
                decoration: BoxDecoration(
                  color: shopController.isCurrentPackage(plan) &&
                          shopController.checkDaysRemaining(shop: shop) > 0
                      ? AppColors.lightDeepPurple
                      : AppColors.mainColor,
                  borderRadius: BorderRadius.circular(50),
                ),
                child: minorTitle(
                    title: shopController.isCurrentPackage(plan) &&
                            shopController.checkDaysRemaining(shop: shop) > 0
                        ? "Active"
                        : "Subscribe",
                    color: shopController.isCurrentPackage(plan) &&
                            shopController.checkDaysRemaining(shop: shop) > 0
                        ? Colors.white
                        : Colors.white),
              )
            ],
          ),
        ),
      ),
    );
  }
}

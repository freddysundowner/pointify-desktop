import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/main.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/widgets/major_title.dart';

import '../controllers/salescontroller.dart';
import '../controllers/shopcontroller.dart';
import '../models/shop.dart';
import '../screens/usage/extend_usage.dart';
import '../utils/helper.dart';

showShopModalBottomSheet(context) {
  ShopController shopController = Get.find<ShopController>();
  SalesController salesController = Get.find<SalesController>();
  showModalBottomSheet(
    context: context,
    backgroundColor: isSmallScreen(context) ? Colors.white : Colors.transparent,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.only(
          topRight: Radius.circular(15), topLeft: Radius.circular(15)),
    ),
    builder: (context) => SingleChildScrollView(
      child: Container(
        padding: const EdgeInsets.only(top: 10),
        child: ListView.builder(
            itemCount: shopController.allShops.length,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemBuilder: (context, index) {
              Shop shopBody = shopController.allShops.elementAt(index);
              return InkWell(
                onTap: () async {
                  Get.back();
                  //check if has days remaining
                  if (shopController.checkDaysRemaining(shop: shopBody) == 0) {
                    Get.to(() => ExtendUsage(
                          shop: shopBody,
                        ));
                    return;
                  }
                  await userController.profileUpdate(shopId: shopBody.id);
                  if (await isConnected()) {
                    salesController.getSalesByDate(
                        type: "today",
                        shop:
                            userController.currentUser.value!.primaryShop!.id!);
                    salesController.getNetAnalysis(
                        shopId:
                            userController.currentUser.value!.primaryShop!.id!,
                        type: "today");
                  }
                },
                child: Container(
                  padding: const EdgeInsets.all(10),
                  width: MediaQuery.of(context).size.width,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
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
                                          color: Colors.green, fontSize: 12),
                                    )
                            ],
                          ),
                          const Icon(Icons.arrow_forward_ios),
                        ],
                      ),
                      const Divider()
                    ],
                  ),
                ),
              );
            }),
      ),
    ),
  );
}

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/shopcontroller.dart';
import 'package:pointify/main.dart';
import 'package:pointify/widgets/minor_title.dart';

import '../models/shop.dart';
import '../screens/shop/shop_details.dart';
import '../screens/stock/products_selection.dart';
import '../screens/stock/products_shop_import.dart';
import '../utils/colors.dart';
import 'major_title.dart';

Widget shopCard(
    {required Shop shopModel,
    required page,
    required context,
    Function? function}) {
  ShopController shopController = Get.find<ShopController>();
  return InkWell(
    onTap: function != null
        ? () {
            function(shopModel);
          }
        : () {
            if (page == "shop") {
              Get.to(() => ShopDetails(shopModel: shopModel));
            } else if (page == "import") {
              Get.to(() => ProductShopImport(toShop: shopModel));
            } else {
              Get.to(() => ProductSelections(toShop: shopModel));
            }
          },
    child: Container(
      margin: const EdgeInsets.fromLTRB(3, 10, 3, 0),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
          color: AppColors.mainColor, borderRadius: BorderRadius.circular(10)),
      child: Stack(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.shopping_basket,
                    color: Colors.white,
                  ),
                  const SizedBox(
                    width: 10,
                  ),
                  majorTitle(
                      title: shopModel.name!.capitalize,
                      color: Colors.white,
                      size: 14.0)
                ],
              ),
              const SizedBox(height: 10),
              if (shopModel.location != null && shopModel.location!.isNotEmpty)
                Row(
                  children: [
                    Expanded(
                      child: minorTitle(
                          title: "Location- ${shopModel.location}",
                          color: Colors.white),
                    ),
                    const SizedBox(
                      width: 20,
                    ),
                    minorTitle(
                        title: "${shopModel.shopCategoryId?.name}",
                        color: Colors.white)
                  ],
                ),
              const SizedBox(height: 10),
            ],
          ),
          if (shopModel.id == userController.currentUser.value!.primaryShop?.id)
            Positioned(
              right: 0,
              child: Container(
                  decoration: BoxDecoration(
                      color: Colors.deepOrangeAccent,
                      borderRadius: BorderRadius.circular(6)),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8.0, vertical: 5),
                    child: minorTitle(
                        title: "Default", color: Colors.white, size: 12),
                  )),
            ),
          if (shopModel.production == true)
            Positioned(
              right: 0,
              child: Container(
                  decoration: BoxDecoration(
                      color: Colors.deepOrangeAccent,
                      borderRadius: BorderRadius.circular(6)),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8.0, vertical: 5),
                    child: minorTitle(
                        title: "Production", color: Colors.white, size: 12),
                  )),
            ),
          if (shopController.checkSubscription(shop: shopModel) == false)
            Positioned(
              right: shopModel.id ==
                      userController.currentUser.value!.primaryShop?.id
                  ? 80
                  : 0,
              child: Container(
                  decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(6)),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8.0, vertical: 5),
                    child: minorTitle(
                        title: "Expired", color: Colors.white, size: 12),
                  )),
            ),
        ],
      ),
    ),
  );
}

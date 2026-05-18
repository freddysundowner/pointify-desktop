import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/ordercontroller.dart';
import 'package:pointify/controllers/shopcontroller.dart';
import 'package:pointify/screens/discover/orders/create_order.dart';
import 'package:pointify/utils/colors.dart';
import 'package:pointify/widgets/no_items_found.dart';
import 'package:pointify/widgets/textbutton.dart';

import '../../models/shop.dart';

class ShopsAround extends StatelessWidget {
  ShopsAround({super.key}) {
    shopController.getShopsAround();
  }
  final ShopController shopController = Get.find<ShopController>();
  final OrderController orderController = Get.find<OrderController>();

  bool getColor(String itemName) {
    var index = shopController.selectedDiscoverCategories
        .indexWhere((element) => element.name == itemName);
    bool val = false;
    if (index == -1) {
      return false;
    }
    if (index != -1) {
      val = true;
    } else {
      val = false;
    }

    return val;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
            icon:  Icon(Icons.clear, color: AppColors.mainColor),
            onPressed: () {
              Get.back();
            }),
        title: Obx(
          () => Text(
            "Shops Around (${shopController.shopsAround.length})",
            style:  TextStyle(color: AppColors.mainColor, fontSize: 18),
          ),
        ),
      ),
      body: Obx(
        () => Column(
          children: [
            Obx(
              () => Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Selected Distance: ${shopController.currentDistance} km',
                    style: const TextStyle(fontSize: 16),
                  ),
                  Slider(
                    value: shopController.currentDistance.value,
                    max: 500,
                    divisions: 100,
                    label: '${shopController.currentDistance.value} km',
                    onChanged: (value) {
                      shopController.currentDistance.value =
                          double.parse(value.toStringAsFixed(0));
                    },
                    onChangeEnd: (value) {
                      orderController.allowLocation();
                      shopController.getShopsAround();
                    },
                  ),
                  InkWell(
                    onTap: () {
                      orderController.allowLocation();
                    },
                    child: Container(
                      decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10),
                          color: Colors.white,
                          border: Border.all(
                            color: AppColors.mainColor,
                          )),
                      margin: const EdgeInsets.symmetric(
                        horizontal: 20,
                      ),
                      padding: const EdgeInsets.symmetric(
                          vertical: 5, horizontal: 15),
                      child:  Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Column(
                            children: [
                              Text("Enable location",
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: AppColors.mainColor,
                                  )),
                              Text("allow location to view nearby shops",
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: AppColors.mainColor,
                                  )),
                            ],
                          ),
                          Icon(Icons.location_on_outlined, size: 20),
                        ],
                      ),
                    ),
                  ),
                  Wrap(
                      children: List.generate(
                          shopController.selectedDiscoverCategories.length,
                          (index) {
                    var item = shopController.selectedDiscoverCategories[index];
                    return InkWell(
                      onTap: () {
                        var index = shopController.selectedDiscoverCategories
                            .indexWhere((element) => element.id == item.id);
                        if (index != -1) {
                          shopController.selectedDiscoverCategories
                              .removeAt(index);
                        } else {
                          shopController.selectedDiscoverCategories.add(item);
                        }
                        if (shopController.selectedDiscoverCategories.isEmpty) {
                          Get.back();
                        }

                        shopController.getShopsAround();
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 3),
                        margin: const EdgeInsets.symmetric(
                            horizontal: 5, vertical: 10),
                        decoration: BoxDecoration(
                          color: getColor(item.name!)
                              ? AppColors.mainColor
                              : Colors.white,
                          borderRadius: BorderRadius.circular(25),
                          border: Border.all(
                              color: getColor(item.name!)
                                  ? AppColors.mainColor
                                  : AppColors.lightDeepPurple),
                          boxShadow: const [
                            BoxShadow(
                              color: Colors.black26,
                              blurRadius: 4,
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              item.name!,
                              style: TextStyle(
                                  fontSize: 10,
                                  color: getColor(item.name!)
                                      ? Colors.white
                                      : Colors.black),
                            ),
                            const SizedBox(
                              width: 5,
                            ),
                            if (getColor(item.name!))
                              Container(
                                padding: const EdgeInsets.all(2),
                                decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(50),
                                    color: Colors.white),
                                child:  Icon(
                                  Icons.clear,
                                  size: 13,
                                  color: AppColors.mainColor,
                                ),
                              )
                          ],
                        ),
                      ),
                    );
                  }))
                ],
              ),
            ),
            Expanded(
              child: shopController.shopsAroundLoad.isTrue
                  ? const Center(
                      child: CircularProgressIndicator(),
                    )
                  : shopController.shopsAround.isEmpty
                      ? noItemsFound(context, false)
                      : ListView.builder(
                          itemBuilder: (context, index) {
                            Shop shop = shopController.shopsAround[index];
                            return Container(
                              padding: const EdgeInsets.all(10),
                              width: double.infinity,
                              child: Row(
                                children: [
                                  Container(
                                      height: 40,
                                      width: 40,
                                      decoration: BoxDecoration(
                                          borderRadius:
                                              BorderRadius.circular(50),
                                          color: Colors.grey.withOpacity(0.5)),
                                      child: Center(
                                        child: Text(
                                            shop.name!.length > 2
                                                ? shop.name!
                                                    .substring(0, 1)
                                                    .toUpperCase()
                                                : shop.name!,
                                            style:  TextStyle(
                                              fontSize: 16,
                                              color: AppColors.mainColor,
                                              fontWeight: FontWeight.bold,
                                            )),
                                      )),
                                  const SizedBox(
                                    width: 10,
                                  ),
                                  Expanded(
                                    child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            shop.name!.capitalizeFirst!,
                                            style:
                                                const TextStyle(fontSize: 20),
                                          ),
                                          Text(
                                            "${shop.distance?.toStringAsFixed(2)}km away ${shop.location}",
                                            style:
                                                const TextStyle(fontSize: 13),
                                          ),
                                          Row(
                                            mainAxisAlignment:
                                                MainAxisAlignment.spaceBetween,
                                            children: [
                                              Text(
                                                shop.shopCategoryId == null
                                                    ? ""
                                                    : shop
                                                        .shopCategoryId!.name!,
                                                style: const TextStyle(
                                                    fontSize: 13),
                                              ),
                                              textBtn(
                                                onPressed: () {
                                                  Get.to(() => CreateOrder(
                                                        shop: shop,
                                                      ));
                                                },
                                                text: "Shop Now",
                                                vPadding: 5,
                                                fontSize: 11,
                                                bgColor: AppColors.mainColor,
                                                color: Colors.white,
                                              ),
                                            ],
                                          ),
                                          const Divider(
                                            thickness: 1,
                                          )
                                        ]),
                                  ),
                                ],
                              ),
                            );
                          },
                          itemCount: shopController.shopsAround.length,
                        ),
            ),
          ],
        ),
      ),
    );
  }
}

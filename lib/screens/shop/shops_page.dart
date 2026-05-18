import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/shopcontroller.dart';
import 'package:pointify/main.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/screens/warehouse/create_warehouse.dart';
import 'package:pointify/widgets/alert.dart';

import '../../controllers/authcontroller.dart';
import '../../models/shop.dart';
import '../../utils/colors.dart';
import '../../widgets/minor_title.dart';
import '../../widgets/no_items_found.dart';
import '../../widgets/shop_card.dart';
import '../purchases/warehouse_create_purchase.dart';
import 'create_shop.dart';

// ignore: must_be_immutable
class ShopsPage extends StatelessWidget {
  String? from;
  final ShopController shopController = Get.find<ShopController>();
  final AuthController authController = Get.find<AuthController>();

  ShopsPage({super.key, this.from}) {
    if (from == "restockpage") {
      shopController.getShops(type: "warehouse");
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: from == "restockpage"
            ? AppBar(
                title: const Text("Choose warehouse"),
              )
            : null,
        body: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                const SizedBox(height: 10),
                if (from != "restockpage")
                  Padding(
                    padding: const EdgeInsets.all(3.0),
                    child: Align(
                      alignment: Alignment.centerRight,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          createShopContainer(context, "warehouse"),
                          const SizedBox(width: 10),
                          createShopContainer(context, "shop")
                        ],
                      ),
                    ),
                  ),
                if (from != "restockpage")
                  Container(
                    padding: const EdgeInsets.all(10),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: searchWidget(),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 10),
              ],
            ),
            if (from == "restockpage")
              Expanded(
                child: Obx(() {
                  return shopController.gettingShopsLoad.value
                      ? loadingWidget(context)
                      : shopController.allShops.isEmpty
                          ? noItemsFound(context, true)
                          : ListView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: shopController.allShops
                                  .where((shop) =>
                                      shop.warehouse != null &&
                                      shop.warehouse == true &&
                                      shop.id !=
                                          userController.currentUser.value!
                                              .primaryShop!.id)
                                  .length,
                              itemBuilder: (context, index) {
                                Shop shopModel = shopController.allShops
                                    .where(((shop) => shop.warehouse == true))
                                    .elementAt(index);
                                return shopCard(
                                    shopModel: shopModel,
                                    page: "shop",
                                    context: context,
                                    function: (Shop shop) {
                                      Get.to(() =>
                                          WarehouseCreatePurchase(shop: shop));
                                    });
                              });
                }),
              ),
            if (from != "restockpage")
              Expanded(
                child: Obx(() {
                  return shopController.gettingShopsLoad.value
                      ? loadingWidget(context)
                      : shopController.allShops.isEmpty
                          ? noItemsFound(context, true)
                          : DefaultTabController(
                              length: 2,
                              initialIndex: 0,
                              child: Column(
                                children: [
                                  TabBar(
                                    indicatorColor: AppColors.mainColor,
                                    labelColor: AppColors.mainColor,
                                    unselectedLabelColor: Colors.grey,
                                    onTap: (value) {},
                                    tabs: const [
                                      Tab(text: "Shops"),
                                      Tab(text: "Warehouses"),
                                    ],
                                  ),
                                  Expanded(
                                    child: TabBarView(
                                        physics:
                                            const NeverScrollableScrollPhysics(),
                                        children: [
                                          ListView.builder(
                                              shrinkWrap: true,
                                              itemCount: shopController.allShops
                                                  .where((shop) =>
                                                      shop.warehouse == null ||
                                                      shop.warehouse == false)
                                                  .length,
                                              itemBuilder: (context, index) {
                                                Shop shopModel = shopController
                                                    .allShops
                                                    .where((shop) =>
                                                        shop.warehouse == false)
                                                    .elementAt(index);
                                                return shopCard(
                                                    shopModel: shopModel,
                                                    page: "shop",
                                                    context: context);
                                              }),
                                          ListView.builder(
                                              shrinkWrap: true,
                                              itemCount: shopController.allShops
                                                  .where((shop) =>
                                                      shop.warehouse != null &&
                                                      shop.warehouse == true)
                                                  .length,
                                              itemBuilder: (context, index) {
                                                Shop shopModel = shopController
                                                    .allShops
                                                    .where(((shop) =>
                                                        shop.warehouse == true))
                                                    .elementAt(index);
                                                return shopCard(
                                                    shopModel: shopModel,
                                                    page: "shop",
                                                    context: context);
                                              }),
                                        ]),
                                  ),
                                ],
                              ),
                            );
                }),
              )
          ],
        ));
  }

  Widget createShopContainer(context, type) {
    return InkWell(
      onTap: () {
        if (shopController.allShops.length > 1 &&
            shopController.allShops
                .where((element) =>
                    shopController.checkDaysRemaining(shop: element) > 0)
                .isEmpty) {
          generalAlert(
            title: "Error",
            message:
                "You have more than 1 shops and non of them has active subscription, please upgrade at least one shop to continue creating more shops",
          );
          return;
        }
        if (type == "warehouse") {
          Get.to(CreateWarehouse(
            page: "warehouse",
            clearInputs: true,
            type: type,
          ));
        } else {
          Get.to(CreateShop(
            page: "shop",
            clearInputs: true,
            type: type,
          ));
        }
      },
      child: Container(
          padding: isSmallScreen(context)
              ? const EdgeInsets.symmetric(horizontal: 10, vertical: 2)
              : const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
          decoration: BoxDecoration(
            color: isSmallScreen(context) ? Colors.white : AppColors.mainColor,
            borderRadius: isSmallScreen(context)
                ? BorderRadius.circular(10)
                : BorderRadius.circular(8),
            border: Border.all(color: AppColors.mainColor, width: 2),
          ),
          child: minorTitle(
              title: "+ Add ${type == "warehouse" ? "Warehouse" : "Shop"}",
              color:
                  isSmallScreen(context) ? AppColors.mainColor : Colors.white)),
    );
  }

  Widget searchWidget() {
    return TextFormField(
      controller: shopController.searchController,
      onChanged: (value) {
        shopController.getShops(name: value.trim().toLowerCase());
      },
      decoration: InputDecoration(
        contentPadding: const EdgeInsets.fromLTRB(10, 5, 10, 5),
        suffixIcon: IconButton(
          onPressed: () {
            shopController.getShops(
                name:
                    shopController.searchController.text.trim().toLowerCase());
          },
          icon: const Icon(Icons.search),
        ),
        hintText: "Search Shop",
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(
              10,
            ),
            borderSide: const BorderSide(color: Colors.grey, width: 1)),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Colors.grey, width: 1)),
      ),
    );
  }

  Widget loadingWidget(context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        SizedBox(
          height: MediaQuery.of(context).size.height * 0.4,
        ),
        const Center(child: CircularProgressIndicator()),
      ],
    );
  }
}

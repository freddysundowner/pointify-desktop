import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/main.dart';
import 'package:pointify/reports/summary/purchases_summary.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/screens/stock/import_products.dart';
import 'package:pointify/screens/stock/stock_counts.dart';
import 'package:pointify/screens/stock/stock_transfer.dart';
import 'package:pointify/screens/warehouse/invoices.dart';
import 'package:pointify/utils/helper.dart';

import '../../controllers/productcontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../functions/functions.dart';
import '../../reports/badstocks.dart';
import '../../utils/colors.dart';
import '../../widgets/major_title.dart';
import '../../widgets/minor_title.dart';
import '../../widgets/normal_text.dart';
import '../product/create_product.dart';
import '../product/products_page.dart';
import '../purchases/create_purchase.dart';
import '../shop/shops_page.dart';

class StockPage extends StatelessWidget {
  StockPage({super.key}) {
    productController.getProductsAnalysis(type: "all");
  }
  final ShopController shopController = Get.find<ShopController>();
  final ProductController productController = Get.find<ProductController>();

  final List<Map<String, dynamic>> enterpriseOperations = [
    {
      "title": "New Product",
      "icon": Icons.production_quantity_limits,
      "category": "stocks",
      "permission": "add_products",
      "subtitle": "Introduce new product",
      "color": Colors.amberAccent
    },
    {
      "title": "Stock in",
      "icon": Icons.arrow_downward,
      "category": "stocks",
      "permission": "add_purchases",
      "subtitle": "Add to an existing stock",
      "color": Colors.blueAccent
    },
    {
      "title": "Restock from Warehouse",
      "icon": Icons.warehouse_rounded,
      "category": "warehouse",
      "permission": "create_orders",
      "subtitle": "Add to an existing stock form warehouse",
      "color": Colors.blueAccent
    },
    {
      "title": "Warehouse Orders",
      "icon": Icons.warehouse_rounded,
      "category": "warehouse",
      "permission": "view_orders",
      "subtitle": "View warehouse orders",
      "color": Colors.blueAccent
    },
    {
      "title": "Purchase",
      "icon": Icons.remove_red_eye_rounded,
      "category": "stocks",
      "permission": "view_purchases",
      "subtitle": "View purchased items",
      "color": Colors.white
    },
    {
      "title": "Count",
      "icon": Icons.calculate_outlined,
      "category": "stocks",
      "permission": "stock_count",
      "subtitle": "Tally with physical count",
      "color": Colors.amberAccent
    },
    {
      "title": "Bad Stock",
      "icon": Icons.remove_circle_outline,
      "category": "stocks",
      "permission": "badstock",
      "subtitle": "View/Add faulty goods",
      "color": Colors.redAccent
    },
    {
      "title": "Transfer",
      "icon": Icons.compare_arrows,
      "category": "stocks",
      "permission": "transfer",
      "subtitle": "Transfer stock to another shop",
      "color": Colors.green
    },
  ];

  @override
  Widget build(BuildContext context) {
    final operations = enterpriseOperations.where((e) {
      final hideWarehouse = e["category"] == "warehouse" &&
          userController.currentUser.value?.primaryShop?.warehouse == true &&
          userController.currentUser.value?.primaryShop?.production == false;

      return !hideWarehouse;
    }).toList();

    final filteredOperations = operations
        .where((e) => verifyPermission(
              category: e["category"],
              permission: e["permission"],
            ))
        .toList();
    return Helper(
        widget: SingleChildScrollView(
          child: Container(
            padding: const EdgeInsets.all(8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (verifyPermission(
                    category: "stocks", permission: "stock_summary"))
                  stockValueCard(type: "small"),
                const SizedBox(height: 10),
                majorTitle(
                    title: "Stock Actions", color: Colors.black, size: 18.0),
                ListView.builder(
                  itemCount: filteredOperations.length,
                  shrinkWrap: true,
                  physics: const ScrollPhysics(),
                  itemBuilder: (c, i) {
                    var e = filteredOperations[i];
                    return stockContainers(
                        title: e["title"],
                        subtitle: e["subtitle"],
                        icon: e["icon"],
                        onPresssed: () {
                          switch (e["subtitle"]) {
                            case "Introduce new product":
                              {
                                Get.to(() => CreateProduct(
                                      page: "create",
                                      productModel: null,
                                      clearInputs: true,
                                    ));
                              }
                            case "Add to an existing stock":
                              {
                                if (shopController.checkSubscription() ==
                                    true) {
                                  Get.to(() => CreatePurchase());
                                }
                              }
                            case "Add to an existing stock form warehouse":
                              {
                                if (shopController.checkSubscription() ==
                                    true) {
                                  Get.to(() => ShopsPage(
                                        from: 'restockpage',
                                      ));
                                }
                              }
                            case "View warehouse orders":
                              {
                                if (shopController.checkSubscription() ==
                                    true) {
                                  Get.to(() => Invoices(page: ''));
                                }
                              }
                            case "View purchased items":
                              {
                                Get.to(() => PurchasesSummary());
                              }
                            case "Tally with physical count":
                              {
                                if (shopController.checkSubscription() ==
                                    true) {
                                  Get.to(() => StockCount());
                                }
                              }
                            case "View/Add faulty goods":
                              {
                                Get.to(() => BadStockPage(
                                      page: "stock",
                                    ));
                              }
                            case "Transfer stock to another shop":
                              {
                                if (shopController.checkSubscription() ==
                                    true) {
                                  shopController.getShops();
                                  Get.to(() => StockTransfer());
                                }
                              }
                          }
                        },
                        context: context,
                        color: e["color"]);
                  },
                )
              ],
            ),
          ),
        ),
        appBar: AppBar(
          titleSpacing: 0.0,
          backgroundColor: Colors.white,
          elevation: 0.3,
          centerTitle: false,
          leading: IconButton(
            onPressed: () {
              Get.back();
            },
            icon: const Icon(
              Icons.arrow_back_ios,
              color: Colors.black,
            ),
          ),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              majorTitle(title: "Stock", color: Colors.black, size: 16.0),
              minorTitle(
                  title:
                      "${userController.currentUser.value?.primaryShop?.name}",
                  color: Colors.grey)
            ],
          ),
        ));
  }

  Widget stockContainers(
      {required title,
      required subtitle,
      required icon,
      required onPresssed,
      required context,
      required Color color}) {
    return InkWell(
      onTap: () {
        onPresssed();
      },
      child: Container(
        width: isSmallScreen(Get.context)
            ? MediaQuery.of(context).size.width
            : 200,
        margin: EdgeInsets.only(
            top: 10, right: isSmallScreen(Get.context) ? 0 : 10),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
            color: Colors.deepPurple.withOpacity(0.1),
            borderRadius: BorderRadius.circular(10)),
        child: isSmallScreen(Get.context)
            ? Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  iconWidget(color: color, icon: icon),
                  const SizedBox(
                    width: 10,
                  ),
                  content(title: title, subtitle: subtitle),
                ],
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  iconWidget(color: color, icon: icon),
                  const SizedBox(
                    height: 10,
                  ),
                  content(title: title, subtitle: subtitle),
                ],
              ),
      ),
    );
  }

  Widget iconWidget({required color, required icon}) {
    double size = isSmallScreen(Get.context) ? 40 : 80;
    return Container(
      height: size,
      width: size,
      decoration:
          BoxDecoration(color: color, borderRadius: BorderRadius.circular(20)),
      child: Center(child: Icon(icon)),
    );
  }

  Widget content({required title, required subtitle}) {
    return Column(
      crossAxisAlignment: isSmallScreen(Get.context)
          ? CrossAxisAlignment.start
          : CrossAxisAlignment.center,
      children: [
        majorTitle(title: title, color: Colors.black, size: 16.0),
        const SizedBox(height: 5),
        normalText(title: subtitle, color: Colors.grey, size: 14.0)
      ],
    );
  }

  Widget stockValueCard({required String type}) {
    return Card(
      elevation: 5,
      child: Container(
        padding: const EdgeInsets.all(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                Row(
                  children: [
                    majorTitle(
                        title: "Stock Value", color: Colors.black, size: 15.0),
                    const Spacer(),
                    Obx(() {
                      return normalText(
                          title: htmlPrice(productController
                              .productAnalysis.value?["totalStockValue"]),
                          color: Colors.black,
                          size: 14.0);
                    })
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    majorTitle(
                        title: "Profit Estimate",
                        color: Colors.black,
                        size: 15.0),
                    const Spacer(),
                    Obx(() {
                      return normalText(
                          title: htmlPrice(
                            productController
                                .productAnalysis.value?["profitEstimate"],
                          ),
                          color: Colors.black,
                          size: 14.0);
                    })
                  ],
                ),
                const SizedBox(height: 20),
              ],
            ),
            if (verifyPermission(
                category: "stocks", permission: "view_products"))
              InkWell(
                splashColor: Colors.transparent,
                onTap: () {
                  Get.to(() => ProductPage(refetch: true));
                },
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    width: double.infinity,
                    decoration: BoxDecoration(
                        border:
                            Border.all(width: 3, color: AppColors.mainColor),
                        borderRadius: BorderRadius.circular(40)),
                    child: Center(
                        child: majorTitle(
                            title: "View Products",
                            color: AppColors.mainColor,
                            size: 18.0)),
                  ),
                ),
              ),
            const SizedBox(height: 20),
            if (verifyPermission(
                category: "stocks", permission: "add_products"))
              InkWell(
                splashColor: Colors.transparent,
                onTap: () {
                  Get.to(() => ImportProducts());
                },
                child: Center(
                  child: Center(
                      child: majorTitle(
                          title: "Import Products",
                          color: AppColors.mainColor,
                          size: 13.0)),
                ),
              ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}

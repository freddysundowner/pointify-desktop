import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/ordercontroller.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/saleitem.dart';
import 'package:pointify/screens/discover/orders/order_preview.dart';
import 'package:pointify/screens/product/products_page.dart';
import 'package:pointify/widgets/alert.dart';

import '../../../controllers/customercontroller.dart';
import '../../../controllers/productcontroller.dart';
import '../../../controllers/salescontroller.dart';
import '../../../controllers/shopcontroller.dart';
import '../../../models/product.dart';
import '../../../models/shop.dart';
import '../../../utils/colors.dart';
import '../../../widgets/major_title.dart';
import '../customer_signup.dart';

class CreateOrder extends StatelessWidget {
  final String? page;
  final Shop? shop;

  CreateOrder({Key? key, this.page, this.shop}) : super(key: key) {
    if (shop != null) {
      orderController.currentShop.value = shop;
    }
  }

  final SalesController salesController = Get.find<SalesController>();
  final OrderController orderController = Get.find<OrderController>();
  final ShopController shopController = Get.find<ShopController>();
  final ProductController productController = Get.find<ProductController>();
  final CustomerController customersController = Get.find<CustomerController>();

  @override
  Widget build(BuildContext context) {
    return PopScope(
        canPop: true,
        onPopInvoked: (val) {
          salesController.receipt.value = null;
        },
        child: Obx(
          () => Scaffold(
            backgroundColor: Colors.white,
            body: SafeArea(
              child: Column(
                children: [
                  Row(
                    children: [
                      IconButton(
                          onPressed: () {
                            Get.back();
                            salesController.receipt.value = null;
                          },
                          icon:  Icon(
                            Icons.clear,
                            color: AppColors.mainColor,
                          )),
                      Text(
                        "Order Items from\n${shop!.name!.capitalizeFirst}",
                        style:  TextStyle(
                            color: AppColors.mainColor,
                            fontWeight: FontWeight.bold,
                            fontSize: 16),
                      ),
                    ],
                  ),
                  Expanded(
                    child: Column(
                      children: [
                        const SizedBox(
                          height: 10,
                        ),
                        Material(
                          elevation: 1,
                          child: Container(
                            width: double.infinity,
                            color: Colors.white,
                            padding: const EdgeInsets.fromLTRB(5, 0, 5, 5),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const SizedBox(
                                  height: 10,
                                ),
                                Row(
                                  children: [
                                    Expanded(
                                      child: InkWell(
                                        onTap: () {
                                          productController.getProductsBySort(
                                              type: "all",
                                              shop: shop!.id ?? "");
                                          Get.to(() => ProductPage(
                                              type: "onlineorders",
                                              function: (Product product) {
                                                salesController
                                                    .addToCart(product);
                                              }));
                                        },
                                        child: Container(
                                          padding: const EdgeInsets.fromLTRB(
                                              5, 10, 5, 10),
                                          decoration: BoxDecoration(
                                              borderRadius:
                                                  BorderRadius.circular(10),
                                              color: AppColors.lightDeepPurple),
                                          child: Row(
                                            mainAxisAlignment:
                                                MainAxisAlignment.center,
                                            children: [
                                              Text(
                                                "Search ${salesController.receipt.value != null ? "more items" : "items to buy"}",
                                                style: const TextStyle(
                                                    color: Colors.black,
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 18),
                                              ),
                                              const Icon(
                                                Icons.add,
                                                color: Colors.white,
                                                size: 18,
                                              )
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(
                                  height: 5,
                                ),
                              ],
                            ),
                          ),
                        ),
                        Expanded(
                          child: Obx(() {
                            return salesController.receipt.value == null
                                ? InkWell(
                                    onTap: () {
                                      Get.to(() => ProductPage(
                                          type: "salemodule",
                                          function: (Product product) {
                                            salesController.addToCart(product);
                                          }));
                                    },
                                    child:  Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.center,
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Icon(
                                          Icons.add_circle_outline_outlined,
                                          size: 40,
                                          color: AppColors.mainColor,
                                        ),
                                        SizedBox(
                                          height: 10,
                                        ),
                                        Text(
                                          "add items",
                                          style: TextStyle(
                                              color: AppColors.mainColor,
                                              fontSize: 21),
                                        ),
                                      ],
                                    ),
                                  )
                                : Column(
                                    children: [
                                      Expanded(
                                        child: ListView.builder(
                                            shrinkWrap: true,
                                            itemCount: salesController
                                                .receipt.value!.items?.length,
                                            itemBuilder: (context, index) {
                                              SaleItem receiptItem =
                                                  salesController
                                                          .receipt.value!.items
                                                          ?.elementAt(index)
                                                      as SaleItem;
                                              return salesContainer(
                                                  receiptItem: receiptItem,
                                                  index: index,
                                                  type: "order");
                                            }),
                                      ),
                                      Container(
                                        margin: const EdgeInsets.symmetric(
                                            horizontal: 20, vertical: 10),
                                        child: Column(
                                          children: [
                                            const SizedBox(
                                              height: 10,
                                            ),
                                            InkWell(
                                              onTap: () {
                                                if (salesController
                                                            .receipt.value ==
                                                        null ||
                                                    salesController
                                                        .receipt
                                                        .value!
                                                        .items!
                                                        .isEmpty) {
                                                  generalAlert(
                                                      title: "No items to pay");
                                                  return;
                                                }

                                                if (orderController
                                                            .currentCustomer
                                                            .value ==
                                                        null &&
                                                    userController.currentUser
                                                            .value ==
                                                        null) {
                                                  Get.to(() => CustomerSignUp(
                                                      toPage: "sales"));
                                                } else {
                                                  Get.to(() => OrderPreview());
                                                }
                                              },
                                              child: Container(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                        vertical: 15),
                                                decoration: BoxDecoration(
                                                    color: AppColors.mainColor,
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                            10)),
                                                child: Center(
                                                  child: majorTitle(
                                                      title:
                                                          "Request Quote Now",
                                                      color: Colors.white,
                                                      size: 18.0),
                                                ),
                                              ),
                                            )
                                          ],
                                        ),
                                      )
                                    ],
                                  );
                          }),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ));
  }

  Widget salesContainer(
      {required SaleItem receiptItem, required index, required type}) {
    SalesController salesController = Get.find<SalesController>();
    Product productModel = receiptItem.product!;

    return Container(
      padding: const EdgeInsets.all(8.0),
      decoration: BoxDecoration(
          border: Border(
              bottom: BorderSide(
        color: Colors.grey.withOpacity(0.3),
      ))),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              "${productModel.name}".capitalize!,
              style: const TextStyle(color: Colors.black, fontSize: 14),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Column(
            mainAxisAlignment: MainAxisAlignment.end,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
                IconButton(
                    onPressed: () {
                      salesController.decrementItem(index);
                    },
                    icon:  Icon(Icons.remove_circle,
                        color: AppColors.mainColor, size: 25)),
                Container(
                    padding: const EdgeInsets.only(
                        top: 5, bottom: 5, right: 8, left: 8),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(5),
                      border: Border.all(color: Colors.black, width: 0.1),
                    ),
                    child: majorTitle(
                        title: "${receiptItem.quantity}",
                        color: Colors.black,
                        size: 12.0)),
                IconButton(
                    onPressed: () {
                      salesController.incrementItem(index);
                    },
                    icon:  Icon(Icons.add_circle,
                        color: AppColors.mainColor, size: 25)),
                IconButton(
                  color: Colors.grey,
                  icon: const Icon(
                    Icons.restore_from_trash,
                    size: 25,
                    color: Colors.red,
                  ),
                  onPressed: () {
                    salesController.removeFromList(index);
                  },
                )
              ]),
            ],
          )
        ],
      ),
    );
  }

  needCustomer() {
    return salesController.paymentType.value == "Credit" ||
        salesController.paymentType.value == "Wallet";
  }
}

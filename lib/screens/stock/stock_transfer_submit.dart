import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/stockcontroller.dart';
import 'package:pointify/screens/stock/products_selection.dart';
import 'package:pointify/screens/stock/stockqty.dart';
import 'package:pointify/utils/colors.dart';

import '../../controllers/homecontroller.dart';
import '../../controllers/productcontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../models/product.dart';
import '../../models/shop.dart';
import '../../widgets/major_title.dart';
import '../sales/components/sales_qty_dialog.dart';

class StockSubmit extends StatelessWidget {
  final Shop toShop;

  StockSubmit({Key? key, required this.toShop}) : super(key: key);
  final StockController stockTransferController = Get.find<StockController>();
  final ProductController productController = Get.find<ProductController>();
  final ShopController shopController = Get.find<ShopController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white,
          centerTitle: false,
          elevation: 0.2,
          title: const Text(
            "Transfer",
            style: TextStyle(color: Colors.black),
          ),
          leading: IconButton(
              onPressed: () {
                if (MediaQuery.of(context).size.width > 600) {
                  Get.find<HomeController>().selectedWidget.value =
                      ProductSelections(toShop: toShop);
                } else {
                  Get.back();
                }
              },
              icon: const Icon(
                Icons.arrow_back_ios,
                color: Colors.black,
              )),
        ),
        bottomNavigationBar: BottomAppBar(
          color: Colors.white,
          height: kToolbarHeight * 1.8,
          child: Obx(() {
            return stockTransferController.isSavingingCount.isTrue
                ? const Center(
                    child: CircularProgressIndicator(),
                  )
                : Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),

                    child: InkWell(
                      splashColor: Colors.transparent,
                      onTap: () {
                        stockTransferController.submitTranster(
                            toShop: toShop, context: context);
                      },
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        width: double.infinity,
                        decoration: BoxDecoration(
                            border: Border.all(
                                width: 3, color: AppColors.mainColor),
                            borderRadius: BorderRadius.circular(40)),
                        child: Center(
                            child: majorTitle(
                                title: "Complete",
                                color: AppColors.mainColor,
                                size: 18.0)),
                      ),
                    ),
                  );
          }),
        ),
        body: Obx(
          () {
            return ListView.builder(
              shrinkWrap: true,
              itemBuilder: (context, index) {
                var productTransfer =
                    stockTransferController.selectedProducts.elementAt(index);
                Product product = stockTransferController.selectedProducts
                    .elementAt(index)["item"];
                return Container(
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.all(Radius.circular(8)),
                    boxShadow: [
                      BoxShadow(
                          color: Colors.grey, //New
                          blurRadius: 2.0,
                          offset: Offset(1, 1))
                    ],
                  ),
                  padding: const EdgeInsets.all(10),
                  margin: const EdgeInsets.only(
                      left: 10, right: 10, bottom: 7, top: 3),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "${product.name}".capitalize!,
                        style: const TextStyle(
                            color: Colors.black,
                            fontWeight: FontWeight.bold,
                            fontSize: 16),
                      ),
                      const SizedBox(height: 5),
                      if (product.type == 'product')
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              flex: 4,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    "Available".capitalize!,
                                    style: const TextStyle(
                                        color: Colors.grey, fontSize: 15),
                                  ),
                                  const SizedBox(
                                    height: 5,
                                  ),
                                  Text(
                                    "${product.quantity ?? 0}",
                                    style: const TextStyle(
                                        color: Colors.grey, fontSize: 15),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(
                              width: 20,
                            ),
                            Expanded(
                              flex: 4,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    "Transfer Count".capitalize!,
                                    style: const TextStyle(
                                        color: Colors.grey, fontSize: 15),
                                  ),
                                  const SizedBox(
                                    height: 5,
                                  ),
                                  Row(
                                    children: [
                                      InkWell(
                                          onTap: () {
                                            if (productTransfer['quantity'] >
                                                1) {
                                              stockTransferController
                                                      .selectedProducts[index]
                                                  ["quantity"]--;
                                              stockTransferController
                                                  .selectedProducts
                                                  .refresh();
                                            }
                                          },
                                          child: const Icon(
                                              Icons.remove_circle_outline)),
                                      const Spacer(),

                                      InkWell(
                                        onTap: () {
                                          stockDialog(

                                            index: index,
                                            product:product,
                                          );
                                        },
                                        child: Container(
                                            padding: const EdgeInsets.only(
                                                top: 5, bottom: 5, right: 8, left: 8),
                                            decoration: BoxDecoration(
                                              borderRadius: BorderRadius.circular(5),
                                              border: Border.all(color: Colors.black, width: 0.1),
                                            ),
                                            child: majorTitle(
                                                title: "${productTransfer['quantity'] ?? 1}",
                                                color: Colors.black,
                                                size: 12.0)),
                                      ),
                                      // Text(
                                      //   "${productTransfer['quantity'] ?? 1}",
                                      //   style: const TextStyle(
                                      //       color: Colors.grey, fontSize: 15),
                                      // ),
                                      const Spacer(),
                                      InkWell(
                                          onTap: () {
                                            if (product.quantity! >
                                                stockTransferController
                                                        .selectedProducts[index]
                                                    ["quantity"]) {
                                              stockTransferController
                                                      .selectedProducts[index]
                                                  ["quantity"]++;
                                              stockTransferController
                                                  .selectedProducts
                                                  .refresh();
                                            }

                                          },
                                          child: const Icon(
                                              Icons.add_circle_outline)),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(
                              width: 20,
                            ),
                            Expanded(
                                flex: 2,
                                child: InkWell(
                                  onTap: () {
                                    stockTransferController.selectedProducts
                                        .removeWhere((element) =>
                                            element['product'] ==
                                            productTransfer['product']);
                                    stockTransferController.selectedProducts
                                        .refresh();
                                    productController.products.refresh();
                                  },
                                  child:  Icon(
                                    Icons.clear,
                                    color: AppColors.mainColor,
                                  ),
                                ))
                          ],
                        ),
                      if (product.type == 'service')
                        Align(
                          alignment: Alignment.topRight,
                          child: InkWell(
                            onTap: () {
                              stockTransferController.selectedProducts
                                  .removeWhere((element) =>
                                      element['product'] ==
                                      productTransfer['product']);
                              stockTransferController.selectedProducts
                                  .refresh();
                              productController.products.refresh();
                            },
                            child:  Icon(
                              Icons.clear,
                              color: AppColors.mainColor,
                            ),
                          ),
                        ),
                    ],
                  ),
                );
              },
              itemCount: stockTransferController.selectedProducts.length,
            );
          },
        ));
  }
}

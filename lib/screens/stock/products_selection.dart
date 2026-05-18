import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/stockcontroller.dart';
import 'package:pointify/screens/stock/stock_transfer_submit.dart';

import '../../controllers/productcontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../models/product.dart';
import '../../models/shop.dart';
import '../../utils/colors.dart';
import '../../widgets/major_title.dart';
import '../../widgets/minor_title.dart';
import '../../widgets/snackBars.dart';

class ProductSelections extends StatelessWidget {
  final Shop toShop;

  ProductSelections({Key? key, required this.toShop}) : super(key: key);

  final ProductController productController = Get.find<ProductController>();
  final StockController stockTransferController = Get.find<StockController>();
  final ShopController shopController = Get.find<ShopController>();

  Widget searchWidget() {
    return TextFormField(
      controller: productController.searchProductController,
      onChanged: (value) {
        if (value == "") {
          productController.getProductsBySort(
            type: "all",
          );
        } else {
          productController.getProductsBySort(
              type: "search",
              text: productController.searchProductController.text);
        }
      },
      decoration: InputDecoration(
        contentPadding: const EdgeInsets.fromLTRB(10, 2, 10, 2),
        suffixIcon: IconButton(
          onPressed: () {
            productController.getProductsBySort(
                type: "search",
                text: productController.searchProductController.text);
          },
          icon: const Icon(Icons.search),
        ),
        hintText: "Quick Search",
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
        ),
      ),
    );
  }
  List<Product> get outOfStockProducts =>
      productController.products
          .where((p) => p.type == 'product' && (p.quantity ?? 0) <= 0)
          .toList();

  List<Product> get availableProducts =>
      productController.products
          .where((p) => p.type == 'service' || (p.quantity ?? 0) > 0)
          .toList();
  Widget productTile(Product productBody) {
    return InkWell(
      onTap: () {
        if (productBody.quantity! > 0 || productBody.type == 'service') {
          stockTransferController.addToList(productBody);
        } else {
          showSnackBar(
            message: "You cannot transfer product that is out of stock",
            color: Colors.red,
          );
        }
      },
      child: Padding(
        padding: const EdgeInsets.all(4.0),
        child: Card(
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10)),
          elevation: 4,
          child: Container(
            padding: const EdgeInsets.all(10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(productBody.name ?? ""),
                      const SizedBox(height: 10),
                      if (productBody.productCategoryId != null)
                        minorTitle(
                          title:
                          "Category: ${productBody.productCategoryId?.name}",
                          color: Colors.grey,
                        ),
                      if (productBody.type == 'product') ...[
                        const SizedBox(height: 10),
                        Text(
                          "Qty Available: ${productBody.quantity}",
                          style: const TextStyle(
                              color: Colors.grey, fontSize: 16),
                        ),
                      ]
                    ],
                  ),
                ),
                Checkbox(
                  value: stockTransferController.selectedProducts
                      .indexWhere((e) =>
                  e['product'] == productBody.sId) !=
                      -1,
                  onChanged: (_) {},
                )
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: true,
      onPopInvoked: (val) {
        stockTransferController.selectedProducts.value = [];
        stockTransferController.selectedProducts.refresh();
        productController.products.refresh();
      },
      child: Scaffold(
          appBar: AppBar(
            titleSpacing: 0.0,
            backgroundColor: Colors.white,
            elevation: 0.3,
            centerTitle: false,
            leading: IconButton(
              onPressed: () {
                stockTransferController.selectedProducts.value = [];
                stockTransferController.selectedProducts.refresh();
                productController.products.refresh();
                Get.back();
              },
              icon: const Icon(
                Icons.arrow_back_ios,
                color: Colors.black,
              ),
            ),
            title: majorTitle(
                title: "Product Selection", color: Colors.black, size: 16.0),
          ),
          body: Column(
            children: [
              Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                  child: searchWidget()),
              Expanded(
                child: Obx(() {
                  if (productController.products.isEmpty) {
                    return const Center(child: Text("no products to transfer"));
                  }

                  return ListView(
                    children: [
                      /// 🔴 COLLAPSIBLE OUT-OF-STOCK PRODUCTS
                      if (outOfStockProducts.isNotEmpty)
                        Card(
                          margin: const EdgeInsets.all(8),
                          child: ExpansionTile(
                            initiallyExpanded: false,
                            leading: const Icon(Icons.warning, color: Colors.red),
                            title: const Text(
                              "Out of Stock",
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            trailing: Container(
                              padding:
                              const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.red,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                outOfStockProducts.length.toString(),
                                style: const TextStyle(color: Colors.white),
                              ),
                            ),
                            children:
                            outOfStockProducts.map(productTile).toList(),
                          ),
                        ),

                      /// ✅ AVAILABLE PRODUCTS
                      ...availableProducts.map(productTile).toList(),
                    ],
                  );
                }),
              ),

            ],
          ),
          bottomNavigationBar: Obx(() => BottomAppBar(
                color: Colors.white,
                height: stockTransferController.selectedProducts.isEmpty
                    ? 0
                    : kBottomNavigationBarHeight * 1.8,
                child: Obx(() {
                  return stockTransferController.selectedProducts.isEmpty
                      ? Container(
                          height: 0,
                        )
                      : Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(10),
                          child: InkWell(
                            splashColor: Colors.transparent,
                            onTap: () {
                              Get.to(() => StockSubmit(
                                    toShop: toShop,
                                  ));
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
                                      title: "Proceed",
                                      color: AppColors.mainColor,
                                      size: 18.0)),
                            ),
                          ),
                        );
                }),
              ))),
    );
  }
}

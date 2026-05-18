import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/stockcontroller.dart';
import 'package:pointify/widgets/alert.dart';

import '../../controllers/productcontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../main.dart';
import '../../models/product.dart';
import '../../models/shop.dart';
import '../../utils/colors.dart';
import '../../widgets/major_title.dart';
import '../../widgets/minor_title.dart';

class ProductShopImport extends StatelessWidget {
  final Shop toShop;

  ProductShopImport({Key? key, required this.toShop}) : super(key: key) {
    // productController.getProductsBySort(type: "all");
  }

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
            title: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    majorTitle(
                        title: "Product Selection",
                        color: Colors.black,
                        size: 16.0),
                  ],
                ),
              ],
            ),
          ),
          body: Column(
            children: [
              Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                  child: searchWidget()),
              Expanded(
                child: Obx(() {
                  return productController.products.isEmpty
                      ? const Center(
                          child: Text("no products to transfer"),
                        )
                      : Column(
                          children: [
                            Container(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 10),
                              child: Align(
                                alignment: Alignment.centerRight,
                                child: InkWell(
                                  onTap: () {
                                    _selectAll(
                                        !productController.transferAll.value);
                                  },
                                  child: Row(
                                    children: [
                                      Text(
                                          "Select All (${productController.productssPaginageSettings['total']})"),
                                      Obx(
                                        () => Checkbox(
                                            value: productController
                                                .transferAll.value,
                                            onChanged: (v) {
                                              stockTransferController
                                                  .transferall.value = v!;
                                              _selectAll(v);
                                            }),
                                      )
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            Expanded(
                              child: ListView.builder(
                                  itemCount: productController.products.length,
                                  itemBuilder: (context, index) {
                                    Product productBody = productController
                                        .products
                                        .elementAt(index);
                                    return InkWell(
                                      onTap: () {
                                        var index = stockTransferController
                                            .selectedProducts
                                            .indexWhere((element) =>
                                                element["name"] ==
                                                productBody.name);
                                        if (index == -1) {
                                          stockTransferController
                                              .selectedProducts
                                              .add(_addProduct(productBody));
                                        } else {
                                          int i = stockTransferController
                                              .selectedProducts
                                              .indexWhere((element) =>
                                                  element["name"] ==
                                                  productBody.name);
                                          stockTransferController
                                              .selectedProducts
                                              .removeAt(i);
                                        }
                                        productController.products.refresh();
                                        stockTransferController.selectedProducts
                                            .refresh();
                                      },
                                      child: Padding(
                                        padding: const EdgeInsets.all(4.0),
                                        child: Card(
                                          shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(10)),
                                          elevation: 4,
                                          child: Container(
                                            padding: const EdgeInsets.all(10),
                                            child: Row(
                                              mainAxisAlignment:
                                                  MainAxisAlignment
                                                      .spaceBetween,
                                              children: [
                                                Column(
                                                  crossAxisAlignment:
                                                      CrossAxisAlignment.start,
                                                  children: [
                                                    majorTitle(
                                                        title:
                                                            "${productBody.name}",
                                                        color: Colors.black,
                                                        size: 16.0),
                                                    const SizedBox(height: 5),
                                                    if (productBody
                                                            .productCategoryId !=
                                                        null)
                                                      minorTitle(
                                                          title:
                                                              " ${productBody.productCategoryId?.name}",
                                                          color: Colors.grey),
                                                    if (productBody.type ==
                                                        'product')
                                                      const SizedBox(
                                                          height: 10),
                                                    if (productBody.type ==
                                                        'product')
                                                      Text(
                                                          "Qty ${productBody.quantity} ${productBody.measureUnit}",
                                                          style:
                                                              const TextStyle(
                                                                  color: Colors
                                                                      .grey,
                                                                  fontSize: 16))
                                                  ],
                                                ),
                                                Checkbox(
                                                    value: productController
                                                                .transferAll
                                                                .value ==
                                                            true
                                                        ? true
                                                        : (stockTransferController
                                                                    .selectedProducts
                                                                    .indexWhere((element) =>
                                                                        element[
                                                                            'name'] ==
                                                                        productBody
                                                                            .name) !=
                                                                -1
                                                            ? true
                                                            : false),
                                                    onChanged: (value) {})
                                              ],
                                            ),
                                          ),
                                        ),
                                      ),
                                    );
                                  }),
                            ),
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
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(10),
                  child: InkWell(
                    splashColor: Colors.transparent,
                    onTap: () {
                      generalAlert(
                        title: "Proceed",
                        message:
                            "Are you sure you want to transfer ${stockTransferController.selectedProducts.length} products?",
                        positiveText: "Yes",
                        negativeText: "No",
                        function: () {
                          productController.transferProducts(
                              stockTransferController.selectedProducts, toShop,
                              all: stockTransferController.transferall.value);
                        },
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      width: double.infinity,
                      decoration: BoxDecoration(
                          border:
                              Border.all(width: 3, color: AppColors.mainColor),
                          borderRadius: BorderRadius.circular(40)),
                      child: Center(
                          child: majorTitle(
                              title: "Proceed",
                              color: AppColors.mainColor,
                              size: 18.0)),
                    ),
                  ),
                ),
              ))),
    );
  }

  void _selectAll(bool? v) {
    productController.transferAll.value = !productController.transferAll.value;
    if (v == false) {
      stockTransferController.selectedProducts.clear();
    } else {
      stockTransferController.selectedProducts.addAll(
          productController.products.map((element) => _addProduct(element)));
    }
    productController.products.refresh();
  }

  Map<String, dynamic> _addProduct(Product element) {
    var data = {
      "name": element.name,
      "quantity": element.quantity,
      "buyingPrice": element.buyingPrice,
      "sellingPrice": element.sellingPrice,
      "minSellingPrice": element.minSellingPrice ?? element.minSellingPrice,
      "shopId": toShop.id,
      "measure": element.measureUnit ?? "",
      "productCategoryId": element.productCategoryId?.name ?? "",
      "attendantId": userController.currentUser.value!.attendantId?.sId,
      "reorderLevel": element.reorderLevel ?? 0,
      "maxDiscount": element.maxDiscount ?? 0,
      "description": element.description ?? "",
      "supplierId": element.supplierId?.name ?? "",
      "owner": toShop.owner?.id,
      "deleted": false
    };
    return data;
  }
}

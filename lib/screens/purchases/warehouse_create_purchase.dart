import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/warehousecontroller.dart';
import 'package:pointify/main.dart';
import 'package:pointify/screens/purchases/product_stockin_warehouse_preview.dart';
import 'package:pointify/widgets/no_items_found.dart';

import '../../controllers/productcontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../functions/functions.dart';
import '../../models/product.dart';
import '../../models/shop.dart';
import '../../utils/colors.dart';
import '../../widgets/alert.dart';
import '../../widgets/major_title.dart';
import '../../widgets/minor_title.dart';
import '../../widgets/product_image.dart';

class CartButton extends StatelessWidget {
  Shop shop;
  CartButton({Key? key, required this.shop}) : super(key: key);
  WareHouseController wareHouseController = Get.find<WareHouseController>();
  @override
  Widget build(BuildContext context) {
    return FloatingActionButton(
      onPressed: () {
        Get.to(() => ProductStockinWarehousePreview(shop: shop));
      },
      child: Stack(
        alignment: Alignment.center,
        children: [
          const Icon(Icons.shopping_cart),
          // if (itemCount > 0)
          Positioned(
            right: 0,
            child: Container(
              padding: EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: Colors.red,
                borderRadius: BorderRadius.circular(10),
              ),
              constraints: const BoxConstraints(
                minWidth: 16,
                minHeight: 16,
              ),
              child: Obx(
                () => Text(
                  '${wareHouseController.productsCountCart.length}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class WarehouseCreatePurchase extends StatelessWidget {
  Shop? shop;
  WarehouseCreatePurchase({Key? key, this.shop}) : super(key: key) {
    productController.searchProductCountController.text = "";
    productController.getProductsBySort(
        type: 'all', warehouse: true, shop: shop!.id!, limit: 50);
  }

  final ProductController productController = Get.find<ProductController>();
  final WareHouseController wareHouseController =
      Get.find<WareHouseController>();
  final ShopController shopController = Get.find<ShopController>();
  @override
  Widget build(BuildContext context) {
    return Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white,
          centerTitle: false,
          elevation: 0.3,
          titleSpacing: 0.0,
          leading: IconButton(
            onPressed: () {
              Get.back();
              productController.filterProductsLocally('');
              productController.searchProductController.clear();
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
                  majorTitle(title: "Restock", color: Colors.black, size: 16.0),
                  minorTitle(
                      title:
                          "${userController.currentUser.value?.primaryShop?.name}",
                      color: Colors.grey)
                ],
              ),
              Spacer(),
              const SizedBox(
                width: 20,
              ),
              Container(
                  padding: const EdgeInsets.only(right: 20),
                  child: InkWell(
                      onTap: () {
                        productController.getProductsBySort(
                          type: 'all',
                          warehouse: true,
                          shop: shop!.id!,
                        );
                      },
                      child:  Icon(Icons.refresh,
                          color: AppColors.mainColor))),
            ],
          ),
        ),
        floatingActionButton: CartButton(shop: shop!),
        body: ListView(children: [
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(10),
            child: TextFormField(
              controller: productController.searchProductCountController,
              onChanged: (query) {
                if (query.isEmpty) {
                  wareHouseController.productsCount.value =
                      productController.products;
                  productController.getProductsBySort(
                      type: "search",
                      text: productController.searchProductCountController.text,
                      page: 1,
                      warehouse: true,
                      shop: shop!.id!,
                      limit: 50);
                } else {
                  wareHouseController.productsCount.value = productController
                      .products
                      .where((product) => product.name!
                          .toLowerCase()
                          .contains(query.toLowerCase()))
                      .toList();
                }
              },
              decoration: InputDecoration(
                suffixIconConstraints: BoxConstraints(maxWidth: 100),
                contentPadding: const EdgeInsets.fromLTRB(10, 2, 10, 2),
                suffixIcon: Align(
                  alignment: Alignment.centerRight,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        vertical: 10, horizontal: 15),
                    decoration: BoxDecoration(
                      color: AppColors.mainColor,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: InkWell(
                      onTap: () {
                        productController.getProductsBySort(
                          type: "search",
                          text: productController
                              .searchProductCountController.text,
                          page: 1,
                          limit: 50,
                          warehouse: true,
                          shop: shop!.id!,
                        );
                      },
                      child: const Text(
                        "Search",
                        style: TextStyle(color: Colors.white),
                      ),
                    ),
                  ),
                ),
                hintText: "Quick Search Item",
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Colors.grey, width: 1)),
                focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Colors.grey, width: 1)),
              ),
            ),
          ),
          Container(
            margin: EdgeInsets.symmetric(horizontal: 10),
            child: DropdownButtonFormField<Shop>(
              value: shopController.allShops
                  .where((w) => w.warehouse == true && shop?.id == w.id)
                  .first,
              hint: const Text('Select warehouse'),
              decoration: InputDecoration(
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              items: shopController.allShops
                  .where((s) => s.warehouse == true)
                  .map((Shop value) {
                return DropdownMenuItem<Shop>(
                  value: value,
                  child: Text(value.name!),
                );
              }).toList(),
              onChanged: (Shop? value) {
                productController.getProductsBySort(
                    type: 'all', warehouse: true, shop: value!.id!);
              },
            ),
          ),
          Obx(() {
            return productController.loadingproducts.isTrue
                ? const Center(
                    child: CircularProgressIndicator(),
                  )
                : wareHouseController.productsCount.isEmpty
                    ? noItemsFound(context, false)
                    : ListView.builder(
                        physics: const NeverScrollableScrollPhysics(),
                        shrinkWrap: true,
                        itemCount: wareHouseController.productsCount.length,
                        itemBuilder: (context, index) {
                          Product product = wareHouseController.productsCount
                              .elementAt(index);
                          return Obx(
                            () => warehouseProductCard(
                                product: product,
                                ordered: wareHouseController.productsCountCart
                                            .indexWhere((element) =>
                                                element.sId == product.sId) ==
                                        -1
                                    ? false
                                    : true,
                                function: (Product product) {
                                  if (product.quantity! < 1 &&
                                      product.virtual == false &&
                                      product.bundleItems!.isEmpty) {
                                    generalAlert(
                                      title: "Error",
                                      message: "Item out of stock",
                                    );
                                    return;
                                  }
                                  return wareHouseController
                                      .incrementQuantityWidget(context,
                                          product: product);
                                }),
                          );
                        });
          })
        ]));
  }

  Widget warehouseProductCard(
      {required Product product, Function? function, bool? ordered = false}) {
    return InkWell(
      onTap: () {
        function!(product);
      },
      child: Padding(
        padding: const EdgeInsets.all(3.0),
        child: Card(
          color: product.type == "service"
              ? AppColors.mainColor
              : product.quantity == 0 &&
                      product.virtual == false &&
                      product.manageByPrice == false
                  ? Colors.red
                  : product.quantity! <= product.reorderLevel! &&
                          product.virtual == false &&
                          product.manageByPrice == false
                      ? Colors.amber
                      : Colors.white,
          elevation: 1,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(5.0),
          ),
          child: Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                ProductImage(
                  element: product.images != null && product.images!.isNotEmpty
                      ? product.images![0].path
                      : "",
                  radius: 10,
                  size: 50,
                ),
                const SizedBox(
                  width: 10,
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  "${product.name!.capitalizeFirst!} ${product.measureUnit ?? ""}",
                                  style: const TextStyle(fontSize: 16.0),
                                  softWrap: false,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                if (verifyPermission(
                                        category: "warehouse",
                                        permission: "view_buying_price") &&
                                    product.virtual == false)
                                  Text(
                                    "BP/= ${htmlPrice(product.buyingPrice?.toStringAsFixed(2))}",
                                    style: const TextStyle(color: Colors.black),
                                  ),
                              ],
                            ),
                          ),
                          if (wareHouseController.productsCountCart.isNotEmpty)
                            InkWell(
                              onTap: () {
                                wareHouseController.productsCountCart
                                    .removeWhere((element) =>
                                        element.sId == product.sId);
                                wareHouseController.productsCountCart.refresh();
                                wareHouseController.productsCountCart.refresh();
                              },
                              child: Container(
                                margin: const EdgeInsets.only(left: 10),
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 5, vertical: 2),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(5),
                                  color: ordered == true
                                      ? AppColors.mainColor
                                      : Colors.transparent,
                                ),
                                child: Row(
                                  children: [
                                    Text(
                                      ordered == true
                                          ? "(${wareHouseController.productsCountCart.where((element) => element.sId == product.sId).first.lastCount}) Selected"
                                          : "",
                                      style: const TextStyle(
                                        fontSize: 12.0,
                                        color: Colors.white,
                                      ),
                                      softWrap: false,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(
                                      width: 4,
                                    ),
                                    if (ordered == true)
                                      const Icon(
                                        Icons.remove_circle,
                                        color: Colors.red,
                                      )
                                  ],
                                ),
                              ),
                            ),
                        ],
                      ),
                      if (wareHouseController.productsCountCart.isNotEmpty)
                        const SizedBox(
                          height: 5,
                        ),
                      Row(
                        children: [
                          if (product.productCategoryId != null)
                            minorTitle(
                                title: "${product.productCategoryId?.name},",
                                color: Colors.black,
                                size: 11),
                          if (product.productCategoryId != null)
                            const SizedBox(width: 5),
                          if (product.manufacturer!.isNotEmpty)
                            Text(
                              product.manufacturer ?? "",
                              style: const TextStyle(
                                  color: Colors.grey, fontSize: 13),
                            )
                        ],
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (product.reorderLevel! > 0 &&
                                  product.virtual == false)
                                minorTitle(
                                    title:
                                        "Restock @ ${product.reorderLevel} ~ Qty: ${product.quantity?.toStringAsFixed(2)}",
                                    color: Colors.black,
                                    size: 11),
                              if (verifyPermission(
                                      category: "warehouse",
                                      permission: "show_available_stock") &&
                                  product.virtual == false)
                                minorTitle(
                                    title:
                                        "Qty: ${product.quantity?.toStringAsFixed(2)}",
                                    color: Colors.black,
                                    size: 11),
                            ],
                          ),
                          if (product.bundleItems!.isNotEmpty)
                            InkWell(
                              onTap: () {
                                showDialog(
                                    context: Get.context!,
                                    builder: (_) {
                                      return AlertDialog(
                                        title: const Center(
                                          child: Text(
                                            "Items Included",
                                            style: TextStyle(
                                                color: Colors.black,
                                                fontWeight: FontWeight.bold,
                                                fontSize: 16),
                                          ),
                                        ),
                                        content: Column(
                                          mainAxisSize: MainAxisSize.min,
                                          children: List.generate(
                                              product.bundleItems!.length,
                                              (index) => Text(
                                                  "${product.bundleItems![index].product!.name!.capitalizeFirst!} - ${product.bundleItems![index].quantity} ${product.bundleItems![index].product!.measureUnit}")),
                                        ),
                                        actions: [
                                          TextButton(
                                            onPressed: () {
                                              Get.back();
                                            },
                                            child: Text(
                                              "Cancel".toUpperCase(),
                                              style:  TextStyle(
                                                color: AppColors.mainColor,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                          TextButton(
                                            onPressed: () {
                                              Get.back();
                                            },
                                            child: Text(
                                              "Okay".toUpperCase(),
                                              style:  TextStyle(
                                                color: AppColors.mainColor,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                        ],
                                      );
                                    });
                              },
                              child: Container(
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 5),
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(5),
                                  color: AppColors.mainColor,
                                ),
                                child: Text(
                                  "Bundle (${product.bundleItems?.length}) items",
                                  style: const TextStyle(
                                      fontSize: 11.0, color: Colors.white),
                                  softWrap: false,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

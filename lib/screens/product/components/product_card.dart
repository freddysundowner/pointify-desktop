import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/main.dart';
import 'package:pointify/screens/product/barcode_scanner.dart';
import 'package:pointify/widgets/minor_title.dart';
import 'package:pointify/widgets/product_image.dart';
import 'package:pointify/widgets/snackBars.dart';

import '../../../controllers/productcontroller.dart';
import '../../../controllers/salescontroller.dart';
import '../../../functions/functions.dart';
import '../../../models/product.dart';
import '../../../utils/colors.dart';
import '../../../widgets/delete_dialog.dart';
import '../batches_page.dart';
import '../create_product.dart';
import '../product_history.dart';
import '../product_transfer_history.dart';
import '../stock_adjustment_history.dart';
import '../tabs/receipts_sales.dart';
import 'barcodegenerator.dart';

Widget productCard(
    {required Product product,
    Function? function,
    bool? counted = false,
    String? type = "all"}) {
  return InkWell(
    onTap: () {
      if (type == "wh_restock") {
        function!(product);
      } else if (type == "salemodule") {
        function!(product);
      } else {
        if (userController.internetConected.isFalse) {
          showSnackBar(message: "No internet connection", color: Colors.red);
          return;
        }
        if (function != null) {
          function(product);
        } else if (userController.currentUser.value!.primaryShop!.production ==
            true) {
          showProdctionProductModal(Get.context!, product);
        } else {
          showProductModal(Get.context!, product);
        }
      }
    },
    child: Padding(
      padding: const EdgeInsets.all(3.0),
      child: Card(
        color: type == "count" || product.virtual == true
            ? Colors.white
            : product.type == "service"
                ? AppColors.mainColor
                : product.quantity == 0 && product.manageByPrice == false
                    ? Colors.red
                    : product.quantity! <= product.reorderLevel! &&
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
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  "${product.name!.capitalizeFirst!} ${product.measureUnit ?? ""}",
                                  style: const TextStyle(fontSize: 16.0),
                                  softWrap: false,
                                  overflow: TextOverflow.ellipsis,
                                ),
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
                                                  style: TextStyle(
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
                                                  style: TextStyle(
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
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 5),
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(5),
                                      color: AppColors.mainColor,
                                    ),
                                    child: Text(
                                      "${userController.currentUser.value!.primaryShop!.production == true ? "Raw Materials" : "Bundle"} (${product.bundleItems?.length}) items",
                                      style: const TextStyle(
                                          fontSize: 11.0, color: Colors.white),
                                      softWrap: false,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        if (counted == true)
                          Container(
                            margin: const EdgeInsets.only(left: 10),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 5, vertical: 2),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(5),
                              color: counted == true
                                  ? AppColors.mainColor
                                  : Colors.transparent,
                            ),
                            child: const Text(
                              "Counted",
                              style: TextStyle(
                                fontSize: 12.0,
                                color: Colors.white,
                              ),
                              softWrap: false,
                              overflow: TextOverflow.ellipsis,
                            ),
                          )
                      ],
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
                    if (product.attendantId != null &&
                        type == "all" &&
                        product.virtual == true)
                      minorTitle(
                          title: "By ~ ${product.attendantId?.username}",
                          color: Colors.black,
                          size: 11),
                    if (userController
                            .currentUser.value?.primaryShop?.production ==
                        true)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          minorTitle(
                              title:
                                  "Qty: ${product.quantity?.toStringAsFixed(2)}  ${product.measureUnit}",
                              color: Colors.black,
                              size: 11),
                          Container(
                            margin: const EdgeInsets.only(left: 10),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 5, vertical: 2),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(5),
                              color: product.status == 'processing'
                                  ? Colors.amber
                                  : AppColors.mainColor,
                            ),
                            child: Text(
                              product.status!,
                              style: TextStyle(
                                fontSize: 12.0,
                                color: product.status == 'processing'
                                    ? AppColors.mainColor
                                    : Colors.white,
                              ),
                              softWrap: false,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    if (product.virtual == false &&
                        userController
                                .currentUser.value?.primaryShop?.production ==
                            false)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (product.reorderLevel! > 0)
                                minorTitle(
                                    title:
                                        "Restock @ ${product.reorderLevel} ~ Qty: ${product.quantity?.toStringAsFixed(2)}",
                                    color: Colors.black,
                                    size: 11),
                              if ((product.reorderLevel == 0 ||
                                      product.reorderLevel == null) &&
                                  type != "onlineorders")
                                minorTitle(
                                    title:
                                        "Qty: ${product.quantity?.toStringAsFixed(2)} ${product.measureUnit}",
                                    color: Colors.black,
                                    size: 11),
                              if ((product.reorderLevel == 0 ||
                                      product.reorderLevel == null) &&
                                  type == "all")
                                const SizedBox(height: 5),
                              if (product.attendantId != null && type == "all")
                                minorTitle(
                                    title:
                                        "By ~ ${product.attendantId?.username}",
                                    color: Colors.black,
                                    size: 11),
                            ],
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (verifyPermission(
                                  category: "stocks",
                                  permission: "view_buying_price"))
                                Text(
                                  "BP/= ${htmlPrice(product.getBuyingPrice())}",
                                  style: const TextStyle(color: Colors.black),
                                ),
                              const SizedBox(height: 5),
                              minorTitle(
                                  title:
                                      "SP/= ${htmlPrice(product.sellingPrice?.toStringAsFixed(2))}",
                                  color: Colors.black),
                            ],
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

showProdctionProductModal(context, Product product) {
  ProductController productController = Get.find<ProductController>();
  SalesController salesController = Get.find<SalesController>();

  return showModalBottomSheet<void>(
      context: context,
      builder: (BuildContext context) {
        return SizedBox(
          height: MediaQuery.of(context).size.height * 0.4,
          child: Column(
            children: [
              if (userController.currentUser.value?.usertype == "admin")
                ListTile(
                    leading: const Icon(Icons.list),
                    onTap: () {
                      Get.back();

                      getYearlyRecords(product, function:
                          (Product product, String firstday, String lastday) {
                        salesController.filterStartDate.value = firstday;
                        salesController.filterEndDate.value = lastday;
                        salesController.getSalesByProductId(
                            product: product,
                            fromDate: firstday,
                            toDate: lastday);
                        productController.getProductPurchasesGroupedByMonth(
                          product.sId!,
                          fromDate: firstday,
                          toDate: lastday,
                        );
                      }, year: salesController.currentYear.value);

                      Get.to(() => ProductHistory(product: product));
                    },
                    title: const Text('History')),
              if (verifyPermission(category: "production", permission: "edit"))
                ListTile(
                    leading: const Icon(Icons.edit),
                    onTap: () {
                      Get.back();
                      Get.to(() => CreateProduct(
                            page: "edit",
                            productModel: product,
                          ));
                    },
                    title: const Text('Edit')),
              if (verifyPermission(
                  category: "production", permission: "adjust_stock"))
                ListTile(
                    leading: const Icon(Icons.adjust),
                    onTap: () {
                      Get.back();
                      showDialog(
                          context: Get.context!,
                          builder: (_) {
                            return AlertDialog(
                              title: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text("Adjust Stock"),
                                  InkWell(
                                    onTap: () {
                                      Get.back();
                                    },
                                    child: const Icon(
                                      Icons.cancel,
                                      color: Colors.red,
                                    ),
                                  )
                                ],
                              ),
                              actions: [
                                TextFormField(
                                    decoration: const InputDecoration(
                                      hintText: "Quantity",
                                    ),
                                    keyboardType: TextInputType.number,
                                    controller: productController.stockadjust,
                                    onFieldSubmitted: (value) {
                                      if (value.isNotEmpty) {}
                                    }),
                                Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceEvenly,
                                    children: [
                                      TextButton(
                                          onPressed: () {
                                            productController.adjustStock(
                                              product: product,
                                              quantity: int.parse(
                                                  productController
                                                      .stockadjust.text),
                                              type: "remove",
                                            );
                                            productController.stockadjust
                                                .clear();
                                            Get.back();
                                          },
                                          child: const Text(
                                            "Remove-",
                                            style: TextStyle(color: Colors.red),
                                          )),
                                      TextButton(
                                          onPressed: () {
                                            productController.adjustStock(
                                              product: product,
                                              quantity: int.parse(
                                                  productController
                                                      .stockadjust.text),
                                              type: "add",
                                            );
                                            productController.stockadjust
                                                .clear();
                                            Get.back();
                                          },
                                          child: const Text(
                                            "Add+",
                                            style:
                                                TextStyle(color: Colors.green),
                                          ))
                                    ])
                              ],
                            );
                          });
                    },
                    title: const Text('Adjust Stock')),
              if (verifyPermission(
                  category: "production",
                  permission: "view_adjustment_history"))
                ListTile(
                    leading: const Icon(Icons.history),
                    onTap: () {
                      Get.to(() => StockAdjustmentHistory(product: product));
                    },
                    title: const Text('Adjustments History')),
              if (verifyPermission(category: "products", permission: "delete"))
                ListTile(
                    leading: const Icon(Icons.delete),
                    onTap: () {
                      deleteDialog(
                          context: context,
                          onPressed: () {
                            productController.deleteProduct(
                              product: product,
                            );
                          });
                    },
                    title: const Text('Delete')),
              ListTile(
                  leading: const Icon(Icons.clear),
                  onTap: () {
                    Get.back();
                  },
                  title: const Text('Close')),
            ],
          ),
        );
      });
}

showProductModal(context, Product product) {
  ProductController productController = Get.find<ProductController>();
  SalesController salesController = Get.find<SalesController>();

  return showModalBottomSheet<void>(
      context: context,
      builder: (BuildContext context) {
        return ListView(
          children: [
            if (userController.currentUser.value?.usertype == "admin")
              ListTile(
                  leading: const Icon(Icons.list),
                  onTap: () {
                    Get.back();

                    getYearlyRecords(product, function:
                        (Product product, String firstday, String lastday) {
                      salesController.filterStartDate.value = firstday;
                      salesController.filterEndDate.value = lastday;
                      salesController.getSalesByProductId(
                          product: product,
                          fromDate: firstday,
                          toDate: lastday);
                      productController.getProductPurchasesGroupedByMonth(
                        product.sId!,
                        fromDate: firstday,
                        toDate: lastday,
                      );
                    }, year: salesController.currentYear.value);

                    Get.to(() => ProductHistory(product: product));
                  },
                  title: const Text('History')),
            ListTile(
                leading: const Icon(Icons.list),
                onTap: () {
                  Get.back();
                  var firstday = DateFormat("yyy-MM-dd").format(DateTime.now());
                  var lastday = DateFormat("yyy-MM-dd").format(DateTime.now());
                  salesController.getProductSales(
                      product: product.sId,
                      fromDate: firstday,
                      toDate: lastday);
                  salesController.getReturns(
                      product: product,
                      fromDate: firstday,
                      shopid:
                          userController.currentUser.value!.primaryShop!.id!,
                      toDate: lastday,
                      type: "return");

                  Get.to(() => ProductReceiptsSales(
                        product: product,
                        i: DateTime.now().month,
                      ));
                },
                title: const Text('Sales')),
            if (verifyPermission(
                category: "production", permission: "view_adjustment_history"))
              ListTile(
                  leading: const Icon(Icons.history),
                  onTap: () {
                    Get.to(() => ProductTransferHistory(product: product));
                  },
                  title: const Text('Transfer History')),
            if (verifyPermission(
                category: "products", permission: "view_adjustment_history"))
              ListTile(
                  leading: const Icon(Icons.history),
                  onTap: () {
                    Get.to(() => StockAdjustmentHistory(product: product));
                  },
                  title: const Text('Adjustment History')),
            if (product.batches != null && product.batches!.isNotEmpty)
              ListTile(
                  leading: const Icon(Icons.list),
                  onTap: () {
                    Get.back();
                    Get.to(() => BatchesPage(product: product));
                  },
                  title: Text('Batches ${product.batches!.length}')),
            if (verifyPermission(category: "products", permission: "edit"))
              ListTile(
                  leading: const Icon(Icons.edit),
                  onTap: () {
                    Get.back();
                    Get.to(() => CreateProduct(
                          page: "edit",
                          productModel: product,
                        ));
                  },
                  title: const Text('Edit')),
            if (verifyPermission(
                category: "products", permission: "adjust_stock"))
              ListTile(
                  leading: const Icon(Icons.adjust),
                  onTap: () {
                    Get.back();
                    showDialog(
                        context: Get.context!,
                        builder: (_) {
                          return AlertDialog(
                            title: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text("Adjust Stock"),
                                InkWell(
                                  onTap: () {
                                    Get.back();
                                  },
                                  child: const Icon(
                                    Icons.cancel,
                                    color: Colors.red,
                                  ),
                                )
                              ],
                            ),
                            actions: [
                              TextFormField(
                                  decoration: const InputDecoration(
                                    hintText: "Quantity",
                                  ),
                                  keyboardType: TextInputType.number,
                                  controller: productController.stockadjust,
                                  onFieldSubmitted: (value) {
                                    if (value.isNotEmpty) {}
                                  }),
                              Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceEvenly,
                                  children: [
                                    TextButton(
                                        onPressed: () {
                                          productController.adjustStock(
                                            product: product,
                                            quantity: int.parse(
                                                productController
                                                    .stockadjust.text),
                                            type: "remove",
                                          );
                                          productController.stockadjust.clear();
                                          Get.back();
                                        },
                                        child: const Text(
                                          "Remove-",
                                          style: TextStyle(color: Colors.red),
                                        )),
                                    TextButton(
                                        onPressed: () {
                                          productController.adjustStock(
                                            product: product,
                                            quantity: int.parse(
                                                productController
                                                    .stockadjust.text),
                                            type: "add",
                                          );
                                          productController.stockadjust.clear();
                                          Get.back();
                                        },
                                        child: const Text(
                                          "Add+",
                                          style: TextStyle(color: Colors.green),
                                        ))
                                  ])
                            ],
                          );
                        });
                  },
                  title: const Text('Adjust Stock')),
            if (verifyPermission(category: "products", permission: "edit"))
              ListTile(
                leading: const Icon(Icons.qr_code_scanner),
                onTap: () async {
                  Get.back();

                  final barcode = await Get.to(
                    () => const BarcodeScannerPage(),
                  );

                  if (barcode == null) {
                    return;
                  }

                  showDialog(
                    context: Get.context!,
                    builder: (_) {
                      return AlertDialog(
                        title: const Text(
                          "Update Barcode",
                        ),
                        content: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              product.name ?? "",
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 15),
                            const Text("Scanned Barcode"),
                            const SizedBox(height: 5),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade100,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                barcode.toString(),
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                        actions: [
                          TextButton(
                            onPressed: () {
                              Get.back();
                            },
                            child: const Text(
                              "Cancel",
                            ),
                          ),
                          ElevatedButton(
                            onPressed: () async {
                              showDialog(
                                context: Get.context!,
                                barrierDismissible: false,
                                builder: (_) {
                                  return const AlertDialog(
                                    content: Row(
                                      children: [
                                        CircularProgressIndicator(),
                                        SizedBox(width: 15),
                                        Expanded(
                                          child: Text(
                                            "Updating barcode...",
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                },
                              );

                              final result =
                                  await productController.updateBarcode(
                                productId: product.sId!,
                                barcode: barcode,
                              );

                              Get.back(); // close loader

                              if (result["success"] == true) {
                                Get.back(); // close update dialog

                                showDialog(
                                  context: Get.context!,
                                  builder: (_) {
                                    return AlertDialog(
                                      title: const Text("Success"),
                                      content: Text(result["message"]),
                                      actions: [
                                        TextButton(
                                          onPressed: () {
                                            Get.back();
                                          },
                                          child: const Text("OK"),
                                        )
                                      ],
                                    );
                                  },
                                );
                              } else {
                                showDialog(
                                  context: Get.context!,
                                  builder: (_) {
                                    return AlertDialog(
                                      title: const Text("Error"),
                                      content: Text(result["message"]),
                                      actions: [
                                        TextButton(
                                          onPressed: () {
                                            Get.back();
                                          },
                                          child: const Text("OK"),
                                        )
                                      ],
                                    );
                                  },
                                );
                              }
                            },
                            child: const Text(
                              "Update",
                            ),
                          ),
                        ],
                      );
                    },
                  );
                },
                title: const Text('Update Barcode'),
              ),
            if (userController.currentUser.value?.usertype == "admin")
              ListTile(
                  leading: const Icon(Icons.code),
                  onTap: () {
                    Get.back();
                    Get.to(() => BarcodeGenerator(
                          product: product,
                        ));
                  },
                  title: const Text('Generate Barcode')),
            if (verifyPermission(category: "products", permission: "delete"))
              ListTile(
                  leading: const Icon(Icons.delete),
                  onTap: () {
                    deleteDialog(
                        context: context,
                        onPressed: () {
                          productController.deleteProduct(
                            product: product,
                          );
                        });
                  },
                  title: const Text('Delete')),
          ],
        );
      });
}

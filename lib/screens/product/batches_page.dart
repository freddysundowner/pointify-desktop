import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/batch.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/screens/receipts/pdf/products/productsexpirypdflist.dart';
import 'package:pointify/widgets/alert.dart';
import 'package:pointify/widgets/no_items_found.dart';
import 'package:printing/printing.dart';

import '../../controllers/productcontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../functions/functions.dart';
import '../../models/product.dart';
import '../../utils/colors.dart';
import '../../widgets/loading_dialog.dart';
import '../../widgets/major_title.dart';
import '../../widgets/minor_title.dart';
import '../receipts/pdf/products/productspdflist.dart';

class BatchesPage extends StatelessWidget {
  Product product;
  BatchesPage({Key? key, required this.product}) : super(key: key) {
    productController.filteredBatches.value = product.batches!;
  }

  final ShopController createShopController = Get.find<ShopController>();
  final ProductController productController = Get.find<ProductController>();
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade200,
      appBar: AppBar(
        backgroundColor: Colors.grey.shade200,
        elevation: 0.3,
        titleSpacing: 0.0,
        centerTitle: false,
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
        actions: [
          IconButton(
              onPressed: () async {
                showBottomSheet(context);
              },
              icon:  Icon(
                Icons.download,
                color: AppColors.mainColor,
              )),
          IconButton(
              onPressed: () async {
                productController.getProductsBySort(type: "all");
              },
              icon:  Icon(
                Icons.refresh,
                color: AppColors.mainColor,
              ))
        ],
        title: Padding(
          padding: const EdgeInsets.only(right: 10.0),
          child: Row(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  majorTitle(
                      title: "Products", color: Colors.black, size: 16.0),
                  minorTitle(
                      title:
                          "${userController.currentUser.value?.primaryShop?.name}",
                      color: Colors.grey)
                ],
              ),
            ],
          ),
        ),
      ),
      body: Column(
        children: [
          // Container(
          //   padding: const EdgeInsets.all(10),
          //   child: Row(
          //     children: [
          //       Expanded(
          //         child: TextFormField(
          //           controller: productController.searchBatchController,
          //           onChanged: (value) {
          //             productController.filteredBatches.value =
          //                 product.batches!;
          //           },
          //           decoration: InputDecoration(
          //             suffixIconConstraints:
          //                 const BoxConstraints(maxWidth: 100),
          //             contentPadding: const EdgeInsets.fromLTRB(10, 2, 10, 2),
          //             hintText: "Quick Search",
          //             border: OutlineInputBorder(
          //               borderRadius: BorderRadius.circular(10),
          //             ),
          //             focusedBorder: OutlineInputBorder(
          //               borderRadius: BorderRadius.circular(10),
          //             ),
          //           ),
          //         ),
          //       ),
          //       IconButton(
          //           onPressed: () async {}, icon: const Icon(Icons.qr_code))
          //     ],
          //   ),
          // ),
          // Padding(
          //   padding: const EdgeInsets.all(8.0),
          //   child: Row(
          //     mainAxisAlignment: MainAxisAlignment.spaceBetween,
          //     children: [
          //       const Text("Sort List By"),
          //       InkWell(
          //         onTap: () {
          //           showDialog(
          //             context: context,
          //             builder: (_) {
          //               return SimpleDialog(
          //                 children: List.generate(
          //                     Constants().sortBatch.length,
          //                     (index) => SimpleDialogOption(
          //                           onPressed: () {
          //                             Navigator.pop(context);
          //                             productController
          //                                     .selectedSortBatch.value =
          //                                 Constants()
          //                                     .sortBatch
          //                                     .elementAt(index);
          //                             productController
          //                                     .selectedSortBatch.value =
          //                                 Constants()
          //                                     .sortOrderList
          //                                     .elementAt(index);
          //                           },
          //                           child: Text(
          //                             Constants().sortOrder.elementAt(index),
          //                           ),
          //                         )),
          //               );
          //             },
          //           );
          //         },
          //         child: Row(
          //           children: [
          //             Obx(() {
          //               return Text(productController.selectedSortBatch.value,
          //                   style: const TextStyle(color: AppColors.mainColor));
          //             }),
          //             const Icon(
          //               Icons.keyboard_arrow_down,
          //               color: AppColors.mainColor,
          //             )
          //           ],
          //         ),
          //       ),
          //     ],
          //   ),
          // ),
          const SizedBox(height: 20),
          Expanded(
              child: product.batches!.isEmpty
                  ? noItemsFound(context, true)
                  : ListView.builder(
                      itemCount: product.batches!.length,
                      itemBuilder: ((context, index) {
                        Batch productModel = product.batches!.elementAt(index);
                        return Card(
                          color: productModel.quantity == 0
                              ? Colors.red
                              : Colors.white,
                          elevation: 1,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(5.0),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: <Widget>[
                                    Text(
                                      productModel.batchCode ?? "",
                                      style: const TextStyle(
                                          fontSize: 16.0,
                                          fontWeight: FontWeight.bold),
                                      softWrap: false,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            minorTitle(
                                                title:
                                                    "All Products Count ${productModel.totalQuantity}",
                                                color: Colors.black,
                                                size: 11),
                                            minorTitle(
                                                title:
                                                    "Available: ${productModel.quantity?.toStringAsFixed(2)}",
                                                color: Colors.black,
                                                size: 11),
                                            const SizedBox(height: 5),
                                            if (productModel.attendant != null)
                                              minorTitle(
                                                  title:
                                                      "Created by ~ ${productModel.attendant?.username}",
                                                  color: Colors.black,
                                                  size: 11),
                                          ],
                                        ),
                                        Text(
                                          "BP/= ${htmlPrice(productModel.buyingPrice?.toStringAsFixed(2))}",
                                          style: const TextStyle(
                                              color: Colors.black),
                                        )
                                      ],
                                    ),
                                  ],
                                ),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                        "Per Item EST Profit\n${htmlPrice((product.sellingPrice! - productModel.buyingPrice!))}",
                                        style: const TextStyle(
                                            color: Colors.black, fontSize: 12)),
                                    Text(
                                      "Total EST Profit\n ${htmlPrice(((product.sellingPrice! - productModel.buyingPrice!) * productModel.totalQuantity!).toStringAsFixed(2))}",
                                      style: const TextStyle(
                                          color: Colors.black, fontSize: 12),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                    )),
        ],
      ),
    );
  }

  productOperions(context, product, shopId) {
    List<Map<String, dynamic>> data = [
      {"title": "Product History", "icon": Icons.list, "value": "history"},
      {"title": "Edit", "icon": Icons.edit, "value": "edit"},
      {"title": "Delete", "icon": Icons.delete, "value": "delete"},
      {"title": "Cancel", "icon": Icons.clear, "value": "clear"},
    ];
    return data
        .map((e) => PopupMenuItem(
              value: e["value"],
              child:
                  ListTile(leading: Icon(e["icon"]), title: Text(e["title"])),
            ))
        .toList();
  }

  showBottomSheet(
    BuildContext context,
  ) {
    final GlobalKey<State> _keyLoader = GlobalKey<State>();
    return showModalBottomSheet(
        context: context,
        backgroundColor:
            isSmallScreen(context) ? Colors.white : Colors.transparent,
        builder: (_) {
          return Container(
            color: Colors.white,
            height: MediaQuery.of(context).size.height * 0.5,
            margin: EdgeInsets.only(
                left: isSmallScreen(context)
                    ? 0
                    : MediaQuery.of(context).size.width * 0.2),
            child: Column(
              children: [
                Container(
                  color: AppColors.mainColor.withOpacity(0.1),
                  width: double.infinity,
                  child: const ListTile(
                    title: Text("Choose what to download"),
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.edit),
                  onTap: () async {
                    Get.back();

                    generalAlert(
                        message: "Which type of document you want to download?",
                        positiveText: "Excel Sheet",
                        negativeText: "PDF",
                        negativeCallback: () async {
                          await productController.getProductsBySort(
                              type: "all", reason: "download");

                          Get.to(() => Scaffold(
                                appBar: AppBar(
                                  title: const Text("All Products"),
                                ),
                                body: PdfPreview(
                                  build: (context) => productsListPdf(
                                      productController.productDownloadss,
                                      "All PRODUCTS"),
                                ),
                              ));
                        },
                        function: () async {
                          List<List<Object?>> data = [
                            [
                              'Name',
                              'Bp',
                              'Sp',
                              "qty",
                              "category",
                              "expiry date",
                              'min price',
                              "wholesale price",
                              "dealer price",
                              "supplier",
                            ],
                          ];
                          data.addAll(productController.products
                              .map((element) => [
                                    element.name,
                                    element.buyingPrice,
                                    element.sellingPrice,
                                    element.quantity,
                                    element.productCategoryId?.name,
                                    element.expiryDate,
                                    element.minSellingPrice,
                                    element.wholesalePrice,
                                    element.dealerPrice,
                                    element.supplierId?.name
                                  ])
                              .toList());

                          String? filePath =
                              await exportToExcel(data, "products");
                          await openFile(filePath!);
                        });
                  },
                  title: const Text("All"),
                ),
                ListTile(
                  leading: const Icon(Icons.hourglass_empty),
                  onTap: () async {
                    LoadingDialog.showLoadingDialog(
                      context: Get.context!,
                      title: "Please wait...",
                      key: _keyLoader,
                    );
                    List<List<Object?>> data = [
                      ['Name', 'Bp', 'Sp', "qty", "category"],
                    ];
                    await productController.getProductsBySort(
                        type: "all", sort: "outofstock", reason: "download");
                    data.addAll(productController.productDownloadss
                        .map((element) => [
                              element.name,
                              element.buyingPrice,
                              element.sellingPrice,
                              element.quantity,
                              element.productCategoryId?.name
                            ])
                        .toList());
                    Get.back();

                    String? filePath = await exportToExcel(data, "outofstock");
                    await openFile(filePath!);
                  },
                  title: const Text("Out of stock"),
                ),
                ListTile(
                  leading: const Icon(Icons.downhill_skiing_sharp),
                  onTap: () async {
                    LoadingDialog.showLoadingDialog(
                      context: Get.context!,
                      title: "Please wait...",
                      key: _keyLoader,
                    );
                    List<List<Object?>> data = [
                      ['Name', 'Bp', 'Sp', "qty", "category"],
                    ];
                    await productController.getProductsBySort(
                        type: "runninglow", reason: "download");
                    data.addAll(productController.productDownloadss
                        .map((element) => [
                              element.name,
                              element.buyingPrice,
                              element.sellingPrice,
                              element.quantity,
                              element.productCategoryId?.name
                            ])
                        .toList());
                    Get.back();

                    String? filePath = await exportToExcel(data, "runninglow");
                    await openFile(filePath!);
                  },
                  title: const Text("Running Low on Stock"),
                ),
                ListTile(
                  leading: const Icon(Icons.data_exploration),
                  onTap: () async {
                    LoadingDialog.showLoadingDialog(
                      context: Get.context!,
                      title: "Please wait...",
                      key: _keyLoader,
                    );
                    await productController.getProductsBySort(
                        type: "expired", reason: "download");

                    Get.back();
                    Get.to(() => Scaffold(
                          appBar: AppBar(
                            title: const Text("Expired Products"),
                          ),
                          body: PdfPreview(
                            build: (context) => productsExpiryListPdf(
                                productController.productDownloadss,
                                "EXPIRED PRODUCTS"),
                          ),
                        ));
                  },
                  title: const Text("Expired"),
                ),
                ListTile(
                  leading: const Icon(
                    Icons.clear,
                    color: Colors.red,
                  ),
                  onTap: () {
                    Get.back();
                  },
                  title: const Text("Cancel "),
                ),
              ],
            ),
          );
        });
  }
}

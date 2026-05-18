import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/productcategory.dart';
import 'package:pointify/screens/product/barcode_scanner.dart';
import 'package:pointify/screens/product/components/service_card.dart';
import 'package:pointify/utils/constants.dart';
import 'package:pointify/widgets/no_items_found.dart';
import 'package:share_plus/share_plus.dart';

import '../../controllers/productcontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../models/product.dart';
import '../../services/end_points.dart';
import '../../utils/colors.dart';
import '../../utils/helper.dart';
import '../../widgets/major_title.dart';
import 'components/product_card.dart';

// ignore: must_be_immutable
class ProductPage extends StatelessWidget {
  final Function? function;
  String? type;
  bool? refetch;
  ProductPage({super.key, this.function, this.type = "all", this.refetch}) {
    productController.searchProductController.text = "";
    productController.getProductCategiories();
    if (refetch == true) {
      productController.getProductsBySort(
          type: type!,
          showLoader: false,
          loadMore: true,
          clearafterloading: true);
    }
  }

  final ShopController createShopController = Get.find<ShopController>();
  final ProductController productController = Get.find<ProductController>();

  Widget outOfStockCollapsible({
    required ProductController controller,
    String? type,
    Function? function,
  }) {
    return Obx(() {
      final items = controller.outOfStockProducts;

      if (items.isEmpty) return const SizedBox.shrink();

      return Card(
        margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: ExpansionTile(
          leading: const Icon(Icons.warning, color: Colors.red),
          title: const Text(
            "Out of Stock",
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          trailing: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.red,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              items.length.toString(),
              style: const TextStyle(color: Colors.white, fontSize: 12),
            ),
          ),
          children: items.map((product) {
            return productCard(
              product: product,
              type: type,
              function: function,
            );
          }).toList(),
        ),
      );
    });
  }

  void showCategorySheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(20),
        ),
      ),
      builder: (_) {
        return Container(
          padding: const EdgeInsets.all(16),
          height: MediaQuery.of(context).size.height * 0.7,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    "Select Category",
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    onPressed: () {
                      Get.back();
                    },
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 15),
              Expanded(
                child: Obx(() {
                  List<ProductCategory> categories = [
                    ProductCategory(name: "All"),
                    ...productController.productCategories,
                  ];

                  return GridView.builder(
                    itemCount: categories.length,
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisExtent: 60,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                    ),
                    itemBuilder: (_, index) {
                      final category = categories[index];

                      final isSelected =
                          productController.selectedCategory.value == category;

                      return InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () {
                          Get.back();

                          productController.selectedCategory.value = category;

                          productController.getProductsBySort(
                            type: 'all',
                            category: category,
                            page: 1,
                            limit: 50,
                            showLoader: false,
                          );
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                          ),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? AppColors.mainColor
                                : Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: isSelected
                                  ? AppColors.mainColor
                                  : Colors.grey.shade300,
                            ),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            category.name ?? "",
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: isSelected ? Colors.white : Colors.black,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      );
                    },
                  );
                }),
              ),
            ],
          ),
        );
      },
    );
  }

  void showSortDialog(BuildContext context) {
    final titles = Constants().sortOrder;
    final values = Constants().sortOrderList;

    final itemCount =
        titles.length > values.length ? values.length : titles.length;
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(20),
        ),
      ),
      builder: (_) {
        return SafeArea(
          child: Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.7,
            ),
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      "Sort Products",
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    IconButton(
                      onPressed: () {
                        Get.back();
                      },
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Expanded(
                  child: ListView(
                    children: List.generate(
                      itemCount,
                      (index) {
                        final title = titles[index];

                        final value = values[index];

                        final isSelected =
                            productController.selectedSortOrder.value == title;

                        return ListTile(
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          tileColor: isSelected
                              ? AppColors.mainColor.withOpacity(0.1)
                              : null,
                          leading: Icon(
                            isSelected
                                ? Icons.check_circle
                                : Icons.circle_outlined,
                            color:
                                isSelected ? AppColors.mainColor : Colors.grey,
                          ),
                          title: Text(title),
                          onTap: () {
                            Get.back();

                            productController.selectedSortOrder.value = title;

                            productController.selectedSortOrderSearch.value =
                                value;

                            productController.getProductsBySort(
                              type: "",
                              text: productController
                                  .searchProductController.text,
                              sort: value,
                            );
                          },
                        );
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    // print(productController.normalProducts.length);
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
          if (type != "salemodule")
            IconButton(
                onPressed: () async {
                  showBottomSheet(context);
                },
                icon: Icon(
                  Icons.download,
                  color: AppColors.mainColor,
                )),
          IconButton(
              onPressed: () async {
                productController.getProductsBySort(type: "all");
              },
              icon: Icon(
                Icons.refresh,
                color: AppColors.mainColor,
              )),
          if (type != "salemodule")
            IconButton(
                onPressed: () async {
                  Share.share(
                    '$storeurl?shopid=${userController.currentUser.value?.primaryShop?.id}&adminid=${userController.currentUser.value?.id}',
                    subject: "Share Inventory",
                    sharePositionOrigin: Rect.fromLTWH(0, 0, 0, 0),
                  );
                },
                icon: Icon(
                  Icons.share,
                  color: AppColors.mainColor,
                ))
        ],
        title: Padding(
          padding: const EdgeInsets.only(right: 10.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              majorTitle(title: "Products", color: Colors.black, size: 16.0),
              Text(
                "${userController.currentUser.value?.primaryShop?.name}",
                style: TextStyle(color: Colors.grey, fontSize: 12),
              )
            ],
          ),
        ),
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            child: Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: productController.searchProductController,
                    onChanged: (value) {
                      productController.filterProductsLocally(
                          productController.searchProductController.text);
                    },
                    decoration: InputDecoration(
                      suffixIconConstraints:
                          const BoxConstraints(maxWidth: 100),
                      suffixIcon: Align(
                        alignment: Alignment.centerRight,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              vertical: 10, horizontal: 15),
                          margin: const EdgeInsets.only(right: 5),
                          decoration: BoxDecoration(
                            color: AppColors.mainColor,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: InkWell(
                            onTap: () {
                              productController.getProductsBySort(
                                  type: productController
                                      .selectedSortOrder.value
                                      .toLowerCase(),
                                  text: productController
                                      .searchProductController.text,
                                  page: 1,
                                  limit: 50);
                            },
                            child: const Text(
                              "Search",
                              style: TextStyle(color: Colors.white),
                            ),
                          ),
                        ),
                      ),
                      contentPadding: const EdgeInsets.fromLTRB(10, 2, 10, 2),
                      hintText: "Quick Search Item",
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                ),
                if (type != "salemodule")
                  IconButton(
                    onPressed: () async {
                      // Get.to(() => QRViewExample());
                      Get.to(
                        () => BarcodeScannerPage(
                          popAfterScan: true,
                          onScanned: (barcode) async {
                            await productController.getProductsBySort(
                              type: "search",
                              barcodeId: barcode,
                              page: 1,
                              scanningFrom: "",
                              limit: 50,
                            );
                          },
                        ),
                      );
                    },
                    icon: const Icon(Icons.qr_code),
                  )
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 8,
            ),
            child: Row(
              children: [
                Expanded(
                  child: Obx(() => filterButton(
                        title: productController.selectedCategory.value?.name ??
                            "Categories",
                        icon: Icons.category_outlined,
                        onTap: () {
                          showCategorySheet(context);
                        },
                      )),
                ),
                if (type != "salemodule") const SizedBox(width: 10),
                if (type != "salemodule")
                  Expanded(
                    child: filterButton(
                      title: productController.selectedSortOrder.value,
                      icon: Icons.swap_vert,
                      onTap: () {
                        showSortDialog(context);
                      },
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Expanded(
            child: Obx(() {
              if (productController.loadingproducts.value) {
                return const Center(child: CircularProgressIndicator());
              }

              if (productController.filteredProducts.isEmpty) {
                return noItemsFound(context, true);
              }

              return ListView(
                controller: productController.scrollController,
                children: [
                  if (productController.selectedSortOrderSearch.value ==
                      "outofstock")
                    ...productController.outOfStockProducts.map((productModel) {
                      return productCard(
                        product: productModel,
                        type: type,
                        function: function != null
                            ? (Product p) => function!(p)
                            : null,
                      );
                    }),
                  if (productController.selectedSortOrderSearch.value ==
                      "runninglow")
                    ...productController.outOfStockProducts.map((productModel) {
                      return productCard(
                        product: productModel,
                        type: type,
                        function: function != null
                            ? (Product p) => function!(p)
                            : null,
                      );
                    }),

                  // 🔴 COLLAPSIBLE OUT-OF-STOCK SECTION
                  if (productController.selectedSortOrderSearch.value !=
                          "outofstock" &&
                      productController.selectedSortOrderSearch.value !=
                          "runninglow")
                    outOfStockCollapsible(
                      controller: productController,
                      type: type,
                      function: function,
                    ),

                  // ✅ NORMAL PRODUCTS
                  ...productController.normalProducts.map((productModel) {
                    if (productModel.type == "service") {
                      return serviceCard(
                        type: type,
                        product: productModel,
                        function: (Product p) => function!(p),
                      );
                    }

                    return productCard(
                      product: productModel,
                      type: type,
                      function:
                          function != null ? (Product p) => function!(p) : null,
                    );
                  }).toList(),
                ],
              );
            }),
          ),
          Obx(() => productController.loadingMoreProducts.isTrue
              ? const Center(
                  child: CircularProgressIndicator(),
                )
              : const SizedBox.shrink()),
        ],
      ),
    );
  }

  Widget filterButton({
    required String title,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: Container(
        height: 45,
        padding: const EdgeInsets.symmetric(
          horizontal: 12,
        ),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: Colors.grey.shade300,
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 18,
              color: AppColors.mainColor,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                title,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            Icon(
              Icons.keyboard_arrow_down,
              color: Colors.grey.shade700,
            ),
          ],
        ),
      ),
    );
  }

  showBottomSheet(
    BuildContext context,
  ) {
    return showModalBottomSheet(
        context: context,
        backgroundColor: Colors.white,
        builder: (_) {
          return Container(
            color: Colors.white,
            height: MediaQuery.of(context).size.height * 0.5,
            margin: EdgeInsets.only(
              left: 0,
            ),
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
                    generateReportAlert(context, 'all');
                  },
                  title: const Text("All"),
                ),
                ListTile(
                  leading: const Icon(Icons.hourglass_empty),
                  onTap: () async {
                    generateReportAlert(context, 'outofstock');
                  },
                  title: const Text("Out of stock"),
                ),
                ListTile(
                  leading: const Icon(Icons.downhill_skiing_sharp),
                  onTap: () async {
                    generateReportAlert(context, 'runninglow');
                  },
                  title: const Text("Running Low on Stock"),
                ),
                ListTile(
                  leading: const Icon(Icons.data_exploration),
                  onTap: () async {
                    generateReportAlert(context, 'expired');
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

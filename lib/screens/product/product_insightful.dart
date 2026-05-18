import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/productcontroller.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/product.dart';
import 'package:pointify/utils/colors.dart';
import 'package:pointify/widgets/no_items_found.dart';

import '../../widgets/major_title.dart';
import 'components/product_card.dart';

class ProductInsightPage extends StatefulWidget {
  final String type; // fastmoving or dormant
  final Function? function;

  const ProductInsightPage({
    super.key,
    required this.type,
    this.function,
  });

  @override
  State<ProductInsightPage> createState() => _ProductInsightPageState();
}

class _ProductInsightPageState extends State<ProductInsightPage> {
  final ProductController productController = Get.find<ProductController>();

  @override
  void initState() {
    super.initState();
    productController.searchProductController.clear();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      productController.getProductsBySort(
        type: widget.type,
        page: 1,
        limit: 20,
      );
    });
  }

  String get pageTitle =>
      widget.type == "fastmoving" ? "Fast Moving" : "Dormant Products";

  String get pageHint => widget.type == "fastmoving"
      ? "Search fast moving..."
      : "Search dormant...";

  IconData get pageIcon => widget.type == "fastmoving"
      ? Icons.trending_up
      : Icons.pause_circle_outline;

  Color get pageColor =>
      widget.type == "fastmoving" ? Colors.green : Colors.orange;

  List<Product> get products => productController.filteredProducts;

  int get totalProducts => products.length;

  int get totalQty =>
      products.fold(0, (sum, p) => sum + ((p.quantity ?? 0) as num).toInt());

  int get totalSoldQty => products.fold(
      0, (sum, p) => sum + ((p.totalSoldQty ?? 0) as num).toInt());

  int get totalSalesCount =>
      products.fold(0, (sum, p) => sum + ((p.salesCount ?? 0) as num).toInt());

  double get stockValue => products.fold(
      0,
      (sum, p) =>
          sum + (((p.quantity ?? 0) as num) * ((p.sellingPrice ?? 0) as num)));

  String get topInsight {
    if (widget.type == "fastmoving") {
      if (totalProducts == 0) return "No fast moving products found.";
      return "$totalSoldQty units sold across $totalSalesCount sales in the last 30 days.";
    }
    if (totalProducts == 0) return "No dormant products found.";
    return "$totalProducts products have stock but no sales in the last 30 days.";
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      appBar: AppBar(
        elevation: 0.2,
        backgroundColor: Colors.white,
        leading: IconButton(
          onPressed: () => Get.back(),
          icon: const Icon(Icons.arrow_back_ios, color: Colors.black),
        ),
        titleSpacing: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            majorTitle(title: pageTitle, color: Colors.black, size: 16.0),
            Text(
              userController.currentUser.value?.primaryShop?.name ?? '',
              style: const TextStyle(color: Colors.grey, fontSize: 12),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () {
              productController.getProductsBySort(
                type: widget.type,
                text: productController.searchProductController.text,
                page: 1,
                limit: 20,
              );
            },
            icon: Icon(Icons.refresh, color: AppColors.mainColor),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            _buildCompactHeader(),
            _buildSearchBar(),
            Expanded(
              child: Obx(() {
                if (productController.loadingproducts.value) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (products.isEmpty) {
                  return noItemsFound(context, true);
                }

                return ListView.separated(
                  controller: productController.scrollController,
                  padding: const EdgeInsets.fromLTRB(10, 0, 10, 16),
                  itemCount: products.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final product = products[index];
                    return _buildInsightItem(product, index);
                  },
                );
              }),
            ),
            Obx(
              () => productController.loadingMoreProducts.isTrue
                  ? const Padding(
                      padding: EdgeInsets.all(12),
                      child: CircularProgressIndicator(),
                    )
                  : const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCompactHeader() {
    return Obx(() {
      return Container(
        margin: const EdgeInsets.all(10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: pageColor.withOpacity(0.12),
                  child: Icon(pageIcon, color: pageColor, size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    topInsight,
                    style: const TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(child: _metric("Items", "$totalProducts")),
                const SizedBox(width: 8),
                Expanded(
                  child: _metric(
                    widget.type == "fastmoving" ? "Sold Qty" : "Stock Qty",
                    widget.type == "fastmoving" ? "$totalSoldQty" : "$totalQty",
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _metric(
                    widget.type == "fastmoving" ? "Sales" : "Value",
                    widget.type == "fastmoving"
                        ? "$totalSalesCount"
                        : "KES ${stockValue.toStringAsFixed(0)}",
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    });
  }

  Widget _metric(String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              color: pageColor,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(fontSize: 11, color: Colors.grey),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(10, 0, 10, 8),
      child: TextFormField(
        controller: productController.searchProductController,
        onChanged: (value) {
          productController.getProductsBySort(
              type: "all", text: value, page: 1, limit: 50, showLoader: true);
        },
        decoration: InputDecoration(
          hintText: pageHint,
          prefixIcon: const Icon(Icons.search),
          isDense: true,
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          suffixIcon: IconButton(
            onPressed: () {
              productController.getProductsBySort(
                  type: widget.type,
                  text: productController.searchProductController.text,
                  page: 1,
                  limit: 20,
                  showLoader: true);
            },
            icon: Icon(Icons.arrow_forward, color: AppColors.mainColor),
          ),
        ),
      ),
    );
  }

  Widget _buildInsightItem(Product product, int index) {
    final soldQty = ((product.totalSoldQty ?? 0) as num).toInt();
    final salesCount = ((product.salesCount ?? 0) as num).toInt();
    final qty = ((product.quantity ?? 0) as num).toInt();

    final insight = widget.type == "fastmoving"
        ? "Rank ${index + 1} • $soldQty units • $salesCount sales"
        : "In stock: $qty • No sales in 30 days";

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
            child: Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: pageColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    insight,
                    style: TextStyle(
                      color: pageColor,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          productCard(
            product: product,
            type: widget.type,
            function: widget.function != null
                ? (Product p) => widget.function!(p)
                : null,
          ),
        ],
      ),
    );
  }
}

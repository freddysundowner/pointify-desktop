import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/productcontroller.dart';
import 'package:pointify/screens/product/product_insightful.dart';
import 'package:pointify/screens/product/products_page.dart';
import 'package:pointify/utils/colors.dart';

class InventoryInsightsMinimal extends StatelessWidget {
  final int runningLow;
  final int outOfStock;
  final int dormant;
  final int fastMovingCount;
  final VoidCallback? onTapFastMoving;

  const InventoryInsightsMinimal({
    super.key,
    required this.runningLow,
    required this.outOfStock,
    required this.dormant,
    required this.fastMovingCount,
    this.onTapFastMoving,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Inventory Insights",
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: AppColors.mainColor,
            ),
          ),
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _item("Running low", runningLow, Colors.orange),
                const SizedBox(width: 8),
                _item("Out of stock", outOfStock, Colors.red),
                const SizedBox(width: 8),
                _item("Fast moving", fastMovingCount, Colors.green),
                const SizedBox(width: 8),
                _item("Dormant", dormant, Colors.blue),
              ],
            ),
          ),
          const SizedBox(height: 10),
          InkWell(
            onTap: onTapFastMoving,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  "See fast moving products",
                  style: TextStyle(
                    color: AppColors.mainColor,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(width: 6),
                Icon(
                  Icons.arrow_forward_ios_rounded,
                  size: 13,
                  color: AppColors.mainColor,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _item(String title, int value, Color color) {
    return InkWell(
      onTap: () {
        String type = "";
        if (title == "Fast moving") {
          type = "fastmoving";
          Get.find<ProductController>().selectedSortOrderSearch.value = type;
          Get.find<ProductController>().getProductsBySort(type: type);
          Get.to(() => ProductInsightPage(
                type: "fastmoving",
              ));
          return;
        }
        if (title == "Dormant") {
          type = "dormant";
          Get.find<ProductController>().selectedSortOrderSearch.value = type;
          Get.find<ProductController>().getProductsBySort(type: type);
          Get.to(() => ProductInsightPage(
                type: "dormant",
              ));
          return;
        }
        if (title == "Out of stock") {
          type = "outofstock";
        }
        if (title == "Running low") {
          type = "runninglow";
        }
        Get.find<ProductController>().selectedSortOrderSearch.value = type;
        Get.find<ProductController>().getProductsBySort(type: type);
        Get.to(() => ProductPage());
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(30),
        ),
        child: RichText(
          text: TextSpan(
            style: const TextStyle(fontSize: 12),
            children: [
              TextSpan(
                text: "$value ",
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.bold,
                ),
              ),
              TextSpan(
                text: title,
                style: const TextStyle(
                  color: Colors.black87,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/main.dart';
import 'package:pointify/utils/colors.dart';
import 'package:pointify/widgets/minor_title.dart';
import 'package:pointify/widgets/shop_list_bottomsheet.dart';

import '../../controllers/plancontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../models/package.dart';
import '../../models/shop.dart';
import '../../widgets/major_title.dart';
import 'ShopsRenew.dart';

class ExtendUsage extends StatelessWidget {
  final Shop? shop;

  ExtendUsage({
    super.key,
    this.shop,
  }) {
    WidgetsBinding.instance.addPostFrameCallback((timeStamp) {
      userController.phoneController.text =
          userController.currentUser.value!.phone ?? "";
      planController.getPlans();
    });
  }

  final ShopController shopController = Get.find<ShopController>();
  final PlanController planController = Get.find<PlanController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xffF8F8FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          onPressed: () => Get.back(),
          icon: Icon(
            Icons.clear,
            color: AppColors.mainColor,
          ),
        ),
        title: Text(
          "Extend usage",
          style: TextStyle(
            color: AppColors.mainColor,
            fontWeight: FontWeight.w700,
            fontSize: 18,
          ),
        ),
      ),
      body: Column(
        children: [
          _topSection(),
          Expanded(
            child: Obx(
              () => planController.isLoadingPackages.isTrue
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(12, 6, 12, 18),
                      separatorBuilder: (_, __) => const SizedBox(height: 4),
                      itemCount: planController.plans.length,
                      itemBuilder: (BuildContext c, int i) {
                        final Package plan = planController.plans[i];
                        return _usageCard(plan);
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _topSection() {
    if (shop != null) {
      return Container(
        width: double.infinity,
        margin: const EdgeInsets.fromLTRB(14, 12, 14, 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.black.withOpacity(.05)),
        ),
        child: Text(
          "Extend usage for ${shop!.name} to continue using this shop.",
          style: const TextStyle(
            fontSize: 14,
            height: 1.4,
            color: Colors.black87,
            fontWeight: FontWeight.w500,
          ),
        ),
      );
    }

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(14, 12, 14, 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.black.withOpacity(.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          majorTitle(
            title: "Current Shop",
            color: Colors.black,
            size: 15.0,
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Obx(() {
                  return Text(
                    userController.currentUser.value?.primaryShop?.name ?? "",
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: AppColors.mainColor,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  );
                }),
              ),
              const SizedBox(width: 10),
              Obx(
                () => InkWell(
                  borderRadius: BorderRadius.circular(50),
                  onTap: shopController.gettingShopsLoad.isTrue
                      ? null
                      : () async {
                          await shopController.getShops();
                          showShopModalBottomSheet(Get.context);
                        },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 7,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.mainColor.withOpacity(.08),
                      borderRadius: BorderRadius.circular(50),
                      border: Border.all(
                        color: AppColors.mainColor.withOpacity(.18),
                      ),
                    ),
                    child: Text(
                      shopController.gettingShopsLoad.isTrue
                          ? "Loading..."
                          : "Switch",
                      style: TextStyle(
                        color: AppColors.mainColor,
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _usageCard(Package plan) {
    return Obx(() {
      final bool isActive = shopController.isCurrentPackage(plan) &&
          shopController.checkDaysRemaining(shop: shop) > 0;

      final int daysRemaining = shopController.checkDaysRemaining(shop: shop);

      final bool isNewPricing =
          plan.priceText != null && plan.priceText!.trim().isNotEmpty;

      final String shopText =
          isNewPricing ? (plan.shopText ?? "") : _oldPlanShopText(plan);

      final String priceText =
          isNewPricing ? (plan.priceText ?? "") : _oldPlanPriceText(plan);

      return InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: isActive
            ? null
            : () {
                shopController.shopsRenew.clear();
                shopController.getShops();
                Get.to(() => ShopsToRenew(plan: plan, shop: shop));
              },
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isActive
                  ? AppColors.mainColor.withOpacity(.25)
                  : Colors.black.withOpacity(.05),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      plan.title ?? "",
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: Colors.black87,
                      ),
                    ),
                  ),
                  if (plan.type != "free")
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 9,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: isActive
                            ? Colors.green.withOpacity(.12)
                            : AppColors.mainColor.withOpacity(.10),
                        borderRadius: BorderRadius.circular(30),
                      ),
                      child: Text(
                        isActive ? "Active" : "Subscribe",
                        style: TextStyle(
                          color: isActive
                              ? Colors.green.shade700
                              : AppColors.mainColor,
                          fontWeight: FontWeight.w800,
                          fontSize: 10.5,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                shopText,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.black.withOpacity(.52),
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              RichText(
                text: TextSpan(
                  children: [
                    if (isNewPricing)
                      const TextSpan(
                        text: "From ",
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.black54,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    TextSpan(
                      text: priceText,
                      style: TextStyle(
                        fontSize: 16,
                        color: AppColors.mainColor,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
              if (isActive) ...[
                const SizedBox(height: 6),
                Text(
                  "$daysRemaining days remaining",
                  style: TextStyle(
                    color: Colors.red.shade500,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ],
          ),
        ),
      );
    });
  }

  String _oldPlanShopText(Package plan) {
    if (plan.type == "free") return "Unlimited shops";

    final int max = plan.maxShops ?? 0;

    if (max > 10) return "11+ shops";
    if (max <= 1) return "$max shop only";

    return "$max shops only";
  }

  String _oldPlanPriceText(Package plan) {
    final currency = userController.currentUser.value?.primaryShop?.currency;

    if (currency != "KES") {
      return "USD ${plan.amountusd ?? 0}";
    }

    return "KES ${plan.amount ?? 0}";
  }
}

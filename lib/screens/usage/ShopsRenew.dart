import 'package:flutter/material.dart';
import 'package:flutter_paystack_plus/flutter_paystack_plus.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/authcontroller.dart';
import 'package:pointify/controllers/shopcontroller.dart';
import 'package:pointify/controllers/paymentcontroller.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/package.dart';
import 'package:pointify/models/shop.dart';
import '../../models/payment_methods.dart';
import '../../utils/colors.dart';

class ShopsToRenew extends StatelessWidget {
  final Package plan;
  final Shop? shop;

  ShopsToRenew({super.key, required this.plan, this.shop});

  final ShopController shopController = Get.find();
  final PaymentController paymentController = Get.find();
  bool get isNewPricing => plan.shopOptions.isNotEmpty;

  ShopPriceOption? getSelectedShopOption() {
    final selectedCount = shopController.shopsRenew.length;

    if (!isNewPricing) return null;

    for (final option in plan.shopOptions) {
      if (option.shops == selectedCount) return option;
    }

    final firstOption = plan.shopOptions.first;

    if (selectedCount > 0 && selectedCount < firstOption.shops) {
      return firstOption;
    }

    return null;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xffF7F8FA),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        title: const Text(
          "Select shops to renew",
          style: TextStyle(
            fontWeight: FontWeight.w600,
            color: Colors.black,
          ),
        ),
        iconTheme: const IconThemeData(color: Colors.black),
      ),
      body: SafeArea(
        child: Obx(() {
          if (shopController.gettingShopsLoad.isTrue) {
            return const Center(child: CircularProgressIndicator());
          }

          if (shopController.expiredShops.isEmpty) {
            return _emptyState();
          }

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _selectionHeader(),
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.only(bottom: 120),
                  itemCount: shopController.expiredShops.length,
                  itemBuilder: (_, index) =>
                      _shopTile(shopController.expiredShops[index]),
                ),
              ),
            ],
          );
        }),
      ),
      bottomSheet: SafeArea(child: Obx(() => _bottomAction(context))),
    );
  }

  // ================= HEADER =================

  Widget _selectionHeader() {
    final selected = shopController.shopsRenew.length;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Choose up to ${plan.maxShops} shop(s)",
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              _countChip(
                "$selected selected",
                selected > 0 ? AppColors.mainColor : Colors.grey,
              ),
              const SizedBox(width: 8),
              _countChip(
                "${plan.maxShops! - selected} remaining",
                Colors.grey.shade700,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _countChip(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  // ================= SHOP TILE =================

  Widget _shopTile(Shop shop) {
    final selected = shopController.shopsRenew.any((e) => e.id == shop.id);

    return GestureDetector(
      onTap: () {
        if (!selected) {
          if (shopController.shopsRenew.length >= plan.maxShops!) {
            ScaffoldMessenger.of(Get.context!).showSnackBar(
              SnackBar(
                content: Text(
                  "You can only select ${plan.maxShops} shops",
                ),
                behavior: SnackBarBehavior.floating,
                backgroundColor: Colors.red,
                duration: const Duration(seconds: 2),
              ),
            );

            return;
          }
          shopController.shopsRenew.add(shop);
        } else {
          shopController.shopsRenew
              .removeWhere((element) => element.id == shop.id);
        }
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: selected ? Colors.white : Colors.white.withOpacity(0.6),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? AppColors.mainColor : Colors.grey.shade300,
            width: 1.5,
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    shop.name ?? "",
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    shop.location ?? "",
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: selected
                  ? const Icon(
                      Icons.check_circle,
                      color: Colors.green,
                      key: ValueKey("checked"),
                    )
                  : const Icon(
                      Icons.radio_button_unchecked,
                      color: Colors.grey,
                      key: ValueKey("unchecked"),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _bottomAction(BuildContext context) {
    final selectedCount = shopController.shopsRenew.length;

    if (selectedCount == 0) {
      return const SizedBox.shrink();
    }

    final selectedOption = getSelectedShopOption();
    final priceText = isNewPricing
        ? (selectedOption?.priceText ?? plan.priceText ?? "")
        : "KES ${plan.amount ?? 0}";
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        margin: const EdgeInsets.only(bottom: 50),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 16,
              offset: const Offset(0, -4),
            )
          ],
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    "$selectedCount shop${selectedCount > 1 ? 's' : ''} selected",
                    style: const TextStyle(
                      fontSize: 13,
                      color: Colors.black54,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    priceText,
                    style: TextStyle(
                      fontSize: 18,
                      color: AppColors.mainColor,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.mainColor,
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 13,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(30),
                ),
              ),
              onPressed: () => _paymentSheet(context),
              child: const Text(
                "Continue",
                style: TextStyle(fontSize: 14, color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ================= PAYMENT =================
  Widget _sheetHandle() {
    return Center(
      child: Container(
        width: 40,
        height: 4,
        decoration: BoxDecoration(
          color: Colors.grey.shade300,
          borderRadius: BorderRadius.circular(4),
        ),
      ),
    );
  }

  void _paymentSheet(BuildContext context) {
    paymentController.getPaymentMethods();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => Obx(
        () => Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          margin: EdgeInsets.only(bottom: 50),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _sheetHandle(),
              const SizedBox(height: 16),
              const Text(
                "Choose payment method",
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                "Complete your subscription renewal",
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 20),
              ...paymentController.paymentmethods
                  .map((m) => _paymentOption(context, m))
                  .toList(),
            ],
          ),
        ),
      ),
    );
  }

  String _paymentSubtitle(String name) {
    switch (name) {
      case "mpesa":
        return "Pay using your mobile money";
      case "paystack":
        return "Card or bank transfer";
      case "stripe":
        return "Visa, Mastercard, Apple Pay";
      default:
        return "Fast and secure payment";
    }
  }

  void _paywithMpesa(BuildContext context) async {
    final Shop shopp = shop ?? userController.currentUser.value!.primaryShop!;

    // 1️⃣ Start Mpesa (STK push)

    showMpesaWaitingDialog(context);
    final response = await shopController.subscribe(
      shopp,
      package: plan,
      type: "mpesa",
    );

    if (response == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Failed to initiate Mpesa payment")),
      );
      return;
    }

    // 2️⃣ NOW show waiting dialog (STK was sent)

    // 3️⃣ Start polling
    final reference = response; // or your reference
    _listenForMpesaPayment(context, reference);
  }

  void showMpesaWaitingDialog(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: false, // 🔒 user CANNOT close
      builder: (_) => WillPopScope(
        onWillPop: () async => false, // 🔒 disable back button
        child: Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: const [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text(
                  "Waiting for Mpesa payment",
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  "Check your phone and enter your Mpesa PIN to complete payment.",
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: Colors.grey),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _listenForMpesaPayment(
    BuildContext context,
    String reference,
  ) async {
    const int maxAttempts = 12; // ~1 minute
    int attempts = 0;

    while (attempts < maxAttempts) {
      await Future.delayed(const Duration(seconds: 5));
      final status = await shopController.checkPaymentStatus(reference);
      if (status == "success") {
        Navigator.pop(context); // close waiting sheet

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Payment successful"),
            backgroundColor: Colors.green,
          ),
        );
        await Get.find<AuthController>().initUser();
        shopController.shopsRenew.clear();
        return;
      }

      if (status == "failed") {
        Navigator.pop(context);

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Payment failed"),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }

      attempts++;
    }

    // timeout
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("Payment pending, we’ll notify you"),
      ),
    );
  }

  void _paywithStripe() {
    Get.snackbar(
      "Stripe",
      "Stripe payment coming soon",
      snackPosition: SnackPosition.BOTTOM,
    );
  }

  String _generateRef() {
    return "ref_${DateTime.now().millisecondsSinceEpoch}";
  }

  Future<void> _paywithPaystack(
      BuildContext context, PaymentMethods pay) async {
    final String reference = _generateRef();
    final selectedOption = getSelectedShopOption();

    if (isNewPricing && selectedOption == null) {
      Get.snackbar(
        "Invalid selection",
        "Please select shops within this plan limit",
        snackPosition: SnackPosition.BOTTOM,
      );
      return;
    }

    var amount = isNewPricing ? selectedOption!.amount : plan.amount!;
    if (userController.currentUser.value?.primaryShop?.currency == "USD") {
      amount = plan.amountusd!;
    }
    try {
      await FlutterPaystackPlus.openPaystackPopup(
        context: context,
        publicKey: pay.settings!['publicKey'],
        secretKey: pay.settings!['secretKey'],
        customerEmail: userController.currentUser.value?.email ?? "",
        amount: (amount * 100).toString(), // Paystack uses kobo/cents
        currency: userController.currentUser.value?.primaryShop?.currency,
        reference: reference,
        callBackUrl: pay.settings!['callbackUrl'],
        metadata: {
          "packageId": plan.id,
          "shops": shopController.shopsRenew.map((s) => s.id).toList(),
          "userId": userController.currentUser.value?.id,
          "shop": userController.currentUser.value?.primaryShop?.id
        },
        onSuccess: () async {
          await Get.find<AuthController>().initUser();
          debugPrint("Paystack payment successful");
        },
        onClosed: () {
          debugPrint("Paystack payment closed");
        },
      );
    } catch (e) {
      debugPrint("Paystack error: $e");
    }
  }

  Widget _paymentOption(BuildContext context, PaymentMethods method) {
    return GestureDetector(
      onTap: () {
        Navigator.pop(context);

        if (method.name == "mpesa") {
          _paywithMpesa(context);
        } else if (method.name == "paystack") {
          _paywithPaystack(context, method);
        } else if (method.name == "stripe") {
          _paywithStripe();
        }
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Colors.grey.shade300,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Image.asset(
                "assets/images/${method.name}.png",
                fit: BoxFit.contain,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    method.name!.capitalizeFirst!,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _paymentSubtitle(method.name!),
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.arrow_forward_ios,
              size: 14,
              color: Colors.grey,
            ),
          ],
        ),
      ),
    );
  }

  Widget _emptyState() {
    return const Center(
      child: Text("No expired shops"),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/purchase_controller.dart';
import 'package:pointify/controllers/suppliercontroller.dart';

import '../../functions/functions.dart';
import '../../main.dart';
import '../../utils/colors.dart';
import '../../widgets/alert.dart';
import '../suppliers/suppliers_page.dart';

class PurchaesPreview extends StatefulWidget {
  final String? page;

  const PurchaesPreview({
    super.key,
    this.page,
  });

  @override
  State<PurchaesPreview> createState() => _PurchaesPreviewState();
}

class _PurchaesPreviewState extends State<PurchaesPreview> {
  final PurchaseController purchaseController = Get.find<PurchaseController>();

  final SupplierController supplierController = Get.find<SupplierController>();

  @override
  void initState() {
    super.initState();

    if (purchaseController.selectedpaymentMethod.value.isEmpty) {
      purchaseController.selectedpaymentMethod.value = 'Cash';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff7f7fb),
      bottomNavigationBar: _buildBottomBar(),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: SingleChildScrollView(
            child: Column(
              children: [
                _buildCloseButton(),
                const SizedBox(height: 12),
                _buildTotalCard(),
                const SizedBox(height: 12),
                _buildPaymentMethodsLabel(),
                const SizedBox(height: 12),
                _buildPaymentSection(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // CLOSE BUTTON
  // ─────────────────────────────────────────────────────────────

  Widget _buildCloseButton() {
    return Align(
      alignment: Alignment.centerRight,
      child: InkWell(
        onTap: Get.back,
        borderRadius: BorderRadius.circular(30),
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: const Icon(Icons.close, size: 18),
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // TOTAL CARD
  // ─────────────────────────────────────────────────────────────

  Widget _buildTotalCard() {
    return Obx(() {
      final total = purchaseController.balance;

      final itemCount = purchaseController.invoice.value?.items?.length ?? 0;

      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 18,
        ),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              AppColors.mainColor,
              AppColors.mainColor.withOpacity(.85),
            ],
          ),
          borderRadius: BorderRadius.circular(26),
        ),
        child: Column(
          children: [
            const Text(
              'PURCHASE TOTAL',
              style: TextStyle(
                color: Colors.white70,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              htmlPrice(total.toStringAsFixed(2)),
              style: const TextStyle(
                color: Colors.white,
                fontSize: 28,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '$itemCount item(s)',
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 13,
              ),
            ),
          ],
        ),
      );
    });
  }

  // ─────────────────────────────────────────────────────────────
  // LABEL
  // ─────────────────────────────────────────────────────────────

  Widget _buildPaymentMethodsLabel() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Text(
        'Payment Method',
        style: TextStyle(
          color: Colors.grey.shade700,
          fontWeight: FontWeight.w700,
          fontSize: 13,
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // PAYMENT SECTION
  // ─────────────────────────────────────────────────────────────

  Widget _buildPaymentSection() {
    return Obx(() {
      final method = purchaseController.selectedpaymentMethod.value.isEmpty
          ? 'Cash'
          : purchaseController.selectedpaymentMethod.value;

      return Column(
        children: [
          _SelectedPaymentMethodCard(
            method: method,
            iconResolver: _paymentIcon,
            onTap: _showPaymentMethodsSheet,
          ),
          _buildInlinePaymentCard(method),
          _buildChangeMethodLink(),
        ],
      );
    });
  }

  Widget _buildChangeMethodLink() {
    return InkWell(
      onTap: _showPaymentMethodsSheet,
      child: Padding(
        padding: const EdgeInsets.only(top: 2, bottom: 10),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Change payment method',
              style: TextStyle(
                color: AppColors.mainColor,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
            const SizedBox(width: 4),
            Icon(
              Icons.keyboard_arrow_down,
              size: 18,
              color: AppColors.mainColor,
            ),
          ],
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // INLINE CARD
  // ─────────────────────────────────────────────────────────────

  Widget _buildInlinePaymentCard(String method) {
    final needsSupplier = method == 'Credit';

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (needsSupplier) ...[
            _buildSupplierSelector(),
            const SizedBox(height: 12),
          ],
          _buildAmountField(method),
          if (method == "Mpesa") ...[
            const SizedBox(height: 12),
            _buildMpesaField(),
          ],
          if (method == "Bank") ...[
            const SizedBox(height: 12),
            _buildBankField(),
          ],
          const SizedBox(height: 16),
          _buildSummary(method),
        ],
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SUPPLIER SELECTOR
  // ─────────────────────────────────────────────────────────────

  Widget _buildSupplierSelector() {
    return InkWell(
      onTap: () {
        Get.to(
          () => Suppliers(
            from: "purchases",
          ),
        );
      },
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.grey.shade50,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: AppColors.mainColor.withOpacity(.08),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                Icons.storefront_outlined,
                color: AppColors.mainColor,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Obx(() {
                final supplier = purchaseController.selectedSupplier.value;

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      supplier?.name ?? "Select Supplier",
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: supplier == null ? Colors.grey : Colors.black,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      supplier == null
                          ? "Required for credit purchases"
                          : "Tap to change",
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                );
              }),
            ),
            Icon(
              Icons.arrow_forward_ios_rounded,
              size: 14,
              color: Colors.grey.shade500,
            ),
          ],
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // AMOUNT FIELD
  // ─────────────────────────────────────────────────────────────

  Widget _buildAmountField(String method) {
    return TextFormField(
      controller: purchaseController.textEditingControllerAmount,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      onChanged: (value) {
        purchaseController.calculateAmount();
        purchaseController.invoice.refresh();
      },
      decoration: InputDecoration(
        labelText: _amountLabel(method),
        hintText: 'Enter amount',
        prefixIcon: const Icon(Icons.payments_outlined),
        prefixText:
            "${userController.currentUser.value!.primaryShop!.currency!} ",
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
        ),
      ),
    );
  }

  String _amountLabel(String method) {
    switch (method) {
      case 'Cash':
        return 'Cash Paid';
      case 'Mpesa':
        return 'Mpesa Amount';
      case 'Bank':
        return 'Bank Amount';
      case 'Credit':
        return 'Amount Paid';
      default:
        return 'Amount';
    }
  }

  // ─────────────────────────────────────────────────────────────
  // MPESA FIELD
  // ─────────────────────────────────────────────────────────────

  Widget _buildMpesaField() {
    return TextFormField(
      controller: purchaseController.mpesaTransId,
      decoration: InputDecoration(
        labelText: 'Mpesa Transaction ID',
        hintText: 'e.g. QWE123RTY',
        prefixIcon: const Icon(
          Icons.confirmation_number_outlined,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // BANK FIELD
  // ─────────────────────────────────────────────────────────────

  Widget _buildBankField() {
    return TextFormField(
      controller: purchaseController.bankTransId,
      decoration: InputDecoration(
        labelText: 'Bank Transaction ID',
        hintText: 'e.g. TXN-293939',
        prefixIcon: const Icon(
          Icons.account_balance_outlined,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────

  Widget _buildSummary(String method) {
    return Obx(() {
      final total = purchaseController.balance;

      final paid = double.tryParse(
            purchaseController.textEditingControllerAmount.text,
          ) ??
          0;

      final balance = total - paid;

      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.grey.shade50,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          children: [
            _PaymentRow(
              label: 'Total',
              value: htmlPrice(total),
            ),
            const SizedBox(height: 10),
            _PaymentRow(
              label: 'Paid',
              value: htmlPrice(paid),
            ),
            Divider(
              height: 24,
              color: Colors.grey.shade300,
            ),
            _PaymentRow(
              label: balance <= 0 ? 'Change' : 'Balance',
              value: htmlPrice(balance.abs()),
              bold: true,
              valueColor: balance > 0 ? Colors.red : Colors.green,
            ),
          ],
        ),
      );
    });
  }

  // ─────────────────────────────────────────────────────────────
  // BOTTOM BAR
  // ─────────────────────────────────────────────────────────────

  Widget _buildBottomBar() {
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(
          16,
          10,
          16,
          16,
        ),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(.04),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: SizedBox(
          height: 52,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.mainColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            onPressed: () {
              _sell(
                selectedpaymentMethod:
                    purchaseController.selectedpaymentMethod.value,
              );
            },
            child: const Text(
              'Complete Purchase',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // PAYMENT METHODS SHEET
  // ─────────────────────────────────────────────────────────────

  void _showPaymentMethodsSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        padding: const EdgeInsets.all(16),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(28),
          ),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 35,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'Select Payment Method',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 12),
              ...purchaseController.paymentMethods.map(
                (method) => _PaymentMethodOption(
                  method: method,
                  icon: _paymentIcon(method),
                  onTap: () {
                    purchaseController.selectedpaymentMethod.value = method;

                    purchaseController.textEditingControllerAmount.clear();

                    Get.back();
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────

  IconData _paymentIcon(String method) {
    switch (method) {
      case 'Cash':
        return Icons.payments_outlined;

      case 'Mpesa':
        return Icons.phone_android;

      case 'Bank':
        return Icons.account_balance;

      case 'Credit':
        return Icons.credit_score;

      default:
        return Icons.wallet;
    }
  }

  bool _needSupplier() {
    return purchaseController.selectedpaymentMethod.value == "Credit";
  }

  void _sell({
    String status = "cashed",
    String selectedpaymentMethod = "",
  }) {
    if (purchaseController.invoice.value == null ||
        purchaseController.invoice.value!.items!.isEmpty) {
      generalAlert(title: "No items to pay");
      return;
    }

    if (purchaseController.selectedSupplier.value == null && _needSupplier()) {
      generalAlert(
        title: "Error!",
        message: "Please select supplier to buy from",
        function: () {
          Get.to(
            () => Suppliers(
              from: "purchases",
            ),
          );
        },
      );
      return;
    }

    if (selectedpaymentMethod == "Credit") {
      generalAlert(
        title: "Confirm",
        message:
            "Are you sure you want to purchase on $selectedpaymentMethod from ${purchaseController.selectedSupplier.value?.name}?",
        function: () {
          purchaseController.createPurchase();
        },
      );
    } else {
      purchaseController.createPurchase();
    }
  }
}

// ─────────────────────────────────────────────────────────────
// PAYMENT METHOD CARD
// ─────────────────────────────────────────────────────────────

class _SelectedPaymentMethodCard extends StatelessWidget {
  final String method;
  final IconData Function(String) iconResolver;
  final VoidCallback onTap;

  const _SelectedPaymentMethodCard({
    required this.method,
    required this.iconResolver,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: AppColors.mainColor,
            width: 1.4,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(.04),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                color: AppColors.mainColor.withOpacity(.08),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(
                iconResolver(method),
                color: AppColors.mainColor,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                method,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            Icon(
              Icons.arrow_forward_ios_rounded,
              size: 16,
              color: Colors.grey.shade500,
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// PAYMENT OPTION
// ─────────────────────────────────────────────────────────────

class _PaymentMethodOption extends StatelessWidget {
  final String method;
  final IconData icon;
  final VoidCallback onTap;

  const _PaymentMethodOption({
    required this.method,
    required this.icon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: Colors.grey.shade200,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 35,
              height: 35,
              decoration: BoxDecoration(
                color: AppColors.mainColor.withOpacity(.08),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(
                icon,
                color: AppColors.mainColor,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                method,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            Icon(
              Icons.arrow_forward_ios_rounded,
              size: 15,
              color: Colors.grey.shade500,
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// PAYMENT ROW
// ─────────────────────────────────────────────────────────────

class _PaymentRow extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  final Color? valueColor;

  const _PaymentRow({
    required this.label,
    required this.value,
    this.bold = false,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            color: Colors.grey.shade700,
            fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
            color: valueColor ?? Colors.black,
          ),
        ),
      ],
    );
  }
}

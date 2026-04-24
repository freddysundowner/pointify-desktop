import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/main.dart';
import 'package:pointify/services/sms_service.dart';
import 'package:pointify/services/user.dart';
import 'package:pointify/utils/colors.dart';

class SmsSettingsPage extends StatelessWidget {
  SmsSettingsPage({super.key}) {
    authController.getUserData();
  }

  final TextEditingController senderController =
      TextEditingController(text: "POINTIFY");

  final TextEditingController templateController = TextEditingController(
    text:
        "Hi {name}, thank you for your purchase at {shop}. Amount: {amount}. Receipt #{receipt}. View: {receipt_url}",
  );

  final RxInt smsCredits = 1250.obs;
  final RxBool saving = false.obs;

  final String sampleName = "John";
  final String sampleShop = "Pointify Store";
  final String sampleAmount = "KES 2,500";
  final String sampleReceipt = "A102";
  final String sampleReceiptUrl = "https://ptfy.link/A102";

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff6f7fb),
      appBar: AppBar(
        backgroundColor: const Color(0xfff6f7fb),
        elevation: 0,
        surfaceTintColor: const Color(0xfff6f7fb),
        titleSpacing: 0,
        leading: IconButton(
          onPressed: Get.back,
          icon: Icon(
            Icons.arrow_back_ios_new_rounded,
            color: AppColors.mainColor,
            size: 18,
          ),
        ),
        title: const Text(
          "SMS Settings",
          style: TextStyle(
            color: Colors.black,
            fontSize: 17,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          color: const Color(0xfff6f7fb),
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
          child: Obx(
            () => ElevatedButton(
              onPressed: saving.value ? null : _saveSettings,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.mainColor,
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 15),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: saving.value
                  ? const SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Text(
                      "Save SMS Settings",
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
            ),
          ),
        ),
      ),
      body: Obx(
        () => SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 90),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _summaryCard(),
              const SizedBox(height: 14),
              _sectionLabel("Configuration"),
              const SizedBox(height: 8),
              _sectionCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Obx(() => _switchTile(
                          title: "Enable SMS after sale",
                          subtitle:
                              "Automatically send SMS when a sale is completed",
                          value: userController
                                  .currentUser.value?.saleSmsEnabled ??
                              false,
                          onChanged: (value) {
                            authController.smsEnabled.value = value;
                            userController.currentUser.value?.saleSmsEnabled =
                                value;
                            userController.currentUser.refresh();
                          },
                        )),
                    const SizedBox(height: 14),
                    _fieldLabel("Sender Name"),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: senderController,
                      enabled: userController.currentUser.value?.saleSmsEnabled,
                      decoration: _inputDecoration(
                        hintText: "e.g POINTIFY",
                        prefixIcon: Icons.badge_outlined,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _fieldLabel("Sale SMS Template"),
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: templateController,
                      enabled: userController.currentUser.value?.saleSmsEnabled,
                      maxLines: 5,
                      onChanged: (_) {
                        templateController.selection =
                            templateController.selection;
                      },
                      decoration: _inputDecoration(
                        hintText:
                            "Hi {name}, thank you for your purchase at {shop}. Amount: {amount}. Receipt #{receipt}. View: {receipt_url}",
                      ),
                    ),
                    const SizedBox(height: 10),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(14),
                        color: Colors.orange.shade50,
                        border: Border.all(color: Colors.orange.shade200),
                      ),
                      child: const Text(
                        "Available placeholders: {name}, {shop}, {amount}, {receipt}, {receipt_url}",
                        style: TextStyle(
                          fontSize: 11.5,
                          color: Colors.black87,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              _sectionLabel("Preview"),
              const SizedBox(height: 8),
              _sectionCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Sample message",
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Colors.grey.shade700,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        color: Colors.grey.shade50,
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Text(
                        _buildPreviewMessage(),
                        style: const TextStyle(
                          fontSize: 13,
                          color: Colors.black87,
                          height: 1.45,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _dialogFieldLabel(String label) {
    return Text(
      label,
      style: const TextStyle(
        fontSize: 12.5,
        fontWeight: FontWeight.w600,
        color: Colors.black87,
      ),
    );
  }

  InputDecoration _dialogInputDecoration({String? hintText}) {
    return InputDecoration(
      hintText: hintText,
      hintStyle: TextStyle(
        color: Colors.grey.shade500,
        fontSize: 12,
      ),
      filled: true,
      fillColor: Colors.grey.shade50,
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: 12,
        vertical: 13,
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: AppColors.mainColor),
      ),
    );
  }

  Widget _topUpPreviewCard() {
    final double amount = userController.topUpAmount.value;

    final int estimatedCredits =
        amount > 0 ? (amount / userController.pricePerSms.value).floor() : 0;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: Colors.grey.shade50,
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Preview",
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: Colors.grey.shade700,
            ),
          ),
          const SizedBox(height: 10),
          _previewRow("Amount", "KES ${amount.toStringAsFixed(0)}"),
          const SizedBox(height: 6),
          _previewRow("Estimated SMS Credits", estimatedCredits.toString()),
          const SizedBox(height: 6),
          _previewRow(
            "STK Push To",
            userController.topUpPhoneController.text.trim().isEmpty
                ? "-"
                : userController.topUpPhoneController.text.trim(),
          ),
        ],
      ),
    );
  }

  Widget _previewRow(String title, String value) {
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey.shade700,
            ),
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w700,
            color: Colors.black,
          ),
        ),
      ],
    );
  }

  void _showTopUpSheet() {
    userController.topUpPhoneController.text =
        userController.currentUser.value?.phone ?? "";

    userController.topUpAmountController.text = "";

    Get.bottomSheet(
      Obx(
        () => Container(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 42,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  "Top Up SMS Credits",
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: Colors.black,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  "Enter the phone number to receive STK push and the amount to spend.",
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade700,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 16),
                _dialogFieldLabel("Phone Number"),
                const SizedBox(height: 6),
                TextFormField(
                  controller: userController.topUpPhoneController,
                  keyboardType: TextInputType.phone,
                  decoration: _dialogInputDecoration(
                    hintText: "e.g 254712345678",
                  ),
                ),
                const SizedBox(height: 12),
                _dialogFieldLabel("Amount"),
                const SizedBox(height: 6),
                TextFormField(
                  controller: userController.topUpAmountController,
                  keyboardType: TextInputType.number,
                  onChanged: (value) {
                    userController.topUpAmount.value =
                        double.tryParse(value) ?? 0;
                  },
                  decoration: _dialogInputDecoration(
                    hintText: "e.g 500",
                  ),
                ),
                const SizedBox(height: 14),
                Obx(() => _topUpPreviewCard()),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: userController.toppingUp.value
                            ? null
                            : () => Get.back(),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          side: BorderSide(color: Colors.grey.shade300),
                        ),
                        child: const Text("Cancel"),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: userController.toppingUp.value
                            ? null
                            : _submitTopUp,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.mainColor,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: userController.toppingUp.value
                            ? const SizedBox(
                                height: 18,
                                width: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text(
                                "Buy Credits",
                                style: TextStyle(fontWeight: FontWeight.w700),
                              ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
      isScrollControlled: true,
    );
  }

  Future<void> _submitTopUp() async {
    final String phone = userController.topUpPhoneController.text.trim();
    final double amount = userController.topUpAmount.value;

    if (phone.isEmpty) {
      Get.snackbar(
        "Error",
        "Enter phone number",
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
      return;
    }

    if (amount <= 0) {
      Get.snackbar(
        "Error",
        "Enter valid amount",
        backgroundColor: Colors.red,
        colorText: Colors.white,
      );
      return;
    }

    try {
      userController.toppingUp.value = true;

      // replace with your real API call
      var response =
          await SmsService.topUpCredits(phone: phone, amount: amount);

      if (response["error"] != null) {
        Get.snackbar(
          "Error",
          response["error"],
          backgroundColor: Colors.red,
          colorText: Colors.white,
        );
        return;
      }

      Get.back();

      _showTopUpInstructionDialog(phone);
    } finally {
      userController.toppingUp.value = false;
    }
  }

  void _showTopUpInstructionDialog(String phone) {
    Get.dialog(
      Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 14),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.phone_android_rounded,
                size: 36,
                color: AppColors.mainColor,
              ),
              const SizedBox(height: 12),
              const Text(
                "Complete Payment",
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                "Check your phone ($phone) and enter your M-Pesa PIN to complete the STK push.",
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12.5,
                  color: Colors.grey.shade700,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    Get.back();

                    await authController.getUserData(); // 🔥 refresh user
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.mainColor,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    "OK",
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      barrierDismissible: false,
    );
  }

  Widget _summaryCard() {
    return _sectionCard(
      child: Row(
        children: [
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                color: Colors.grey.shade50,
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "SMS Balance",
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade700,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Obx(() => Text(
                        "${userController.currentUser.value?.smscredit} credits",
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: Colors.black,
                        ),
                      )),
                ],
              ),
            ),
          ),
          const SizedBox(width: 10),
          ElevatedButton(
            onPressed: _showTopUpSheet,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.mainColor,
              foregroundColor: Colors.white,
              elevation: 0,
              padding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 14,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            child: const Text(
              "Top Up",
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _switchTile({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: Colors.grey.shade50,
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: Colors.black,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 11.5,
                    color: Colors.grey.shade700,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          CupertinoSwitch(
            value: value,
            activeColor: AppColors.mainColor,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }

  Widget _sectionCard({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        color: Colors.white,
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.025),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: child,
    );
  }

  Widget _sectionLabel(String title) {
    return Text(
      title,
      style: TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w700,
        color: Colors.grey.shade700,
      ),
    );
  }

  Widget _fieldLabel(String label) {
    return Text(
      label,
      style: const TextStyle(
        fontSize: 12.5,
        fontWeight: FontWeight.w600,
        color: Colors.black87,
      ),
    );
  }

  InputDecoration _inputDecoration({
    String? hintText,
    IconData? prefixIcon,
  }) {
    return InputDecoration(
      hintText: hintText,
      hintStyle: TextStyle(
        color: Colors.grey.shade500,
        fontSize: 12,
      ),
      filled: true,
      fillColor: Colors.grey.shade50,
      isDense: true,
      prefixIcon: prefixIcon == null
          ? null
          : Icon(prefixIcon, size: 20, color: Colors.grey.shade700),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: 12,
        vertical: 13,
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: AppColors.mainColor),
      ),
    );
  }

  String _buildPreviewMessage() {
    return templateController.text
        .replaceAll("{name}", sampleName)
        .replaceAll("{shop}", sampleShop)
        .replaceAll("{amount}", sampleAmount)
        .replaceAll("{receipt}", sampleReceipt)
        .replaceAll("{receipt_url}", sampleReceiptUrl);
  }

  Future<void> _saveSettings() async {
    try {
      saving.value = true;

      // Replace this with your real backend call
      // Example:
      await User().profileUpdate(
        {
          "saleSmsEnabled": authController.smsEnabled.value,
          "saleSmsSender": senderController.text.trim(),
          "saleSmsTemplate": templateController.text.trim(),
        },
      );

      await Future.delayed(const Duration(milliseconds: 700));

      Get.snackbar(
        "Success",
        "SMS settings updated",
        backgroundColor: Colors.green,
        colorText: Colors.white,
      );
    } finally {
      saving.value = false;
    }
  }
}

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/customercontroller.dart';
import 'package:pointify/controllers/salescontroller.dart';
import 'package:pointify/models/customer.dart';
import 'package:pointify/utils/colors.dart';

void showDepositDialog({
  required BuildContext context,
  required Customer customerModel,
  required String title,
  String? page,
  String? size,
}) {
  final walletController = Get.find<CustomerController>();
  final salesController = Get.find<SalesController>();

  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => Padding(
      padding:
          EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style:
                    const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextFormField(
              controller: walletController.amountController,
              keyboardType: TextInputType.number,
              decoration: _input("Amount"),
            ),
            const SizedBox(height: 12),
            InkWell(
              onTap: () => _selectPaymentMethod(salesController),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Obx(() => Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(salesController.paynowMethod.value),
                        const Icon(Icons.arrow_drop_down),
                      ],
                    )),
              ),
            ),
            Obx(() => salesController.paynowMethod.value == "Mpesa"
                ? Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: TextFormField(
                      controller: salesController.mpesaCode,
                      decoration: _input("Mpesa Code (Last 5 Digits)"),
                    ),
                  )
                : const SizedBox()),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                    onPressed: () => Get.back(), child: const Text("CANCEL")),
                const SizedBox(width: 8),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.mainColor),
                  onPressed: () {
                    Get.back();
                    walletController.deposit(
                        customerModel, context, page, size);
                  },
                  child: Text(title.toUpperCase(),
                      style: const TextStyle(color: Colors.white)),
                ),
              ],
            )
          ],
        ),
      ),
    ),
  );
}

InputDecoration _input(String hint) {
  return InputDecoration(
    hintText: hint,
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
  );
}

void _selectPaymentMethod(SalesController controller) {
  Get.dialog(SimpleDialog(
    children: controller.receiptpaymentMethods
        .map((method) => SimpleDialogOption(
              onPressed: () {
                controller.paynowMethod.value = method;
                Get.back();
              },
              child: Text(method),
            ))
        .toList(),
  ));
}

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/customercontroller.dart';
import 'components/wallet_card.dart';

class DepositHistory extends StatelessWidget {
  const DepositHistory({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = Get.find<CustomerController>();

    return Obx(() {
      if (controller.gettingWalletLoad.value) {
        return const Center(child: CircularProgressIndicator());
      }

      if (controller.deposits.isEmpty) {
        return const Center(child: Text("No entries found"));
      }

      return ListView.separated(
        padding: const EdgeInsets.all(10),
        itemCount: controller.deposits.length,
        separatorBuilder: (_, __) => const SizedBox(height: 6),
        itemBuilder: (_, index) => walletUsageCard(
          context: context,
          depositBody: controller.deposits[index],
        ),
      );
    });
  }
}

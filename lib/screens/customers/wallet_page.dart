import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/customercontroller.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/screens/customers/deposit_history.dart';
import 'package:pointify/utils/colors.dart';
import 'package:printing/printing.dart';

import '../receipts/pdf/wallet_pdf.dart';
import 'components/deposit_dialog.dart';

class WalletPage extends StatelessWidget {
  final String? page;
  WalletPage({super.key, this.page});

  final CustomerController controller = Get.find<CustomerController>();

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      final customer = controller.currentCustomer.value!;
      return Scaffold(
        appBar: _appBar(),
        body: Column(
          children: [
            _walletHeader(context, customer),
            Expanded(child: _tabs(customer.sId!)),
          ],
        ),
      );
    });
  }

  AppBar _appBar() {
    return AppBar(
      backgroundColor: AppColors.mainColor,
      elevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios, color: Colors.white),
        onPressed: () => Get.back(),
      ),
      title: Text(
        controller.currentCustomer.value!.name!.capitalize!,
        style: const TextStyle(color: Colors.white),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.download, color: Colors.white),
          onPressed: _showDownloadSheet,
        ),
      ],
    );
  }

  Widget _walletHeader(BuildContext context, customer) {
    return Container(
      height: MediaQuery.of(context).size.height * .2,
      width: double.infinity,
      color: AppColors.mainColor,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text(
            "Wallet Balance",
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          Obx(() => Text(
                htmlPrice(controller.currentCustomer.value?.wallet ?? 0)
                    .toUpperCase(),
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.bold),
              )),
          const SizedBox(height: 12),
          InkWell(
            onTap: () {
              showDepositDialog(
                context: context,
                customerModel: customer,
                title: customer.wallet! < 0 ? "Payment" : "Deposit",
                page: page,
                size: "small",
              );
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
              decoration: BoxDecoration(
                  color: Colors.white, borderRadius: BorderRadius.circular(16)),
              child: Text(
                customer.wallet! < 0 ? "Make Payment" : "Make Deposit",
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _tabs(String uid) {
    return Column(
      children: [
        TabBar(
          controller: controller.tabController,
          labelColor: AppColors.mainColor,
          unselectedLabelColor: Colors.grey,
          indicatorColor: AppColors.mainColor,
          onTap: (index) {
            controller.getTransactions(index == 0 ? "deposit" : "payment", uid);
          },
          tabs: const [
            Tab(text: "Deposit"),
            Tab(text: "Usage"),
          ],
        ),
        Expanded(
          child: TabBarView(
            controller: controller.tabController,
            children: const [
              DepositHistory(),
              DepositHistory(),
            ],
          ),
        ),
      ],
    );
  }

  void _showDownloadSheet() {
    showModalBottomSheet(
      context: Get.context!,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _downloadItem("Deposit History", "deposit"),
          _downloadItem("Usage History", "payment"),
          _downloadItem("Full Statement", "all"),
        ],
      ),
    );
  }

  Widget _downloadItem(String title, String type) {
    return ListTile(
      leading: const Icon(Icons.download),
      title: Text(title),
      onTap: () {
        Get.back();
        final id = controller.currentCustomer.value!.sId!;
        controller.getTransactions(type, id, reason: "download");

        Get.to(() => Scaffold(
              appBar: AppBar(title: Text(title)),
              body: Obx(() => controller.isLoadingcustomerPayments.isTrue
                  ? const Center(child: CircularProgressIndicator())
                  : PdfPreview(
                      build: (_) => customerStatement(
                          controller.downloadPaymentsHistory, title),
                    )),
            ));
      },
    );
  }
}

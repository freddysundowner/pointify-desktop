import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/reports_controller.dart';
import 'package:pointify/main.dart';
import 'package:pointify/reports/purchases/invoice_order_card.dart';
import 'package:pointify/utils/colors.dart';
import 'package:pointify/widgets/no_items_found.dart';
import 'package:printing/printing.dart';

import '../../../controllers/purchase_controller.dart';
import '../../../controllers/shopcontroller.dart';
import '../../functions/functions.dart';
import '../../screens/receipts/pdf/sales/purchases_report.dart';
import '../../widgets/alert.dart';

class PurchasesReport extends StatelessWidget {
  final String? title;
  final String? type;

  PurchasesReport({
    super.key,
    this.title,
    this.type,
  });

  final ShopController shopController = Get.find<ShopController>();

  final PurchaseController purchaseController = Get.find<PurchaseController>();

  final ReportsController reportsController = Get.find<ReportsController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff7f7fb),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        centerTitle: false,
        leading: IconButton(
          onPressed: () {
            Get.back();
          },
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            color: Colors.black,
            size: 20,
          ),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title ?? "Purchases",
              style: const TextStyle(
                color: Colors.black,
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              "Purchase invoices & reports",
              style: TextStyle(
                color: Colors.grey.shade600,
                fontSize: 11,
              ),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(
              right: 14,
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () {
                _showPrintDialog(context);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: AppColors.mainColor,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Row(
                  children: [
                    Icon(
                      Icons.print_outlined,
                      color: Colors.white,
                      size: 18,
                    ),
                    SizedBox(width: 6),
                    Text(
                      "Print",
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // SEARCH
          Container(
            margin: const EdgeInsets.fromLTRB(
              16,
              14,
              16,
              10,
            ),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(.03),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: TextFormField(
              controller: purchaseController.searchInvoiceController,
              onChanged: (value) {
                if (value == "") {
                  purchaseController.filteredInvoices.value = purchaseController
                      .invoices
                      .where((p0) =>
                          p0.paymentType ==
                          purchaseController.selectedItem.value)
                      .toList();
                } else {
                  purchaseController.filteredInvoices.value = purchaseController
                      .invoices
                      .where((p0) =>
                          p0.paymentType ==
                                  purchaseController.selectedItem.value &&
                              p0.purchaseNo
                                  .toString()
                                  .toLowerCase()
                                  .contains(value.toLowerCase()) ||
                          p0.items!.any(
                            (element) =>
                                element.product!.name!.toLowerCase().contains(
                                      value.toLowerCase(),
                                    ),
                          ))
                      .toList();
                }
              },
              decoration: InputDecoration(
                hintText: "Search by invoice number",
                hintStyle: TextStyle(
                  color: Colors.grey.shade500,
                ),
                prefixIcon: Icon(
                  Icons.search_rounded,
                  color: Colors.grey.shade500,
                ),
                suffixIcon: IconButton(
                  onPressed: () {
                    purchaseController.searchInvoiceController.clear();

                    purchaseController.filteredInvoices.value =
                        purchaseController.invoices;
                  },
                  icon: const Icon(Icons.close),
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(18),
                  borderSide: BorderSide.none,
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(18),
                  borderSide: BorderSide.none,
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(18),
                  borderSide: BorderSide(
                    color: AppColors.mainColor,
                  ),
                ),
                filled: true,
                fillColor: Colors.white,
              ),
            ),
          ),

          // FILTERS
          if (type!.toLowerCase() != "credit")
            Container(
              margin: const EdgeInsets.only(
                bottom: 10,
              ),
              height: 48,
              child: Obx(
                () {
                  final selectedMethod =
                      purchaseController.selectedItem.value; // 👈 read here

                  return ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    scrollDirection: Axis.horizontal,
                    itemBuilder: (context, index) {
                      final method =
                          purchaseController.reportpaymentMethods[index];
                      final selected =
                          selectedMethod == method.toString().toLowerCase();

                      return InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () {
                          purchaseController.selectedItem.value =
                              method.toString().toLowerCase();
                          purchaseController.filteredInvoices.value =
                              purchaseController.invoices
                                  .where((p0) =>
                                      p0.paymentType ==
                                      method.toString().toLowerCase())
                                  .toList();
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color:
                                selected ? AppColors.mainColor : Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: selected
                                  ? AppColors.mainColor
                                  : Colors.grey.shade300,
                            ),
                          ),
                          child: Row(
                            children: [
                              Text(
                                method.toString().capitalizeFirst!,
                                style: TextStyle(
                                  color: selected ? Colors.white : Colors.black,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: selected
                                      ? Colors.white.withOpacity(.15)
                                      : AppColors.mainColor.withOpacity(.08),
                                  borderRadius: BorderRadius.circular(30),
                                ),
                                child: Text(
                                  htmlPrice(
                                    purchaseController
                                        .totals[method.toString().toLowerCase()]
                                        .toStringAsFixed(2),
                                  ),
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: selected
                                        ? Colors.white
                                        : AppColors.mainColor,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                    separatorBuilder: (_, __) => const SizedBox(width: 10),
                    itemCount: purchaseController.reportpaymentMethods.length,
                  );
                },
              ),
            ),

          // LIST
          Expanded(
            child: Obx(() {
              return purchaseController.isLoadingPurchases.isTrue
                  ? const Center(
                      child: CircularProgressIndicator(),
                    )
                  : purchaseController.filteredInvoices.isEmpty
                      ? Center(
                          child: noItemsFound(
                            context,
                            true,
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(
                            16,
                            0,
                            16,
                            20,
                          ),
                          itemCount:
                              purchaseController.filteredInvoices.length + 1,
                          itemBuilder: (context, index) {
                            if (index <
                                purchaseController.filteredInvoices.length) {
                              return Padding(
                                padding: const EdgeInsets.only(
                                  bottom: 12,
                                ),
                                child: invoiceCard(
                                  invoice: purchaseController
                                      .filteredInvoices[index],
                                ),
                              );
                            }

                            if (!purchaseController.hasMore.value) {
                              return const SizedBox.shrink();
                            }

                            return Padding(
                              padding: const EdgeInsets.all(16),
                              child: purchaseController.isLoadingMore.value
                                  ? const Center(
                                      child: CircularProgressIndicator(),
                                    )
                                  : SizedBox(
                                      height: 50,
                                      child: ElevatedButton(
                                        style: ElevatedButton.styleFrom(
                                          elevation: 0,
                                          backgroundColor: AppColors.mainColor,
                                          shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(16),
                                          ),
                                        ),
                                        onPressed: () {
                                          purchaseController.getPurchases(
                                            shopid: userController.currentUser
                                                .value!.primaryShop!.id,
                                            loadMore: true,
                                            fromDate: reportsController
                                                .filterStartDate.value,
                                            toDate: reportsController
                                                .filterEndDate.value,
                                          );
                                        },
                                        child: const Text(
                                          "Load More",
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w700,
                                          ),
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
  }

  // ─────────────────────────────────────────────
  // PRINT DIALOG
  // ─────────────────────────────────────────────

  void _showPrintDialog(
    BuildContext context,
  ) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true, // 👈 ADDED
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom, // 👈 ADDED
        ),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(
              top: Radius.circular(28),
            ),
          ),
          child: SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                const Text(
                  "Print Purchases Report",
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  "Only 50 items will appear in the PDF. For larger reports, send to email.",
                  style: TextStyle(
                    color: Colors.grey.shade600,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 20),
                TextFormField(
                  controller: purchaseController.emailController,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.done,
                  decoration: InputDecoration(
                    hintText: "Enter email address",
                    prefixIcon: const Icon(Icons.email),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                            vertical: 14,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        onPressed: () {
                          Get.back();
                        },
                        child: const Text("Cancel"),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          elevation: 0,
                          backgroundColor: AppColors.mainColor,
                          padding: const EdgeInsets.symmetric(
                            vertical: 14,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        onPressed: () {
                          Get.back();

                          Get.to(
                            () => Scaffold(
                              appBar: AppBar(
                                title: Text(
                                  "${type.toString().capitalizeFirst} Purchases",
                                ),
                              ),
                              body: PdfPreview(
                                build: (context) => purchasesReportPdf(
                                  "receipts",
                                  "${type!.toUpperCase()} PURCHASES",
                                ),
                              ),
                            ),
                          );
                        },
                        child: const Text(
                          "Print",
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      elevation: 0,
                      backgroundColor: Colors.black,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    onPressed: () {
                      if (purchaseController.emailController.text.isNotEmpty) {
                        purchaseController.sendReportEmail(
                          email: purchaseController.emailController.text,
                          fromDate: reportsController.filterStartDate.value,
                          toDate: reportsController.filterEndDate.value,
                          shop: userController
                              .currentUser.value!.primaryShop!.id!,
                          status: "cashed",
                        );
                      } else {
                        generalAlert(
                          message: "Please enter your email",
                        );
                      }
                    },
                    icon: const Icon(
                      Icons.email_outlined,
                      color: Colors.white,
                    ),
                    label: const Text(
                      "Send To Email",
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

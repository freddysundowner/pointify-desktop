import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geocoding/geocoding.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/paymentcontroller.dart';
import 'package:pointify/controllers/reports_controller.dart';
import 'package:pointify/controllers/shopcontroller.dart';
import 'package:pointify/screens/shop/edit_shop_details.dart';
import 'package:pointify/screens/usage/extend_usage.dart';
import 'package:pointify/utils/colors.dart';
import 'package:pointify/utils/helper.dart';
import 'package:pointify/widgets/alert.dart';

import '../../../main.dart';
import '../../controllers/salescontroller.dart';
import '../../models/shop.dart';
import '../../services/place_service.dart';
import '../../services/shop_services.dart';
import '../../widgets/delete_dialog.dart';
import '../../widgets/loading_dialog.dart';
import 'shop_address.dart';

class ShopDetails extends StatelessWidget {
  final Shop shopModel;

  ShopDetails({super.key, required this.shopModel}) {
    reportsController.getSalesReport(
      startDate: reportsController.filterStartDate.value,
      toDate: reportsController.filterEndDate.value,
      shopid: userController.currentUser.value!.primaryShop!.id!,
    );

    shopController.emailController.text = shopModel.receiptemail ?? "";
    shopController.contactController.text = shopModel.contact ?? "";
    shopController.paybillAcc.text = shopModel.paybillAccount ?? "";
    shopController.paybillTill.text = shopModel.paybillTill ?? "";
    shopController.address.text = shopModel.addressReceipt ?? "";
    shopController.backupemail.text =
        shopModel.backupemail ?? userController.currentUser.value?.email ?? "";

    shopController.shopLocation.value = shopModel.location ?? "";
    shopController.allowOnlineSelling.value =
        shopModel.allowOnlineSelling ?? false;
    shopController.productionEnabled.value = shopModel.production ?? false;
    shopController.allowBackup.value = shopModel.allowBackup ?? false;
    shopController.useWarehouse.value = shopModel.useWarehouse ?? false;

    final backupName = shopModel.backupInterval;
    final matchedBackup = shopController.backupsendinterval.firstWhereOrNull(
      (item) => item["name"] == backupName,
    );
    if (matchedBackup != null) {
      shopController.selectedbackupsendinterval.value = matchedBackup;
    }

    shopController.showbackupsettings.value = false;
    shopController.onlinesellingsettings.value = false;
    shopController.showReportssettings.value = false;
    showDangerZone.value = false;
  }

  final ReportsController reportsController = Get.find<ReportsController>();
  final PaymentController paymentController = Get.find<PaymentController>();
  final SalesController salesController = Get.find<SalesController>();
  final ShopController shopController = Get.find<ShopController>();

  final RxBool showDangerZone = false.obs;

  @override
  Widget build(BuildContext context) {
    return Helper(
      appBar: AppBar(
        titleSpacing: 0,
        elevation: 0,
        backgroundColor: Colors.white,
        centerTitle: true,
        title: Text(
          "Shop Settings",
          style: TextStyle(
            color: AppColors.mainColor,
            fontWeight: FontWeight.w700,
            fontSize: 17,
          ),
        ),
        leading: IconButton(
          onPressed: Get.back,
          icon: Icon(
            Icons.arrow_back_ios_new_rounded,
            color: AppColors.mainColor,
            size: 18,
          ),
        ),
      ),
      widget: Obx(
        () => ListView(
          padding: const EdgeInsets.all(12),
          children: [
            _buildHeaderCard(),
            const SizedBox(height: 10),
            _buildQuickActionCard(),
            const SizedBox(height: 10),
            _buildBackupSection(context),
            const SizedBox(height: 10),
            if (shopModel.warehouse == false) ...[
              _buildOnlineSellingSection(context),
              const SizedBox(height: 10),
            ],
            _buildReceiptSection(context),
            const SizedBox(height: 10),
            _buildDangerZone(context),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderCard() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        color: Colors.white,
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Container(
            height: 42,
            width: 42,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              color: AppColors.mainColor.withOpacity(0.10),
            ),
            child: Icon(
              Icons.storefront_outlined,
              color: AppColors.mainColor,
              size: 22,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  shopModel.name ?? "Shop",
                  style: const TextStyle(
                    fontSize: 15.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  "Manage main shop settings",
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionCard() {
    return _compactCard(
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () {
          Get.to(() => EditShopDetails(shopModel: shopModel));
        },
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              _smallIcon(Icons.tune_rounded),
              const SizedBox(width: 10),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "General Settings",
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13.5,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      "Edit shop details, tax, category and currency",
                      style: TextStyle(fontSize: 11.5, color: Colors.grey),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios_rounded, size: 14),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBackupSection(BuildContext context) {
    return _collapsibleSection(
      title: "Backup",
      subtitle: "Auto and manual backups",
      icon: Icons.backup_outlined,
      expanded: shopController.showbackupsettings.value,
      onTap: () {
        shopController.showbackupsettings.toggle();
      },
      child: Column(
        children: [
          _settingSwitchTile(
            title: "Allow Backup",
            subtitle: "Enable scheduled backup delivery",
            value: shopController.allowBackup.value,
            onChanged: (value) {
              shopModel.allowBackup = value;
              shopController.allowBackup.value = value;
              shopController.updateShop(
                shop: shopModel,
                allowBackup: value,
              );
            },
          ),
          if (shopController.allowBackup.isTrue) ...[
            const SizedBox(height: 10),
            _fieldLabel("Backup Email"),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: shopController.backupemail,
                    onChanged: (_) {
                      shopController.updateEmail.value = true;
                    },
                    decoration: _modernInputDecoration(
                      hint: "Enter backup email",
                      prefixIcon: Icons.email_outlined,
                    ),
                  ),
                ),
                if (shopController.updateEmail.isTrue) ...[
                  const SizedBox(width: 8),
                  InkWell(
                    onTap: () {
                      if (!validateEmail(
                          shopController.backupemail.text.trim())) {
                        generalAlert(
                          title: "Error",
                          message: "Please enter a valid email",
                        );
                        return;
                      }

                      shopController.updateShop(
                        shop: shopModel,
                        backupemail: shopController.backupemail.text.trim(),
                      );
                      shopController.updateEmail.value = false;
                      FocusScope.of(Get.context!).requestFocus(FocusNode());
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 13,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.mainColor,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        "Save",
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 10),
            _fieldLabel("Backup Interval"),
            const SizedBox(height: 6),
            TextFormField(
              readOnly: true,
              controller: TextEditingController(
                text: shopController.selectedbackupsendinterval["value"] ?? "",
              ),
              onTap: () => _showBackupIntervalDialog(context),
              decoration: _modernInputDecoration(
                hint: "Select interval",
                prefixIcon: Icons.watch_later_outlined,
                suffixIcon: Icons.keyboard_arrow_down_rounded,
              ),
            ),
            const SizedBox(height: 12),
            shopController.isBacking.isTrue
                ? const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Center(child: CircularProgressIndicator()),
                  )
                : SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () {
                        if (shopController.checkSubscription() == false) {
                          generalAlert(
                            title: "Error",
                            message:
                                "Please upgrade your shop subscription to download backup",
                            function: () {
                              Get.to(() => ExtendUsage());
                            },
                          );
                          return;
                        }

                        showDialog(
                          context: context,
                          builder: (_) => AlertDialog(
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            title: const Text("Backup Contents"),
                            content: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text("✅ Product Sales Report"),
                                const SizedBox(height: 5),
                                const Text("✅ Products Report"),
                                const SizedBox(height: 5),
                                const Text("✅ Customers"),
                                const SizedBox(height: 14),
                                SizedBox(
                                  width: double.infinity,
                                  child: ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.amber,
                                      foregroundColor: Colors.black,
                                      elevation: 0,
                                      padding: const EdgeInsets.symmetric(
                                        vertical: 13,
                                      ),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                    ),
                                    onPressed: () {
                                      shopController.backupNow(
                                        shopModel: shopModel,
                                      );
                                      Get.back();
                                    },
                                    child: const Text("Backup Now"),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                      icon: const Icon(Icons.download_rounded, size: 18),
                      label: const Text(
                        "Download Backup",
                        style: TextStyle(fontSize: 12.5),
                      ),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.black87,
                        side: BorderSide(color: Colors.grey.shade300),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
          ],
        ],
      ),
    );
  }

  Widget _buildOnlineSellingSection(BuildContext context) {
    return _collapsibleSection(
      title: "Online Selling",
      subtitle: "Selling options and location",
      icon: Icons.language_rounded,
      expanded: shopController.onlinesellingsettings.value,
      onTap: () {
        shopController.onlinesellingsettings.toggle();
      },
      child: Column(
        children: [
          _settingSwitchTile(
            title: "Allow Online Selling",
            subtitle: "Enable online selling for this shop",
            value: shopController.allowOnlineSelling.value,
            onChanged: (value) {
              shopModel.allowOnlineSelling = value;
              shopController.allowOnlineSelling.value = value;
              shopController.updateShop(
                shop: shopModel,
                allowOnlineSelling: value,
              );
            },
          ),
          if (shopController.allowOnlineSelling.isTrue) ...[
            const SizedBox(height: 10),
            InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () => _pickShopLocation(context),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  color: AppColors.mainColor.withOpacity(0.06),
                  border: Border.all(
                    color: AppColors.mainColor.withOpacity(0.20),
                  ),
                ),
                child: Row(
                  children: [
                    _smallIcon(Icons.location_on_outlined),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "Shop Location",
                            style: TextStyle(
                              fontSize: 11.5,
                              color: Colors.grey.shade700,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            shopController.shopLocation.value.isEmpty
                                ? "Tap to pick location"
                                : shopController.shopLocation.value,
                            style: const TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios_rounded, size: 14),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildReceiptSection(BuildContext context) {
    return _collapsibleSection(
      title: "Receipt Customization",
      subtitle: "Receipt details and contacts",
      icon: Icons.receipt_long_outlined,
      expanded: shopController.showReportssettings.value,
      onTap: () {
        shopController.showReportssettings.toggle();
      },
      child: Column(
        children: [
          _buildModernField(
            label: "Email",
            controller: shopController.emailController,
            keyboardType: TextInputType.emailAddress,
            icon: Icons.email_outlined,
          ),
          const SizedBox(height: 10),
          _buildModernField(
            label: "Contact",
            controller: shopController.contactController,
            keyboardType: TextInputType.phone,
            icon: Icons.phone_outlined,
          ),
          const SizedBox(height: 10),
          _buildModernField(
            label: "Mpesa Paybill / Till Number",
            controller: shopController.paybillTill,
            keyboardType: TextInputType.number,
            icon: Icons.payments_outlined,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          ),
          const SizedBox(height: 10),
          _buildModernField(
            label: "Paybill Account Number",
            controller: shopController.paybillAcc,
            keyboardType: TextInputType.number,
            icon: Icons.confirmation_number_outlined,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          ),
          const SizedBox(height: 10),
          _buildModernField(
            label: "Address",
            controller: shopController.address,
            icon: Icons.location_city_outlined,
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () async {
                try {
                  LoadingDialog.showLoadingDialog(
                    context: context,
                    title: "Updating Shop...",
                    key: salesController.keyLoader,
                  );

                  await ShopService().updateShop(shopModel.id!, {
                    "contact": shopController.contactController.text,
                    "paybill_till": shopController.paybillTill.text,
                    "paybill_account": shopController.paybillAcc.text,
                    "address_receipt": shopController.address.text,
                    "receiptemail": shopController.emailController.text,
                  });

                  Get.back();
                  Get.snackbar(
                    "Success",
                    "Receipt settings updated",
                    backgroundColor: Colors.green,
                    colorText: Colors.white,
                  );
                } catch (_) {
                  Get.back();
                }
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
                "Save Receipt Settings",
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 12.5,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDangerZone(BuildContext context) {
    return _collapsibleSection(
      title: "Danger Zone",
      subtitle: "Irreversible actions",
      icon: Icons.warning_amber_rounded,
      expanded: showDangerZone.value,
      iconColor: Colors.red.shade700,
      iconBgColor: Colors.red.shade50,
      borderColor: Colors.red.shade100,
      onTap: () {
        showDangerZone.toggle();
      },
      child: Column(
        children: [
          _dangerTile(
            title: "Delete Shop Data",
            subtitle: "Erase all shop data",
            onTap: () {
              deleteDialog(
                context: context,
                message:
                    "Are you sure you want to delete this shop data? This option is irreversible and it will erase all your shop data and you cannot recover it again.",
                onPressed: () async {
                  await shopController.deleteShopData(shop: shopModel);
                },
              );
            },
          ),
          const SizedBox(height: 10),
          _dangerTile(
            title: "Delete This Shop",
            subtitle: "Remove this shop completely",
            onTap: () {
              deleteDialog(
                context: context,
                message:
                    "Are you sure you want to delete this shop? This option is irreversible and it will erase all your shop data and you cannot recover it again.",
                onPressed: () async {
                  await shopController.deleteShop(shop: shopModel);
                },
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _collapsibleSection({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool expanded,
    required VoidCallback onTap,
    required Widget child,
    Color? iconColor,
    Color? iconBgColor,
    Color? borderColor,
  }) {
    return _compactCard(
      borderColor: borderColor,
      child: Column(
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  _smallIcon(
                    icon,
                    color: iconColor ?? AppColors.mainColor,
                    background:
                        iconBgColor ?? AppColors.mainColor.withOpacity(0.10),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          subtitle,
                          style: TextStyle(
                            fontSize: 11.5,
                            color: Colors.grey.shade700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    expanded
                        ? Icons.keyboard_arrow_up_rounded
                        : Icons.keyboard_arrow_down_rounded,
                    size: 20,
                    color: Colors.grey.shade700,
                  ),
                ],
              ),
            ),
          ),
          AnimatedCrossFade(
            duration: const Duration(milliseconds: 220),
            crossFadeState:
                expanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
            firstChild: const SizedBox.shrink(),
            secondChild: Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: child,
            ),
          ),
        ],
      ),
    );
  }

  Widget _compactCard({
    required Widget child,
    Color? borderColor,
  }) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: Colors.white,
        border: Border.all(color: borderColor ?? Colors.grey.shade200),
      ),
      child: child,
    );
  }

  Widget _smallIcon(
    IconData icon, {
    Color? color,
    Color? background,
  }) {
    return Container(
      height: 34,
      width: 34,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        color: background ?? AppColors.mainColor.withOpacity(0.10),
      ),
      child: Icon(
        icon,
        color: color ?? AppColors.mainColor,
        size: 18,
      ),
    );
  }

  Widget _settingSwitchTile({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
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
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 11.5,
                    color: Colors.grey.shade700,
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

  Widget _buildModernField({
    required String label,
    required TextEditingController controller,
    TextInputType keyboardType = TextInputType.text,
    List<TextInputFormatter>? inputFormatters,
    IconData? icon,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _fieldLabel(label),
        const SizedBox(height: 5),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          inputFormatters: inputFormatters,
          style: const TextStyle(fontSize: 12.5),
          decoration: _modernInputDecoration(
            hint: label,
            prefixIcon: icon,
          ),
        ),
      ],
    );
  }

  Widget _dangerTile({
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          color: Colors.white,
          border: Border.all(color: Colors.red.shade100),
        ),
        child: Row(
          children: [
            _smallIcon(
              Icons.delete_outline_rounded,
              color: Colors.red.shade700,
              background: Colors.red.shade50,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                      color: Colors.red.shade700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 11.5,
                      color: Colors.red.shade400,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.arrow_forward_ios_rounded,
              size: 13,
              color: Colors.red.shade400,
            ),
          ],
        ),
      ),
    );
  }

  Widget _fieldLabel(String text) {
    return Text(
      text,
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: Colors.black87,
      ),
    );
  }

  InputDecoration _modernInputDecoration({
    required String hint,
    IconData? prefixIcon,
    IconData? suffixIcon,
  }) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(
        color: Colors.grey.shade500,
        fontSize: 12,
      ),
      filled: true,
      fillColor: Colors.grey.shade50,
      isDense: true,
      prefixIcon: prefixIcon == null
          ? null
          : Icon(prefixIcon, color: Colors.grey.shade700, size: 18),
      suffixIcon: suffixIcon == null
          ? null
          : Icon(suffixIcon, color: Colors.grey.shade700, size: 18),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: 12,
        vertical: 12,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: Colors.grey.shade200),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: AppColors.mainColor.withOpacity(0.5)),
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: Colors.grey.shade200),
      ),
    );
  }

  Future<void> _showBackupIntervalDialog(BuildContext context) async {
    showDialog(
      context: context,
      builder: (_) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          title: const Text('Select Backup Interval'),
          content: SizedBox(
            width: double.maxFinite,
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: shopController.backupsendinterval.length,
              itemBuilder: (_, index) {
                final item = shopController.backupsendinterval[index];
                return ListTile(
                  dense: true,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  title: Text(
                    item["value"],
                    style: const TextStyle(fontSize: 13),
                  ),
                  onTap: () {
                    Navigator.pop(context);
                    shopController.selectedbackupsendinterval.value = item;
                    shopController.updateShop(
                      shop: shopModel,
                      backup: shopController.selectedbackupsendinterval["name"],
                    );
                  },
                );
              },
            ),
          ),
        );
      },
    );
  }

  Future<void> _pickShopLocation(BuildContext context) async {
    final Suggestion? result = await showSearch(
      context: context,
      delegate: AddressSearch("details"),
    );

    if (result == null) return;

    shopModel.location = result.description;
    shopController.reqionController.text = result.description;
    shopController.shopLocation.value = result.description;

    final locations = await locationFromAddress(result.description);

    shopController.updateShop(
      shop: shopModel,
      location: result.description,
      latitude: locations.first.latitude.toString(),
      longitude: locations.first.longitude.toString(),
    );

    shopController.shopLocation.refresh();
  }
}

bool validateEmail(String email) {
  return RegExp(
    r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$",
  ).hasMatch(email);
}

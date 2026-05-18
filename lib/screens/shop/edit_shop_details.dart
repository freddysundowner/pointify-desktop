import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:geocoding/geocoding.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/authcontroller.dart';
import 'package:pointify/controllers/homecontroller.dart';
import 'package:pointify/controllers/shopcontroller.dart';
import 'package:pointify/main.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/screens/shop/shop_address.dart';
import 'package:pointify/screens/shop/shop_cagories.dart';
import 'package:pointify/screens/shop/shops_page.dart';
import 'package:pointify/services/place_service.dart';
import 'package:pointify/services/shop_services.dart';
import 'package:pointify/utils/colors.dart';
import 'package:pointify/utils/constants.dart';
import 'package:pointify/widgets/alert.dart';
import 'package:pointify/widgets/shop_widget.dart';
import 'package:switcher_button/switcher_button.dart';

import '../../models/shop.dart';
import '../../models/shoptype.dart';

class EditShopDetails extends StatelessWidget {
  final Shop shopModel;

  EditShopDetails({super.key, required this.shopModel}) {
    shopController.warehouseemail.text = shopModel.warehouseemail ?? "";
    shopController.nameController.text = shopModel.name ?? "";
    shopController.businessController.text =
        shopModel.shopCategoryId?.name ?? "";
    shopController.tax.text = (shopModel.tax ?? 0.0).toString();
    shopController.reqionController.text = shopModel.location ?? "";
    shopController.currencyController.text = shopModel.currency ?? "";
    shopController.selectedCategory.value = shopModel.shopCategoryId;
    shopController.currency.value = shopModel.currency ?? "";
    shopController.allownegativesales.value =
        shopModel.allownegativeselling ?? false;
    shopController.allowbatchtracking.value =
        shopModel.allowbatchtracking ?? false;
    shopController.useWarehouse.value = shopModel.useWarehouse ?? false;
    shopController.productionEnabled.value = shopModel.production ?? false;

    showBusinessSetup.value = false;
    showStockSettings.value = true;
    showOperations.value = false;
    showWarehouseSettings.value = false;
  }

  final ShopController shopController = Get.find<ShopController>();
  final AuthController authController = Get.find<AuthController>();

  final RxBool showBusinessSetup = false.obs;
  final RxBool showStockSettings = true.obs;
  final RxBool showOperations = false.obs;
  final RxBool showWarehouseSettings = false.obs;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff7f8fa),
      appBar: AppBar(
        titleSpacing: 0,
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.white,
        leading: IconButton(
          onPressed: () {
            if (isSmallScreen(context)) {
              Get.back();
            } else {
              Get.find<HomeController>().selectedWidget.value = ShopsPage();
            }
          },
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            color: Colors.black87,
            size: 18,
          ),
        ),
        title: Text(
          shopModel.name ?? "Shop",
          style: const TextStyle(
            color: Colors.black,
            fontSize: 15,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 16),
          child: Column(
            children: [
              _buildBasicInfoSection(),
              const SizedBox(height: 10),
              if (shopModel.warehouse == false) ...[
                Obx(
                  () => _buildCollapsibleSection(
                    title: "Business Setup",
                    subtitle: "Category & location",
                    icon: Icons.store_mall_directory_outlined,
                    expanded: showBusinessSetup.value,
                    onTap: () => _toggleSection("business"),
                    child: _buildBusinessSetupContent(context),
                  ),
                ),
                const SizedBox(height: 10),
              ],
              Obx(
                () => _buildCollapsibleSection(
                  title: "Stock",
                  subtitle: "Selling & tracking",
                  icon: Icons.inventory_2_outlined,
                  expanded: showStockSettings.value,
                  onTap: () => _toggleSection("stock"),
                  child: _buildStockSettingsContent(),
                ),
              ),
              const SizedBox(height: 10),
              Obx(
                () => _buildCollapsibleSection(
                  title: "Operations",
                  subtitle: "Currency",
                  icon: Icons.settings_outlined,
                  expanded: showOperations.value,
                  onTap: () => _toggleSection("operations"),
                  child: _buildOperationsContent(context),
                ),
              ),
              if (shopModel.warehouse == true) ...[
                const SizedBox(height: 10),
                Obx(
                  () => _buildCollapsibleSection(
                    title: "Warehouse",
                    subtitle: "Production",
                    icon: Icons.warehouse_outlined,
                    expanded: showWarehouseSettings.value,
                    onTap: () => _toggleSection("warehouse"),
                    child: _buildWarehouseContent(),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              _buildSaveButton(),
            ],
          ),
        ),
      ),
    );
  }

  void _toggleSection(String section) {
    showBusinessSetup.value =
        section == "business" ? !showBusinessSetup.value : false;
    showStockSettings.value =
        section == "stock" ? !showStockSettings.value : false;
    showOperations.value =
        section == "operations" ? !showOperations.value : false;
    showWarehouseSettings.value =
        section == "warehouse" ? !showWarehouseSettings.value : false;
  }

  Widget _buildBasicInfoSection() {
    return _cardShell(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _sectionTitle("Basic Info"),
            const SizedBox(height: 10),
            shopWidget(
              controller: shopController.nameController,
              name: "Shop Name",
            ),
            const SizedBox(height: 10),
            _fieldLabel("Email"),
            const SizedBox(height: 6),
            TextFormField(
              controller: shopController.warehouseemail,
              style: const TextStyle(fontSize: 13),
              decoration: _inputDecoration(),
            ),
            if (shopModel.warehouse == false) ...[
              const SizedBox(height: 10),
              _fieldLabel("Tax"),
              const SizedBox(height: 6),
              TextFormField(
                controller: shopController.tax,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                style: const TextStyle(fontSize: 13),
                decoration: _inputDecoration(),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildBusinessSetupContent(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _fieldLabel("Business Type"),
        const SizedBox(height: 6),
        InkWell(
          onTap: () {
            if (isSmallScreen(context)) {
              Get.to(
                () => ShopCategories(
                  shopModel: shopModel,
                  page: "details",
                  selectedItemsCallback: (ShopTypes s) async {
                    Get.back();
                    shopController.selectedCategory.value = s;
                    shopController.selectedCategory.refresh();
                    await shopController.updateShop(shop: shopModel);
                  },
                ),
              );
            } else {
              Get.find<HomeController>().selectedWidget.value = ShopCategories(
                shopModel: shopModel,
                page: "details",
                selectedItemsCallback: (ShopTypes s) async {
                  Get.find<HomeController>().selectedWidget.value =
                      EditShopDetails(shopModel: shopModel);
                  shopController.selectedCategory.value = s;
                  shopController.selectedCategory.refresh();
                  await shopController.updateShop(shop: shopModel);
                },
              );
            }
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              border: Border.all(color: Colors.grey.shade300),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Obx(
                    () => Text(
                      shopController.selectedCategory.value == null
                          ? "Select business type"
                          : shopController.selectedCategory.value!.name ?? "",
                      style: const TextStyle(
                        fontSize: 13,
                        color: Colors.black87,
                      ),
                    ),
                  ),
                ),
                const Icon(Icons.arrow_forward_ios_rounded, size: 14),
              ],
            ),
          ),
        ),
        const SizedBox(height: 10),
        _fieldLabel("Location"),
        const SizedBox(height: 6),
        TextFormField(
          controller: shopController.reqionController,
          readOnly: true,
          style: const TextStyle(fontSize: 13),
          onTap: () async {
            final Suggestion? result = await showSearch(
              context: Get.context!,
              delegate: AddressSearch("sessionToken"),
            );
            if (result != null) {
              shopController.reqionController.text = result.description;
              locationFromAddress(result.description).then((value) {
                shopController.latitude.text = value.first.latitude.toString();
                shopController.longitude.text =
                    value.first.longitude.toString();
              });
            }
          },
          decoration: _inputDecoration(
            suffixIcon: const Icon(Icons.location_on_outlined, size: 18),
          ),
        ),
      ],
    );
  }

  Widget _buildStockSettingsContent() {
    return Column(
      children: [
        Obx(
          () => _buildSwitchTile(
            title: "Allow Negative Selling",
            subtitle: "Sell even when stock is below zero",
            value: shopController.allownegativesales.value,
            onChanged: (value) {
              generalAlert(
                title: "Are you sure?",
                message: value == false
                    ? "Switching off negative selling means you cannot sell items with negative stock."
                    : "By allowing negative selling, you can sell items even with negative stock.",
                function: () async {
                  shopModel.allownegativeselling = value;
                  shopController.allownegativesales.value = value;

                  await ShopService().updateShop(shopModel.id!, {
                    "allownegativeselling":
                        shopController.allownegativesales.value,
                  });

                  var response = await ShopService.getShop(shopModel.id!);
                  userController.currentUser.value?.primaryShop =
                      Shop.fromJson(response);
                  userController.currentUser.refresh();
                },
              );
            },
          ),
        ),
        const SizedBox(height: 8),
        Obx(
          () => _buildSwitchTile(
            title: "Allow Batch Tracking",
            subtitle: "Track stock in batches",
            value: shopController.allowbatchtracking.value,
            onChanged: (value) async {
              shopModel.allowbatchtracking = value;
              shopController.allowbatchtracking.value = value;

              await ShopService().updateShop(shopModel.id!, {
                "trackbatches": shopController.allowbatchtracking.value,
              });

              var response = await ShopService.getShop(shopModel.id!);
              userController.currentUser.value?.primaryShop =
                  Shop.fromJson(response);
              userController.currentUser.refresh();
            },
          ),
        ),
        const SizedBox(height: 8),
        Obx(
          () => Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Use warehouse to stock in?",
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Colors.black,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        "You must have created a warehouse to control stock in your shop.",
                        style: TextStyle(
                          fontSize: 11.5,
                          color: Colors.grey.shade700,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                SwitcherButton(
                  onChange: (value) {
                    shopController.useWarehouse.value = value;
                  },
                  onColor: AppColors.mainColor,
                  value: shopController.useWarehouse.value,
                  offColor: Colors.grey,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildOperationsContent(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _fieldLabel("Currency"),
        const SizedBox(height: 6),
        InkWell(
          onTap: () {
            showDialog(
              context: context,
              builder: (context) {
                return SimpleDialog(
                  children: List.generate(
                    Constants.currenciesData.length,
                    (index) => SimpleDialogOption(
                      onPressed: () {
                        shopController.currency.value =
                            Constants.currenciesData.elementAt(index);
                        Navigator.pop(context);
                      },
                      child: Text(Constants.currenciesData.elementAt(index)),
                    ),
                  ),
                );
              },
            );
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              border: Border.all(color: Colors.grey.shade300),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Obx(
                    () => Text(
                      shopController.currency.value,
                      style: const TextStyle(
                        color: Colors.black,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
                const Icon(Icons.arrow_drop_down),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildWarehouseContent() {
    return Column(
      children: [
        Obx(
          () => _buildSwitchTile(
            title: "Production Warehouse",
            subtitle: "Enable production mode for this warehouse",
            value: shopController.productionEnabled.value,
            onChanged: (value) async {
              shopController.productionEnabled.value = value;

              await ShopService().updateShop(shopModel.id!, {
                "production": shopController.productionEnabled.value,
              });

              var response = await ShopService.getShop(shopModel.id!);
              userController.currentUser.value?.primaryShop =
                  Shop.fromJson(response);
              userController.currentUser.refresh();
            },
          ),
        ),
      ],
    );
  }

  Widget _buildCollapsibleSection({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool expanded,
    required VoidCallback onTap,
    required Widget child,
  }) {
    return _cardShell(
      child: Column(
        children: [
          InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Container(
                    height: 34,
                    width: 34,
                    decoration: BoxDecoration(
                      color: AppColors.mainColor.withOpacity(0.10),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      icon,
                      size: 18,
                      color: AppColors.mainColor,
                    ),
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

  Widget _buildSwitchTile({
    required String title,
    required String subtitle,
    required bool value,
    required Function(bool) onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.black,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: Colors.grey.shade700,
                    fontSize: 11.5,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          CupertinoSwitch(
            value: value,
            activeColor: AppColors.mainColor,
            onChanged: (v) => onChanged(v),
          ),
        ],
      ),
    );
  }

  Widget _cardShell({required Widget child}) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: child,
    );
  }

  Widget _sectionTitle(String text) {
    return Text(
      text,
      style: const TextStyle(
        color: Colors.black,
        fontSize: 14.5,
        fontWeight: FontWeight.w700,
      ),
    );
  }

  Widget _fieldLabel(String text) {
    return Text(
      text,
      style: const TextStyle(
        color: Colors.black87,
        fontSize: 12,
        fontWeight: FontWeight.w600,
      ),
    );
  }

  InputDecoration _inputDecoration({
    String? hintText,
    Widget? suffixIcon,
  }) {
    return InputDecoration(
      hintText: hintText,
      hintStyle: TextStyle(
        color: Colors.grey.shade500,
        fontSize: 12,
      ),
      isDense: true,
      filled: true,
      fillColor: Colors.grey.shade50,
      suffixIcon: suffixIcon,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: 12,
        vertical: 12,
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: AppColors.mainColor),
      ),
    );
  }

  Widget _buildSaveButton() {
    return Obx(() {
      final bool loading = shopController.updateShopLoad.isTrue ||
          shopController.deleteShopLoad.isTrue;

      if (loading) {
        return const Center(child: CircularProgressIndicator());
      }

      return InkWell(
        splashColor: Colors.transparent,
        onTap: () async {
          await shopController.updateShop(shop: shopModel);

          await ShopService().updateShop(shopModel.id!, {
            "currency": shopController.currency.value,
            "useWarehouse": shopController.useWarehouse.value,
          });

          var response = await ShopService.getShop(shopModel.id!);
          userController.currentUser.value?.primaryShop =
              Shop.fromJson(response);
          userController.currentUser.refresh();

          Get.snackbar(
            "Success",
            "Shop details updated successfully",
            backgroundColor: Colors.green,
            colorText: Colors.white,
          );
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          width: double.infinity,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            color: AppColors.mainColor,
          ),
          child: const Center(
            child: Text(
              "Update Shop",
              style: TextStyle(
                color: Colors.white,
                fontSize: 14.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      );
    });
  }
}

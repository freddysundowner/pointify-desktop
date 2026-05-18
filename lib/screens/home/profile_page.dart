import 'dart:io';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:pointify/controllers/shopcontroller.dart';
import 'package:pointify/ios_ble_printer_page.dart';
import 'package:pointify/main.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/screens/profile/sms_settings_page.dart';
import 'package:pointify/screens/usage/extend_usage.dart';
import 'package:pointify/services/shop_services.dart';
import 'package:pointify/widgets/loading_dialog.dart';

import '../../controllers/homecontroller.dart';
import '../../printing_page.dart';
import '../../utils/colors.dart';
import '../../widgets/alert.dart';
import '../../widgets/delete_dialog.dart';
import '../../widgets/logout.dart';
import '../profile/profile_update.dart';

class ProfilePage extends StatelessWidget {
  ProfilePage({super.key});

  final ShopController createShopController = Get.find<ShopController>();

  bool get isAdmin => userController.currentUser.value?.usertype == "admin";

  final RxBool smsEnabled = false.obs;
  final TextEditingController smsSenderController = TextEditingController();
  final TextEditingController smsTemplateController = TextEditingController(
    text:
        "Hi {name}, thank you for your purchase at {shop}. Amount: {amount}. Receipt #{receipt}. View: {receipt_url}",
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff6f7fb),
      appBar: isAdmin
          ? null
          : AppBar(
              titleSpacing: 0,
              backgroundColor: const Color(0xfff6f7fb),
              elevation: 0,
              surfaceTintColor: const Color(0xfff6f7fb),
              leading: IconButton(
                onPressed: Get.back,
                icon: Icon(
                  Icons.arrow_back_ios_new_rounded,
                  color: AppColors.mainColor,
                  size: 18,
                ),
              ),
              title: const Text(
                "Profile",
                style: TextStyle(
                  color: Colors.black,
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
      body: SafeArea(
        child: Obx(
          () => userController.profileupdateLoading.value
              ? const Center(child: CircularProgressIndicator())
              : SingleChildScrollView(
                  padding: EdgeInsets.symmetric(
                    horizontal: isSmallScreen(context) ? 12 : 20,
                    vertical: 12,
                  ).copyWith(right: isSmallScreen(context) ? 12 : 50),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildProfileHeader(),
                      const SizedBox(height: 14),
                      _sectionLabel("Account"),
                      const SizedBox(height: 8),
                      _buildUserDetailsCard(),
                      const SizedBox(height: 14),
                      _sectionLabel("Settings"),
                      const SizedBox(height: 8),
                      _buildSettingsCard(context),
                      if (isSmallScreen(context)) ...[
                        const SizedBox(height: 14),
                        _buildLogoutCard(context),
                      ],
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
        ),
      ),
    );
  }

  Widget _buildProfileHeader() {
    final user = userController.currentUser.value;
    final String username =
        user?.username?.trim().isNotEmpty == true ? user!.username! : "User";
    final String email = user?.email ?? "";

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        color: Colors.white,
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            height: 56,
            width: 56,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              color: AppColors.mainColor.withOpacity(0.12),
            ),
            alignment: Alignment.center,
            child: Text(
              username.isNotEmpty ? username[0].toUpperCase() : "U",
              style: TextStyle(
                color: AppColors.mainColor,
                fontWeight: FontWeight.w700,
                fontSize: 22,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  username,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Colors.black,
                  ),
                ),
                if (email.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    email,
                    style: TextStyle(
                      fontSize: 12.5,
                      color: Colors.grey.shade700,
                    ),
                  ),
                ],
                const SizedBox(height: 6),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(30),
                  ),
                  child: Text(
                    isAdmin ? "Admin Account" : "User Account",
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey.shade700,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
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

  Widget _buildUserDetailsCard() {
    return _sectionCard(
      child: Column(
        children: [
          if (userController.currentUser.value?.email != null && isAdmin)
            _infoTile(
              icon: Icons.email_outlined,
              title: "Email",
              value: userController.currentUser.value?.email ?? "",
            ),
          if (userController.currentUser.value?.email != null &&
              userController.currentUser.value?.username != null)
            const SizedBox(height: 10),
          if (userController.currentUser.value?.username != null)
            _infoTile(
              icon: Icons.person_outline_rounded,
              title: "Username",
              value: userController.currentUser.value?.username ?? "",
            ),
        ],
      ),
    );
  }

  Widget _buildSettingsCard(BuildContext context) {
    return _sectionCard(
      child: Column(
        children: [
          _modernActionTile(
            title: "Edit Profile",
            subtitle: "Update your account details",
            icon: Icons.edit_outlined,
            onTap: () {
              if (isSmallScreen(context)) {
                Get.to(() => ProfileUpdate());
              } else {
                Get.find<HomeController>().selectedWidget.value =
                    ProfileUpdate();
              }
            },
          ),
          const SizedBox(height: 10),
          _modernActionTile(
            title: "Password Settings",
            subtitle: "Change your account password",
            icon: Icons.lock_outline_rounded,
            onTap: showPasswordResetDialog,
          ),
          if (isAdmin) const SizedBox(height: 10),
          if (isAdmin)
            _modernActionTile(
              title: "SMS Settings",
              subtitle: "Templates, sender name, credits and usage",
              icon: Icons.sms_outlined,
              onTap: () {
                Get.to(() => SmsSettingsPage());
              },
            ),
          const SizedBox(height: 10),
          _modernActionTile(
            title: "Connect BLE Printer",
            subtitle: "Pair a Bluetooth receipt printer",
            icon: Icons.print_outlined,
            onTap: () async {
              if (Platform.isIOS) {
                Get.to(() => const IosBlePrinterPage());
                return;
              }

              final bool allowed = await askPermissions();
              if (allowed) {
                Get.to(() => const BluetoothReceiptPrinter());
              }
            },
          ),
          if (isAdmin) ...[
            const SizedBox(height: 10),
            _modernActionTile(
              title: "Subscription Plans",
              subtitle: "View or upgrade your subscription",
              icon: Icons.subscriptions_outlined,
              onTap: () {
                Get.to(() => ExtendUsage());
              },
            ),
          ],
          const SizedBox(height: 10),
          _modernActionTile(
            title: "Check for Updates",
            subtitle: "See if a newer version is available",
            icon: Icons.system_update_alt_rounded,
            onTap: () async {
              LoadingDialog.showLoadingDialog(
                context: context,
                title: "Checking for updates",
                key: GlobalKey<State>(),
              );
              await authController.checkForUpdate(null);
              Get.back();
            },
          ),
          if (isAdmin) ...[
            const SizedBox(height: 14),
            _dangerActionTile(
              title: "Delete Account",
              subtitle: "Permanently remove your account and all related data",
              onTap: () {
                deleteDialog(
                  context: context,
                  message:
                      "This action will delete all products, customers, suppliers, sales, purchases and everything else related to your account, do you want to proceed?",
                  onPressed: () {
                    userController.deleteAccount();
                  },
                );
              },
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildLogoutCard(BuildContext context) {
    return _sectionCard(
      child: _modernActionTile(
        title: "Logout",
        subtitle: "Sign out of your account",
        icon: Icons.logout_rounded,
        onTap: () {
          logoutAccountDialog(context);
        },
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

  Widget _infoTile({
    required IconData icon,
    required String title,
    required String value,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: Colors.grey.shade50,
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 36,
            width: 36,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              color: AppColors.mainColor.withOpacity(0.10),
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
                  style: TextStyle(
                    fontSize: 11.5,
                    color: Colors.grey.shade700,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: Colors.black,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _modernActionTile({
    required String title,
    required String subtitle,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          color: Colors.grey.shade50,
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Row(
          children: [
            Container(
              height: 38,
              width: 38,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: AppColors.mainColor.withOpacity(0.10),
              ),
              child: Icon(
                icon,
                color: AppColors.mainColor,
                size: 19,
              ),
            ),
            const SizedBox(width: 12),
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
            const SizedBox(width: 8),
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

  Widget _dangerActionTile({
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          color: Colors.red.shade50,
          border: Border.all(color: Colors.red.shade100),
        ),
        child: Row(
          children: [
            Container(
              height: 38,
              width: 38,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: Colors.red.shade100,
              ),
              child: Icon(
                Icons.delete_outline_rounded,
                color: Colors.red.shade700,
                size: 19,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: Colors.red.shade700,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 11.5,
                      color: Colors.red.shade400,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.arrow_forward_ios_rounded,
              size: 15,
              color: Colors.red.shade300,
            ),
          ],
        ),
      ),
    );
  }

  void showPasswordResetDialog() {
    showDialog(
      context: Get.context!,
      builder: (_) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          titlePadding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
          contentPadding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
          title: const Text(
            "Change Password",
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
            ),
          ),
          content: SizedBox(
            width: 420,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _passwordField(
                  label: "New Password",
                  controller: userController.passwordController,
                ),
                const SizedBox(height: 12),
                _passwordField(
                  label: "Confirm Password",
                  controller: userController.confirmPassword,
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Get.back(),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 13),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          side: BorderSide(color: Colors.grey.shade300),
                        ),
                        child: Text(
                          "Cancel",
                          style: TextStyle(color: Colors.grey.shade800),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () async {
                          final String password =
                              userController.passwordController.text.trim();
                          final String confirm =
                              userController.confirmPassword.text.trim();

                          if (password.isEmpty || confirm.isEmpty) {
                            generalAlert(
                              message: "please fill all the fields",
                              title: "Error",
                            );
                            return;
                          }

                          if (password != confirm) {
                            generalAlert(
                              message: "Password mismatched",
                              title: "Error",
                            );
                            return;
                          }

                          if (password.length < 6) {
                            generalAlert(
                              title: "Error",
                              message:
                                  "Password must be more than 6 characters",
                            );
                            return;
                          }

                          authController.showPassword.value = true;
                          Get.back();
                          await userController.profileUpdate();
                          userController.passwordController.clear();
                          userController.confirmPassword.clear();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.mainColor,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 13),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: const Text(
                          "Update",
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void showSmsSettingsDialog() {
    showDialog(
      context: Get.context!,
      builder: (_) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          titlePadding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
          contentPadding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
          title: const Text(
            "SMS Settings",
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
            ),
          ),
          content: SizedBox(
            width: 460,
            child: Obx(
              () => Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _smsSwitchTile(),
                  const SizedBox(height: 14),
                  _dialogFieldLabel("Sender Name"),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: smsSenderController,
                    enabled: smsEnabled.value,
                    decoration: _dialogInputDecoration(
                      hintText: "e.g Pointify",
                    ),
                  ),
                  const SizedBox(height: 12),
                  _dialogFieldLabel("SMS Template"),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: smsTemplateController,
                    enabled: smsEnabled.value,
                    maxLines: 4,
                    decoration: _dialogInputDecoration(
                      hintText:
                          "Hi {name}, thank you for your purchase of {amount}. Receipt #{receipt}.",
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
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Get.back(),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            side: BorderSide(color: Colors.grey.shade300),
                          ),
                          child: Text(
                            "Cancel",
                            style: TextStyle(color: Colors.grey.shade800),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () async {
                            // Replace this with your real save logic
                            // Example:
                            await ShopService().updateShop(
                                userController
                                    .currentUser.value!.primaryShop!.id!,
                                {
                                  "saleSmsEnabled": smsEnabled.value,
                                  "saleSmsSender":
                                      smsSenderController.text.trim(),
                                  "saleSmsTemplate":
                                      smsTemplateController.text.trim(),
                                });

                            Get.back();
                            Get.snackbar(
                              "Success",
                              "SMS settings updated",
                              backgroundColor: Colors.green,
                              colorText: Colors.white,
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.mainColor,
                            foregroundColor: Colors.white,
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          child: const Text(
                            "Save",
                            style: TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _smsSwitchTile() {
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
                const Text(
                  "Send SMS after sale",
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: Colors.black,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  "Automatically send a custom SMS when a sale is completed",
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
            value: smsEnabled.value,
            activeColor: AppColors.mainColor,
            onChanged: (value) {
              smsEnabled.value = value;
            },
          ),
        ],
      ),
    );
  }

  Widget _passwordField({
    required String label,
    required TextEditingController controller,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
            color: Colors.black87,
          ),
        ),
        const SizedBox(height: 6),
        Obx(
          () => TextFormField(
            controller: controller,
            obscureText: authController.showPassword.value,
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.grey.shade50,
              isDense: true,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 13),
              suffixIcon: InkWell(
                onTap: () {
                  authController.showPassword.value =
                      !authController.showPassword.value;
                },
                child: Icon(
                  authController.showPassword.value
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                  size: 20,
                ),
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
            ),
          ),
        ),
      ],
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

  Future<bool> askPermissions() async {
    final PermissionStatus locationStatus = await Permission.location.status;

    if (locationStatus.isDenied) {
      final Map<Permission, PermissionStatus> statuses = await [
        Permission.location,
        Permission.bluetoothScan,
        Permission.bluetoothAdvertise,
        Permission.bluetoothConnect,
      ].request();

      return statuses[Permission.location]!.isGranted &&
          statuses[Permission.bluetoothScan]!.isGranted &&
          statuses[Permission.bluetoothAdvertise]!.isGranted &&
          statuses[Permission.bluetoothConnect]!.isGranted;
    }

    return true;
  }
}

import 'dart:math';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/shopcontroller.dart';
import 'package:pointify/controllers/usercontroller.dart';
import 'package:pointify/main.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/utils/helper.dart';
import 'package:pointify/widgets/loading_dialog.dart';
import 'package:switcher_button/switcher_button.dart';

import '../../../../utils/colors.dart';
import '../../../controllers/homecontroller.dart';
import '../../../models/usermodel.dart';
import '../../../widgets/alert.dart';
import '../../../widgets/attendant_user_inputs.dart';
import '../../../widgets/delete_dialog.dart';
import '../../../widgets/major_title.dart';
import '../../../widgets/minor_title.dart';
import 'attendants_page.dart';

class AttendantDetails extends StatelessWidget {
  final UserModel? userModel;

  AttendantDetails({
    super.key,
    required this.userModel,
  }) {
    if (userModel != null) {
      userController.nameController.text = userModel!.username ?? "";

      userController.attendantId.text = userModel!.uniqueDigits.toString();

      userController.getRoles(userModel!);
    } else {
      userController.attendantId.text = Random().nextInt(30000).toString();
    }
  }

  final ShopController shopController = Get.find<ShopController>();

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
            if (isSmallScreen(context)) {
              Get.back();
            } else {
              Get.find<HomeController>().selectedWidget.value =
                  AttendantsPage();
            }
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
              userModel == null ? "New Attendant" : userModel?.username ?? "",
              style: const TextStyle(
                color: Colors.black,
                fontWeight: FontWeight.w800,
                fontSize: 18,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              userModel == null
                  ? "Create shop attendant"
                  : "Manage attendant account",
              style: TextStyle(
                color: Colors.grey.shade600,
                fontSize: 11,
              ),
            ),
          ],
        ),
        actions: [
          if (userModel != null && isSmallScreen(context))
            Padding(
              padding: const EdgeInsets.only(
                right: 14,
              ),
              child: InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () {
                  deleteDialog(
                    context: context,
                    onPressed: () {
                      userController.deleteAttendant(
                        userModel: userModel,
                      );
                    },
                  );
                },
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.delete_outline,
                    color: Colors.red.shade700,
                    size: 20,
                  ),
                ),
              ),
            ),
        ],
      ),
      bottomNavigationBar: _buildBottomBar(context),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(
              maxWidth: 650,
            ),
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(
                16,
                12,
                16,
                120,
              ),
              child: Column(
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(
                        color: Colors.grey.shade200,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: AppColors.mainColor.withOpacity(.08),
                                borderRadius: BorderRadius.circular(
                                  16,
                                ),
                              ),
                              child: Icon(
                                Icons.person_outline,
                                color: AppColors.mainColor,
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    userModel == null
                                        ? "New Attendant"
                                        : userModel?.username ?? "",
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    "Manage account access",
                                    style: TextStyle(
                                      color: Colors.grey.shade600,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        attendantUserInputs(
                          name: "Username",
                          controller: userController.nameController,
                        ),
                        const SizedBox(height: 18),
                        if (userModel == null) ...[
                          _fieldLabel("Password"),
                          const SizedBox(height: 8),
                          TextFormField(
                            controller: userController.passwordController,
                            obscureText: true,
                            decoration: _modernInputDecoration(
                              hint: "Enter password",
                              icon: Icons.lock_outline,
                            ),
                          ),
                          const SizedBox(height: 18),
                        ],
                        attendantUserInputs(
                          name: "User ID",
                          controller: userController.attendantId,
                          enabled: false,
                        ),
                        const SizedBox(height: 20),
                        if (userModel != null)
                          InkWell(
                            borderRadius: BorderRadius.circular(16),
                            onTap: () {
                              _showPasswordDialog(context);
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 14,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.mainColor.withOpacity(.05),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.lock_reset,
                                    color: AppColors.mainColor,
                                    size: 20,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      "Reset Password",
                                      style: TextStyle(
                                        color: AppColors.mainColor,
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
                          ),
                        if (userModel != null) ...[
                          const SizedBox(height: 14),
                          InkWell(
                            borderRadius: BorderRadius.circular(16),
                            onTap: () {
                              Get.to(
                                () => Permissions(
                                  userModel: userModel,
                                ),
                              );
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 14,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade50,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.admin_panel_settings_outlined,
                                    color: AppColors.mainColor,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          "Permissions",
                                          style: TextStyle(
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          "Roles and access control",
                                          style: TextStyle(
                                            color: Colors.grey.shade600,
                                            fontSize: 11,
                                          ),
                                        ),
                                      ],
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
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBottomBar(BuildContext context) {
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
              offset: const Offset(0, -3),
            ),
          ],
        ),
        child: SizedBox(
          height: 54,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              elevation: 0,
              backgroundColor: AppColors.mainColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            onPressed: () async {
              if (userModel == null) {
                Get.to(
                  () => Permissions(),
                );
              } else {
                await userController.updateAttendant(
                  userModel: userModel!,
                  type: "other",
                );
              }
            },
            child: Text(
              userModel == null ? "Continue" : "Update Attendant",
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 15,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _fieldLabel(String text) {
    return Text(
      text,
      style: TextStyle(
        fontWeight: FontWeight.w700,
        color: Colors.grey.shade700,
      ),
    );
  }

  InputDecoration _modernInputDecoration({
    required String hint,
    required IconData icon,
  }) {
    return InputDecoration(
      hintText: hint,
      prefixIcon: Icon(icon),
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(
          color: Colors.grey.shade300,
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(
          color: AppColors.mainColor,
        ),
      ),
    );
  }

  void _showPasswordDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
          title: const Text(
            "Reset Password",
            style: TextStyle(
              fontWeight: FontWeight.w800,
            ),
          ),
          content: TextFormField(
            controller: userController.passwordController,
            obscureText: true,
            decoration: _modernInputDecoration(
              hint: "Enter new password",
              icon: Icons.lock_outline,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Get.back();
              },
              child: Text(
                "Cancel",
                style: TextStyle(
                  color: Colors.grey.shade700,
                ),
              ),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                elevation: 0,
                backgroundColor: AppColors.mainColor,
              ),
              onPressed: () async {
                if (userController.passwordController.text.length < 6) {
                  generalAlert(
                    title: "Error",
                    message: "Password must be at least 6 characters",
                  );

                  return;
                }

                await userController.updateAttendant(
                  userModel: userModel!,
                  type: "other",
                );
              },
              child: const Text(
                "Update",
                style: TextStyle(
                  color: Colors.white,
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class Permissions extends StatelessWidget {
  final UserModel? userModel;

  Permissions({super.key, this.userModel});
  final UserController userController = Get.find<UserController>();

  itemRow({required String key, required data, required catId}) {
    var permission = userController.permissions[catId];

    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: Row(
        children: <Widget>[
          majorTitle(
              title: key.capitalize!.replaceAll("_", " "),
              color: Colors.black,
              size: 14.0),
          const Spacer(),
          Obx(
            () => SwitcherButton(
              onColor: AppColors.mainColor,
              offColor: Colors.grey,
              size: 40,
              value: userController.roles
                      .where((p0) => p0["key"] == permission["key"])
                      .toList()
                      .isNotEmpty &&
                  userController.roles
                      .where((p0) => p0["key"] == permission["key"])
                      .toList()[0]["value"]
                      .contains(key),
              onChange: (value) {
                String keyy = userController.permissions[catId]["key"];
                int i = userController.roles
                    .indexWhere((element) => element["key"] == keyy);
                if (i != -1) {
                  if (value == false) {
                    int ii = userController.roles[i]["value"]
                        .indexWhere((element) => element == key);
                    if (ii != -1) {
                      userController.roles[i]["value"].removeAt(ii);
                    }
                    if ((userController.roles[i]["value"] as List).isEmpty) {
                      userController.roles.removeAt(i);
                    }
                  } else {
                    userController.roles[i]["value"].add(key);
                  }
                } else {
                  var role = {
                    "key": keyy,
                    "value": [key]
                  };
                  print(role);
                  userController.roles.addAll([role]);
                }
              },
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    userController.permissions = RxList([
      {
        "key": "pos",
        "value": [
          "set_sale_date",
          'can_sell',
          'can_sell_to_dealer_&_wholesaler',
          'discount',
          "edit_price",
        ],
      },
      {
        "key": "stocks",
        "value": [
          'view_products',
          'add_products',
          "view_buying_price",
          'stock_summary',
          'view_purchases',
          'add_purchases',
          'stock_count',
          'badstock',
          'transfer',
          'return',
          'delete_purchase_invoice',
        ],
      },
      {
        "key": "products",
        "value": [
          'edit',
          'delete',
          'add',
          "adjust_stock",
          "view_adjustment_history"
        ],
      },
      {
        "key": "sales",
        "value": ['view_sales', "return", "delete", "view_profit"],
      },
      {
        "key": "reports",
        "value": [
          'sales',
          "dues",
          "productsales",
          "discoutedsales",
          "debtors",
          "purchases",
          "expenses",
          "stocktake",
          "netprofit",
          'stockreport',
          "productmovement",
          "profitanalysis"
        ],
      },
      {
        "key": "purchases",
        "value": ['edit_buying_price'],
      },
      {
        "key": "accounts",
        "value": [
          'cashflow',
        ],
      },
      {
        "key": "expenses",
        "value": [
          'manage',
        ],
      },
      {
        "key": "suppliers",
        "value": ['manage']
      },
      {
        "key": "customers",
        "value": ['manage', 'deposit']
      },
      {
        "key": 'shop',
        "value": ["manage", "switch"],
      },
      {
        "key": 'attendants',
        "value": ["manage", "view"],
      },
      {
        "key": 'usage',
        "value": ["manage"],
      },
      {
        "key": 'support',
        "value": ["manage"],
      },
    ]);

    if (userController.currentUser.value!.primaryShop!.production == true) {
      userController.permissions.add({
        "key": 'production',
        "value": [
          "delete",
          "change_status",
          "edit",
          "adjust_stock",
          'view_adjustment_history'
        ],
      });
    }
    if (userController.currentUser.value!.primaryShop!.warehouse == true) {
      userController.permissions.add(
        {
          "key": "warehouse",
          "value": [
            'invoice_delete',
            "show_buying_price",
            "show_available_stock",
            "view_buying_price",
            "create_orders",
            "view_orders",
            "return",
            "accept_warehouse_orders"
          ],
        },
      );
    }

    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.mainColor,
        leading: IconButton(
            onPressed: () {
              Get.back();
            },
            icon: Icon(
              Icons.arrow_back_ios,
              color: Colors.white,
            )),
        title: Text(
          "Permissions",
          style: TextStyle(color: Colors.white),
        ),
        elevation: 0.2,
      ),
      body: Obx(
        () => ListView.builder(
          itemCount: userController.permissions.length,
          itemBuilder: (c, ii) {
            var role = userController.permissions[ii];
            var title = role["key"];
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                InkWell(
                  onTap: () {
                    if (userController.activePermission.value == title) {
                      userController.activePermission.value = "";
                    } else {
                      userController.activePermission.value = title;
                    }
                    userController.activePermission.refresh();
                  },
                  child: Container(
                    margin: const EdgeInsets.only(
                        bottom: 10, top: 10, left: 20, right: 20),
                    child: Row(
                      children: [
                        Text(title.toString().toUpperCase()),
                        const Spacer(),
                        const Icon(Icons.arrow_forward_ios_rounded)
                      ],
                    ),
                  ),
                ),
                const Divider(),
                Obx(() => userController.activePermission.value != role["key"]
                    ? Container()
                    : Container(
                        height: double.parse(
                                (role["value"] as List).length.toString()) *
                            35,
                        margin: const EdgeInsets.only(left: 20),
                        child: ListView.builder(
                            itemCount: (role["value"] as List).length,
                            itemBuilder: (c, i) {
                              var p = role["value"][i];
                              return itemRow(
                                  key: p, data: role["value"], catId: ii);
                            }),
                      ))
              ],
            );
          },
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          height: 50,
          margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 20),
          child: Obx(
            () => userController.profileupdateLoading.isTrue
                ? const Center(
                    child: CircularProgressIndicator(),
                  )
                : InkWell(
                    splashColor: Colors.transparent,
                    onTap: () async {
                      var all = [];
                      for (var element in userController.roles) {
                        all.add(
                            {"key": element["key"], "value": element["value"]});
                      }
                      if (userModel == null) {
                        await userController.createAttendant(all);
                      } else {
                        await userController.updateAttendant(
                            userModel: userModel!,
                            permissions: all,
                            type: "permissions");
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      width: double.infinity,
                      decoration: BoxDecoration(
                          border:
                              Border.all(width: 3, color: AppColors.mainColor),
                          borderRadius: BorderRadius.circular(40)),
                      child: Center(
                          child: majorTitle(
                              title: "Update Changes",
                              color: AppColors.mainColor,
                              size: 18.0)),
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}

import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/productcontroller.dart';
import 'package:pointify/controllers/reports_controller.dart';
import 'package:pointify/controllers/shopcontroller.dart';
import 'package:pointify/controllers/usercontroller.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/main.dart';
import 'package:pointify/reports/expenses/expense_page.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/screens/home/profile_page.dart';
import 'package:pointify/screens/home/widgets/inventory_insights_section.dart';
import 'package:pointify/screens/usage/inapppurchases_screen.dart';
import 'package:pointify/screens/warehouse/invoices.dart';
import 'package:pointify/widgets/snackBars.dart';

import '../../controllers/authcontroller.dart';
import '../../controllers/expensecontroller.dart';
import '../../controllers/salescontroller.dart';
import '../../controllers/warehousecontroller.dart';
import '../../models/wahoureinvoice.dart';
import '../../reports/net_profit_report.dart';
import '../../reports/reports.dart';
import '../../reports/sales/sales_report.dart';
import '../../utils/colors.dart';
import '../../utils/helper.dart';
import '../../widgets/major_title.dart';
import '../../widgets/minor_title.dart';
import '../../widgets/normal_text.dart';
import '../../widgets/shop_list_bottomsheet.dart';
import '../cash_flow/cash_flow_manager.dart';
import '../customers/customers_page.dart';
import '../discover/shop_tags.dart';
import '../product/products_page.dart';
import '../sales/all_sales.dart';
import '../sales/create_sale.dart';
import '../stock/stock_page.dart';
import '../suppliers/suppliers_page.dart';
import '../usage/extend_usage.dart';
import '../usage/share_and_use.dart';
import '../warehouse/widgets/wh_invoice_card.dart';

class HomePage extends StatelessWidget {
  HomePage({Key? key}) : super(key: key);

  final ShopController shopController = Get.find<ShopController>();
  final ReportsController reportsController = Get.put(ReportsController());
  final SalesController salesController = Get.put(SalesController());
  final ExpenseController expenseController = Get.put(ExpenseController());
  final UserController attendantController = Get.put(UserController());
  final AuthController authController = Get.find<AuthController>();
  final ProductController productController = Get.find<ProductController>();
  final DateTime now = DateTime.now();
  WareHouseController wareHouseController = Get.put(WareHouseController());

  getData() async {
    if (userController.currentUser.value == null) return;
    authController.initUser();
    isConnected().then((value) {
      userController.internetConected.value = value;
    });
  }

  getAllowedTabs() {
    List<Map<String, dynamic>> enterpriseOperations = [
      {
        "title":
            userController.currentUser.value!.primaryShop!.production == true
                ? "Invoices"
                : "Invoices",
        "icon": Icons.sell_rounded,
        "category": "whinvoices",
        "isWarehouse": true,
        "production": userController.currentUser.value!.primaryShop!.production!
      },
      {"title": "POS", "icon": Icons.sell_rounded, "category": "pos"},
      {
        "title": "Stock",
        "icon": Icons.production_quantity_limits,
        "category": "stocks",
        "both": true
      },
      {
        "title": "Sales & Orders",
        "icon": Icons.production_quantity_limits,
        "category": "sales"
      },
      {
        "title": "Suppliers",
        "icon": Icons.people_alt,
        "category": "suppliers",
        "both": true
      },
      {
        "title": "Customers",
        "icon": Icons.people_outline_outlined,
        "category": "customers"
      },
      {
        "title": "Reports",
        "icon": Icons.data_usage,
        "category": "reports",
        "both": true
      },
      {
        "title": "Cashflow",
        "icon": Icons.request_quote_outlined,
        "category": "accounts"
      },
    ];
    if (userController.currentUser.value?.usertype == "admin") {
      if (userController.currentUser.value?.primaryShop?.warehouse == true ||
          userController.currentUser.value?.primaryShop?.production == true) {
        if (userController.currentUser.value?.primaryShop?.production == true) {
          var warehouseTabs = enterpriseOperations
              .where((element) =>
                  element['isWarehouse'] == true ||
                  element['both'] == true ||
                  element['production'] == true)
              .toList();
          return warehouseTabs;
        } else {
          var warehouseTabs = enterpriseOperations
              .where((element) =>
                  element['isWarehouse'] == true || element['both'] == true)
              .toList();
          return warehouseTabs;
        }
      }
      return enterpriseOperations
          .where((element) =>
              element['isWarehouse'] == false ||
              element['both'] == true ||
              element['isWarehouse'] == null)
          .toList();
    }
    Set<dynamic> categorySet =
        userController.roles.map((e) => e['key']).toSet();

    List all = [];
    for (var obj in enterpriseOperations) {
      if (categorySet.contains(obj['category'])) {
        all.add(obj);
      }
    }
    return all;
  }

  var filterOptions = ["All", "Pending", "Processed", "Void"];

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {
        await shopController.getShops();
        getData();
      },
      child: Scaffold(
          appBar: userController.currentUser.value?.usertype == "admin"
              ? null
              : AppBar(
                  titleSpacing: 0.0,
                  leading: Icon(
                    Icons.electric_bolt,
                    color: AppColors.mainColor,
                  ),
                  title: Row(
                    children: [
                      Obx(
                        () => majorTitle(
                            title:
                                "Welcome ${userController.currentUser.value?.username}",
                            color: Colors.black,
                            size: 16.0),
                      ),
                      const Spacer(),
                      InkWell(
                        onTap: () async {
                          Get.to(() => ProfilePage());
                        },
                        child: Icon(
                          Icons.account_circle_rounded,
                          color: AppColors.mainColor,
                          size: 30,
                        ),
                      ),
                      const SizedBox(
                        width: 20,
                      )
                    ],
                  ),
                  elevation: 0.2,
                  backgroundColor: Colors.white,
                ),
          body: SingleChildScrollView(
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              child: Obx(
                () => userController.isAttendannt() &&
                        userController.currentUser.value!.permisions!.isEmpty
                    ? Column(
                        children: [
                          const Text("No Permissions yet to do anything"),
                          IconButton(
                              onPressed: () async {
                                await shopController.getShops();
                                getData();
                              },
                              icon: const Icon(
                                Icons.refresh,
                                color: Colors.red,
                              )),
                        ],
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (!userController.isAttendannt())
                            Obx(
                              () => userController
                                          .currentUser.value?.emailVerified ==
                                      false
                                  ? Container(
                                      padding: const EdgeInsets.symmetric(
                                          vertical: 10, horizontal: 20),
                                      decoration: BoxDecoration(
                                        color: Colors.red,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Center(
                                        child: Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceBetween,
                                          children: [
                                            Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              mainAxisAlignment:
                                                  MainAxisAlignment.start,
                                              children: [
                                                const Text(
                                                  "Verify Your email",
                                                  style: TextStyle(
                                                      color: Colors.white),
                                                ),
                                                Text(
                                                  "You have ${DateTime.parse(userController.currentUser.value?.emailVerificationDate ?? DateTime.now().toString()).add(const Duration(days: 1)).difference(DateTime(now.year, now.month, now.day)).inDays} days to verify your email",
                                                  style: const TextStyle(
                                                      color: Colors.white,
                                                      fontSize: 11),
                                                ),
                                              ],
                                            ),
                                            InkWell(
                                              onTap: () {
                                                userController
                                                    .sendVerificationEmail();
                                              },
                                              child: Container(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                        horizontal: 10,
                                                        vertical: 4),
                                                decoration: BoxDecoration(
                                                  color: Colors.white,
                                                  borderRadius:
                                                      BorderRadius.circular(50),
                                                ),
                                                child: const Text(
                                                  "Verify now",
                                                  style: TextStyle(
                                                      color: Colors.red),
                                                ),
                                              ),
                                            )
                                          ],
                                        ),
                                      ),
                                    )
                                  : userController
                                              .currentUser.value?.usertype ==
                                          ""
                                      ? Container()
                                      : Container(),
                            ),
                          const SizedBox(
                            height: 10,
                          ),
                          Obx(() => userController.internetConected.isFalse
                              ? Container(
                                  padding: const EdgeInsets.symmetric(
                                      vertical: 10, horizontal: 20),
                                  decoration: BoxDecoration(
                                    color: Colors.red,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Center(
                                    child: Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          "You have no internet connection",
                                          style: TextStyle(color: Colors.white),
                                        ),
                                        Icon(Icons.wifi_off,
                                            color: Colors.white)
                                      ],
                                    ),
                                  ),
                                )
                              : Container()),
                          Obx(
                            () => shopController.checkSubscription() == false
                                ? Container(
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 10, horizontal: 20),
                                    decoration: BoxDecoration(
                                      color: Colors.red,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Center(
                                      child: Obx(
                                        () => Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceBetween,
                                          children: [
                                            if (shopController.checkIfTrial())
                                              Column(
                                                crossAxisAlignment:
                                                    CrossAxisAlignment.center,
                                                mainAxisAlignment:
                                                    shopController
                                                            .checkIfTrial()
                                                        ? MainAxisAlignment
                                                            .spaceBetween
                                                        : MainAxisAlignment
                                                            .start,
                                                children: [
                                                  const Text(
                                                    "Your trial period has expired",
                                                    style: TextStyle(
                                                        color: Colors.white),
                                                  ),
                                                  if (shopController
                                                          .checkDaysRemaining() >
                                                      0)
                                                    Text(
                                                      "${shopController.checkDaysRemaining()} days remaining",
                                                      style: const TextStyle(
                                                          color: Colors.white,
                                                          fontSize: 11),
                                                    ),
                                                ],
                                              ),
                                            if (!shopController.checkIfTrial())
                                              const Text(
                                                "Your subscription has expired",
                                                style: TextStyle(
                                                    color: Colors.white),
                                              ),
                                            InkWell(
                                              onTap: () {
                                                if (Platform.isIOS) {
                                                  Get.to(() =>
                                                      InAppPurchasesScreen());
                                                } else {
                                                  Get.to(() => ExtendUsage());
                                                }
                                              },
                                              child: Container(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                        horizontal: 10,
                                                        vertical: 4),
                                                decoration: BoxDecoration(
                                                  color: Colors.white,
                                                  borderRadius:
                                                      BorderRadius.circular(50),
                                                ),
                                                child: const Text(
                                                  "Upgrade now",
                                                  style: TextStyle(
                                                      color: Colors.red),
                                                ),
                                              ),
                                            )
                                          ],
                                        ),
                                      ),
                                    ),
                                  )
                                : userController.currentUser.value?.usertype ==
                                        ""
                                    ? Container()
                                    : Container(),
                          ),
                          Row(
                            children: [
                              majorTitle(
                                  title: "Current Shop",
                                  color: Colors.black,
                                  size: 20.0),
                              const SizedBox(
                                width: 5,
                              ),
                              majorTitle(
                                  title: shopController.checkSubscription() ==
                                          false
                                      ? "Expired"
                                      : "Active",
                                  color: shopController.checkSubscription()
                                      ? Colors.green
                                      : Colors.red,
                                  size: 10.0),
                              if (userController.currentUser.value?.usertype ==
                                  "attendant")
                                const Spacer(),
                              if (userController.currentUser.value?.usertype ==
                                  "attendant")
                                IconButton(
                                    onPressed: () async {
                                      try {
                                        showDialog(
                                            context: context,
                                            builder: (_) {
                                              return const AlertDialog(
                                                content: Row(
                                                  children: [
                                                    CircularProgressIndicator(),
                                                    Padding(
                                                      padding:
                                                          EdgeInsets.all(8.0),
                                                      child:
                                                          Text("Just a moment"),
                                                    )
                                                  ],
                                                ),
                                              );
                                            });
                                        await authController.initUser();
                                        Get.back();
                                      } catch (e) {
                                        Get.back();
                                      }
                                    },
                                    icon: const Icon(Icons.refresh))
                            ],
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Obx(() {
                                return minorTitle(
                                    title: userController.currentUser.value
                                                ?.primaryShop ==
                                            null
                                        ? ""
                                        : "${userController.currentUser.value?.primaryShop!.name} ",
                                    color: AppColors.mainColor);
                              }),
                              if (verifyPermission(
                                  category: 'shop', permission: "switch"))
                                Obx(
                                  () => shopController.gettingShopsLoad.isTrue
                                      ? const Center(
                                          child: SizedBox(
                                              width: 20,
                                              height: 20,
                                              child:
                                                  CircularProgressIndicator()),
                                        )
                                      : InkWell(
                                          onTap: shopController
                                                  .gettingShopsLoad.isTrue
                                              ? null
                                              : () async {
                                                  await shopController
                                                      .getShops();
                                                  showShopModalBottomSheet(
                                                      Get.context);
                                                },
                                          child: Container(
                                            padding: const EdgeInsets.all(5),
                                            decoration: BoxDecoration(
                                              color: Colors.white,
                                              borderRadius:
                                                  BorderRadius.circular(50),
                                              border: Border.all(
                                                  color: AppColors.mainColor,
                                                  width: 2),
                                            ),
                                            child: minorTitle(
                                                title: "Switch Shop",
                                                color: AppColors.mainColor),
                                          ),
                                        ),
                                ),
                            ],
                          ),
                          if (userController
                                  .currentUser.value?.primaryShop?.warehouse ==
                              false)
                            const SizedBox(height: 20),
                          Obx(
                            () {
                              return (salesController.homecards.isEmpty ||
                                          userController
                                              .internetConected.isFalse) ||
                                      userController.currentUser.value
                                              ?.primaryShop?.warehouse ==
                                          true
                                  ? Container()
                                  : SizedBox(
                                      height: 100,
                                      width: double.infinity,
                                      child: Column(
                                        children: [
                                          Expanded(
                                            child: PageView.builder(
                                                scrollDirection:
                                                    Axis.horizontal,
                                                controller: salesController
                                                    .pageController,
                                                onPageChanged: (value) {},
                                                itemCount: salesController
                                                    .homecards.length,
                                                itemBuilder: (context, index) {
                                                  return showTodaySales(
                                                      context,
                                                      index,
                                                      salesController.homecards
                                                          .elementAt(index));
                                                }),
                                          )
                                        ],
                                      ),
                                    );
                            },
                          ),
                          const SizedBox(height: 20),
                          if (userController.currentUser.value?.usertype ==
                              'admin')
                            InventoryInsightsMinimal(
                              runningLow: productController
                                      .countHistoryData['runningLow'] ??
                                  0,
                              outOfStock: productController
                                      .countHistoryData['outofstock'] ??
                                  0,
                              fastMovingCount: productController
                                      .countHistoryData['fastmoving']?.length ??
                                  0,
                              dormant: productController
                                      .countHistoryData['dormant'] ??
                                  0,
                            ),
                          const SizedBox(height: 20),
                          majorTitle(
                              title: "Enterprise Operations",
                              color: Colors.black,
                              size: 20.0),
                          Obx(() => salesController.offlinesales.value == 0
                              ? Container()
                              : Text(
                                  "(${salesController.offlinesales.value}) offline sales",
                                  style: const TextStyle(color: Colors.red),
                                )),
                          const SizedBox(height: 20),
                          Container(
                            width: double.infinity,
                            margin: EdgeInsets.only(right: 0, left: 0),
                            padding: const EdgeInsets.symmetric(vertical: 15),
                            decoration: BoxDecoration(
                                color: AppColors.mainColor,
                                borderRadius: BorderRadius.circular(20)),
                            child: Obx(
                              () => Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  GridView.builder(
                                    gridDelegate:
                                        SliverGridDelegateWithFixedCrossAxisCount(
                                            childAspectRatio: 0.85,
                                            crossAxisCount: 4,
                                            crossAxisSpacing: 2,
                                            mainAxisSpacing: 10),
                                    padding: EdgeInsets.zero,
                                    itemCount: getAllowedTabs().length,
                                    shrinkWrap: true,
                                    physics: const ScrollPhysics(),
                                    itemBuilder: (c, i) {
                                      var e = getAllowedTabs().elementAt(i);
                                      return Stack(
                                        children: [
                                          gridItems(
                                              title: e["title"],
                                              iconData: e["icon"],
                                              isSmallScreen: true,
                                              function: () =>
                                                  handleClickFunctions(
                                                      context: context,
                                                      title: e["title"]
                                                          .toString()
                                                          .toLowerCase())),
                                          if (e['title'] == "Sales & Orders")
                                            Positioned(
                                              top: 10,
                                              right: 20,
                                              child: Obx(
                                                () => salesController.orders
                                                        .map((e) => e.status)
                                                        .where((element) =>
                                                            element ==
                                                            "pending")
                                                        .toList()
                                                        .length
                                                        .toString()
                                                        .isEmpty
                                                    ? Container()
                                                    : Container(
                                                        width: 20,
                                                        height: 20,
                                                        decoration: BoxDecoration(
                                                            color: Colors.red,
                                                            borderRadius:
                                                                BorderRadius
                                                                    .circular(
                                                                        50)),
                                                        child: Center(
                                                          child: Text(
                                                            salesController
                                                                .orders
                                                                .map((e) =>
                                                                    e.status)
                                                                .where((element) =>
                                                                    element ==
                                                                    "pending")
                                                                .toList()
                                                                .length
                                                                .toString(),
                                                            style: const TextStyle(
                                                                color: Colors
                                                                    .white,
                                                                fontWeight:
                                                                    FontWeight
                                                                        .bold),
                                                          ),
                                                        ),
                                                      ),
                                              ),
                                            ),
                                        ],
                                      );
                                    },
                                  ),
                                  if (verifyPermission(
                                          category: "accounts", group: true) &&
                                      userController.currentUser.value
                                              ?.primaryShop?.warehouse ==
                                          false)
                                    const Divider(
                                      color: Colors.white,
                                    ),
                                  if (userController.currentUser.value
                                          ?.primaryShop?.warehouse ==
                                      false)
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 10),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          if (verifyPermission(
                                              category: "reports",
                                              permission: 'profitanalysis'))
                                            InkWell(
                                              onTap: shopController
                                                          .checkSubscription() ==
                                                      false
                                                  ? null
                                                  : () {
                                                      if (userController
                                                          .internetConected
                                                          .isFalse) {
                                                        showSnackBar(
                                                            message:
                                                                "no internet connection",
                                                            color: Colors.red);
                                                        return;
                                                      }
                                                      Get.to(() =>
                                                          NetProfitReport());
                                                    },
                                              child: Row(
                                                children: [
                                                  const Icon(
                                                    Icons.auto_graph,
                                                    color: Colors.amber,
                                                  ),
                                                  const SizedBox(
                                                    width: 10,
                                                  ),
                                                  Text(
                                                    "Profit & Expenses Summary",
                                                    style: TextStyle(
                                                        color: shopController
                                                                    .checkSubscription() ==
                                                                false
                                                            ? Colors.grey
                                                            : Colors.white,
                                                        fontWeight:
                                                            FontWeight.bold),
                                                  ),
                                                  const Spacer(),
                                                  const Icon(
                                                    Icons
                                                        .arrow_forward_ios_rounded,
                                                    color: Colors.white,
                                                    size: 15,
                                                  )
                                                ],
                                              ),
                                            ),
                                          if (verifyPermission(
                                              category: "expenses",
                                              permission: "manage"))
                                            const Divider(
                                              color: Colors.white,
                                            ),
                                          if (verifyPermission(
                                              category: "expenses",
                                              permission: "manage"))
                                            InkWell(
                                              onTap: shopController
                                                          .checkSubscription() ==
                                                      false
                                                  ? null
                                                  : () {
                                                      if (userController
                                                          .internetConected
                                                          .isFalse) {
                                                        showSnackBar(
                                                            message:
                                                                "no internet connection",
                                                            color: Colors.red);
                                                        return;
                                                      }
                                                      Get.to(() => ExpensePage(
                                                          firstday:
                                                              DateTime.now(),
                                                          lastday:
                                                              DateTime.now()));
                                                    },
                                              child: Row(
                                                children: [
                                                  const Icon(
                                                    Icons.auto_graph,
                                                    color: Colors.amber,
                                                  ),
                                                  const SizedBox(
                                                    width: 10,
                                                  ),
                                                  Text(
                                                    "Expenses",
                                                    style: TextStyle(
                                                        color: shopController
                                                                    .checkSubscription() ==
                                                                false
                                                            ? Colors.grey
                                                            : Colors.white,
                                                        fontWeight:
                                                            FontWeight.bold),
                                                  ),
                                                  const Spacer(),
                                                  const Icon(
                                                    Icons
                                                        .arrow_forward_ios_rounded,
                                                    color: Colors.white,
                                                    size: 15,
                                                  )
                                                ],
                                              ),
                                            ),
                                          const Divider(
                                            color: Colors.white,
                                          ),
                                          if (userController.currentUser.value
                                                  ?.usertype ==
                                              'admin')
                                            InkWell(
                                              onTap: () {
                                                if (userController
                                                    .internetConected.isFalse) {
                                                  showSnackBar(
                                                      message:
                                                          "no internet connection",
                                                      color: Colors.red);
                                                  return;
                                                }
                                                Get.to(() => ShareAndUse());
                                              },
                                              child: const Row(
                                                children: [
                                                  Icon(
                                                    Icons.subscriptions,
                                                    color: Colors.amber,
                                                  ),
                                                  SizedBox(
                                                    width: 10,
                                                  ),
                                                  Text(
                                                    "Share & Use for Free",
                                                    style: TextStyle(
                                                        color: Colors.white,
                                                        fontWeight:
                                                            FontWeight.bold),
                                                  ),
                                                  Spacer(),
                                                  Icon(
                                                    Icons
                                                        .arrow_forward_ios_rounded,
                                                    color: Colors.white,
                                                    size: 15,
                                                  )
                                                ],
                                              ),
                                            ),
                                          if (userController
                                              .internetConected.isFalse)
                                            InkWell(
                                              onTap: () {
                                                authController.logOut();
                                              },
                                              child: const Column(
                                                crossAxisAlignment:
                                                    CrossAxisAlignment.start,
                                                children: [
                                                  SizedBox(
                                                    width: 10,
                                                  ),
                                                  Divider(
                                                    color: Colors.white,
                                                  ),
                                                  Center(
                                                    child: Text(
                                                      "Logout",
                                                      style: TextStyle(
                                                          color: Colors.red,
                                                          fontWeight:
                                                              FontWeight.bold),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 20),
                          if (userController
                                  .currentUser.value?.primaryShop?.warehouse ==
                              true)
                            Container(
                              margin:
                                  const EdgeInsets.symmetric(horizontal: 10),
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text("Latest Invoices",
                                      style: TextStyle(
                                          color: AppColors.mainColor,
                                          fontSize: 20,
                                          fontWeight: FontWeight.bold)),
                                  InkWell(
                                    onTap: () {
                                      showModalBottomSheet(
                                        context: context,
                                        backgroundColor: isSmallScreen(context)
                                            ? Colors.white
                                            : Colors.transparent,
                                        shape: const RoundedRectangleBorder(
                                          borderRadius: BorderRadius.only(
                                              topRight: Radius.circular(15),
                                              topLeft: Radius.circular(15)),
                                        ),
                                        builder: (context) =>
                                            SingleChildScrollView(
                                          child: Container(
                                            padding:
                                                const EdgeInsets.only(top: 10),
                                            child: ListView.builder(
                                                itemCount: filterOptions.length,
                                                shrinkWrap: true,
                                                physics:
                                                    const NeverScrollableScrollPhysics(),
                                                itemBuilder: (context, index) {
                                                  var option = filterOptions
                                                      .elementAt(index);
                                                  return InkWell(
                                                    onTap: () async {
                                                      var status =
                                                          option.toLowerCase();
                                                      if (option
                                                              .toLowerCase() ==
                                                          "all") {
                                                        status = "";
                                                      }
                                                      wareHouseController
                                                          .getRequests(
                                                              warehouse:
                                                                  userController
                                                                      .currentUser
                                                                      .value
                                                                      ?.primaryShop
                                                                      ?.id,
                                                              status: status);
                                                      Get.back();
                                                    },
                                                    child: Column(
                                                      children: [
                                                        Container(
                                                          padding:
                                                              const EdgeInsets
                                                                  .all(10),
                                                          width: MediaQuery.of(
                                                                  context)
                                                              .size
                                                              .width,
                                                          child: Row(
                                                            mainAxisAlignment:
                                                                MainAxisAlignment
                                                                    .spaceBetween,
                                                            children: [
                                                              Text(option),
                                                              const Icon(
                                                                Icons
                                                                    .arrow_forward_ios_outlined,
                                                                size: 16,
                                                              ),
                                                            ],
                                                          ),
                                                        ),
                                                        const Divider()
                                                      ],
                                                    ),
                                                  );
                                                }),
                                          ),
                                        ),
                                      );
                                    },
                                    child: Row(
                                      children: [
                                        Text("Filter ",
                                            style: TextStyle(
                                                fontSize: 14,
                                                color: AppColors.mainColor)),
                                        SizedBox(
                                          width: 10,
                                        ),
                                        Icon(
                                          Icons.filter_list_outlined,
                                          color: AppColors.mainColor,
                                        ),
                                      ],
                                    ),
                                  )
                                ],
                              ),
                            ),
                          if (userController
                                  .currentUser.value?.primaryShop?.warehouse ==
                              true)
                            Container(
                              margin:
                                  const EdgeInsets.symmetric(horizontal: 10),
                              child: Divider(
                                color: AppColors.mainColor,
                              ),
                            ),
                          if (userController
                                  .currentUser.value?.primaryShop?.warehouse ==
                              true)
                            SizedBox(
                              height: 350,
                              child: Obx(
                                () => wareHouseController.isLoadingCount.isTrue
                                    ? const Center(
                                        child: CircularProgressIndicator(),
                                      )
                                    : wareHouseController
                                            .warehouseInvoices.isEmpty
                                        ? const Center(
                                            child: Text("No ivoices yet"),
                                          )
                                        : ListView.builder(
                                            itemBuilder: (context, index) {
                                              WareHouseInvoice
                                                  wareHouseInvoice =
                                                  wareHouseController
                                                      .warehouseInvoices
                                                      .elementAt(index);
                                              return WareHouseItemInvoice(
                                                  warehouseinoivce:
                                                      wareHouseInvoice,
                                                  from: "home");
                                            },
                                            itemCount: wareHouseController
                                                .warehouseInvoices.length,
                                          ),
                              ),
                            ),
                          if (userController.currentUser.value?.primaryShop
                                      ?.warehouse ==
                                  true &&
                              wareHouseController.warehouseInvoices.isEmpty)
                            const Center(
                              child: Text("No ivoices yet"),
                            )
                        ],
                      ),
              ),
            ),
          )),
    );
  }

  Widget gridItems(
      {required title,
      required IconData iconData,
      required function,
      required isSmallScreen}) {
    return InkWell(
      onTap: shopController.checkSubscription() == false &&
              shopController.excludefeatures
                      .contains(title.toString().toLowerCase()) ==
                  false
          ? null
          : () {
              function();
            },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            decoration: BoxDecoration(
              color: shopController.checkSubscription() == false &&
                      shopController.excludefeatures
                              .contains(title.toString().toLowerCase()) ==
                          false
                  ? Colors.grey
                  : isSmallScreen
                      ? Colors.white
                      : Colors.red,
              borderRadius: const BorderRadius.all(
                Radius.circular(10.0),
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.all(10.0),
              child: Icon(
                iconData,
                size: 40,
                color: AppColors.mainColor,
              ),
            ),
          ),
          const SizedBox(height: 10),
          Center(
            child: Text(
              title,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 11,
                color: shopController.checkSubscription() == false
                    ? Colors.grey
                    : isSmallScreen
                        ? Colors.white
                        : AppColors.mainColor,
              ),
            ),
          ),
        ],
      ),
    );
  }

  handleClickFunctions({required context, required title}) {
    if (userController.internetConected.value == false && title != "pos") {
      if (title == "stock" || title == "stocks") {
        Get.to(() => ProductPage());
        return;
      }
      showSnackBar(message: 'No Internet Connection', color: Colors.red);
      return;
    }
    switch (title) {
      case "pos":
        {
          Get.to(() => CreateSale());
        }
        break;
      case "sales & orders":
        {
          Get.to(() => const AllSalesPage(page: ""));
        }
        break;
      case "invoices":
        {
          Get.to(() => Invoices(page: ""));
        }
        break;
      case "cashflow":
        {
          Get.to(() => CashFlowManager());
        }
        break;
      case "stock":
        {
          print("user type ${userController.currentUser.value?.usertype}");
          // if (userController.currentUser.value?.usertype == "attendant" &&
          //     !verifyPermission(
          //         category: "stocks", permission: "stock_summary")) {
          //   Get.to(() => ProductPage());
          //   return;
          // }

          Get.to(() => StockPage());
        }
        break;
      case "suppliers":
        {
          Get.to(() => SuppliersPage());
        }
        break;
      case "customers":
        {
          Get.to(() => CustomersPage());
        }
        break;
      case "reports":
        {
          Get.to(() => Reports());
        }
        break;
    }
  }

  Widget showTodaySales(context, int index, HomeCard homeCard) {
    var c =
        Color((math.Random().nextDouble() * 0xFFFFFF).toInt()).withOpacity(1.0);
    return InkWell(
      onTap: () {
        if (homeCard.key == "expenses") {
          Get.to(() => ExpensePage(
              firstday: DateTime(DateTime.now().year, DateTime.now().month,
                  DateTime.now().day),
              lastday: DateTime.now()));
        } else if (homeCard.key == "profit") {
          reportsController.activeFilter.value = 'today';
          reportsController.filterStartDate.value = DateFormat(
            "yyyy-MM-dd",
          ).format(DateTime.now());
          reportsController.filterEndDate.value = DateFormat(
            "yyyy-MM-dd",
          ).format(DateTime.now());

          salesController.getNetAnalysis(
              fromDate: reportsController.filterStartDate.value,
              toDate: reportsController.filterEndDate.value,
              shopId: userController.currentUser.value!.primaryShop!.id!,
              duesales: 'true');

          Get.to(() => NetProfitReport(
              firstday: DateTime(DateTime.now().year, DateTime.now().month,
                  DateTime.now().day),
              lastday: DateTime.now()));
        } else if (homeCard.key == "sales") {
          if (verifyPermission(category: "sales", permission: "view_sales")) {
            Get.to(() => const AllSalesPage(page: "homepage"));
          } else {
            salesController.getSalesByDate(
                fromDate: reportsController.filterStartDate.value,
                toDate: reportsController.filterEndDate.value,
                status: "cashed",
                shop: userController.currentUser.value!.primaryShop!.id!);
            Get.to(() => Scaffold(
                  appBar: AppBar(
                    title: Text("Sales"),
                  ),
                  body: AllSales(),
                ));
          }
        } else if (homeCard.key == "dues") {
          reportsController.activeFilter.value = "today";
          reportsController.filterStartDate.value =
              DateFormat('yyyy-MM-dd').format(DateTime.now());
          reportsController.filterEndDate.value =
              DateFormat('yyyy-MM-dd').format(DateTime.now());
          salesController.getSalesByDate(
              shop: userController.currentUser.value!.primaryShop!.id!,
              fromDate: reportsController.filterStartDate.value,
              dueDate: DateFormat('yyyy-MM-dd').format(DateTime.now()),
              toDate: reportsController.filterEndDate.value);

          Get.to(() => SalesReport(
                title: "Due Sales",
                keyFrom: "dues",
              ));
        }
      },
      child: Container(
        padding: EdgeInsets.symmetric(
            vertical: 10, horizontal: isSmallScreen(context) ? 20 : 50),
        margin: const EdgeInsets.only(left: 10, right: 10),
        decoration: BoxDecoration(
            color: homeCard.color, borderRadius: BorderRadius.circular(10)),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Icon(
              homeCard.iconData,
              size: 40,
              color: c,
            ),
            const SizedBox(
              width: 40,
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                majorTitle(
                    title: homeCard.name, color: Colors.white, size: 13.0),
                const SizedBox(height: 10),
                Obx(() {
                  return salesController.getSalesByLoad.value
                      ? minorTitle(title: "Calculating...", color: Colors.white)
                      : verifyPermission(
                              category: "sales", permission: "view_sales")
                          ? normalText(
                              title: htmlPrice(
                                  homeCard.total?.toStringAsFixed(2) ?? 0),
                              color: Colors.white,
                              size: 20.0)
                          : normalText(
                              title: "N/A", color: Colors.white, size: 20.0);
                }),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

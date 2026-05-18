import 'dart:async';
import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/customercontroller.dart';
import 'package:pointify/controllers/productcontroller.dart';
import 'package:pointify/controllers/salescontroller.dart';
import 'package:pointify/controllers/shopcontroller.dart';
import 'package:pointify/controllers/usercontroller.dart';
import 'package:pointify/sqlite/helper.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../controllers/authcontroller.dart';
import '../../controllers/homecontroller.dart';
import '../../services/sales_service.dart';
import '../../utils/colors.dart';
import '../../utils/constants.dart';
import '../../utils/helper.dart';
import '../../widgets/minor_title.dart';
import 'attendant/attendants_page.dart';

class Home extends StatefulWidget {
  const Home({Key? key}) : super(key: key);

  @override
  State<Home> createState() => _HomeState();
}

class _HomeState extends State<Home> {
  HomeController homeControler = Get.put(HomeController());
  SalesController salesController = Get.put(SalesController());
  ShopController shopController = Get.put(ShopController());
  UserController userController = Get.find<UserController>();
  AuthController authController = Get.find<AuthController>();
  List<ConnectivityResult> _connectionStatus = [ConnectivityResult.none];
  final Connectivity _connectivity = Connectivity();
  late StreamSubscription<List<ConnectivityResult>> _connectivitySubscription;

  @override
  void initState() {
    super.initState();
    if (settingsData['offlineEnabled'] == true) {
      initConnectivity();
      _connectivitySubscription =
          _connectivity.onConnectivityChanged.listen(_updateConnectionStatus);
    }
    _connectBLE();
  }

  _connectBLE() async {
    final prefs = await SharedPreferences.getInstance();
    String mac = prefs.getString('saved_printer_mac') ?? "";
    if(mac.isNotEmpty) {
       await PrintBluetoothThermal.connect(
        macPrinterAddress: prefs.getString('saved_printer_mac')!,
      );
    }
  }

  @override
  void dispose() {
    if (settingsData['offlineEnabled'] == true) {
      _connectivitySubscription.cancel();
    }
    super.dispose();
  }

  Future<void> initConnectivity() async {
    late List<ConnectivityResult> result;
    try {
      result = await _connectivity.checkConnectivity();
    } on PlatformException catch (e) {
      return;
    }
    if (!mounted) {
      return Future.value(null);
    }

    return _updateConnectionStatus(result);
  }

  Future<void> _updateConnectionStatus(List<ConnectivityResult> result) async {
    setState(() {
      _connectionStatus = result;
    });
    if (_connectionStatus[0] == ConnectivityResult.none) {
      userController.internetConected.value = false;
      homeControler.selectedIndex.value = 0;
      DatabaseHelper databaseHelper = DatabaseHelper();
      List<dynamic> sales = await databaseHelper.getSales();
      salesController.offlinesales.value = sales.length;
    } else {
      userController.internetConected.value = true;
      _updateProduct();
    }
  }

  _updateProduct() async {
    DatabaseHelper databaseHelper = DatabaseHelper();
    databaseHelper.getSales().then((value) async {
      List<dynamic> sales = value;
      if (sales.isEmpty) {
        return;
      }
      for (var data in sales) {
        var sale = {
          "products": jsonDecode(data['products']),
          "shopId": data['shopId'],
          "attendantId": data['attendantId'],
          "saleType": data['saleType'],
          "createdAt": data['createdAt'],
          "status": data['status'],
          "totaltax": data['totaltax'],
          "salesnote": data['salesnote'],
          "duedate": data['duedate'],
          "mpesaTotal": data['mpesaTotal'],
          "bankTotal": data['bankTotal'],
          "amountPaid": data['amountPaid'],
          "paymentType": data['paymentType'],
          "paymentTag": data['paymentTag'],
          "totalDiscount": data['totalDiscount'],
          "customerId": data['customerId']
        };
        await SalesService.createSale(sale);
        databaseHelper.deleteSale(data['id']);
      }

      salesController.offlinesales.value = 0;
      Get.find<ProductController>().getProductsBySort(type: 'all');
      Get.find<CustomerController>().getCustomersInShop('');
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        body: Helper(
          widget: Obx(() {
            return homeControler.pages[homeControler.selectedIndex.value];
          }),
          appBar: AppBar(
            titleSpacing: 0.0,
            leading:  Icon(
              Icons.electric_bolt,
              color: AppColors.mainColor,
            ),
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(
                  height: 5,
                ),
                Obx(
                  () => minorTitle(
                      title:
                          "Welcome ${userController.switcheduser.value != null ? userController.switcheduser.value!.username : userController.currentUser.value?.username}",
                      color: Colors.black,
                      size: 12.0),
                ),
                const SizedBox(
                  height: 5,
                ),
                Obx(
                  () {
                    return userController.switcheduser.value != null
                        ? minorTitle(
                            title:
                                "logged in as ${userController.switcheduser.value?.username}",
                            color: Colors.red,
                            size: 12)
                        : userController.switcheduser.value?.usertype == "admin"
                            ? minorTitle(
                                title: "Switch Account",
                                color: AppColors.mainColor)
                            : Container();
                  },
                )
              ],
            ),
            elevation: 0.2,
            backgroundColor: Colors.white,
            actions: [
              SizedBox(
                width: 10,
              ),
              if (userController.currentUser.value?.usertype == "admin")
                Align(
                  alignment: Alignment.centerRight,
                  child: InkWell(
                    onTap: () async {
                      Get.to(() => AttendantsPage(type: "switch"));
                    },
                    child:  Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Text(
                          "Switch User",
                          style: TextStyle(fontSize: 16),
                        ),
                        Icon(
                          Icons.repeat_sharp,
                          color: AppColors.mainColor,
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
          bottomNavigationBar: SafeArea(
            child: Obx(
              () => userController.internetConected.isFalse
                  ? Container(
                      height: 0,
                    )
                  : Container(
                      padding:
                          const EdgeInsets.only(left: 20, right: 20, bottom: 10),
                      decoration: BoxDecoration(
                          color: AppColors.lightDeepPurple,
                          borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(20),
                              topRight: Radius.circular(20))),
                      child: Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            InkWell(
                              onTap: () {
                                homeControler.selectedIndex.value = 0;
                              },
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Obx(
                                    () => Icon(
                                      Icons.home,
                                      color:
                                          homeControler.selectedIndex.value == 0
                                              ? Colors.white
                                              : Colors.black,
                                    ),
                                  ),
                                  const Text("Home")
                                ],
                              ),
                            ),
                            InkWell(
                              onTap: () {
                                homeControler.selectedIndex.value = 1;
                                shopController.getShops();
                              },
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Obx(
                                    () => Icon(Icons.shop,
                                        color:
                                            homeControler.selectedIndex.value == 1
                                                ? Colors.white
                                                : Colors.black),
                                  ),
                                  const Text("Shops")
                                ],
                              ),
                            ),
                            InkWell(
                              onTap: () {
                                homeControler.selectedIndex.value = 2;
                                userController.getAttendants();
                              },
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Obx(
                                    () => Icon(Icons.people,
                                        color:
                                            homeControler.selectedIndex.value == 2
                                                ? Colors.white
                                                : Colors.black),
                                  ),
                                  const Text("Attendants")
                                ],
                              ),
                            ),
                            InkWell(
                              onTap: () {
                                homeControler.selectedIndex.value = 3;
                              },
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Obx(
                                    () => Icon(Icons.people,
                                        color:
                                            homeControler.selectedIndex.value == 3
                                                ? Colors.white
                                                : Colors.black),
                                  ),
                                  const Text("Profile")
                                ],
                              ),
                            )
                          ],
                        ),
                      ),
                    ),
            ),
          ),
        ));
  }
}

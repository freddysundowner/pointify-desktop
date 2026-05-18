import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_stripe/flutter_stripe.dart' as stripe;
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/ordercontroller.dart';
import 'package:pointify/controllers/paymentcontroller.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/package.dart';

import '../models/shop.dart';
import '../models/shoptype.dart';
import '../models/warehouse.dart';
import '../screens/home/home.dart';
import '../screens/shop/create_shop.dart';
import '../services/client.dart';
import '../services/end_points.dart';
import '../services/shop_services.dart';
import '../sqlite/helper.dart';
import '../utils/app_config.dart';
import '../utils/constants.dart';
import '../utils/helper.dart';
import '../widgets/alert.dart';
import '../widgets/loading_dialog.dart';
import '../widgets/snackbars.dart';

class ShopController {
  RxBool gettingShopsLoad = RxBool(false);
  RxBool loadingwarehouses = RxBool(false);
  RxList<Shop> allShops = RxList([]);
  RxList<Warehouse> warehouses = RxList([]);
  RxList<Shop> expiredShops = RxList([]);
  RxBool loadingcateries = RxBool(false);
  RxInt shopSubscribed = RxInt(0);
  RxList<Shop> shopsRenew = RxList([]);
  RxBool subscribing = RxBool(false);
  RxBool showReportssettings = RxBool(false);

  final GlobalKey<State> _keyLoader = GlobalKey<State>();

  TextEditingController contactController = TextEditingController();
  TextEditingController emailController = TextEditingController();
  TextEditingController paybillAcc = TextEditingController();
  TextEditingController paybillTill = TextEditingController();
  TextEditingController address = TextEditingController();

  TextEditingController nameController = TextEditingController();
  TextEditingController backupemail = TextEditingController();
  TextEditingController businessController = TextEditingController();
  TextEditingController reqionController = TextEditingController();
  TextEditingController warehouseemail = TextEditingController();
  TextEditingController tax = TextEditingController();
  TextEditingController latitude = TextEditingController();
  TextEditingController longitude = TextEditingController();
  TextEditingController currencyController = TextEditingController();
  TextEditingController searchController = TextEditingController();
  RxList excludefeatures = RxList(["usage", 'stock', "support"]);
  RxBool createShopLoad = RxBool(false);
  RxBool updateEmail = RxBool(false);
  RxBool showbackupsettings = RxBool(false);
  RxBool allowOnlineSelling = RxBool(true);
  RxBool productionEnabled = RxBool(false);
  RxBool useWarehouse = RxBool(false);
  RxBool allowbatchtracking = RxBool(false);
  RxBool allownegativesales = RxBool(false);
  RxBool allowBackup = RxBool(false);
  RxBool onlinesellingsettings = RxBool(false);
  Rxn<ShopTypes> selectedCategory = Rxn(null);
  RxList<ShopTypes> selectedDiscoverCategories = RxList([]);
  RxList<Shop> shopsAround = RxList([]);
  RxString currency = RxString("");
  RxDouble currentDistance = RxDouble(100);
  RxBool updateShopLoad = RxBool(false);
  RxBool isBacking = RxBool(false);
  RxBool shopsAroundLoad = RxBool(false);
  RxBool deleteShopLoad = RxBool(false);
  RxString shopLocation = RxString("");
  RxBool terms = RxBool(false);
  RxList<ShopTypes> categories = RxList([]);

  RxMap selectedbackupsendinterval =
      RxMap({"name": "end_of_month", "value": "Every End of Month"});
  RxList backupsendinterval = RxList([
    {"name": "daily", "value": "Every day"},
    {"name": "end_of_month", "value": "Every End of Month"},
    {"name": "weekly", "value": "Every End of Week"},
    {"name": "yearly", "value": "Every End of Year"},
  ]);

  createShop({required page, required context, String? type = "shop"}) async {
    if (nameController.text.trim().isEmpty) {
      generalAlert(title: "Error", message: "Please enter  name");
      return;
    }
    if (selectedCategory.value == null && type == "shop") {
      generalAlert(title: "Error", message: "Please select business type");
      return;
    }
    if (reqionController.text.trim().isEmpty && type == "shop") {
      generalAlert(title: "Error", message: "Please enter location");
      return;
    }
    createShopLoad.value = true;
    var shop = {
      "name": nameController.text,
      "location": reqionController.text ?? "",
      "production": productionEnabled.value,
      "useWarehouse": true,
      "warehouse": type == "warehouse" ? true : false,
      "warehouseemail": warehouseemail.text ?? "",
      "address": reqionController.text ?? "",
      "tax": tax.text ?? "",
      "latitude": latitude.text ?? "",
      "backupInterval": selectedbackupsendinterval['name'] ?? "",
      "allowOnlineSelling": allowOnlineSelling.value,
      "backupemail": userController.currentUser.value?.email,
      "longitude": longitude.text,
      "shopCategoryId": selectedCategory.value?.id ?? null,
      "currency":
          currency.isEmpty ? Constants.currenciesData[0] : currency.value,
      "adminId": userController.currentUser.value?.id
    };
    var response = await ShopService().createShop(shop);
    clearTextFields();
    await getShops();
    if (userController.currentUser.value!.primaryShop == null) {
      userController.currentUser.value!.primaryShop = Shop.fromJson(response);
    }
    await authController.initUser();
    if (page == "home" || page == "reg") {
      Get.off(() => const Home());
    } else {
      Get.back();
    }

    createShopLoad.value = false;
  }

  getShops({String name = "", String? type = ""}) async {
    try {
      if (gettingShopsLoad.value == true) return;
      gettingShopsLoad.value = true;
      allShops.clear();
      expiredShops.clear();
      bool connected = await isConnected();
      DatabaseHelper databaseHelper = DatabaseHelper();
      List<dynamic> response;
      if (!connected) {
        response = await databaseHelper.getAllShops();
      } else {
        if (type == "warehouse") {
          response = await ShopService.getShops(
            userController.currentUser.value!.primaryShop!.adminId!,
            name: name,
            type: type,
          );
        } else {
          response = await ShopService.getShops(
              userController.currentUserId.value,
              name: name,
              type: type);
        }
      }
      gettingShopsLoad.value = false;
      if (response.isNotEmpty) {
        allShops.addAll(response.map((e) => Shop.fromJson(e)).toList());
        expiredShops.addAll(allShops
            .where((element) =>
                checkDaysRemaining(shop: element) <= 0 ||
                element.subscription?.package?.type == "trial")
            .toList());
        if (connected) {
          for (var element in response) {
            await databaseHelper.insertShop(element);
          }
        }
      }
      clearTextFields();
    } catch (e) {
      gettingShopsLoad.value = false;
    }
  }

  getWarehouses({String name = ""}) async {
    try {
      if (loadingwarehouses.value == true) return;
      loadingwarehouses.value = true;
      warehouses.clear();
      bool connected = await isConnected();
      DatabaseHelper databaseHelper = DatabaseHelper();
      List<dynamic> response;
      if (!connected) {
        response = await databaseHelper.getAllShops();
      } else {
        response = await ShopService.getWarehouses(
            userController.currentUserId.value,
            name: name);
      }
      loadingwarehouses.value = false;
      if (response.isNotEmpty) {
        warehouses.addAll(response.map((e) => Warehouse.fromJson(e)).toList());
        if (connected) {
          for (var element in response) {
            await databaseHelper.insertShop(element);
          }
        }
      }
      clearTextFields();
    } catch (e) {
      loadingwarehouses.value = false;
    }
  }

  clearTextFields() {
    nameController.text = "";
    warehouseemail.text = "";
    businessController.text = "";
    reqionController.text = "";
    productionEnabled.value = false;
    terms.value = false;
  }

  checkDaysRemaining({Shop? shop}) {
    if (allowSubscription == false) return 999999;
    shop ??= userController.currentUser.value?.primaryShop;
    if (shop?.subscription == null) {
      return 0;
    }
    DateTime endDate = DateTime.parse(shop!.subscription!.endDate!).toLocal();

    int days = shop.subscription == null
        ? 0
        : endDate.difference(DateTime.now().toLocal()).inDays;
    if (days < 0 || days == 0) {
      int hoursDifference =
          endDate.difference(DateTime.now().toLocal()).inHours;
      if (hoursDifference > 0) {
        days = 1;
      }
    }
    return days < 0 ? 0 : days;
  }

  checkSubscription({Shop? shop}) {
    if (allowSubscription == false) return !allowSubscription;
    return checkDaysRemaining(shop: shop) > 0;
  }

  checkIfTrial() {
    if (allowSubscription == false) return allowSubscription;
    if (userController.currentUser.value?.primaryShop?.subscription == null ||
        userController.currentUser.value?.primaryShop!.subscription!.package ==
            null) {
      return true;
    }
    return userController
        .currentUser.value?.primaryShop!.subscription!.package?.trial!;
  }

  getCurrentPackage() {
    if (allowSubscription == false) return allowSubscription;
    return userController.currentUser.value!.primaryShop!.subscription!.package;
  }

  isCurrentPackage(Package package) {
    if (allowSubscription == false) return allowSubscription;
    if (userController.currentUser.value!.primaryShop!.subscription == null) {
      return false;
    }
    return userController
            .currentUser.value!.primaryShop!.subscription!.package?.id ==
        package.id;
  }

  Future<String?> subscribe(
    Shop shop, {
    required Package package,
    required String type,
  }) async {
    try {
      subscribing.value = true;

      final data = {
        "userId": userController.currentUser.value!.id,
        "shops": shopsRenew.map((e) => e.id).toList(),
        "email": userController.currentUser.value!.email,
        "phonenumber": userController.phoneController.text,
        "package": package.id,
        "paymentType": type,
        "shop": shop.id,
        "amount": package.amount,
      };

      final response = await ShopService().subscribe(data);

      if (response["status"] != 200) {
        return null;
      }

      return response["subscriptionid"];
    } catch (e) {
      return null;
    } finally {
      subscribing.value = false;
    }
  }

  paymentCall(subscriptionid,
      {String message =
          "Check your phone and enter your mpesa pin and click confirmed on this page payment",
      Shop? shop}) async {
    generalAlert(
        title: "Please wait...",
        message: message,
        positiveText: "Confirm Payment",
        function: () async {
          LoadingDialog.showLoadingDialog(
              context: Get.context!, title: "Please wait...", key: _keyLoader);
          var response = await ShopService().confirmPayment(
              subscriptionid,
              shop != null
                  ? shop.id!
                  : userController.currentUser.value!.primaryShop!.id!,
              shops: shopsRenew.map((element) => element.id).toList());
          Get.back();
          if (response["status"] == false) {
            generalAlert(
                title: "Error",
                message: response["message"],
                function: () {
                  paymentCall(subscriptionid, shop: shop);
                });
          } else {
            generalAlert(
              title: "Success",
              message: response["message"],
              function: () async {
                shopsRenew.clear();
                Get.back();
                // showSnackBar(message: response["message"], color: Colors.green);
                await authController.initUser();
                Get.back();
              },
            );
          }
        },
        negativeCallback: () {
          Get.back();
        });
  }

  openStripe(var response, context) async {
    try {
      stripe.Stripe.publishableKey = AppConfig.stripePublishKey;
      stripe.Stripe.setReturnUrlSchemeOnAndroid = true;
      await stripe.Stripe.instance.initPaymentSheet(
          paymentSheetParameters: stripe.SetupPaymentSheetParameters(
        paymentIntentClientSecret: response['client_secret'],
        googlePay: PaymentSheetGooglePay(
          merchantCountryCode: AppConfig.country_code,
          testEnv: false,
        ),
        style: ThemeMode.light,
        merchantDisplayName: 'Pay ${AppConfig.app_name}',
      ));
      await stripe.Stripe.instance.presentPaymentSheet();
      await checkStripeStatus(response['client_secret'],
          subscriptionid: response['subscriptionid']);
    } catch (e) {
      if (kDebugMode) {
        print(e);
      }
    }
  }

  Future<void> checkStripeStatus(String clientSecret,
      {Function? completeOrder, String? subscriptionid}) async {
    await stripe.Stripe.instance
        .retrievePaymentIntent(clientSecret)
        .then((value) async {
      if (value.status.name == "Succeeded") {
        try {
          if (completeOrder != null) {
            completeOrder();
          } else {
            Get.defaultDialog(
                title: "Please wait",
                contentPadding: const EdgeInsets.all(10),
                content: const CircularProgressIndicator(),
                barrierDismissible: false);
            var responseData = await DbBase().databaseRequest(
                EndPoints.updatestripesubscriptions, DbBase().putRequestType,
                body: {
                  "subscriptionid": subscriptionid,
                  "transaction_code": value.id,
                  'currency': "usd"
                });
            if (responseData["status"] == 200) {
              generalAlert(
                  title: "Success",
                  message: responseData["message"],
                  function: () {
                    authController.initUser();
                  });
            }
          }

          return true;
        } catch (e) {
          if (kDebugMode) {
            print(e);
          }
        }
      } else if (value.status.name == "requires_payment_method") {
        await checkStripeStatus(clientSecret);
      } else if (value.status.name == "requires_confirmation") {
        await checkStripeStatus(clientSecret);
      } else if (value.status.name == "requires_action") {
        await checkStripeStatus(clientSecret);
      } else if (value.status.name == "processing") {
        await checkStripeStatus(clientSecret);
      }
    });
  }

  getCategories() async {
    try {
      loadingcateries.value = true;
      List<dynamic> response = await ShopService().getShopTypes();
      categories.value = response.map((e) => ShopTypes.fromJson(e)).toList();
      loadingcateries.value = false;
    } catch (e) {
      loadingcateries.value = false;
    }
  }

  updateShop(
      {Shop? shop,
      String backup = "",
      String backupemail = "",
      String? location = "",
      String latitude = "",
      bool? allowBackup,
      bool? allowOnlineSelling,
      String longitude = ""}) async {
    try {
      updateShopLoad.value = true;
      if (backup.isNotEmpty ||
          backupemail.isNotEmpty ||
          location != null ||
          allowOnlineSelling != null ||
          allowBackup != null) {
        if (allowOnlineSelling != null) {
          await ShopService().updateShop(
              shop!.id!, {"allowOnlineSelling": allowOnlineSelling});
        }
        if (allowBackup != null) {
          await ShopService()
              .updateShop(shop!.id!, {"allowBackup": allowBackup});
        }
        if (location != "") {
        } else if (backup.isNotEmpty) {
          if (shop?.backupemail == null) {
            generalAlert(message: "Please enter backup email");
            return;
          }
          LoadingDialog.showLoadingDialog(
              context: Get.context!, title: "Please wait...", key: _keyLoader);
          await ShopService().updatebackupiterval(shop!.id!, {
            "backupInterval": selectedbackupsendinterval['name'],
            "backupemail": shop.backupemail,
          });
          Get.back();
          generalAlert(message: "Update interval updated", title: "Success");
        } else if (backupemail.isNotEmpty) {
        } else {
          var response = await ShopService().updateShop(shop!.id!, {
            "name": nameController.text,
            "backupInterval": selectedbackupsendinterval['name'],
            "useWarehouse": useWarehouse.value,
            "tax": tax.text,
            "currency": currency.value == ""
                ? Constants.currenciesData[0]
                : currency.value,
            "shopCategoryId":
                Get.find<ShopController>().selectedCategory.value?.id,
          });
          if (response['error'] != null) {
            showSnackBar(message: response['error'], color: Colors.red);
          }
        }
      } else {
        var response = await ShopService().updateShop(shop!.id!, {
          "name": nameController.text,
          "backupInterval": selectedbackupsendinterval['name'],
          "production": productionEnabled.value,
          "useWarehouse": useWarehouse.value,
          "tax": tax.text,
          "currency": currency.value == ""
              ? Constants.currenciesData[0]
              : currency.value,
          "shopCategoryId":
              Get.find<ShopController>().selectedCategory.value?.id,
        });
        if (response['error'] != null) {
          showSnackBar(message: response['error'], color: Colors.red);
        }
        getShops();
        Get.back();

        showSnackBar(message: "shop updated", color: Colors.green);
      }
      updateShopLoad.value = false;
    } catch (e) {
      updateShopLoad.value = false;
    }
  }

  Future<void> deleteShopData({
    required Shop shop,
  }) async {
    try {
      // close confirmation dialog first
      Get.back();

      await Future.delayed(
        const Duration(milliseconds: 150),
      );

      LoadingDialog.showLoadingDialog(
        context: Get.context!,
        title: "Deleting shop data...",
        key: _keyLoader,
      );

      await ShopService().deleteDataShop(
        shop.id!,
      );

      // close loader
      Get.back();

      await authController.initUser();

      await getShops();

      if (userController.currentUser.value?.primaryShop == null) {
        Get.off(
          () => CreateShop(
            page: "home",
          ),
        );
      } else {
        Get.back();
      }

      generalAlert(
        title: "Success",
        message: "Data deleted successfully",
        function: () {
          Get.back();
        },
      );
    } catch (e) {
      Get.back();

      generalAlert(
        title: "Error",
        message: e.toString(),
      );
    }
  }

  deleteShop({required Shop shop}) async {
    LoadingDialog.showLoadingDialog(
        context: Get.context!, title: "Please wait...", key: _keyLoader);
    await ShopService().deleteShop(shop.id!);
    await getShops();
    if (userController.currentUser.value?.primaryShop == null) {
      Get.off(() => CreateShop(page: "home"));
    } else {
      Get.back();
    }

    showSnackBar(message: "shop deleted", color: Colors.green);
  }

  Future<void> getShopsAround() async {
    shopsAroundLoad.value = true;
    shopsAround.value = [];
    double? latitude = 0;
    double? longitude = 0;
    OrderController orderController = Get.find<OrderController>();
    if (orderController.locationData.value != null) {
      latitude = orderController.locationData.value!.latitude;
      longitude = orderController.locationData.value!.longitude;
    }
    var response = await ShopService().getShopsAround(
      categories:
          selectedDiscoverCategories.map((element) => element.id).toList(),
      radius: currentDistance.value,
      lat: latitude,
      lng: longitude,
    );
    shopsAroundLoad.value = false;
    List shops = response;
    shopsAround.value = shops.map((e) => Shop.fromJson(e)).toList();
  }

  void backupNow({required Shop shopModel}) async {
    isBacking.value = true;
    var response = await ShopService().backupNow(shopModel.id!);
    print(response);
    isBacking.value = false;
    generalAlert(
      title: "Backup",
      message: response["message"],
    );
  }

  void redeemUsage({String? shopId, required int days}) async {
    Get.back();
    LoadingDialog.showLoadingDialog(
        context: Get.context!, title: "Please wait...", key: _keyLoader);
    var response = await ShopService().redeemUsage(shopId!, days);
    if (response["error"] != null) {
      Get.back();
      generalAlert(
        title: "Error",
        message: response["error"],
      );
      return;
    }

    await authController.initUser();
    Get.back();
    Get.back();

    Get.find<PaymentController>()
        .getAwardTransactions(userController.currentUser.value!.id!);

    generalAlert(
      title: "Usage",
      message: response["message"],
    );
  }

  Future<dynamic> checkPaymentStatus(String reference) async {
    try {
      var response = await ShopService().checkPaymentStatus(reference);
      return response["status"];
    } catch (e) {
      return null;
    }
  }
}

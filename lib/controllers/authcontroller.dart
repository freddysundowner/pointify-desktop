import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:country_code_picker/country_code_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_chat_types/flutter_chat_types.dart' as types;
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:get/get.dart';
import 'package:in_app_review/in_app_review.dart';
import 'package:intl/intl.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:pointify/controllers/productcontroller.dart';
import 'package:pointify/controllers/reports_controller.dart';
import 'package:pointify/controllers/salescontroller.dart';
import 'package:pointify/controllers/shopcontroller.dart';
import 'package:pointify/controllers/warehousecontroller.dart';
import 'package:pointify/main.dart';
import 'package:pointify/screens/authentication/admin/admin_login.dart';
import 'package:pointify/screens/authentication/landing.dart';
import 'package:pointify/screens/home/home.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:uuid/uuid.dart';

import '../functions/functions.dart';
import '../models/usermodel.dart';
import '../responsive/responsiveness.dart';
import '../screens/home/home_page.dart';
import '../screens/shop/create_shop.dart';
import '../services/authentication.dart';
import '../services/preference_manager.dart';
import '../services/settings.dart';
import '../services/user.dart';
import '../sqlite/helper.dart';
import '../utils/app_config.dart';
import '../utils/constants.dart';
import '../utils/helper.dart';
import '../widgets/alert.dart';
import '../widgets/loading_dialog.dart';
import '../widgets/snackbars.dart';
import 'customercontroller.dart';
import 'expensecontroller.dart';

class AuthController {
  RxBool signuserLoad = RxBool(false);
  GlobalKey<FormState> signupkey = GlobalKey();
  GlobalKey<FormState> loginKey = GlobalKey();
  RxBool showPassword = true.obs;
  RxBool resetPassword = RxBool(false);
  RxBool loginuserLoad = RxBool(false);
  GlobalKey<FormState> adminresetPassWordFormKey = GlobalKey();
  Rxn<CountryCode> selectedCountry = Rxn(CountryCode.fromCountryCode("KE"));

  TextEditingController attendantUidController = TextEditingController();
  TextEditingController attendantPasswordController = TextEditingController();
  RxBool showingUpdateAlert = RxBool(false);
  RxBool loginAttendantLoad = RxBool(false);
  GlobalKey<FormState> loginAttendantKey = GlobalKey();
  TextEditingController passwordControllerConfirm = TextEditingController();
  TextEditingController emailController = TextEditingController();
  TextEditingController referalController = TextEditingController();
  TextEditingController passwordController = TextEditingController();
  TextEditingController otpController = TextEditingController();
  TextEditingController nameController = TextEditingController();
  TextEditingController phoneController = TextEditingController();
  final GlobalKey<State> _keyLoader = GlobalKey<State>();
  var prefs = PreferenceManager();

  final RxBool smsEnabled = false.obs;
  getToken() async {
    return await prefs.getString('user_token');
  }

  getUserData() async {
    var response = await Authentication.getUser(
      userController.currentUserId.value,
    );
    if (response["error"] != null) {
      logOut();
    }
    userController.currentUser.value?.smscredit = response['smscredit'] == null
        ? 0.0
        : isInteger(response['smscredit'] ?? response['smscredit'])
            ? (response['smscredit']).toDouble()
            : response['smscredit'] ?? response['smscredit'] ?? 0.0;
    userController.currentUser.refresh();
    return response;
  }

  initUser({String type = ""}) async {
    bool connected = await isConnected();

    // try {
    if (connected) {
      if ((await prefs.getString('id')) == null) return;
      userController.currentUserId.value = (await prefs.getString('id'))!;
      if (userController.currentUserId.value.isEmpty) logOut();
      var usertype = await prefs.getString('user_type');
      var response;
      if (usertype == "admin") {
        response = await Authentication.getUser(
          userController.currentUserId.value,
        );
        if (response["error"] != null) {
          logOut();
        }
        response["usertype"] = usertype;

        DatabaseHelper().insertUser(response);
        userController.currentUser.value = UserModel.fromJson(response);
      } else if (usertype == "attendant") {
        var response = await Authentication.getAttendant(
          userController.currentUserId.value,
        );
        if (response["error"] != null) {
          logOut();
        }
        response["usertype"] = usertype;
        userController.currentUser.value = UserModel.fromJson(response);
        userController.getRoles(userController.currentUser.value!);
      }
    } else {
      if (await prefs.getString('id') == null) return;
      String? id = await prefs.getString('id');
      if (id!.isEmpty) return;
      final dbHelper = DatabaseHelper();
      final user = await dbHelper.getUserByEmail(id: id);
      if (user != null) {
        user['primaryShop']['_id'] = user['primaryShop']['id'];
        user['attendantId']['_id'] = user['attendantId']['id'];
        user['_id'] = user['id'];
        userController.currentUser.value = UserModel.fromJson(user);
      } else {
        await logOut();
        return;
      }
    }

    var user = userController.currentUser.value;
    if (user != null) {
      if (user.usertype == "attendant") {
        Get.off(() => HomePage());
      } else {
        final DateTime now = DateTime.now();
        int days = DateTime.parse(
          userController.currentUser.value!.emailVerificationDate!,
        ).difference(DateTime(now.year, now.month, now.day)).inDays;
        if (userController.currentUser.value?.primaryShop != null) {
          if (type == "auth") {
            Get.offAll(() => const Home());
          } else {
            Get.off(() => const Home());
          }
        } else {
          Get.offAll(() => CreateShop(page: "reg"));
        }
      }
    }
    // } catch (e) {
    //   print("Error: $e");
    //   debugPrintMessage(e);
    // } finally {
    SettingsApi.getSettings().then((data) async {
      var app = data['APP_CONFIG'];
      var themes = data['theme'];
      var general = data['GENERAL_CONFIG'];
      var stripe = data['STRIPE_CONFIG'];
      AppConfig.country_code =
          general == null ? "KES" : general['country_code'] ?? "US";
      AppConfig.stripePublishKey = stripe['stripePublishKey'] ?? "";
      if (AppConfig.stripePublishKey.isNotEmpty) {
        Stripe.publishableKey = AppConfig.stripePublishKey;
        Stripe.merchantIdentifier = themes['app_name'].toLowerCase().trim();
        await Stripe.instance.applySettings();
      }
      if (app != null) {
        AppConfig.offline_mode = app['offlineEnabled'] ?? false;
        AppConfig.androidLink = app['androidLink'] ?? "";
        AppConfig.demo_mode = app['demoEnabled'] ?? false;
        AppConfig.iosLink = app['iosLink'] ?? "";
      }
      if (AppConfig.offline_mode == false) {
        userController.enableOffline.value = false;
      } else {
        userController.enableOffline.value = true;
      }
      checkForUpdate(app);
    });

    if (await isConnected()) {
      if (userController.currentUser.value != null &&
          userController.currentUser.value!.primaryShop != null) {
        Get.find<ProductController>().getProductStats(
            userController.currentUser.value!.primaryShop!.id!);
        Get.find<SalesController>().getSalesByDate(
          type: "today",
          shop: userController.currentUser.value!.primaryShop!.id!,
        );
        Get.find<SalesController>().getNetAnalysis(
          fromDate: DateFormat('yyyy-MM-dd').format(DateTime.now()),
          toDate: DateFormat('yyyy-MM-dd').format(DateTime.now()),
          type: "today",
          shopId: userController.currentUser.value!.primaryShop!.id!,
        );

        Get.find<ExpenseController>().getExpenses(
          fromDate: DateFormat('yyyy-MM-dd').format(DateTime.now()),
          toDate: DateFormat('yyyy-MM-dd').format(DateTime.now()),
          shop: userController.currentUser.value?.primaryShop!.id!,
        );
        User().updateLastSeen();
        if (userController.currentUser.value?.primaryShop?.warehouse == true) {
          Get.find<WareHouseController>().getRequests(
            warehouse: userController.currentUser.value?.primaryShop?.id,
          );
        }
      }
      if (userController.currentUser.value?.primaryShop != null) {
        rateApp();
      }
      Get.find<ShopController>().getShops();
    }

    Get.find<ProductController>().getProductsBySort(type: "all");
    Get.find<CustomerController>().getCustomersInShop('');
    Get.find<SalesController>().getOrders(
      fromDate: Get.find<ReportsController>().filterStartDate.value,
      toDate: Get.find<ReportsController>().filterEndDate.value,
    );
    // }
  }

  rateApp() async {
    try {
      if (userController.currentUser.value == null) {
        return;
      }
      //check last time this prompt was shown if its greater less than 7 days then break
      if (userController.currentUser.value!.lastAppRatingDate != null) {
        final DateTime now = DateTime.now();
        int days = DateTime.parse(
          userController.currentUser.value!.lastAppRatingDate!,
        ).difference(DateTime(now.year, now.month, now.day)).inDays;
        if (days <= 7) {
          return;
        }
      }
      final InAppReview inAppReview = InAppReview.instance;
      if (await inAppReview.isAvailable()) {
        // The review dialog can be displayed
        await inAppReview.requestReview();
      } else {
        // Optionally, you can redirect the user to the app store page
        await inAppReview.openStoreListing(appStoreId: AppConfig.appstoreId);
      }
      if (userController.currentUser.value!.usertype == "admin") {
        userController.profileUpdate(
          lastAppRatingDate: DateFormat('yyyy-MM-dd').format(DateTime.now()),
        );
      } else {
        userController.updateAttendant(
          userModel: UserModel(id: userController.currentUser.value!.id),
          type: "other",
          lastAppRatingDate: DateFormat('yyyy-MM-dd').format(DateTime.now()),
        );
      }
    } catch (e) {
      debugPrintMessage(e);
    }
  }

  Future<void> checkForUpdate(var value) async {
    if (value == null) {
      var response = await SettingsApi.getSettings(type: "APP_SETTINGS");
      value = response;
    }

    PackageInfo packageInfo = await PackageInfo.fromPlatform();
    int latestVersion = value['android_version'] == null
        ? 0
        : int.parse(value['android_version'] ?? 0);
    String buildNumber = packageInfo.buildNumber;
    settingsData = value;
    if (Platform.isAndroid) {
      if (latestVersion > int.parse(buildNumber) &&
          showingUpdateAlert.isFalse) {
        showingUpdateAlert.value = true;
        showUpdateAlert(value['forceUpdate']);
      } else {
        showingUpdateAlert.value = false;
      }
    } else if (Platform.isIOS) {
      int latestVersion = value['ios_version'] == null
          ? 0
          : int.parse(value['ios_version'].toString());
      String buildNumber = packageInfo.buildNumber;
      if (latestVersion > int.parse(buildNumber) &&
          showingUpdateAlert.isFalse) {
        showingUpdateAlert.value = true;
        showUpdateAlert(value['forceUpdate']);
      }
    }
  }

  void showUpdateAlert(bool forceUpdate) {
    showDialog(
      context: Get.context!,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Update Available'),
          content: const Text(
            'Pointify has new updated features, please update to get the most out of it.',
          ),
          actions: [
            if (forceUpdate == false)
              TextButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  showingUpdateAlert.value = false;
                },
                child: const Text('Not Now'),
              ),
            TextButton(
              onPressed: () {
                launchStore();
                Navigator.of(context).pop();
                showingUpdateAlert.value = false;
              },
              child: const Text('Update Now'),
            ),
          ],
        );
      },
    );
  }

  void launchStore() async {
    String appPackageName = '';
    if (Platform.isAndroid) {
      appPackageName = AppConfig.androidLink;
    } else if (Platform.isIOS) {
      appPackageName = AppConfig.iosLink;
    }

    if (await canLaunchUrl(Uri.parse(appPackageName))) {
      await launchUrl(Uri.parse(appPackageName));
    }
  }

  attendantLogin(context) async {
    if (attendantPasswordController.text.isEmpty ||
        attendantUidController.text.isEmpty) {
      generalAlert(title: "Error", message: "Enter user id");
      return;
    }
    try {
      loginAttendantLoad.value = true;
      var password = attendantPasswordController.text;
      var uid = attendantUidController.text;
      var response = await Authentication.loginAttendant(
        uid: uid,
        password: password,
      );
      if (response["error"] != null) {
        loginAttendantLoad.value = false;
        generalAlert(title: "Error", message: response["error"]);
        return;
      }

      userController.currentUser.value = UserModel.fromJson(
        response["userdata"],
      );
      await prefs.saveString('user_token', response["token"]);
      await prefs.saveString('user_type', "attendant");
      await prefs.saveString('id', userController.currentUser.value!.id!);
      userController.currentUser.refresh();

      await initUser();
      loginuserLoad.value = false;
      loginAttendantLoad.value = false;
    } catch (e) {
      loginAttendantLoad.value = false;
      generalAlert(title: "Error", message: "UID supplied does not exist");
    }
  }

  getReferer() async {
    return await prefs.getString('refer') ?? "";
  }

  registerAdmin(context) async {
    if (nameController.text == "" ||
        emailController.text == "" ||
        phoneController.text == "") {
      generalAlert(title: "Error", message: "Fill all required fields");
      return;
    }
    try {
      if (passwordController.text.toString().trim().length < 6) {
        generalAlert(
          title: "Error",
          message: "Password must be more than 6 characters",
        );
        return;
      }
      signuserLoad.value = true;

      PackageInfo packageInfo = await PackageInfo.fromPlatform();
      String buildNumber = packageInfo.buildNumber;
      var response = {
        "email": emailController.text,
        "password": passwordController.text,
        "username": nameController.text,
        "phone": selectedCountry.value!.dialCode! + phoneController.text,
        "platform": Platform.isIOS ? "ios" : "android",
        "app_version": buildNumber,
        "referal": await getReferer(),
        "affliate": referalController.text,
      };
      var adminResponse = await Authentication.registerUser(response);

      if (adminResponse["status"] == false) {
        signuserLoad.value = false;
        showSnackBar(message: adminResponse["error"], color: Colors.red);
        return;
      }
      userController.currentUser.value = UserModel.fromJson(
        adminResponse["userdata"],
      );

      await prefs.saveString('user_token', adminResponse["token"]);
      await prefs.saveString('user_type', "admin");
      await prefs.saveString('id', userController.currentUser.value!.id!);
      userController.currentUser.refresh();
      await initUser();
      clearDataFromTextFields();
      if (userController.currentUser.value?.primaryShop == null) {
        Get.offAll(() => CreateShop(page: "home", clearInputs: true));
      }

      signuserLoad.value = false;
    } catch (e) {
      showSnackBar(
        message: "error creating account, try another email",
        color: Colors.red,
      );
      signuserLoad.value = false;
    }
  }

  Future<void> logOut() async {
    String id = userController.currentUserId.value;
    await prefs.clear();
    userController.currentUser.value = null;
    userController.switcheduser.value = null;
    userController.currentUserId.value = "";
    loginKey.currentState?.reset();
    Get.offAll(() => const Landing());
    await prefs.saveString('sqlite_db_key', id);
  }

  validateEmail(String email) {
    return RegExp(
      r"^[a-zA-Z0-9.a-zA-Z0-9.!#$%&'*+-/=?^_`{|}~]+@[a-zA-Z0-9]+\.[a-zA-Z]+",
    ).hasMatch(email);
  }

  Future<void> resetPasswordEmail({
    required String email,
    required String password,
    required type,
  }) async {
    resetPassword.value = false;
    LoadingDialog.showLoadingDialog(
      context: Get.context!,
      title: "Please wait",
      key: _keyLoader,
    );
    var response = await Authentication.requestPasswordReset(
      emailController.text,
    );
    Get.back();
    if (response["error"] != null) {
      generalAlert(message: response["error"]);
      return;
    }
    resetPassword.value = true;
  }

  Future<void> resetPasswordOtp() async {
    if (passwordController.text != passwordControllerConfirm.text) {
      generalAlert(message: "Password does not match");
      return;
    }
    if (otpController.text.isEmpty) {
      generalAlert(message: "Please enter OTP");
      return;
    }
    LoadingDialog.showLoadingDialog(
      context: Get.context!,
      title: "Please wait",
      key: _keyLoader,
    );
    var response = await Authentication.passwordReset(
      emailController.text,
      otpController.text,
      passwordController.text,
    );
    Get.back();
    if (response["error"] != null) {
      generalAlert(message: response["error"], title: "Error");
      return;
    }
    resetPassword.value = false;
    Get.to(() => AdminLogin());
  }

  login(context, {String type = ""}) async {
    if (emailController.text == "" || passwordController.text == "") {
      generalAlert(title: "Error", message: "Please enter email and password");
      return;
    }
    loginuserLoad.value = true;
    bool connected = await isConnected();
    var response;

    if (connected) {
      response = await Authentication.loginUser(
        type: "admin",
        email: emailController.text,
        password: passwordController.text,
      );
      if (response == null) {
        loginuserLoad.value = false;
        return;
      }
      if (response["error"] != null) {
        loginuserLoad.value = false;
        showSnackBar(message: response["error"], color: Colors.red);
        return;
      }
      userController.currentUserId.value = response["userdata"]['_id'];
      DatabaseHelper dbHelper = DatabaseHelper();
      response["userdata"]['usertype'] = 'admin';
      dbHelper.insertUser(response["userdata"]);

      await prefs.saveString('user_token', response["token"]);
      await prefs.saveString('user_type', "admin");
      await prefs.saveString('id', response["userdata"]['_id']);
      await initUser(type: type);
    } else {
      DatabaseHelper dbHelper = DatabaseHelper();
      final user = await dbHelper.getUserByEmail(email: emailController.text);
      if (user != null) {
        await prefs.saveString('user_type', "admin");
        await prefs.saveString('id', user['id']);
        userController.currentUserId.value = user['id'];
        await initUser(type: type);
      } else {
        showSnackBar(
          message: "no user with that email and password",
          color: Colors.red,
        );
      }
    }
    loginuserLoad.value = false;
    clearDataFromTextFields();
  }

  clearDataFromTextFields() {
    nameController.text = "";
    emailController.text = "";
    phoneController.text = "";
    passwordController.text = "";
  }
}

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/services/user.dart';
import 'package:pointify/sqlite/helper.dart';

import '../main.dart';
import '../models/usermodel.dart';
import '../responsive/responsiveness.dart';
import '../screens/home/attendant/attendants_page.dart';
import '../utils/app_config.dart';
import '../utils/helper.dart';
import '../widgets/alert.dart';
import '../widgets/loading_dialog.dart';
import 'homecontroller.dart';

class UserController {
  TextEditingController textEditingCredit = TextEditingController();
  TextEditingController passwordController = TextEditingController();
  TextEditingController confirmPassword = TextEditingController();
  TextEditingController nameController = TextEditingController();
  TextEditingController attendantId = TextEditingController();
  final GlobalKey<State> _keyLoader = GlobalKey<State>();
  RxList permissions = RxList([]);

  TextEditingController passwordControllerConfirm = TextEditingController();
  TextEditingController emailController = TextEditingController();
  TextEditingController phoneController = TextEditingController();
  final TextEditingController topUpPhoneController = TextEditingController();
  final TextEditingController topUpAmountController = TextEditingController();
  final RxDouble topUpAmount = 0.0.obs;
  final RxBool toppingUp = false.obs;
  final RxDouble pricePerSms = 0.50.obs;
  Rxn<UserModel> switcheduser = Rxn(null);
  RxBool internetConected = RxBool(true);
  RxBool enableOffline = RxBool(AppConfig.offline_mode);
  Rxn<UserModel> currentUser = Rxn(null);
  RxList<UserModel> attendants = RxList([]);
  RxString currentUserId = RxString('');
  RxString messagesCount = RxString('');

  RxBool profileupdateLoading = RxBool(false);
  RxBool attendantsloading = RxBool(false);
  RxList roles = RxList([]);

  RxString activePermission = RxString("");

  getRoles(UserModel userModel) {
    var all = [];
    if (userModel.permisions != null) {
      List perms = userModel.permisions!;
      for (var element in perms) {
        all.add({"key": element["key"], "value": element["value"]});
      }
    }
    roles.value = all;
  }

  deleteAttendant({UserModel? userModel}) async {
    await User.deleteUser(userModel!);
    getAttendants();
  }

  bool isAttendannt() => currentUser.value?.usertype == "attendant";

  profileUpdate(
      {String? shopId,
      bool? editEmail = false,
      String? lastAppRatingDate}) async {
    try {
      var response;
      if (!await isConnected()) {
        response = await DatabaseHelper().updateProfilePrimaryShop(shopId);
      } else {
        profileupdateLoading.value = true;
        response = await User().profileUpdate({
          "email": emailController.text,
          "password": passwordController.text,
          "username": nameController.text,
          "phone": phoneController.text,
          "lastAppRatingDate": lastAppRatingDate ?? "",
          "shop": shopId ?? userController.currentUser.value?.primaryShop?.id
        });
      }

      if (response["error"] != null) {
        generalAlert(
          message: response["error"],
        );
        return;
      }
      Get.back();
      if (passwordController.text.isNotEmpty) {
        authController.logOut();
      }
      response["usertype"] = "admin";
      currentUser.value = UserModel.fromJson(response);
      currentUser.refresh();
      if (shopId != null) {
        await authController.initUser();
      }
      if (editEmail == true) {
        sendVerificationEmail();
      }
    } catch (e) {
      generalAlert(
        message: e.toString(),
      );
      profileupdateLoading.value = false;
    } finally {
      profileupdateLoading.value = false;
    }
  }

  deleteAccount() async {
    profileupdateLoading.value = true;
    await User.deleteAccount();
    authController.logOut();
    profileupdateLoading.value = false;
  }

  getAttendants() async {
    if (attendantsloading.isTrue) return;
    attendantsloading.value = true;
    List<dynamic> response = await User.getAttendants();
    attendants.value = response.map((e) => UserModel.fromJson(e)).toList();
    attendantsloading.value = false;
  }

  createAttendant(all) async {
    if (userController.nameController.text.isEmpty) {
      generalAlert(title: "Error", message: "Enter username");
      return;
    }
    if (userController.passwordController.text.isEmpty) {
      generalAlert(title: "Error", message: "Enter password");
      return;
    }
    profileupdateLoading.value = true;
    attendants.clear();
    await User.createAttendant({
      "password": userController.passwordController.text,
      "username": userController.nameController.text,
      "uniqueDigits": userController.attendantId.text,
      "shopId": userController.currentUser.value?.primaryShop?.id,
      "adminId": userController.currentUser.value!.id,
      "permissions": all
    });
    List<dynamic> attendantResponse = await User.getAttendants();
    profileupdateLoading.value = false;

    attendants.addAll(attendantResponse.map((e) => UserModel.fromJson(e)));
    attendants.refresh();
    userController.roles.clear();
    userController.nameController.clear();
    userController.passwordController.clear();
    Get.back();
    Get.back();
  }

  Future<void> updateAttendant({
    List<dynamic>? permissions,
    required UserModel userModel,
    required String type,
    String? lastAppRatingDate,
  }) async {
    try {
      profileupdateLoading.value = true;

      LoadingDialog.showLoadingDialog(
        context: Get.context!,
        title: "Updating attendant...",
        key: _keyLoader,
      );

      attendants.clear();

      if (type == "other") {
        await User().atendantUpdate(
          {
            "username": nameController.text,
            "password": passwordController.text,
            "lastAppRatingDate": lastAppRatingDate,
          },
          userModel.id!,
        );
      } else if (type == "permissions") {
        await User().atendantUpdate(
          {
            "permissions": permissions ?? permissions?.map((e) => e).toList(),
          },
          userModel.id!,
        );
      }

      attendants.refresh();

      List<dynamic> attendantResponse = await User.getAttendants();

      attendants.addAll(
        attendantResponse.map((e) => UserModel.fromJson(e)),
      );

      profileupdateLoading.value = false;

      // CLOSE LOADER
      Get.back();

      generalAlert(
          title: "Success",
          message: "Attendant updated successfully",
          function: () {
            Get.back();
          });
    } catch (e) {
      profileupdateLoading.value = false;

      // CLOSE LOADER
      Get.back();

      generalAlert(
        title: "Error",
        message: e.toString(),
      );
    }
  }

  void sendVerificationEmail() async {
    try {
      LoadingDialog.showLoadingDialog(
          context: Get.context!, title: "Please wait...", key: _keyLoader);
      var response = await User.sendVerificationEmail();

      if (response["error"] != null) {
        generalAlert(message: response["error"]);
      }
      Get.back();
      generalAlert(message: response["message"], title: "Success");
    } catch (e) {
      Get.back();
    }
  }
}

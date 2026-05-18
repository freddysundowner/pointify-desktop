import 'package:package_info_plus/package_info_plus.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/usermodel.dart';
import 'package:pointify/sqlite/helper.dart';
import 'package:pointify/utils/helper.dart';

import 'client.dart';
import 'end_points.dart';

class User {
  Future getSettings({String type = "APP_CONFIG"}) async {
    // try {
    if (!await isConnected()) {
      return await DatabaseHelper().getOfflineSettings();
    }
    var response = await DbBase()
        .databaseRequest("${EndPoints.setting}?type=$type", DbBase().getRequestType);
    return response;
    // } catch (e) {
    //   return null;
    // }
  }

  profileUpdate(var json) async {
    String? id = userController.currentUser.value!.id!;
    var response = await DbBase().databaseRequest(
        "${EndPoints.profile}$id", DbBase().putRequestType,
        body: json);
    return response;
  }

  static deleteAccount() async {
    var response = await DbBase().databaseRequest(
        "${EndPoints.profile}${userController.currentUser.value!.id!}",
        DbBase().deleteRequestType,
        body: {"adminId": userController.currentUser.value?.id});
    return response;
  }

  static getAttendants() async {
    var response = await DbBase().databaseRequest(
      "${EndPoints.attendantsfilter}?adminId=${userController.currentUser.value?.id}",
      DbBase().getRequestType,
    );
    return response;
  }

  static createAttendant(Map<String, dynamic> map) async {
    var response = await DbBase().databaseRequest(
        EndPoints.attendants, DbBase().postRequestType,
        body: map);
    return response;
  }

  atendantUpdate(Map<String, dynamic> map, String id) async {
    var response = await DbBase().databaseRequest(
        EndPoints.attendants + id, DbBase().putRequestType,
        body: map);
    return response;
  }

  static deleteUser(UserModel userModel) async {
    var response = await DbBase().databaseRequest(
        EndPoints.attendants + userModel.id!, DbBase().deleteRequestType);
    return response;
  }

  Future<void> updateLastSeen() async {
    PackageInfo packageInfo = await PackageInfo.fromPlatform();
    String buildNumber = packageInfo.buildNumber;
    var response = await DbBase()
        .databaseRequest(EndPoints.lastseen, DbBase().putRequestType, body: {
      "type": userController.currentUser.value!.usertype,
      "userid": userController.currentUser.value!.id,
      "app_version": buildNumber
    });
    return response;
  }

  static sendVerificationEmail() async {
    var response = await DbBase().databaseRequest(
        EndPoints.sendverificationemail, DbBase().postRequestType,
        body: {"userid": userController.currentUser.value!.id});
    return response;
  }
}

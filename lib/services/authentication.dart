
import 'package:pointify/services/end_points.dart';

import 'client.dart';

class Authentication {
  static registerUser(Map<String, dynamic> data) async {
    var response = await DbBase().databaseRequest(
        EndPoints.register, DbBase().postRequestType,
        body: data);
    return response;
  }


  static requestPasswordReset(String email) async {
    var response = await DbBase().databaseRequest(
        EndPoints.requestpassword, DbBase().postRequestType,
        body: {"email": email});

    return response;
  }

  static passwordReset(String email, String otp, String password) async {
    var response = await DbBase().databaseRequest(
        EndPoints.resetpassword, DbBase().postRequestType,
        body: {"email": email, 'newpassword': password, 'otp': otp});
    return response;
  }

  static Future getUser(String userId) async {
    var response = await DbBase()
        .databaseRequest(EndPoints.admin + userId, DbBase().getRequestType);
    return response;
  }

  static loginUser(
      {required String type,
      required String email,
      required String password}) async {
    var response = await DbBase().databaseRequest(
        EndPoints.login, DbBase().postRequestType,
        body: {"email": email, "password": password});

    return response;
  }

  static loginAttendant({required String uid, required String password}) async {
    var response = await DbBase().databaseRequest(
        EndPoints.getattendantslogin, DbBase().postRequestType,
        body: {"uid": uid, "password": password});

    return response;
  }

  static getAttendant(String value) async {
    var response = await DbBase().databaseRequest(
        EndPoints.getattendants + value, DbBase().getRequestType);
    return response;
  }
}

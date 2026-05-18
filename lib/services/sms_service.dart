import 'package:pointify/main.dart';
import 'package:pointify/services/client.dart';
import 'package:pointify/services/end_points.dart';

class SmsService {
  static Future topUpCredits(
      {required String phone, required double amount}) async {
    String url = "${EndPoints.topUp}?phone=$phone&shop=$amount";
    var response = await DbBase().databaseRequest(url, DbBase().postRequestType,
        body: {
          "phone": phone,
          "amount": amount,
          "userid": userController.currentUser.value!.id
        });
    return response;
  }
}

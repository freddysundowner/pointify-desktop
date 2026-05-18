import 'package:pointify/models/product.dart';
import 'package:pointify/models/shop.dart';
import 'package:pointify/utils/constants.dart';

class UserModel {
  String? id;
  String? email;
  bool? saleSmsEnabled;
  String? username;
  double? smscredit;
  Attendant? attendantId;
  int? uniqueDigits;
  List<dynamic>? permisions;
  Shop? primaryShop;
  String? phone;
  double? referalCredit;
  bool? emailVerified;
  String? lastAppRatingDate;
  String? emailVerificationDate;
  bool? phoneVerified;
  String? usertype;

  UserModel(
      {this.id,
      this.emailVerified,
      this.phoneVerified,
      this.lastAppRatingDate,
      this.email,
      this.smscredit,
      this.emailVerificationDate,
      this.phone,
      this.saleSmsEnabled,
      this.username,
      this.primaryShop,
      this.referalCredit});

  UserModel.fromJson(Map<String, dynamic> json) {
    id = json['_id'];
    emailVerified = json['emailVerified'] == 1 || json['emailVerified'] == true
        ? true
        : json['emailVerified'] == 0 || json['emailVerified'] == false
            ? false
            : null;
    phoneVerified = json['phoneVerified'] == 1 || json['phoneVerified'] == true
        ? json['phoneVerified'] == 0 || json['phoneVerified'] == false
            ? false
            : true
        : null;
    smscredit = json['smscredit'] == null
        ? 0.0
        : isInteger(json['smscredit'] ?? json['smscredit'])
            ? (json['smscredit']).toDouble()
            : json['smscredit'] ?? json['smscredit'] ?? 0.0;
    saleSmsEnabled = json['saleSmsEnabled'];
    emailVerificationDate = json['emailVerificationDate'];
    lastAppRatingDate = json['lastAppRatingDate'];
    permisions = json['permissions'] ?? [];
    referalCredit = json['referalCredit'] == null
        ? 0.0
        : isInteger(json['referalCredit'] ?? json['referalCredit'])
            ? (json['referalCredit']).toDouble()
            : json['referalCredit'] ?? json['referalCredit'] ?? 0.0;
    email = json['email'] ?? "";
    phone = json['phone'] ?? "";
    if (json['usertype'] == "admin") {
      attendantId = json['attendantId'] != null
          ? Attendant.fromJson(json['attendantId'])
          : null;
      primaryShop =
          (json['primaryShop'] is String == true || json['primaryShop'] == null
              ? null
              : Shop.fromJson(json['primaryShop']));
    } else {
      attendantId = Attendant.fromJson(json);
      primaryShop = json['shopId'] is String == true || json['shopId'] == null
          ? null
          : Shop.fromJson(json['shopId']);
    }
    usertype = json['usertype'] ?? "";
    uniqueDigits = json['uniqueDigits'] ?? 0;
    username = json['username'] ?? "";
  }
  bool isInteger(num value) => value is int || value == value.roundToDouble();

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['id'] = id;
    data['uniqueDigits'] = uniqueDigits;
    data['permisions'] = permisions;
    data['email'] = email;
    data['phone'] = phone;
    data['username'] = username;
    return data;
  }

  freeDays() {
    if (referalCredit == 0) return 0;
    return referalCredit! / (settingsData['creditEquivalent'] ?? 10);
  }
}

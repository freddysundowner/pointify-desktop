import 'package:pointify/models/shop.dart';
import 'package:pointify/models/usermodel.dart';

class Awards {
  double? amount;
  double? balance;
  UserModel? user;
  Shop? shop;
  String? recieptNumber;
  String? sId;
  String? type;
  String? awardType;
  String? date;

  Awards(
      {this.amount,
      this.user,
      this.shop,
      this.sId,
      this.date,
      this.awardType,
      this.type,
      this.recieptNumber});

  Awards.fromJson(Map<String, dynamic> json) {
    balance = isInteger(json['balance'])
        ? (json['balance']).toDouble()
        : json['balance'];
    type = json['type'] ?? "Payment";
    awardType = json['awardType'] ?? "";
    amount = isInteger(json['totalAmount'] ?? json['amount'])
        ? (json['totalAmount'] ?? json['amount']).toDouble()
        : json['totalAmount'] ?? json['amount'] ?? 0.0;
    user = json['user'] != null ? UserModel.fromJson(json['user']) : null;
    shop = json['shop'] != null ? Shop.fromJson(json['shop']) : null;
    recieptNumber = json['paymentNo'];
    sId = json['_id'];
    date = json['createdAt'] ?? json['date'];
  }
  bool isInteger(num value) => value is int || value == value.roundToDouble();
}

import 'package:pointify/functions/functions.dart';

class Customer {
  String? name;
  int? totalDebt;
  double? creditLimit;
  double? wallet;
  String? shopId;
  String? attendantId;
  String? phoneNumber;
  int? customerNo;
  String? address;
  String? email;
  String? sId;
  String? createAt;

  Customer(
      {this.name,
      this.wallet,
      this.totalDebt,
      this.shopId,
      this.creditLimit,
      this.attendantId,
      this.sId,
      this.address,
      this.customerNo,
      this.phoneNumber,
      this.email,
      this.createAt});

  Customer.fromJson(Map<String, dynamic> json) {
    name = json['name'];
    creditLimit = json['creditLimit'] == null
        ? 0.0
        : isInteger(json['creditLimit'])
            ? double.parse(json['creditLimit'].toString())
            : 0.0;
    wallet = json['wallet'] != null ? toDouble(json['wallet']) : 0.0;
    totalDebt = json['totalDebt'];
    shopId = json['shopId'];
    customerNo = json['customerNo'] ?? 0;
    address = json['address'] ?? '';
    phoneNumber = json['phonenumber'] ?? '';
    email = json['email'] ?? '';
    attendantId = json['attendantId'];
    sId = json['_id'];
    createAt = json['createAt'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['name'] = name;
    data['wallet'] = wallet;
    data['totalDebt'] = totalDebt;
    data['customerNo'] = customerNo;
    data['address'] = address;
    data['email'] = email;
    data['shopId'] = shopId;
    data['attendantId'] = attendantId;
    data['phonenumber'] = phoneNumber;
    data['_id'] = sId;
    data['createAt'] = createAt;
    return data;
  }
}

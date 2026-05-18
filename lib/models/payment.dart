import 'package:pointify/models/product.dart';

import 'customer.dart';

class Payment {
  int? amount;
  int? balance;
  Attendant? attendantId;
  Customer? customerId;
  String? recieptNumber;
  String? mpesaCode;
  String? sId;
  String? paymentType;
  String? type;
  String? date;

  String? id;

  Payment(
      {this.amount,
      this.attendantId,
      this.customerId,
      this.sId,
      this.mpesaCode,
      this.date,
      this.paymentType,
      this.id,
      this.type,
      this.recieptNumber});

  Payment.fromJson(Map<String, dynamic> json) {
    balance = json['balance'] ?? 0;
    id = json['_id'];
    type = json['type'] ?? "Payment";
    amount = json['totalAmount'] ?? json['amount'];
    attendantId = json['attendantId'] != null
        ? Attendant.fromJson(json['attendantId'])
        : null;
    customerId = json['customerId'] != null
        ? Customer.fromJson(json['customerId'])
        : null;
    mpesaCode = json['mpesaCode'] ?? "";
    paymentType = json['paymentType'] ?? "";
    recieptNumber = json['paymentNo'];
    sId = json['_id'];
    date = json['createdAt'] ?? json['date'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['amount'] = amount;
    if (attendantId != null) {
      data['attendantId'] = attendantId!.toJson();
    }
    data['_id'] = sId;
    data['date'] = date;
    return data;
  }
}

import 'package:pointify/models/extra_charge.dart';
import 'package:pointify/models/product.dart';
import 'package:pointify/models/saleitem.dart';
import 'package:pointify/models/shop.dart';

import 'customer.dart';

class SaleModel {
  String? sId;
  double? totalDiscount;
  double? totaltax;
  double? totalAmount;
  List<ExtraCharge>? extraCharges;
  double? extraChargesTotal;
  double? totalWithDiscount;
  List<SaleItem>? items;
  String? receiptNo;
  String? status;
  String? order;
  Shop? shopId;
  Customer? customerId;
  Attendant? attendant;
  String? salesnote;
  String? saleType;
  String? paymentTag;
  String? paymentType;
  double? amountPaid;
  double? mpesatotal;
  double? banktotal;
  double? outstandingBalance;
  String? createdAt;
  String? orderId;
  String? dueDate;
  DateTime? sellDate;

  SaleModel(
      {this.sId,
      this.mpesatotal,
      this.sellDate,
      this.amountPaid,
      this.banktotal,
      this.salesnote,
      this.saleType,
      this.orderId,
      this.extraCharges,
      this.extraChargesTotal,
      this.totaltax,
      this.totalAmount,
      this.totalWithDiscount,
      this.dueDate,
      this.items,
      this.status,
      this.receiptNo,
      this.paymentTag,
      this.shopId,
      this.order,
      this.customerId,
      this.totalDiscount,
      this.attendant,
      this.paymentType,
      this.outstandingBalance,
      this.createdAt});

  SaleModel.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    salesnote = json['salesnote'] ?? "";
    orderId = json['orderId'] ?? "";
    paymentTag = json['paymentTag'] ?? "";
    status = json['status'];
    totalAmount =
        json['totalAmount'] == null ? 0.0 : json['totalAmount'].toDouble();
    totaltax = json['totaltax'] == null
        ? 0.0
        : isInteger(json['totaltax'])
            ? json['totaltax'].toDouble()
            : json['totaltax'] ?? 0.0;
    totalDiscount =
        json['totalDiscount'] != null ? json['totalDiscount'].toDouble() : 0.0;
    totalWithDiscount = json['totalWithDiscount'] != null
        ? json['totalWithDiscount'].toDouble()
        : 0.0;
    if (json['items'] != null) {
      items = <SaleItem>[];
      json['items'].forEach((v) {
        items!.add(SaleItem.fromJson(v));
      });
    }
    receiptNo = json['receiptNo'];
    extraChargesTotal = json['extraChargesTotal'] != null
        ? json['extraChargesTotal'].toDouble()
        : 0.0;
    if (json['extraCharges'] != null && json['extraCharges'] is List) {
      extraCharges = <ExtraCharge>[];

      json['extraCharges'].forEach((v) {
        if (v is Map<String, dynamic>) {
          extraCharges!.add(
            ExtraCharge.fromJson(v),
          );
        }
      });
    }
    if (json['shopId'] != null && json['shopId'] is String == false) {
      shopId = Shop.fromJson(json['shopId']);
    }
    customerId = json['customerId'] != null
        ? Customer.fromJson(json['customerId'])
        : null;
    attendant = json['attendantId'] != null
        ? Attendant.fromJson(json['attendantId'])
        : null;
    mpesatotal =
        json['mpesaNewTotal'] != null ? json['mpesaNewTotal'].toDouble() : 0.0;
    amountPaid =
        json['amountPaid'] != null ? json['amountPaid'].toDouble() : 0.0;
    banktotal = json['bankTotal'] != null ? json['bankTotal'].toDouble() : 0.0;
    paymentType = json['paymentType'];
    order = json['order'] ?? '';
    saleType = json['saleType'] ?? '';
    dueDate = json['duedate'];
    outstandingBalance = json['outstandingBalance'] == null
        ? 0.0
        : json['outstandingBalance'].toDouble() ?? 0.0;
    createdAt = json['createdAt'];
  }
  bool isInteger(num value) => value is int || value == value.roundToDouble();

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['totalAmount'] = totalAmount;
    data['totalWithDiscount'] = totalWithDiscount;
    if (items != null) {
      data['items'] = items!.map((v) => v.toJson()).toList();
    }
    data['receiptNo'] = receiptNo;
    if (shopId != null) {
      data['shopId'] = shopId!.id;
    }
    data['extraChargesTotal'] = extraChargesTotal;
    if (extraCharges != null) {
      data['extraCharges'] = extraCharges!.map((v) => v.toJson()).toList();
    }
    if (customerId != null) {
      data['customerId'] = customerId!.toJson();
    }
    if (attendant != null) {
      data['attendantId'] = attendant!.toJson();
    }
    data['paymentType'] = paymentType;
    data['outstandingBalance'] = outstandingBalance;
    data['createdAt'] = createdAt;
    return data;
  }
}

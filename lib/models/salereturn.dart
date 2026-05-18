import 'package:pointify/models/product.dart';

import 'customer.dart';

class SaleRetuns {
  String? sId;
  String? saleId;
  Customer? customerId;
  Attendant? attendantId;
  List<Items>? items;
  int? refundAmount;
  String? reason;
  String? createdAt;
  String? saleReturnNo;
  int? iV;

  SaleRetuns(
      {this.sId,
      this.saleId,
      this.customerId,
      this.attendantId,
      this.items,
      this.refundAmount,
      this.reason,
      this.createdAt,
      this.saleReturnNo,
      this.iV});

  SaleRetuns.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    saleId = json['saleId'];
    customerId = json['customerId'] != null
        ? Customer.fromJson(json['customerId'])
        : null;
    attendantId = json['attendantId'] != null
        ? Attendant.fromJson(json['attendantId'])
        : null;
    if (json['items'] != null) {
      items = <Items>[];
      json['items'].forEach((v) {
        items!.add(Items.fromJson(v));
      });
    }
    refundAmount = json['refundAmount'];
    reason = json['reason'];
    createdAt = json['createdAt'];
    saleReturnNo = json['saleReturnNo'];
    iV = json['__v'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['_id'] = sId;
    data['saleId'] = saleId;
    if (customerId != null) {
      data['customerId'] = customerId!.toJson();
    }
    if (attendantId != null) {
      data['attendantId'] = attendantId!.toJson();
    }
    if (items != null) {
      data['items'] = items!.map((v) => v.toJson()).toList();
    }
    data['refundAmount'] = refundAmount;
    data['reason'] = reason;
    data['createdAt'] = createdAt;
    data['saleReturnNo'] = saleReturnNo;
    data['__v'] = iV;
    return data;
  }
}

class Items {
  Product? product;
  double? quantity;
  double? unitPrice;
  String? sId;

  Items({this.product, this.quantity, this.sId, this.unitPrice});

  Items.fromJson(Map<String, dynamic> json) {
    product =
        json['product'] != null ? Product.fromJson(json['product']) : null;
    quantity = json['quantity'] is int
        ? json['quantity'].toDouble()
        : json['quantity'];
    unitPrice = json['unitPrice'] is int
        ? json['unitPrice'].toDouble()
        : json['unitPrice'];
    sId = json['_id'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    if (product != null) {
      data['product'] = product!.toJson();
    }
    data['quantity'] = quantity;
    data['unitPrice'] = unitPrice;
    data['_id'] = sId;
    return data;
  }
}

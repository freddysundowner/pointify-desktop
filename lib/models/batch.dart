import 'package:pointify/models/product.dart';

class Batch {
  String? sId;
  String? name;
  Attendant? attendant;
  int? quantity;
  int? buyingPrice;
  String? expiryDate;
  String? product;
  int? totalQuantity;
  String? createdAt;
  String? batchCode;
  String? shop;
  Batch(
      {this.sId,
      this.name,
      this.attendant,
      this.totalQuantity,
      this.batchCode,
      this.shop,
      this.buyingPrice,
      this.quantity,
      this.createdAt,
      this.expiryDate,
      this.product});

  Batch.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    shop = json['shop'];
    name = json['name'];
    attendant = json['attendant'] != null
        ? Attendant.fromJson(json['attendant'])
        : null;
    totalQuantity = json['totalQuantity'];
    buyingPrice = json['buyingPrice'];
    product = json['product'];
    quantity = json['quantity'];
    createdAt = json['createdAt'];
    expiryDate = json['expiryDate'];
    batchCode = json['batchCode'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['batchCode'] = batchCode;
    data['buyingPrice'] = buyingPrice;
    data['shop'] = shop;
    data['_id'] = sId;
    data['name'] = name;
    data['totalQuantity'] = totalQuantity;
    data['quantity'] = quantity;
    data['createdAt'] = createdAt;
    data['expiryDate'] = expiryDate;
    return data;
  }
}

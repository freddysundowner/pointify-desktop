import 'package:pointify/models/product.dart';
import 'package:pointify/models/shop.dart';

class BadStock {
  String? sId;
  Product? product;
  Shop? shop;
  Attendant? attendant;
  double? quantity;
  double? unitPrice;
  String? reason;
  String? createdAt;

  BadStock(
      {this.sId,
      this.product,
      this.shop,
      this.unitPrice,
      this.attendant,
      this.quantity,
      this.reason,
      this.createdAt});

  BadStock.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    product = Product(
        sId: json['productId']["_id"],
        name: json['productId']['name'],
        buyingPrice: isInteger(json['productId']['buyingPrice'])
            ? json['productId']['buyingPrice'].toDouble()
            : json['productId']['buyingPrice'] ?? 0.0);

    shop = Shop(id: json['shopId']["_id"], name: json['shopId']['name']);
    attendant = Attendant(
        sId: json['attendantId']["_id"],
        username: json['attendantId']['username']);
    quantity = isInteger(json['quantity'])
        ? json['quantity'].toDouble()
        : json['quantity'] ?? 0.0;
    unitPrice = isInteger(json['unitPrice'])
        ? json['unitPrice'].toDouble()
        : json['unitPrice'] ?? 0.0;
    reason = json['reason'];
    createdAt = json['createdAt'];
    reason = json['reason'];
    createdAt = json['createdAt'];
  }
  bool isInteger(num value) => value is int || value == value.roundToDouble();

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['_id'] = sId;
    if (product != null) {
      data['productId'] = product!.toJson();
    }
    if (shop != null) {
      data['shopId'] = shop!.toJson();
    }
    if (attendant != null) {
      data['attendantId'] = attendant!.toJson();
    }
    data['quantity'] = quantity;
    data['reason'] = reason;
    data['createdAt'] = createdAt;
    return data;
  }
}

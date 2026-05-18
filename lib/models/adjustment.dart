import 'package:pointify/models/product.dart';
import 'package:pointify/models/shop.dart';

class Adjustment {
  String? id;
  Product? product;
  Shop? shop;
  double? before;
  double? after;
  String? createdAt;
  double? adjusted;

  Adjustment({
    this.id,
    this.product,
    this.shop,
    this.before,
    this.after,
    this.createdAt,
    this.adjusted,
  });

  Adjustment.fromJson(Map<String, dynamic> json) {
    id = json['_id'];
    product =
        json['product'] != null ? Product.fromJson(json['product']) : null;
    shop = json['shop'] != null ? Shop.fromJson(json['shop']) : null;
    before = json['before'] is int ? json['before'].toDouble() : json['before'];
    after = json['after'] is int ? json['after'].toDouble() : json['after'];
    createdAt = json['createdAt'];
    adjusted = json['adjusted'] is int
        ? json['adjusted'].toDouble()
        : json['adjusted'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['_id'] = id;
    if (product != null) {
      data['productId'] = product!.toJson();
    }
    if (shop != null) {
      data['shopId'] = shop!.toJson();
    }
    data['before'] = before;
    data['after'] = after;
    data['createdAt'] = createdAt;
    data['adjusted'] = adjusted;
    return data;
  }
}

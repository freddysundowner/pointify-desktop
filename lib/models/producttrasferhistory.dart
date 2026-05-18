import 'package:pointify/models/shop.dart';

class ProductTrasferHistory {
  Shop? fromShopId;
  Shop? toShopId;
  int? quantity;
  String? createdAt;
  String? product;

  ProductTrasferHistory({
    this.fromShopId,
    this.toShopId,
    this.quantity,
    this.product,
    this.createdAt,
  });

  ProductTrasferHistory.fromJson(Map<String, dynamic> json) {
    fromShopId = Shop.fromJson(json['fromShopId']);
    toShopId = Shop.fromJson(json['toShopId']);
    quantity = json['quantity'];
    createdAt = json['createdAt'];
    product = json['product'];
  }
}

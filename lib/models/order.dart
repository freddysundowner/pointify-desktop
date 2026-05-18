import 'package:pointify/models/product.dart';
import 'package:pointify/models/shop.dart';

import 'customer.dart';

class OrderItem {
  String? sId;
  String? receiptNo;
  String? status;
  Shop? shop;
  String? createdAt;
  List<Item> items = [];
  Customer? customer;

  OrderItem.fromJson(Map<String, dynamic> json) {
    createdAt = json['createdAt'];
    shop = Shop.fromJson(json['shop']);
    receiptNo = json['receiptNo'];
    status = json['status'];
    sId = json['_id'];
    if (json['items'] != null) {
      items = <Item>[];
      json['items'].forEach((v) {
        items.add(Item.fromJson(v));
      });
    }
    customer =
        json['customer'] != null ? Customer.fromJson(json['customer']) : null;
  }
}

class Item {
  double? quantity;
  double? sellingPrice;
  Product? product;

  Item({this.quantity, this.sellingPrice, this.product});

  Item.fromJson(Map<String, dynamic> json) {
    quantity = json['quantity'] is int
        ? json['quantity'].toDouble()
        : json['quantity'];
    sellingPrice = json['sellingPrice'] is int
        ? json['sellingPrice'].toDouble()
        : json['sellingPrice'];
    product =
        json['product'] != null ? Product.fromJson(json['product']) : null;
  }
}

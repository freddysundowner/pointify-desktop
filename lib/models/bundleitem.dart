import 'package:pointify/functions/functions.dart';
import 'package:pointify/models/product.dart';

import 'inventory.dart';

class BundleItem {
  String? id;
  Inventory? inventory;
  String? inventoryId;
  Product? product;
  double? quantity;

  BundleItem({
    this.id,
    this.inventoryId,
    this.product,
    this.inventory,
    this.quantity,
  });

  BundleItem.fromJson(Map<String, dynamic> json) {
    id = json['_id'];
    inventory = Inventory.fromJson(json['item']);
    product = json['item']['product'] != null
        ? Product.fromJson(json['item']['product'])
        : null;
    inventoryId = Inventory.fromJson(json['item']).id;
    quantity = toDouble(json['quantity'] ?? 0.0);
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['item'] = inventory?.toJson();
    data['itemId'] = inventoryId;
    data['quantity'] = quantity;
    return data;
  }
}

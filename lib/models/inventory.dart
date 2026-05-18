import 'package:pointify/functions/functions.dart';
import 'package:pointify/models/bundleitem.dart';
import 'package:pointify/models/product.dart';

class Inventory {
  String? id;
  Product? product;
  double? quantity;
  bool? bundle;
  List<BundleItem>? bundleItems;

  Inventory(
      {this.id, this.product, this.quantity, this.bundle, this.bundleItems});

  Inventory.fromJson(Map<String, dynamic> json) {
    id = json['_id'];
    product = Product.fromJson(json['product']);
    quantity = toDouble(json['quantity']);
    bundle = json['bundle'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['_id'] = id;
    data['product'] = product!.toJson();
    data['quantity'] = quantity;
    data['bundle'] = bundle;
    if (bundleItems != null) {
      data['bundleItems'] = bundleItems!.map((v) => v.toJson()).toList();
    }
    return data;
  }
}

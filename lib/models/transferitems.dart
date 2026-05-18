import 'package:pointify/models/product.dart';

class TransferItem {
  String? sId;
  int? quantity;
  String? name;
  Product? product;

  TransferItem.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    quantity = json['quantity'];
    name = json['product']['name'];
    product = Product.fromJson(json['product']);
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['_id'] = sId;
    data['quantity'] = quantity;
    data['name'] = name;
    return data;
  }
}

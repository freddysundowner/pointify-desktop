import 'package:pointify/models/product.dart';

class ProductCount {
  String? sId;
  List<Item>? items;
  Attendant? attendantId;
  String? shopId;

  ProductCount({this.sId, this.items, this.attendantId, this.shopId});

  ProductCount.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    if (json['products'] != null) {
      items = <Item>[];
      json['products'].forEach((v) {
        items!.add(Item.fromJson(v));
      });
    }
    attendantId = Attendant.fromJson(json['attendantId']);
    shopId = json['shopId'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['_id'] = sId;
    if (items != null) {
      data['products'] = items!.map((v) => v.toJson()).toList();
    }
    data['attendantId'] = attendantId?.toJson();
    data['shopId'] = shopId;
    return data;
  }
}

class Item {
  String? name;
  int? physicalCount;
  int? quantity;
  int? sellingPrice;
  int? buyingPrice;
  int? initialCount;
  int? variance;
  String? sId;
  String? createdAt;

  Item(
      {this.name,
      this.physicalCount,
      this.quantity,
      this.sellingPrice,
      this.buyingPrice,
      this.initialCount,
      this.variance,
      this.sId,
      this.createdAt});

  Item.fromJson(Map<String, dynamic> json) {
    name = json['productId']["name"];
    if (json['productId']["buyingPrice"] is double) {
      print("Buying price is double ${json['productId']["buyingPrice"]}");
    }
    buyingPrice = json['productId']["buyingPrice"];
    quantity = json['productId']["quantity"];
    sellingPrice = json['productId']["sellingPrice"];
    physicalCount = json['physicalCount'];
    initialCount = json['initialCount'];
    variance = json['variance'];
    sId = json['_id'];
    createdAt = json['createdAt'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['productId'] = name;
    data['sellingPrice'] = sellingPrice;
    data['quantity'] = quantity;
    data['buyingPrice'] = buyingPrice;
    data['physicalCount'] = physicalCount;
    data['initialCount'] = initialCount;
    data['variance'] = variance;
    data['_id'] = sId;
    data['createdAt'] = createdAt;
    return data;
  }
}

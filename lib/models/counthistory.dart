import 'package:pointify/models/product.dart';

class CountHistory {
  List<ProductCount>? products;
  Attendant? attendantId;
  String? shopId;
  String? sId;

  CountHistory({this.products, this.attendantId, this.shopId, this.sId});

  CountHistory.fromJson(Map<String, dynamic> json) {
    if (json['products'] != null) {
      products = <ProductCount>[];
      json['products'].forEach((v) {
        products!.add(ProductCount.fromJson(v));
      });
    }
    attendantId = Attendant.fromJson(json['attendantId']);
    shopId = json['shopId'];
    sId = json['_id'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    if (products != null) {
      data['products'] = products!.map((v) => v.toJson()).toList();
    }
    data['attendantId'] = attendantId;
    data['shopId'] = shopId;
    data['_id'] = sId;
    return data;
  }
}

class ProductCount {
  String? productId;
  int? physicalCount;
  int? initialCount;
  int? variance;
  String? sId;
  String? createdAt;

  ProductCount(
      {this.productId,
      this.physicalCount,
      this.initialCount,
      this.variance,
      this.sId,
      this.createdAt});

  ProductCount.fromJson(Map<String, dynamic> json) {
    productId = json['productId'];
    physicalCount = json['physicalCount'];
    initialCount = json['initialCount'];
    variance = json['variance'];
    sId = json['_id'];
    createdAt = json['createdAt'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['productId'] = productId;
    data['physicalCount'] = physicalCount;
    data['initialCount'] = initialCount;
    data['variance'] = variance;
    data['_id'] = sId;
    data['createdAt'] = createdAt;
    return data;
  }
}

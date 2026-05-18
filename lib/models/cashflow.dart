import 'package:pointify/models/cashflowcategory.dart';
import 'package:pointify/models/product.dart';
import 'package:pointify/models/shop.dart';

class CashFlowModel {
  String? sId;
  String? name;
  int? amount;
  CashFlowCategory? category;
  Attendant? attendantId;
  Shop? shopId;
  String? createAt;
  int? iV;

  CashFlowModel(
      {this.sId,
      this.name,
      this.amount,
      this.category,
      this.attendantId,
      this.shopId,
      this.createAt,
      this.iV});

  CashFlowModel.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    name = json['name'];
    amount = json['amount'];
    category = json['category'] != null
        ? CashFlowCategory.fromJson(json['category'])
        : null;
    attendantId = json['attendantId'] != null
        ? Attendant.fromJson(json['attendantId'])
        : null;
    shopId = json['shopId'] != null ? Shop.fromJson(json['shopId']) : null;
    createAt = json['createAt'];
    iV = json['__v'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['_id'] = sId;
    data['name'] = name;
    data['amount'] = amount;
    if (attendantId != null) {
      data['attendantId'] = attendantId!.toJson();
    }
    if (shopId != null) {
      data['shopId'] = shopId!.toJson();
    }
    data['createAt'] = createAt;
    data['__v'] = iV;
    return data;
  }
}

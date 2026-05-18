import 'package:pointify/models/product.dart';
import 'package:pointify/models/salemodel.dart';

class SaleItem {
  String? id;
  Product? product;
  double? quantity;
  double? unitPrice;
  double? totalLinePrice;
  SaleModel? currentSale;
  dynamic sale;
  Attendant? attendant;
  String? receiptNo;
  double? lineDiscount;
  double? tax;
  String? createdAt;

  SaleItem(
      {this.id,
      this.product,
      this.quantity,
      this.tax,
      this.totalLinePrice,
      this.unitPrice,
      this.receiptNo,
      this.currentSale,
      this.sale,
      this.attendant,
      this.lineDiscount,
      this.createdAt});
  bool isInteger(num value) => value is int || value == value.roundToDouble();

  SaleItem.fromJson(Map<String, dynamic> json) {
    id = json['_id'];
    product =
        json['product'] != null ? Product.fromJson(json['product']) : null;
    quantity = json['quantity'].toDouble();
    totalLinePrice = json['quantity'].toDouble() * json['unitPrice'].toDouble();
    unitPrice = json['unitPrice'].toDouble();
    receiptNo = json['sale'] != null && json['sale'] is String == false
        ? json['sale']['receiptNo']
        : '';
    tax = json['tax'] != null && isInteger(json['tax'])
        ? json['tax'].toDouble()
        : json['tax'] ?? 0.0;
    sale = json['sale']; //to be remove
    currentSale = json['sale'] == null || json['sale'] is String == true
        ? null
        : SaleModel.fromJson(json['sale']);
    attendant =
        json['attendantId'] != null && json['attendantId'] is String == false
            ? Attendant.fromJson(json['attendantId'])
            : null;
    lineDiscount = json['lineDiscount'].toDouble();
    createdAt = json['createdAt'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    if (product != null) {
      data['product'] = product!.sId;
    }
    data['quantity'] = quantity;
    data['unitPrice'] = unitPrice;
    data['tax'] = tax;
    data['attendantId'] = attendant?.sId;
    data['inventory'] = product?.inventoryId;
    data['lineDiscount'] = lineDiscount;
    data['createdAt'] = createdAt;
    return data;
  }
}

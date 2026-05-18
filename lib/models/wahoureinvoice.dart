import 'package:pointify/models/product.dart';
import 'package:pointify/models/shop.dart';
import 'package:pointify/models/warehouseitem.dart';

class WareHouseInvoice {
  String? id;
  double? total;
  List<WareHouseItem>? items;
  String? invoiceNumber;
  String? status;
  Shop? shop;
  Attendant? acceptedBy;
  Attendant? attendant;
  String? note;
  DateTime? acceptedDate;
  DateTime? createdDate;
  DateTime? dispatchedDate;

  WareHouseInvoice(
      {this.id,
      this.total,
      this.acceptedDate,
      this.acceptedBy,
      this.items,
      this.invoiceNumber,
      this.status,
      this.shop,
      this.attendant,
      this.note,
      this.createdDate,
      this.dispatchedDate});

  WareHouseInvoice.fromJson(Map<String, dynamic> json) {
    id = json['_id'];
    total = double.parse(json['total'].toString());
    items = json['requestData'] != null
        ? (json['requestData'] as List)
            .map((i) => WareHouseItem.fromJson(i))
            .toList()
        : null;
    invoiceNumber = json['invoiceNumber'];
    status = json['status'];
    shop = json['fromShop'] != null ? Shop.fromJson(json['fromShop']) : null;
    acceptedBy = json['acceptedBy'] != null
        ? Attendant.fromJson(json['acceptedBy'])
        : null;
    attendant = json['attendant'] != null
        ? Attendant.fromJson(json['attendant'])
        : null;
    note = json['note'];
    acceptedDate = json['acceptedDate'] != null
        ? DateTime.parse(json['acceptedDate'])
        : null;
    createdDate =
        json['createdAt'] != null ? DateTime.parse(json['createdAt']) : null;
    dispatchedDate = json['dispatchedDate'] != null
        ? DateTime.parse(json['dispatchedDate'])
        : null;
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['_id'] = id;
    data['total'] = total;
    if (items != null) {
      data['items'] = items!.map((v) => v.toJson()).toList();
    }
    data['invoiceNumber'] = invoiceNumber;
    data['status'] = status;
    if (shop != null) {
      data['shop'] = shop!.toJson();
    }
    if (attendant != null) {
      data['attendant'] = attendant!.toJson();
    }
    data['note'] = note;
    data['createdDate'] = createdDate;
    data['dispatchedDate'] = dispatchedDate;
    return data;
  }
}

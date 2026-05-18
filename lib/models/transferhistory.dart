import 'package:pointify/models/product.dart';
import 'package:pointify/models/shop.dart';
import 'package:pointify/models/transferitems.dart';

class TransferHistory {
  String? sId;
  Attendant? attendant;
  Shop? fromShop;
  Shop? toShop;
  List<TransferItem>? transferItems;
  String? createdAt;

  TransferHistory(
      {this.sId,
      this.attendant,
      this.fromShop,
      this.toShop,
      this.transferItems,
      this.createdAt});

  TransferHistory.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    attendant = Attendant(
        sId: json['attendantId']['_id'],
        username: json['attendantId']['username']);
    fromShop =
        Shop(id: json['fromShopId']['_id'], name: json['fromShopId']['name']);
    toShop = Shop(id: json['toShopId']['_id'], name: json['toShopId']['name']);
    if (json['productId'] != null) {
      transferItems = <TransferItem>[];
      json['productId'].forEach((v) {
        transferItems!.add(TransferItem.fromJson(v));
      });
    }
    createdAt = json['createdAt'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['_id'] = sId;
    if (attendant != null) {
      data['attendantId'] = attendant!.toJson();
    }
    if (fromShop != null) {
      data['fromShopId'] = fromShop!.toJson();
    }
    if (toShop != null) {
      data['toShopId'] = toShop!.toJson();
    }
    if (transferItems != null) {
      data['productId'] = transferItems!.map((v) => v.toJson()).toList();
    }
    data['createdAt'] = createdAt;
    return data;
  }
}

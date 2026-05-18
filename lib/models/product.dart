import 'package:pointify/models/batch.dart';
import 'package:pointify/models/bundleitem.dart';
import 'package:pointify/models/productcategory.dart';
import 'package:pointify/models/shop.dart';
import 'package:pointify/models/supplier.dart';

import '../screens/product/create_product.dart';

class Product {
  List<CustomImage>? images;
  String? sId;
  List<Batch>? batches;
  List<BundleItem>? bundleItems;
  String? inventoryId;
  String? type;
  String? name;
  String? manufacturer;
  double? buyingPrice;
  int? totalSoldQty;
  int? salesCount;
  double? sellingPrice;
  double? wholesalePrice;
  double? dealerPrice;
  double? minSellingPrice;
  String? measureUnit;
  double? quantity;
  int? lastCount;
  double? maxDiscount;
  int? reorderLevel;
  ProductCategory? productCategoryId;
  String? barcode;
  String? expiryDate;
  Supplier? supplierId;
  Shop? shop;
  String? description;
  String? uploadImage;
  Attendant? attendantId;
  String? lastcoundate;
  String? date;
  String? status;
  bool? bundle;
  bool? virtual;
  bool? taxable;
  bool? manageByPrice;

  Product(
      {this.sId,
      this.images = const [],
      this.name,
      this.manufacturer,
      this.expiryDate,
      this.manageByPrice,
      this.status,
      this.totalSoldQty,
      this.salesCount,
      this.taxable,
      this.batches,
      this.buyingPrice,
      this.sellingPrice,
      this.minSellingPrice,
      this.virtual,
      this.quantity,
      this.bundle,
      this.inventoryId,
      this.lastCount,
      this.maxDiscount,
      this.reorderLevel,
      this.barcode,
      this.productCategoryId,
      this.measureUnit,
      this.supplierId,
      this.shop,
      this.description,
      this.uploadImage,
      this.type,
      this.dealerPrice,
      this.wholesalePrice,
      this.attendantId,
      this.lastcoundate,
      this.date});

  Product.fromJson(Map<String, dynamic> json) {
    images = json["images"] == null ||
            json["images"].isEmpty ||
            json["images"] is String
        ? null
        : List<CustomImage>.from(json["images"].map(
            (x) => CustomImage(imgType: ImageType.network, path: x ?? "")));
    sId = json['_id'];
    type = json['productType'] ?? "product";
    totalSoldQty = json['totalSoldQty'] is int
        ? double.parse(json['totalSoldQty'].toString()).toInt()
        : json['totalSoldQty'] ?? 0;
    salesCount = json['salesCount'] is int
        ? double.parse(json['salesCount'].toString()).toInt()
        : json['salesCount'] ?? 0;
    batches = json['batches'] == null
        ? []
        : List<Batch>.from(json['batches'].map((x) => Batch.fromJson(x)));
    bundleItems = json['bundleItems'] == null
        ? []
        : List<BundleItem>.from(
            json['bundleItems'].map((x) => BundleItem.fromJson(x)));
    inventoryId = json['inventoryId'] ?? "";
    manufacturer = json['manufacturer'] ?? "";
    manageByPrice = json['manageByPrice'] ?? false;
    name = json['name'];
    wholesalePrice = json['wholesalePrice'] == null
        ? 0.0
        : json['wholesalePrice'].toDouble();
    dealerPrice =
        json['dealerPrice'] == null ? 0.0 : json['dealerPrice'].toDouble();
    barcode = json['barcode'];
    expiryDate = json['expiryDate'] ?? '';
    taxable = json['taxable'] == 1 || json['taxable'] == true
        ? true
        : json['taxable'] == false
            ? false
            : null;
    buyingPrice =
        json['buyingPrice'] == null ? 0.0 : json['buyingPrice'].toDouble();
    sellingPrice =
        json['sellingPrice'] == null ? 0.0 : json['sellingPrice'].toDouble();
    minSellingPrice = json['minSellingPrice'] == null
        ? 0.0
        : json['minSellingPrice'].toDouble();
    quantity = json['quantity'] == null ? 0.0 : json['quantity'].toDouble();

    maxDiscount =
        json['maxDiscount'] == null ? 0.0 : json['maxDiscount'].toDouble();

    reorderLevel = json['reorderLevel'];
    if (json['productCategoryId'] != null &&
        json['productCategoryId'] is String == false) {
      productCategoryId = ProductCategory.fromJson(json['productCategoryId']);
    }
    if (json['supplierId'] != null && json['supplierId'] is String == false) {
      supplierId = Supplier.fromJson(json['supplierId']);
    }
    if (json['attendantId'] != null && json['attendantId'] is String == false) {
      attendantId = Attendant.fromJson(json['attendantId']);
    }
    if (json['shopId'] != null && json['shopId'] is String == false) {
      shop = Shop.fromJson(json['shopId']);
    }
    status = json['status'] ?? '';
    virtual = json['virtual'] ?? false;
    bundle = json['bundle'] ?? false;
    lastCount = json['lastCount'] ?? 0;
    measureUnit = json['measure'] ?? "";
    description = json['description'];
    uploadImage = json['uploadImage'];
    lastcoundate = json['lastcoundate'] ?? json['date'];
    date = json['date'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['_id'] = sId;
    data['name'] = name;
    data['buyingPrice'] = buyingPrice;
    data['buyingPrice'] = buyingPrice;
    data['sellingPrice'] = sellingPrice;
    data['minSellingPrice'] = minSellingPrice;
    data['quantity'] = quantity;
    data['maxDiscount'] = maxDiscount;
    data['reorderLevel'] = reorderLevel;
    if (productCategoryId != null) {
      data['productCategoryId'] = productCategoryId!.toJson();
    }
    data['measure'] = measureUnit;
    if (supplierId != null) {
      data['supplierId'] = supplierId!.toJson();
    }
    if (shop != null) {
      data['shopId'] = shop!.toJson();
    }
    data['description'] = description;
    data['uploadImage'] = uploadImage;
    if (attendantId != null) {
      data['attendantId'] = attendantId!.toJson();
    }
    data['date'] = date;
    data['lastcoundate'] = lastcoundate;
    return data;
  }

  //get the oldest (by createdAt) batch buying price
  String? getBuyingPrice() {
    if (batches!.isNotEmpty) {
      List<Batch> batches = this.batches!;
      double totalQty = batches.fold(0, (p, b) => p + b.quantity!);
      if (totalQty == 0) return buyingPrice?.toStringAsFixed(2);
      if (totalQty < quantity!) return buyingPrice?.toStringAsFixed(2);
      batches.sort((a, b) => a.createdAt!.compareTo(b.createdAt!));
      return batches.first.buyingPrice!.toStringAsFixed(2);
    } else {
      return buyingPrice?.toStringAsFixed(2);
    }
  }
}

bool isInteger(num value) => value is int || value == value.roundToDouble();

class Attendant {
  String? sId;
  String? username;

  Attendant({this.sId, this.username});

  Attendant.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    username = json['username'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['_id'] = sId;
    data['username'] = username;
    return data;
  }
}

import 'package:pointify/functions/functions.dart';
import 'package:pointify/models/product.dart';
import 'package:pointify/models/shop.dart';
import 'package:pointify/models/supplier.dart';

class Invoice {
  String? sId;
  List<InvoiceItem>? items;
  Shop? shopId;
  Supplier? supplierId;
  Attendant? attendantId;
  String? paymentType;
  int? amountPaid;
  double? totalAmount;
  int? outstandingBalance;
  String? createdAt;
  List<void>? payments;
  String? purchaseNo;
  String? invoiceType;
  String? salesnote;

  Invoice(
      {this.sId,
      this.items,
      this.shopId,
      this.salesnote,
      this.totalAmount,
      this.amountPaid,
      this.supplierId,
      this.attendantId,
      this.paymentType,
      this.outstandingBalance,
      this.createdAt,
      this.payments,
      this.purchaseNo,
      this.invoiceType});

  Invoice.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    if (json['items'] != null) {
      items = <InvoiceItem>[];
      json['items'].forEach((v) {
        items!.add(InvoiceItem.fromJson(v));
      });
    }
    if (json['shopId'] is String == false && json['shopId'] != null) {
      shopId = json['shopId'] != null ? Shop.fromJson(json['shopId']) : null;
    }
    supplierId = json['supplierId'] != null
        ? Supplier.fromJson(json['supplierId'])
        : null;
    attendantId = json['attendantId'] != null
        ? Attendant.fromJson(json['attendantId'])
        : null;
    paymentType = json['paymentType'];
    if (json['refundAmount'] != null) {
      invoiceType = "return";
    }
    salesnote = json['salesnote'] ?? '';
    amountPaid = json['amountPaid'] ?? json['amountPaid'];
    totalAmount =
        json['totalAmount'] != null ? toDouble(json['totalAmount']) : 0.0;
    outstandingBalance = json['outstandingBalance'] ?? 0;
    createdAt = json['createdAt'];
    purchaseNo = json['purchaseNo'] ?? json['purchaseReturnNo'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['_id'] = sId;
    if (shopId != null) {
      data['shopId'] = shopId!.toJson();
    }
    if (supplierId != null) {
      data['supplierId'] = supplierId!.toJson();
    }
    if (attendantId != null) {
      data['attendantId'] = attendantId!.toJson();
    }
    data['paymentType'] = paymentType;
    data['outstandingBalance'] = outstandingBalance;
    data['createdAt'] = createdAt;
    data['purchaseNo'] = purchaseNo;
    return data;
  }
}

class InvoiceItem {
  String? sId;
  Product? product;
  double? quantity;
  double? unitPrice;
  double? selligPrice;
  String? attendantId;
  Attendant? attendant;
  int? lineDiscount;
  String? createdAt;
  Invoice? purchase;

  InvoiceItem(
      {this.sId,
      this.product,
      this.quantity,
      this.selligPrice,
      this.unitPrice,
      this.attendant,
      this.attendantId,
      this.lineDiscount,
      this.createdAt,
      this.purchase});

  InvoiceItem.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    product =
        json['product'] != null ? Product.fromJson(json['product']) : null;
    quantity = toDouble(json['quantity']);
    unitPrice = toDouble(json['unitPrice']);
    if (json['attendantId'] is String == true) {
      attendantId = json['attendantId'];
    } else if (json['attendantId'] != null) {
      attendant = Attendant.fromJson(json['attendantId']);
    }

    selligPrice = json['selligPrice'] ?? 0.0;
    lineDiscount = json['lineDiscount'];
    createdAt = json['createdAt'];
    purchase = json['purchase'] != null && json['purchase'] is String == false
        ? Invoice.fromJson(json['purchase'])
        : null;
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['_id'] = sId;
    if (product != null) {
      data['product'] = product!.toJson();
    }
    if (attendant != null) {
      data['product'] = attendant!.toJson();
    }
    data['quantity'] = quantity;
    data['unitPrice'] = unitPrice;
    data['attendantId'] = attendantId;
    data['lineDiscount'] = lineDiscount;
    data['createdAt'] = createdAt;
    data['purchase'] = purchase;
    return data;
  }
}

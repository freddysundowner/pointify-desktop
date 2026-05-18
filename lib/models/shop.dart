import 'package:pointify/functions/functions.dart';
import 'package:pointify/models/shoptype.dart';
import 'package:pointify/models/subscription.dart';
import 'package:pointify/models/usermodel.dart';

class Shop {
  bool? primary;
  String? id;
  String? name;
  String? warehouseemail;
  String? location;
  double? tax;
  double? distance;
  bool? warehouse;
  bool? useWarehouse;
  bool? allownegativeselling;
  bool? production;
  bool? allowbatchtracking;
  bool? allowOnlineSelling;
  bool? allowBackup;
  String? backupemail;
  String? backupInterval;
  double? latitude;
  double? longitude;
  ShopTypes? shopCategoryId;
  Subscription? subscription;
  String? currency;
  UserModel? owner;
  String? adminId;
  String? contact;
  String? receiptemail;
  String? paybillAccount;
  String? paybillTill;
  String? addressReceipt;

  Shop(
      {this.primary,
      this.id,
      this.production,
      this.warehouseemail,
      this.tax,
      this.name,
      this.useWarehouse,
      this.receiptemail,
      this.allowbatchtracking,
      this.allownegativeselling,
      this.backupemail,
      this.backupInterval,
      this.allowOnlineSelling,
      this.allowBackup,
      this.location,
      this.distance,
      this.subscription,
      this.warehouse,
      this.shopCategoryId,
      this.currency,
      this.adminId,
      this.paybillTill,
      this.paybillAccount,
      this.contact,
      this.addressReceipt});

  Shop.fromJson(Map<String, dynamic> json) {
    primary = json['primary'] ?? false;
    allowBackup = json['allowBackup'] == 1 || json['allowBackup'] == true
        ? true
        : json['allowBackup'] == 0 || json['allowBackup'] == false
            ? false
            : false;
    allowOnlineSelling = json['allowOnlineSelling'] == 1 ||
            json['allowOnlineSelling'] == true
        ? true
        : json['allowOnlineSelling'] == 0 || json['allowOnlineSelling'] == false
            ? false
            : false;
    allowbatchtracking = json['trackbatches'] ?? false;
    useWarehouse = json['useWarehouse'] ?? false;
    production = json['production'] ?? false;
    warehouse = json['warehouse'] ?? false;
    allownegativeselling = json['allownegativeselling'] ?? false;
    warehouseemail = json['warehouseemail'] ?? '';
    receiptemail = json['receiptemail'] ?? '';
    backupInterval = json['backupInterval'] ?? '';
    tax = toDouble(json['tax'] ?? 0.0);
    backupemail = json['backupemail'] ?? '';
    id = json['_id'];
    name = json['name'];
    distance =
        json['distance'] == null ? 0.0 : toDouble(json['distance'].toString());
    location = json['address'] is String ? json['address'] : null;
    latitude = json['latitude'] is String ? json['latitude'] : null;
    longitude = json['longitude'] is String ? json['longitude'] : null;
    if (json['shopCategoryId'] != null &&
        json['shopCategoryId'] is String == false) {
      shopCategoryId = ShopTypes.fromJson(json['shopCategoryId']);
    }

    if (json['subscription'] != null &&
        json['subscription'] is String == false) {
      subscription = json['subscription'] == null
          ? null
          : Subscription.fromJson(json['subscription']);
    } else {
      subscription = null;
    }
    currency = json['currency'];
    owner = json['adminId'] == null || json['adminId'] is String
        ? null
        : UserModel.fromJson(json['adminId']);
    adminId = json['adminId'] is String ? json['adminId'] : null;
    contact = json['contact'];
    paybillAccount = json['paybill_account'];
    paybillTill = json['paybill_till'];
    addressReceipt = json['address_receipt'];
  }
  bool isInteger(num value) => value is int || value == value.roundToDouble();

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['primary'] = primary;
    data['_id'] = id;
    data['name'] = name;
    data['location'] = location;
    data['shopCategoryId'] = shopCategoryId;
    data['currency'] = currency;
    data['adminId'] = adminId;
    return data;
  }
}

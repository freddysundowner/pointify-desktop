import 'dart:convert';

import 'package:pointify/services/end_points.dart';

import '../main.dart';
import 'client.dart';

class ShopService {
  Future createWareHouse(Map<String, dynamic> shop) async {
    String url = EndPoints.warehouse;
    var response = await DbBase()
        .databaseRequest(url, DbBase().postRequestType, body: shop);
    return response;
  }

  Future createShop(Map<String, dynamic> shop) async {
    String url = EndPoints.shop;
    var response = await DbBase()
        .databaseRequest(url, DbBase().postRequestType, body: shop);
    return response;
  }

  getShopTypes({name}) async {
    var response = await DbBase()
        .databaseRequest(EndPoints.shoptypes, DbBase().getRequestType);
    return response;
  }

  getShopsAround(
      {String? name = "",
      List<String?>? categories,
      lat,
      lng,
      radius = 100}) async {
    var response = await DbBase().databaseRequest(
        "${EndPoints.shop}?adminId=${userController.currentUser.value == null ? "" : userController.currentUser.value?.id}&name=$name&latitude=$lat&longitude=$lng&radius=$radius",
        DbBase().getRequestType,
        body: {"categories": categories});
    return response;
  }

  static getShops(String adminId,
      {String name = "", String? type = "", bool? production = false}) async {
    var response = await DbBase().databaseRequest(
        "${EndPoints.getadminshop}$adminId?name=$name&type=$type",
        DbBase().getRequestType);
    return response;
  }

  static getWarehouses(String adminId, {String name = ""}) async {
    var response = await DbBase().databaseRequest(
        "${EndPoints.warehouse}$adminId?name=$name", DbBase().getRequestType);
    return response;
  }

  static getShop(String shopid, {String name = ""}) async {
    var response = await DbBase()
        .databaseRequest("${EndPoints.shop}$shopid", DbBase().getRequestType);
    return response;
  }

  updateShop(String id, Map<String, dynamic> shop) async {
    String url = EndPoints.shop + id;
    var response = await DbBase()
        .databaseRequest(url, DbBase().putRequestType, body: shop);
    return response;
  }

  deleteShop(String id) async {
    String url = EndPoints.shop + id;

    await DbBase().databaseRequest(url, DbBase().deleteRequestType);
    return jsonDecode('{"deleted": true}');
  }

  deleteDataShop(String id) async {
    String url = EndPoints.deleteshopdata + id;

    await DbBase().databaseRequest(url, DbBase().deleteRequestType);
    return jsonDecode('{"deleted": true}');
  }

  subscribe(data) async {
    String url = EndPoints.subscriptions;
    var response = await DbBase()
        .databaseRequest(url, DbBase().postRequestType, body: data);
    return response;
  }

  confirmPayment(String subscriptionid, String shopid,
      {List<String?>? shops}) async {
    String url = EndPoints.subscriptionPaymentconfirm;
    var response = await DbBase().databaseRequest(url, DbBase().postRequestType,
        body: {
          "subscriptionid": subscriptionid,
          "shopid": shopid,
          "shops": shops
        });
    return response;
  }

  updatebackupiterval(String shopid, Map<String, dynamic> data) async {
    String url = "${EndPoints.updatebackupiterval}/$shopid";
    var response = await DbBase()
        .databaseRequest(url, DbBase().putRequestType, body: data);
    return response;
  }

  backupNow(String shopid) async {
    String url = "${EndPoints.backupnow}/$shopid";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  redeemUsage(String shopId, int days) async {
    String url = "${EndPoints.redeemusage}/$shopId";
    var response = await DbBase()
        .databaseRequest(url, DbBase().postRequestType, body: {"days": days});
    return response;
  }

  Future<dynamic> checkPaymentStatus(String reference) async {
    try {
      var response = await DbBase().databaseRequest(
          "${EndPoints.checkpaymentstatus}?reference=$reference",
          DbBase().getRequestType);
      return response;
    } catch (e) {
      return null;
    }
  }
}

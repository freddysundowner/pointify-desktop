import 'dart:convert';

import 'package:pointify/models/product.dart';
import 'package:pointify/models/productcategory.dart';
import 'package:pointify/models/wahoureinvoice.dart';

import '../main.dart';
import 'client.dart';
import 'end_points.dart';

class ProductService {
  getProductCategories(String admin) async {
    var response = await DbBase().databaseRequest(
      "${EndPoints.productcategories}?admin=$admin",
      DbBase().getRequestType,
    );
    return response;
  }

  static Future<dynamic> getProductStats(String shop) async {
    try {
      var response = await DbBase().databaseRequest(
        "${EndPoints.productstats}?shopid=$shop",
        DbBase().getRequestType,
      );

      return response;
    } catch (e, s) {
      print(s);
      return null;
    }
  }

  static String getPathForProductImage(String id, int index) {
    String path = "products/images/$id";
    return "${path}_$index";
  }

  static updateProductsImages(String productId, List<dynamic> imgUrl) async {
    var respinse = await DbBase().databaseRequest(
        EndPoints.updateproductimages + productId, DbBase().putRequestType,
        body: {"images": imgUrl});
    return jsonDecode(respinse);
  }

  createProduct(Map<String, Object?> product) async {
    var response = await DbBase().databaseRequest(
        EndPoints.products, DbBase().postRequestType,
        body: product);
    return response;
  }

  static updateProducts(List<Map<String, dynamic>> products) async {
    var response = await DbBase().databaseRequest(
        "${EndPoints.products}/sync", DbBase().putRequestType,
        body: {"products": products});
    return response;
  }

  static updateProduct(Map<String, dynamic> product, String productid) async {
    var response = await DbBase().databaseRequest(
        "${EndPoints.products}/$productid", DbBase().putRequestType,
        body: product);
    return response;
  }

  static updateBarcode(Map<String, dynamic> product, String productid) async {
    var response = await DbBase().databaseRequest(
        "${EndPoints.barcode}/$productid", DbBase().putRequestType,
        body: product);
    return response;
  }

  static deleteProduct(String productid) async {
    var response = await DbBase().databaseRequest(
        "${EndPoints.products}/$productid?shop=${userController.currentUser.value?.primaryShop?.id}&useWarehouse=${userController.currentUser.value?.primaryShop?.useWarehouse}",
        DbBase().deleteRequestType);
    return response;
  }

  static getProductsBySort(
      {String? type = "",
      String? text = "",
      int? limit = 100,
      bool? warehouse = false,
      bool? useWarehouse = false,
      int? page = 1,
      String? adminId = "",
      String? date = "",
      String? productType = "",
      ProductCategory? category,
      String? productid = "",
      String? shopId = "",
      String? sort = "",
      String? reason = "",
      String barcodeid = ""}) async {
    var response = await DbBase().databaseRequest(
        "${EndPoints.products}${reason == "download" ? "?" : "?page=$page&"}reason=$reason&date=$date&limit=$limit&name=$text&shopid=$shopId&type=$type&sort=$sort&productid=$productid&barcodeid=$barcodeid&productType=$productType&useWarehouse=$useWarehouse&warehouse=$warehouse&adminid=$adminId&${category?.id != null ? "categoryId=${category?.id}" : ""}",
        DbBase().getRequestType);
    return response;
  }

  static getProductsAnalysis(
      {String? type = "", String? text = "", String? shopId = ""}) async {
    var warehouse = (userController.currentUser.value?.primaryShop?.warehouse ??
            false) ||
        (userController.currentUser.value?.primaryShop?.useWarehouse ?? false);
    var response = await DbBase().databaseRequest(
        "${EndPoints.analysis}?shopid=$shopId&warehouse=$warehouse",
        DbBase().getRequestType);
    return response;
  }

  static Future countProduct(Map<String, dynamic> data) async {
    var response = await DbBase().databaseRequest(
        EndPoints.productCount, DbBase().postRequestType,
        body: data);
    return response;
  }

  static getCountHistory(
      {String? shop, String? fromDate, String? toDate}) async {
    var response = await DbBase().databaseRequest(
        "${EndPoints.shopproductCount}/$shop?fromDate=$fromDate&toDate=$toDate",
        DbBase().getRequestType);
    return response;
  }

  static saveBadStock(Map<String, dynamic> data) async {
    var response = await DbBase().databaseRequest(
        EndPoints.badstock, DbBase().postRequestType,
        body: data);
    return response;
  }

  static Future<List> getBadStock(
      {String? product = "", String? fromDate, String? toDate}) async {
    var response = await DbBase().databaseRequest(
        "${EndPoints.badstock}?shopId=${userController.currentUser.value?.primaryShop?.id}&product=$product&startDate=$fromDate&endDate=$toDate",
        DbBase().getRequestType);
    return response;
  }

  transferProduct(Map<String, Object?> transferData) async {
    String url = EndPoints.transfer;
    var response = await DbBase()
        .databaseRequest(url, DbBase().postRequestType, body: transferData);
    return response;
  }

  getTransferHistory(
      {String? startDate = "",
      String? toDate = "",
      String? shopid = "",
      String? direction = ""}) async {
    String url =
        "${EndPoints.transferfilter}?shopId=$shopid&direction=$direction&startDate=$startDate&endDate=$toDate";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static getProductPurchasesGroupedByMonth({
    required String product,
    String? startDate = "",
    String? toDate = "",
  }) async {
    String url =
        "${EndPoints.purchasefilter}?startDate=$startDate&product=$product&endDate=$toDate&shop=${userController.currentUser.value?.primaryShop?.id}&usewarehouse=${(userController.currentUser.value?.primaryShop?.useWarehouse ?? false) || (userController.currentUser.value?.primaryShop?.warehouse ?? false)}";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static getProductPurchasesHistory({
    required String product,
    String? startDate = "",
    String? toDate = "",
  }) async {
    String url =
        "${EndPoints.productpurchase}?startDate=$startDate&product=$product&endDate=$toDate";
    if ((userController.currentUser.value?.primaryShop?.warehouse ?? false) ||
        (userController.currentUser.value?.primaryShop?.useWarehouse ??
            false)) {
      url +=
          "&warehouse=true&shop=${userController.currentUser.value?.primaryShop?.id}";
    }
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static getBadStockGroupedByMonth(
      {required String product, required String year}) async {
    String url =
        "${EndPoints.summarybadstock}?year=$year&product=$product&shop=${userController.currentUser.value?.primaryShop?.id}";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static Future<List> getProductsCountsHistory(String product) async {
    String url =
        "${EndPoints.countsproduct}/product/$product?shop=${userController.currentUser.value?.primaryShop?.id}";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static deleteProductCount(String sId) async {
    String url = "${EndPoints.productCount}/$sId";
    var response =
        await DbBase().databaseRequest(url, DbBase().deleteRequestType);
    return response;
  }

  importProducts(List<Map<String, dynamic>> products) async {
    String url = EndPoints.productimport;
    var response = await DbBase().databaseRequest(url, DbBase().postRequestType,
        body: {'products': products});
    return response;
  }

  static transferProducts(
      List<Map<String, dynamic>> products, toShop, bool all) async {
    String url = EndPoints.producttransferimport;
    var response =
        await DbBase().databaseRequest(url, DbBase().postRequestType, body: {
      'products': products,
      "all": all,
      "shopId": userController.currentUser.value?.primaryShop?.id,
      "toShop": toShop
    });
    return response;
  }

  static createCategory(Map<String, String> map) async {
    String url = EndPoints.productcategories;
    var response = await DbBase()
        .databaseRequest(url, DbBase().postRequestType, body: map);
    return response;
  }

  static generateReport(
      {required String reportType,
      required String reportStatus,
      required String email,
      required String data}) {
    String url = EndPoints.report;
    var response =
        DbBase().databaseRequest(url, DbBase().postRequestType, body: {
      'reportType': reportType,
      'reportStatus': reportStatus,
      'email': email,
      'dataType': data,
      "shop": userController.currentUser.value?.primaryShop?.id
    });
    return response;
  }

  static Future productStockinRequest(Map<String, dynamic> data) async {
    var response = await DbBase().databaseRequest(
        EndPoints.warehouserequest, DbBase().postRequestType,
        body: data);
    return response;
  }

  getRequests(
      {String? warehouse,
      String? from,
      String? to,
      bool? production = false,
      String? status,
      String? shop}) async {
    var response = await DbBase().databaseRequest(
        "${EndPoints.warehouserequest}?warehouse=$warehouse&from=$from&to=$to&status=$status&shop=$shop&production=$production",
        DbBase().getRequestType);
    return response;
  }

  updateStatusWareHouseInvoice(
      WareHouseInvoice wareHouseInvoice, String status) async {
    var response = await DbBase().databaseRequest(
        "${EndPoints.warehouserequests}/status/${wareHouseInvoice.id}",
        DbBase().putRequestType,
        body: {"status": status});
    return response;
  }

  deleteWareHouseInvoice(WareHouseInvoice wareHouseInvoice) async {
    var response = await DbBase().databaseRequest(
        "${EndPoints.warehouserequest}/${wareHouseInvoice.id}",
        DbBase().deleteRequestType);
    return response;
  }

  updateWareHouseInvoice(Map<String, dynamic> map, {String? requestId}) async {
    var response = await DbBase().databaseRequest(
        "${EndPoints.warehouserequest}/$requestId", DbBase().putRequestType,
        body: map);
    return response;
  }

  deleteSigleItem(Map<String, dynamic> map, {String? requestId}) async {
    var response = await DbBase().databaseRequest(
        "${EndPoints.deletewarehouserequestitem}/$requestId",
        DbBase().putRequestType,
        body: map);
    return response;
  }

  acceptOrder(WareHouseInvoice wareHouseInvoice) async {
    var response = await DbBase().databaseRequest(
        "${EndPoints.warehouserequests}/accept/${wareHouseInvoice.id}",
        DbBase().putRequestType,
        body: {"attendant": userController.currentUser.value?.id});
    return response;
  }

  approveWareHouseInvoice(WareHouseInvoice wareHouseInvoice) async {
    var response = await DbBase().databaseRequest(
        "${EndPoints.approvewarehouseitems}/${wareHouseInvoice.id}",
        DbBase().putRequestType,
        body: {"attendant": userController.currentUser.value?.id});
    return response;
  }

  static Future<void> adjustStock(
      {required Product product,
      required int quantity,
      required String type}) async {
    String url = "${EndPoints.products}/adjust/${product.sId}";
    await DbBase().databaseRequest(url, DbBase().putRequestType, body: {
      "product": product.sId,
      "quantity": quantity,
      "before": product.quantity,
      "type": type,
      "shop": userController.currentUser.value?.primaryShop?.id,
      "useWarehouse":
          (userController.currentUser.value?.primaryShop?.warehouse == true) ||
              (userController.currentUser.value?.primaryShop?.useWarehouse ==
                  true),
    });
  }

  static getProductTrasferHistory(
      {required Product product,
      int page = 1,
      int limit = 100,
      String? fromDate,
      String? toDate}) async {
    String url =
        "${EndPoints.producttrasferhistory}/${product.sId}?shop=${userController.currentUser.value?.primaryShop?.id}&page=$page&limit=$limit&fromDate=$fromDate&toDate=$toDate";
    return await DbBase().databaseRequest(url, DbBase().getRequestType);
  }

  static getProductAdjustmentHistory(
      {required Product product,
      int page = 1,
      int limit = 100,
      String? fromDate,
      String? toDate}) async {
    String url =
        "${EndPoints.products}adjust/${product.sId}?shop=${userController.currentUser.value?.primaryShop?.id}&page=$page&limit=$limit&fromDate=$fromDate&toDate=$toDate";
    return await DbBase().databaseRequest(url, DbBase().getRequestType);
  }

  static removeBundleItem(String s, Product product) async {
    var response = await DbBase().databaseRequest(
        "${EndPoints.products}/remove/bundle/item?itemId=$s&productId=${product.sId}",
        DbBase().putRequestType);
    return response;
  }
}

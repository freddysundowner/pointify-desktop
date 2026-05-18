import 'package:pointify/main.dart';
import 'package:pointify/models/customer.dart';
import 'package:pointify/models/product.dart';
import 'package:pointify/models/salemodel.dart';

import 'client.dart';
import 'end_points.dart';

class SalesService {
  static Future createSale(Map<String, dynamic> sales) async {
    String url = EndPoints.sales;
    var response = await DbBase()
        .databaseRequest(url, DbBase().postRequestType, body: sales);
    return response;
  }

  static Future updateSale(Map<String, dynamic> sales, String saleId) async {
    String url = "${EndPoints.sales}$saleId";
    var response = await DbBase()
        .databaseRequest(url, DbBase().putRequestType, body: sales);
    return response;
  }

  static Future voidSale(String saleId) async {
    String url = "${EndPoints.voidreceipt}/$saleId";
    var response = await DbBase().databaseRequest(url, DbBase().putRequestType);
    return response;
  }

  static getSales(
      {String? fromDate = "",
      String? toDate = "",
      String? paymentTag = "",
      String? dueDate = "",
      String? order = "",
      String? receiptNo = "",
      String? shopId = "",
      String? saleType = "",
      String? attendantId = "",
      String? paymentType = "",
      String? status = "cashed",
      bool? production = false,
      String? customerId = "",
      int page = 1,
      int limit = 50}) async {
    if (userController.currentUser.value?.usertype == "attendant") {
      attendantId = userController.currentUser.value?.attendantId?.sId;
    }
    String url =
        "${EndPoints.salesfilter}?order=$order&paymentTag=$paymentTag&receiptNo=$receiptNo&start=$fromDate&saleType=$saleType&duedate=$dueDate&end=$toDate&shopId=$shopId&attendantId=$attendantId&paymentType=$paymentType&customerId=$customerId&status=$status&page=$page&limit=$limit&production=$production";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static getProductSales({
    String? fromDate = "",
    String? toDate = "",
    String? product = "",
  }) async {
    String url =
        "${EndPoints.productsalesfilter}?startDate=$fromDate&endDate=$toDate&product=$product&shop=${userController.currentUser.value?.primaryShop?.id}";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static getOrders(
      {String? fromDate = "",
      String? shop = "",
      String? toDate = "",
      int? page = 1,
      String limit = "100"}) async {
    String url =
        "${EndPoints.order}?fromDate=$fromDate&toDate=$toDate&page=$page&limit=$limit&shop=$shop";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static netAnalysis(
      {String? fromDate = "",
      String? toDate = "",
      String? shopId = "",
      String? type = "",
      String? duesales = "",
      String? attendant = ""}) async {
    if (userController.currentUser.value?.usertype == "attendant") {
      attendant = userController.currentUser.value?.attendantId?.sId;
    }
    var response = await DbBase().databaseRequest(
        "${EndPoints.analysisnet}?fromDate=$fromDate&toDate=$toDate&shopId=$shopId&attendant=$attendant&type=$type&duesales=$duesales",
        DbBase().getRequestType);
    return response;
  }

  static returnItem(returnData) async {
    var response = await DbBase().databaseRequest(
        EndPoints.salereturn, DbBase().postRequestType,
        body: returnData);
    return response;
  }

  static payCredit(Map<String, dynamic> paymentData) async {
    var response = await DbBase().databaseRequest(
        EndPoints.salepayment, DbBase().postRequestType,
        body: paymentData);
    return response;
  }

  static getSalesRetuns(
      {SaleModel? salesModel,
      Customer? customerModel,
      Product? product,
      Attendant? attedandId,
      String? type,
      String? shopid,
      String? fromDate,
      String? toDate}) async {
    String url = "${EndPoints.salereturnsfilter}?type=$type";
    if (salesModel != null) {
      url += "&saleId=${salesModel.sId}";
    }
    if (customerModel != null) {
      url += "&customerId=${customerModel.sId}";
    }
    if (attedandId != null) {
      url += "&attendantId=${attedandId.sId}";
    }
    if (userController.currentUser.value?.usertype == "attendant") {
      url +=
          "&attendantId=${userController.currentUser.value?.attendantId?.sId}";
    }
    if (shopid != null) {
      url += "&shopId=$shopid";
    }
    if (product != null) {
      url += "&productId=${product.sId}";
    }
    if (fromDate != null) {
      url += "&fromDate=$fromDate";
    }
    if (toDate != null) {
      url += "&toDate=$toDate";
    }
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static getMostSellingProduct(
      {String? shopId,
      String? fromDate,
      String? toDate,
      String? attendantId = ""}) async {
    String url =
        "${EndPoints.analysisproducts}?shopId=$shopId&startDate=$fromDate&endDate=$toDate&attendantId=$attendantId";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static deleteSaleReturn(String saleReturnId) async {
    String url = "${EndPoints.salereturn}$saleReturnId";
    var response =
        await DbBase().databaseRequest(url, DbBase().deleteRequestType);
    return response;
  }

  static getProductSalesGroupedByMonth(
      {String? shopId = "",
      String? startDate = "",
      String? product = "",
      String? endDate = ""}) async {
    var response = await DbBase().databaseRequest(
        "${EndPoints.analysismonthly}?product=$product&shopId=$shopId&startDate=$startDate&endDate=$endDate",
        DbBase().getRequestType);
    return response;
  }

  static getSingleSaleById({required String id}) async {
    var response = await DbBase().databaseRequest(
        "${EndPoints.singlesale}/$id", DbBase().getRequestType);
    return response;
  }

  static sendReportEmail({
    String? fromDate = "",
    String? toDate = "",
    String? email = "",
    String? shop = "",
    String? paymentTag = "",
    String? status = "",
  }) async {
    var response = await DbBase().databaseRequest(
        EndPoints.sendreportemail, DbBase().getRequestType,
        body: {
          "email": email,
          "fromDate": fromDate,
          "toDate": toDate,
          "shop": shop,
          "paymentTag": paymentTag,
          "status": status
        });
    return response;
  }

  static deleteOrder(String s) async {
    var response = await DbBase()
        .databaseRequest("${EndPoints.order}/$s", DbBase().deleteRequestType);
    return response;
  }

  static getDuesByDate({required String shop, required String dueDate}) async {
    var response = await DbBase().databaseRequest(
        "${EndPoints.duesbydate}?shop=$shop&dueDate=$dueDate",
        DbBase().getRequestType);
    return response;
  }
}

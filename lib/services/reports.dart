import 'package:dio/dio.dart';

import 'client.dart';
import 'end_points.dart';

class ReportsService {
  getSalesReport({
    String? startDate,
    String? toDate,
    String? shopid,
  }) async {
    String url =
        "${EndPoints.salesreport}?shopid=$shopid&fromDate=$startDate&toDate=$toDate";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  salesExcelReport({
    required String fromDate,
    required String toDate,
    required String shop,
    String? paymentType,
    required String status,
    required String reportType,
    required String reportMode,
  }) async {
    String url = EndPoints.salesreportexcel;

    var response = await DbBase().databaseRequest(
      url,
      DbBase().postRequestType,
      responseType: ResponseType.bytes,
      body: {
        "fromDate": fromDate,
        "toDate": toDate,
        "shop": shop,
        "paymentType": paymentType,
        "status": status,
        "reportType": reportType,
        "reportMode": reportMode
      },
    );

    return response;
  }

  getGrossProfit({
    String? startDate,
    String? toDate,
    String? shopid,
  }) async {
    String url =
        "${EndPoints.profitsummary}?shopid=$shopid&fromDate=$startDate&toDate=$toDate";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  getStockReport({
    String? shopid,
    int page = 1,
    int limit = 50,
    String? name = '',
  }) async {
    String url =
        "${EndPoints.stockreport}$shopid?page=$page&limit=$limit&name=$name";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  getPurchasesReport({
    String? startDate,
    String? toDate,
    String? shopid,
  }) async {
    String url =
        "${EndPoints.purchasesreport}?shopid=$shopid&fromDate=$startDate&toDate=$toDate";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  getDebtors({required String shopid}) async {
    String url = "${EndPoints.debtor}?shopId=$shopid";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  getDebtorExcel({required String shopid}) {
    String url = "${EndPoints.debtorexcel}?shopId=$shopid";
    var response = DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  productsWisereport(
      {String? shop,
      String? fromDate,
      String? toDate,
      String? product,
      String? saleType}) async {
    String url =
        "${EndPoints.productsales}?shop=$shop&fromDate=$fromDate&toDate=$toDate&product=${product ?? ""}&saleType=$saleType";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  discountReport(
      {String? shop,
      String? fromDate,
      String? toDate,
      String? product,
      String? saleType}) async {
    String url =
        "${EndPoints.discountsales}?shop=$shop&fromDate=$fromDate&toDate=$toDate&product=${product ?? ""}&saleType=$saleType";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }
}


import 'package:pointify/models/bank.dart';

import 'client.dart';
import 'end_points.dart';

class CashFlowServices {
  static Future createCashFlowCategory(var data) async {
    String url = EndPoints.cashflowcategory;
    var response = await DbBase()
        .databaseRequest(url, DbBase().postRequestType, body: data);
    return response;
  }

  static createCashFlow(var data) async {
    String url = EndPoints.cashflow;
    var response = await DbBase()
        .databaseRequest(url, DbBase().postRequestType, body: data);
    return response;
  }

  static updateCashFlow(String expenseId, var data) async {
    String url = "${EndPoints.cashflow}$expenseId";
    var response = await DbBase()
        .databaseRequest(url, DbBase().putRequestType, body: data);
    return response;
  }

  static Future getCashFlowCategoryWithTotals(
      var shopid, type, String startDate, String endDate) async {
    String url =
        "${"${EndPoints.cashflowcategrybyshop}?"}shopId=$shopid&type=$type&startDate=$startDate&endDate=$endDate";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static Future getCashFlowCategoryList(var shopid, type) async {
    String url =
        "${"${EndPoints.cashflowcategrybyshop}?"}shopId=$shopid&type=$type";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static Future getCashflowtransactions(var shopid) async {
    String url = "${EndPoints.cashflowtransactions}$shopid";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static Future getCashflowCategoryTransactions(var categoryId) async {
    String url = "${EndPoints.cashflowcategorytransactions}$categoryId";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  createBank(Map<String, String?> bankdata) async {
    String url = EndPoints.bank;
    var response = await DbBase()
        .databaseRequest(url, DbBase().postRequestType, body: bankdata);
    return response;
  }

  getBanks(String shop) async {
    String url = "${EndPoints.banks}/$shop";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static Future getCashFlowSummary(
      String shop, String startDate, String endDate, String paymentType) async {
    String url =
        "${EndPoints.cashflowsummary}?shop=$shop&startDate=$startDate&endDate=$endDate&paymentType=$paymentType";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static deleteBank(String s) async {
    String url = "${EndPoints.bank}$s";
    var response =
        await DbBase().databaseRequest(url, DbBase().deleteRequestType);
    return response;
  }

  static getBankTransactions(String s) async {
    String url = "${EndPoints.banktransactions}/$s";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static updateBank(BankModel bankModel, var data) async {
    String url = "${EndPoints.bank}${bankModel.id}";
    var response = await DbBase()
        .databaseRequest(url, DbBase().putRequestType, body: data);
    return response;
  }

  static updateCategory(String id, Map<String, String> map) async {
    String url = "${EndPoints.cashflowcategory}$id";
    var response =
        await DbBase().databaseRequest(url, DbBase().putRequestType, body: map);
    return response;
  }

  static deleteCashflowCategory(String s) async {
    String url = "${EndPoints.cashflowcategory}/$s";
    var response =
        await DbBase().databaseRequest(url, DbBase().deleteRequestType);
    return response;
  }
}

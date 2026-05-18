

import 'client.dart';
import 'end_points.dart';

class ExpensesServices {
  static getExpenses(
      {String? shop = "", String? fromDate = "", String? toDate = ""}) async {
    String url = "${EndPoints.expense}?shop=$shop&start=$fromDate&end=$toDate";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static deleteExpenses(String expenseId) async {
    String url = "${EndPoints.expense}/$expenseId";
    var response =
        await DbBase().databaseRequest(url, DbBase().deleteRequestType);
    return response;
  }

  static createExpensesCategory(Map<String, String?> data) async {
    String url = EndPoints.expensecategory;
    var response = await DbBase()
        .databaseRequest(url, DbBase().postRequestType, body: data);
    return response;
  }

  static createExpenses(var data) async {
    String url = EndPoints.expense;
    var response = await DbBase()
        .databaseRequest(url, DbBase().postRequestType, body: data);
    return response;
  }

  static updateExpenses(String expenseId, var data) async {
    String url = "${EndPoints.expense}$expenseId";
    var response = await DbBase()
        .databaseRequest(url, DbBase().putRequestType, body: data);
    return response;
  }

  static Future getExpensestransactions(var categoryid) async {
    String url = "${EndPoints.expensecategorytransactions}/$categoryid";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static getExpensesCategoryWithTotals(
      String? shopid, String startDate, String endDate) async {
    String url =
        "${"${EndPoints.expensecategorytotal}?"}shopId=$shopid&startDate=$startDate&endDate=$endDate";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static editExpenseCategory(Map<String, String> data, String s) async {
    String url = "${EndPoints.expensecategory}/$s";
    var response = await DbBase()
        .databaseRequest(url, DbBase().putRequestType, body: data);
    return response;
  }

  static deleteExpensesCategory(String s) async {
    String url = "${EndPoints.expensecategory}/$s";
    var response =
        await DbBase().databaseRequest(url, DbBase().deleteRequestType);
    return response;
  }
}

import 'package:pointify/models/invoice.dart';
import 'package:pointify/models/supplier.dart';

import 'client.dart';
import 'end_points.dart';

class PurchaseService {
  static getReturnedPurchases({
    String? fromDate = "",
    String? toDate = "",
    bool? onCredit = false,
    String? shopId = "",
    String? attendantId = "",
    String? paymentType = "",
    String? customerId = "",
    String? supplier = "",
  }) async {
    String url =
        "${EndPoints.purchasereturn}?fromDate=$fromDate&toDate=$toDate&shopId=$shopId&attendantId=$attendantId&paymentType=$paymentType&customerId=$customerId&supplierId=$supplier";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static getPurchases({
    String? fromDate = "",
    String? toDate = "",
    bool? onCredit = false,
    String? shopId = "",
    String? attendantId = "",
    String? paymentType = "",
    String? customerId = "",
    String? supplier = "",
    int page = 1,
    int limit = 20,
  }) async {
    String url = "${EndPoints.purchase}"
        "?start=$fromDate"
        "&end=$toDate"
        "&shopId=$shopId"
        "&attendantId=$attendantId"
        "&paymentType=$paymentType"
        "&customerId=$customerId"
        "&supplierId=$supplier"
        "&page=$page"
        "&limit=$limit";

    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);

    return response;
  }

  static createPurchase(Map<String, dynamic> invoiceData) async {
    String url = EndPoints.purchase;
    var response = await DbBase()
        .databaseRequest(url, DbBase().postRequestType, body: invoiceData);
    return response;
  }

  static Future createInvoiceReturn(invoiceData) async {
    String url = EndPoints.purchasereturn;
    var response = await DbBase()
        .databaseRequest(url, DbBase().postRequestType, body: invoiceData);
    return response;
  }

  static Future createPayment(data) async {
    String url = EndPoints.purchasepayment;
    var response = await DbBase()
        .databaseRequest(url, DbBase().postRequestType, body: data);
    return response;
  }

  static Future<List> getReturns({Invoice? invoice, Supplier? supplier}) async {
    String url = "${EndPoints.purchasereturn}?supplierId=${supplier!.id!}";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
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
        EndPoints.purchasesendreportemail, DbBase().getRequestType,
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
}

import 'package:get/get.dart';
import 'package:pointify/controllers/customercontroller.dart';

import 'client.dart';
import 'end_points.dart';

class PaymentService {
  static getSalesPaymentBySaleId(String id) async {
    String url = "${EndPoints.payments}?saleId=$id";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static getSalesPaymentByPurchaseId(id) async {
    String url = "${EndPoints.payments}?purchaseId=$id";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static getAwardTransactions(id) async {
    String url = "${EndPoints.awardstransactions}?user=$id";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static getPaymentsByShopAndDate(
      String shop, String fromDate, String toDate) async {
    String url =
        "${EndPoints.payments}?shop=$shop&fromDate=$fromDate&toDate=$toDate";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static deleteReceiptById(id, rId) async {
    String url =
        "${EndPoints.deletepayments}/$id?type=${Get.find<CustomerController>().customerReceiptType.value}&receiptId=$rId";
    var response =
        await DbBase().databaseRequest(url, DbBase().deleteRequestType);
    return response;
  }

  static deleteReceipt(id, saleId) async {
    String url = "${EndPoints.payments}/$id";
    var response = await DbBase().databaseRequest(
        url, DbBase().deleteRequestType,
        body: {'saleId': saleId});
    return response;
  }

  static deletePayment(id) async {
    String url = "${EndPoints.payments}?purchaseId=$id";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static getPaymentMethods() async {
    String url = EndPoints.paymentsmethods;
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }
}

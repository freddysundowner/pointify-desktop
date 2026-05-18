import 'package:pointify/models/customer.dart';
import 'package:pointify/models/shop.dart';

import 'client.dart';
import 'end_points.dart';

class CustomerService {
  static createCustomer(Customer customerModel, {required page}) async {
    String url = EndPoints.customer;
    var response = await DbBase().databaseRequest(url, DbBase().postRequestType,
        body: customerModel.toJson());
    return response;
  }

  static updateCustomer(var customer, String customerid) async {
    String url = "${EndPoints.customer}$customerid";
    var response = await DbBase()
        .databaseRequest(url, DbBase().putRequestType, body: customer);
    return response;
  }

  static getCustomersByShopId(type, Shop shop) async {
    String url = "${EndPoints.customer}?type=$type&shopId=${shop.id ?? ""}";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static getCustomersById(String id) async {
    String url = "${EndPoints.customer}/$id";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static getCustomersByNo({String? customerno = "", String? otp = ""}) async {
    String url =
        "${EndPoints.customer}customerno?otp=$otp&customerno=$customerno";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static getCustomersPayments(type, String cusotmerId) async {
    String url = "${EndPoints.customerpayments}/$cusotmerId?type=$type";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static Future<void> deleteCustomer({required Customer customerModel}) async {
    String url = "${EndPoints.customer}/${customerModel.sId}";
    var response =
        await DbBase().databaseRequest(url, DbBase().deleteRequestType);
    return response;
  }

  importCustomers(List<Map<String, dynamic>> customers) async {
    String url = EndPoints.customerimport;
    var response = await DbBase().databaseRequest(url, DbBase().postRequestType,
        body: {'customers': customers});
    return response;
  }
}

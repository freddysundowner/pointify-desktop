

import 'package:pointify/models/supplier.dart';

import 'client.dart';
import 'end_points.dart';

class SupplierService {
  createSupplier(Map<String, String?> supplier) async {
    String url = EndPoints.supplier;
    var response = await DbBase()
        .databaseRequest(url, DbBase().postRequestType, body: supplier);
    return response;
  }

  getSuppliers({String? type = "", String? name, String? shop}) async {
    String url =
        "${EndPoints.supplier}?name=${name ?? ""}&shopId=${shop ?? ""}&type=$type";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }

  static updateSupplier(Supplier supplier, Map<String, String> data) async {
    String url = "${EndPoints.supplier}${supplier.id}";
    var response = await DbBase()
        .databaseRequest(url, DbBase().putRequestType, body: data);
    return response;
  }

  getSupplierSupplies({String? supplierId, String? shop}) async {
    String url = "${EndPoints.supplies}/$supplierId/?shopId=${shop ?? ""}";
    var response = await DbBase().databaseRequest(url, DbBase().getRequestType);
    return response;
  }
}

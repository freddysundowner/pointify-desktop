
import 'client.dart';
import 'end_points.dart';

class OrderService {
  verifyCustomer({String? email, String? phone}) async {
    String url = EndPoints.customerverify;
    var response = await DbBase().databaseRequest(url, DbBase().postRequestType,
        body: {"email": email, "phonenumber": phone});
    return response;
  }
}

import 'package.dart';

class Subscription {
  String? sId;
  String? userId;
  Package? package;
  String? startDate;
  String? endDate;

  Subscription(
      {this.sId, this.userId, this.package, this.startDate, this.endDate});

  Subscription.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    userId = json['userId'];
    package =
        json['packageId'] != null ? Package.fromJson(json['packageId']) : null;
    startDate = json['startDate'];
    endDate = json['endDate'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['_id'] = sId;
    data['userId'] = userId;
    data['startDate'] = startDate;
    data['endDate'] = endDate;
    return data;
  }
}

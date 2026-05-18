import 'package:pointify/models/usermodel.dart';

class Warehouse {
  String? id;
  String? name;
  String? currency;
  UserModel? owner;

  Warehouse({this.id, this.name, this.currency, this.owner});

  Warehouse.fromJson(Map<String, dynamic> json) {
    id = json['id'];
    name = json['name'];
    currency = json['currency'];
    owner = UserModel.fromJson(json['owner']);
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = new Map<String, dynamic>();
    data['id'] = this.id;
    data['name'] = this.name;
    data['currency'] = this.currency;
    data['owner'] = this.owner;
    return data;
  }
}

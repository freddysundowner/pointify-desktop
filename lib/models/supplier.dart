class Supplier {
  String? id;
  String? address;
  String? email;
  String? phoneNumber;
  int? totalDebt;
  String? name;
  String? shop;

  Supplier(
      {this.id,
      this.name,
      this.totalDebt,
      this.phoneNumber,
      this.address,
      this.email,
      this.shop});

  Supplier.fromJson(Map<String, dynamic> json) {
    id = json['_id'];
    totalDebt = json['totalDebt'] ?? 0;
    phoneNumber = json['phoneNumber'] ?? "";
    email = json['email'] ?? "";
    address = json['address'] ?? "";
    name = json['name'];
    shop = json['shopId'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['_id'] = id;
    data['name'] = name;
    data['shopId'] = shop;
    return data;
  }
}

class PaymentMethods {
  String? name;
  bool? active;
  String? id;
  Map? settings;

  PaymentMethods({this.id, this.name, this.active,this.settings});

  factory PaymentMethods.fromJson(Map<String, dynamic> json) {
    return PaymentMethods(
      id: json['id'],
      name: json['name'],
      active: json['active'],
      settings: json['settings']
    );
  }
}

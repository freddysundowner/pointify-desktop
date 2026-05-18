class ExtraCharge {
  String? name;
  double? amount;

  ExtraCharge({
    this.name,
    this.amount,
  });

  ExtraCharge.fromJson(Map<String, dynamic> json) {
    name = json['name'];
    amount = json['amount'] != null ? json['amount'].toDouble() : 0.0;
  }

  Map<String, dynamic> toJson() {
    return {
      "name": name,
      "amount": amount,
    };
  }
}

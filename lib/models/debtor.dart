class Debtor {
  final String id;
  final String name;
  final String phone;
  final int totalPaid;
  final int totalDebt;

  Debtor({
    required this.id,
    required this.name,
    required this.phone,
    required this.totalPaid,
    required this.totalDebt,
  });

  factory Debtor.fromJson(Map<String, dynamic> json) {
    return Debtor(
      id: json['_id'],
      name: json['name'],
      phone: json['phonenumber'],
      totalPaid: json['totalPaid'],
      totalDebt: json['totalDebt'],
    );
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['id'] = id;
    data['name'] = name;
    data['phonenumber'] = phone;
    data['totalDebt'] = totalPaid;
    data['totalPaid'] = totalDebt;
    return data;
  }
}

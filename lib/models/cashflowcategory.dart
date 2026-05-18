class CashFlowCategory {
  String? name;
  String? createdAt;
  String? type;
  int? totalAmount;
  String? id;

  CashFlowCategory({
    this.type,
    this.name,
    this.totalAmount,
    this.createdAt,
    this.id,
  });

  factory CashFlowCategory.fromJson(Map<String, dynamic> json) {
    return CashFlowCategory(
      type: json['type'],
      createdAt: json['createAt'],
      totalAmount: json['totalAmount'],
      name: json['name'],
      id: json['_id'],
    );
  }
}

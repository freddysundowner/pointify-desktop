class ExpenseCategory {
  String? name;
  String? createdAt;
  String? type;
  int? totalAmount;
  String? id;

  ExpenseCategory({
    this.type,
    this.name,
    this.totalAmount,
    this.createdAt,
    this.id,
  });

  factory ExpenseCategory.fromJson(Map<String, dynamic> json) {
    return ExpenseCategory(
      type: json['type'],
      createdAt: json['createAt'],
      totalAmount: json['totalAmount'],
      name: json['name'],
      id: json['_id'],
    );
  }
}

import 'package:pointify/models/product.dart';

import 'expensecategory.dart';

class ExpenseModel {
  String? id;
  String? name;
  int? amount;
  String? createdAt;
  String? frequency;
  String? nextOccurrence;
  bool? autoSave;
  ExpenseCategory? category;
  Attendant? attendant;

  ExpenseModel(
      {this.id,
      this.name,
      this.amount,
      this.createdAt,
      this.nextOccurrence,
      this.autoSave,
      this.frequency,
      this.category,
      this.attendant});

  ExpenseModel.fromJson(Map<String, dynamic> json) {
    id = json['_id'];
    name = json['description'];
    attendant = json['attendant'] != null
        ? Attendant.fromJson(json['attendant'])
        : null;
    amount = json['amount'];
    createdAt = json['createAt'];
    nextOccurrence = json['nextOccurrence'];
    autoSave = json['autoSave'] ?? false;
    frequency = json['frequency'] ?? "";
    category = json['category'] != null
        ? ExpenseCategory.fromJson(json['category'])
        : null;
  }
}

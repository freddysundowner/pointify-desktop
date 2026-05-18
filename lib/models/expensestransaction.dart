import 'package:pointify/models/bank.dart';
import 'package:pointify/models/cashflowcategory.dart';
import 'package:pointify/models/product.dart';

class ExpensesTransactionModel {
  String? sId;
  String? createdAt;
  String? description;
  int? amount;
  CashFlowCategory? cashFlowCategory;
  BankModel? bank;
  Attendant? attendant;

  ExpensesTransactionModel({
    this.sId,
    this.createdAt,
    this.description,
    this.cashFlowCategory,
    this.attendant,
    this.bank,
    this.amount,
  });

  factory ExpensesTransactionModel.fromJson(Map<String, dynamic> json) =>
      ExpensesTransactionModel(
        sId: json["_id"],
        createdAt: json["createAt"],
        description: json["description"],
        cashFlowCategory: json["category"] != null
            ? CashFlowCategory.fromJson(json["category"])
            : null,
        bank: json["bank"] != null ? BankModel.fromJson(json["bank"]) : null,
        attendant: json["attendantId"] != null
            ? Attendant.fromJson(json["attendantId"])
            : null,
        amount: json["amount"],
      );
}

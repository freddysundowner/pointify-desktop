import 'package:pointify/models/bank.dart';
import 'package:pointify/models/cashflowcategory.dart';
import 'package:pointify/models/product.dart';

class CashFlowTransaction {
  String? sId;
  String? createdAt;
  String? description;
  int? amount;
  CashFlowCategory? cashFlowCategory;
  BankModel? bank;
  Attendant? attendant;

  CashFlowTransaction({
    this.sId,
    this.createdAt,
    this.description,
    this.cashFlowCategory,
    this.attendant,
    this.bank,
    this.amount,
  });

  factory CashFlowTransaction.fromJson(Map<String, dynamic> json) =>
      CashFlowTransaction(
        sId: json["_id"],
        createdAt: json["createAt"],
        description: json["name"],
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

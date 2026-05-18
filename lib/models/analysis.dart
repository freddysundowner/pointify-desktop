class Analysis {
  int totalSales;
  int profitOnSales;
  double net;
  int gross;
  int badStockValue;
  int creditTotals;
  int totalCashSales;
  int totalExpenses;
  double totalTaxes;
  int debtPaid;
  int totalPurchases;

  Analysis(
      {required this.totalSales,
      required this.profitOnSales,
      required this.net,
      required this.gross,
      required this.totalTaxes,
      required this.totalCashSales,
      required this.creditTotals,
      required this.debtPaid,
      required this.badStockValue,
      required this.totalExpenses,
      required this.totalPurchases});

  factory Analysis.fromJson(Map<String, dynamic> json) {
    return Analysis(
      gross: json['gross'],
      net: json['net'],
      totalPurchases: json['totalPurchases'],
      totalSales: json['totalSales'],
      totalTaxes: json['totalTaxes'],
      profitOnSales: json['profitOnSales'],
      badStockValue: json['badStockValue'],
      totalExpenses: json['totalExpenses'],
      creditTotals: json['creditTotals'],
      totalCashSales: json['totalCashSales'],
      debtPaid: json['debtPaid'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'totalSales': totalSales,
      'profitOnSales': profitOnSales,
      'creditTotals': creditTotals,
      'badStockValue': badStockValue,
      'totalExpenses': totalExpenses,
      'totalCashSales': totalCashSales,
      'debtPaid': debtPaid
    };
  }
}

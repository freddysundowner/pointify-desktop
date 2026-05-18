import '../functions/functions.dart';

class StockReport {
  String? sId;
  String? name;
  double? totalSales;
  double? totalProfit;
  double? totalSoldQuantity;
  double? inStockQuantity;

  StockReport(
      {this.sId,
      this.name,
      this.totalSales,
      this.totalProfit,
      this.totalSoldQuantity,
      this.inStockQuantity});

  StockReport.fromJson(Map<String, dynamic> json) {
    sId = json['_id'];
    name = json['name'];
    totalSales = isInteger(json['totalSales'])
        ? json['totalSales'].toDouble()
        : json['totalSales'];
    totalProfit = isInteger(json['totalProfit'])
        ? json['totalProfit'].toDouble()
        : json['totalProfit'];
    totalSoldQuantity = isInteger(json['totalSoldQuantity'])
        ? json['totalSoldQuantity'].toDouble()
        : json['totalSoldQuantity'];
    inStockQuantity = isInteger(json['inStockQuantity'])
        ? json['inStockQuantity'].toDouble()
        : json[
            'inStockQuantity']; // isInteger(json['inStockQuantity']) : json['inStockQuantity'];
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['_id'] = sId;
    data['name'] = name;
    data['totalSales'] = totalSales;
    data['totalProfit'] = totalProfit;
    data['totalSoldQuantity'] = totalSoldQuantity;
    data['inStockQuantity'] = inStockQuantity;
    return data;
  }
}

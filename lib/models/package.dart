class ShopPriceOption {
  final int shops;
  final num amount;
  final String label;
  final String priceText;

  ShopPriceOption({
    required this.shops,
    required this.amount,
    required this.label,
    required this.priceText,
  });

  factory ShopPriceOption.fromJson(Map<String, dynamic> json) {
    return ShopPriceOption(
      shops: json['shops'] ?? 0,
      amount: json['amount'] ?? 0,
      label: json['label'] ?? '',
      priceText: json['priceText'] ?? '',
    );
  }
}

class Package {
  String? id;
  String? title;
  String? description;
  int? durationValue;
  String? durationUnit;
  String? displayprice;
  String? type;
  bool? trial;
  int? order;
  int? amountusd;
  double? amountDouble;
  int? amount;
  int? discount;
  List<String>? features;
  int? maxShops;
  String? priceText;
  String? shopText;
  int? minShops;
  int? priceFrom;
  int? priceTo;
  List<ShopPriceOption> shopOptions = [];
  Package(
      {this.title,
      this.id,
      this.amountDouble,
      this.displayprice,
      this.type,
      this.order,
      this.trial,
      this.amountusd,
      this.discount,
      this.features,
      this.amount,
      this.description,
      this.durationValue,
      this.maxShops,
      this.durationUnit,
      this.priceText,
      this.shopText,
      this.minShops,
      required this.shopOptions,
      this.priceFrom,
      this.priceTo});

  Package.fromJson(Map<String, dynamic> json) {
    shopOptions = json['shopOptions'] == null
        ? []
        : List<ShopPriceOption>.from(
            json['shopOptions'].map((x) => ShopPriceOption.fromJson(x)),
          );
    id = json['_id'];
    title = json['title'];
    amountusd = json['amountusd'] ?? 0;
    displayprice = json['displayprice'] ?? '';
    amountDouble = 0.0;
    discount = json['discount'] ?? 0;
    priceText = json['priceText'];
    shopText = json['shopText'];
    minShops = json['minShops'];
    priceFrom = json['priceFrom'];
    priceTo = json['priceTo'];
    discount = json['discount'] ?? 0;
    order = json['order'] ?? 0;
    features =
        json['features'] is String ? [] : json['features'].cast<String>();
    type = json['type'];
    trial = json['type'] == 'trial' ? true : false;
    amount = json['amount'];
    description = json['description'];
    durationUnit = json['durationUnit'];
    durationValue = json['durationValue'];
    maxShops = json['maxShops'];
  }
}

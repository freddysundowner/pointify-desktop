class WareHouseItem {
  String? id;
  Map<String, dynamic>? product;
  Map<String, dynamic>? inventory;
  List<dynamic>? items;
  double? received;
  double? quantity;

  WareHouseItem({
    this.id,
    this.items,
    this.inventory,
    this.product,
    this.quantity,
    this.received,
  });

  WareHouseItem.fromJson(Map<String, dynamic> json) {
    id = json['_id'];
    inventory = json['inventory'];
    items =
        json['inventory'] == null ? [] : json['inventory']['bundleItems'] ?? [];
    received = json['received'] is int ? json['received'].toDouble() : 0.0;
    product = json['product'];
    quantity = double.parse(json['quantity'].toString());
  }

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> data = <String, dynamic>{};
    data['_id'] = id;
    data['product'] = product;
    data['inventory'] = inventory;
    data['quantity'] = quantity;
    return data;
  }
}

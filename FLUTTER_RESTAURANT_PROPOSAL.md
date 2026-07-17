# Restaurant Mode for the Pointify Flutter App — Implementation Proposal

This mirrors the restaurant features already live in the web POS. The backend
(MongoDB) already supports everything the web app uses, so the Flutter app only
needs client-side changes plus the same `Accompaniment` endpoints the web app
already calls.

How the web app works (the contract to copy):

| Feature | How the web app does it |
|---|---|
| Restaurant mode | `isRestaurant: boolean` on the Shop record, saved via normal shop update |
| Kitchen order | Holding a sale (`status: "hold"`) IS "send to kitchen"; a kitchen ticket (items + qty + notes, **no prices**) is printed |
| Cashier permission | Permission group `pos`, action `cashier` (only shown when shop is a restaurant) |
| Pending payments | A screen listing sales with `status=hold`; cashier collects payment and completes the sale (status → `cashed`) |
| Accompaniments | Configs in `Accompaniment` collection: `{ productId, shopId, groups:[{id,name,type:'fixed'|'choice',options:[{id,name}]}] }`. At sale time the chosen options become a per-item `salesnote` string like `"Starch: Rice | Sides: Salad"` |

---

## 1. Shop setting: Restaurant Mode

### `lib/models/shop.dart`
```dart
class Shop {
  // ... existing fields ...
  bool? isRestaurant;

  // in fromJson:
  isRestaurant = _toBool(json['isRestaurant']);
}
```

### `lib/screens/shop/edit_shop_details.dart`
Add a switch tile in the "operations" (or "business") section, same pattern as
`allownegativeselling`:

```dart
() => _buildSwitchTile(
  title: "Restaurant Mode",
  subtitle:
      "Waiters send orders to the kitchen; a cashier takes payment later. "
      "Also enables meal accompaniments on products.",
  value: shopModel.isRestaurant ?? false,
  onChanged: (value) {
    shopModel.isRestaurant = value;
    shopController.updateShop(
      shopId: shopModel.id!,
      body: {"isRestaurant": value},
    );
  },
),
```

> Note: the main backend's Shop schema must accept `isRestaurant` (it already
> does for the web app — no backend change needed).

---

## 2. Cashier permission for attendants

### `lib/screens/home/attendant/attendant_details.dart`
In the permission template (the `userController.permissions = RxList([...])`
block), extend the `pos` group — only include `cashier` when the shop is a
restaurant:

```dart
{
  "key": "pos",
  "value": [
    "set_sale_date",
    'can_sell',
    'can_sell_to_dealer_&_wholesaler',
    'discount',
    "edit_price",
    if (shopController.currentShop.value?.isRestaurant == true) 'cashier',
  ],
},
```

Add a helper (e.g. in `usercontroller.dart` or a shared util) used everywhere
you gate features:

```dart
bool hasPermission(String group, String action) {
  final user = userController.user.value;
  if (user?.usertype == "admin") return true; // admins can do everything
  final perms = user?.permisions ?? [];
  final g = perms.firstWhereOrNull((p) => p["key"] == group);
  return g != null && (g["value"] as List).contains(action);
}
```

---

## 3. Kitchen order printing

### 3a. Hook into the existing hold flow — `lib/controllers/salescontroller.dart`
`saveReceipt(status: 'hold')` already exists. In restaurant mode, holding IS
sending to the kitchen, so after a successful hold:

```dart
// inside saveReceipt, in the `if (status == 'hold')` branch, after success:
if (shopController.currentShop.value?.isRestaurant == true) {
  final receiptNo = response['sale']?['receiptNo']?.toString() ?? '';
  await Sunmi().printKitchenOrder(
    orderNumber: receiptNo,
    shopName: shopController.currentShop.value?.name ?? 'Kitchen',
    attendantName: userController.user.value?.username ?? '',
    items: saleItems, // the cart's SaleItem list
  );
}
```

### 3b. The ticket itself — `lib/utils/sunmi.dart`
Items + quantities + accompaniment notes only. **No prices** — this goes to the
kitchen, not the customer.

```dart
Future<void> printKitchenOrder({
  required String orderNumber,
  required String shopName,
  required String attendantName,
  required List<SaleItem> items,
}) async {
  await initialize();
  await SunmiPrinter.printText("*** KITCHEN ORDER ***",
      style: SunmiStyle(align: SunmiPrintAlign.CENTER, bold: true,
          fontSize: SunmiFontSize.LG));
  await printText(shopName);
  await printText("Order #: $orderNumber");
  await printText("Waiter: $attendantName");
  await printText(DateTime.now().toString().substring(0, 16));
  await printText("--------------------------------");
  for (final item in items) {
    await SunmiPrinter.printText(
        "${item.quantity?.toStringAsFixed(0)} x ${item.product?.name}",
        style: SunmiStyle(bold: true));
    final note = item.salesnote;
    if (note != null && note.isNotEmpty) {
      await printText("   $note"); // e.g. "Starch: Rice | Sides: Salad"
    }
  }
  await printText("--------------------------------");
  await SunmiPrinter.lineWrap(3);
  await closePrinter();
}
```

(If a shop uses a separate network/USB kitchen printer instead of the Sunmi
built-in, route through `printercontroller.dart` the same way receipts do —
the ticket content stays identical.)

---

## 4. Pending payments screen (cashier side)

New file: `lib/screens/sales/pending_orders_page.dart`. This is the Flutter
version of the web app's "Kitchen Orders" page: it lists held sales and lets a
cashier take payment.

- **Who sees it:** admins, or attendants with `hasPermission('pos', 'cashier')`.
  Add the menu entry on the attendant home only when
  `shop.isRestaurant && hasPermission('pos','cashier')`.
- **Data:** reuse the existing filter endpoint — `SalesService` already
  supports `status`; call it with `status: 'hold'` (the existing
  `getSalesByDate(shop: shopId, status: 'hold')` does this).
- **Each card shows:** order/receipt number, waiter name, time, items with
  accompaniment notes, and the total.
- **Actions:** "Collect Payment" opens the normal payment sheet (cash/M-Pesa),
  then completes the sale exactly like the existing on-hold flow
  (`onholdsales.dart` already cashes held sales — reuse that code path:
  status `hold` → `cashed`). Optionally "Reprint kitchen ticket".

Complete file (follows the same patterns as `onholdsales.dart`: GetX
controllers, `Obx`, `majorTitle`, `noItemsFound`):

```dart
// lib/screens/sales/pending_orders_page.dart
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../controllers/salescontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../models/salemodel.dart';
import '../../models/saleitem.dart';
import '../../utils/colors.dart';
import '../../widgets/major_title.dart';
import '../../widgets/no_items_found.dart';
import 'sale_preview.dart';

/// Restaurant-mode cashier queue: lists sales that a waiter sent to the
/// kitchen (status = "hold") and are waiting for the cashier to take payment.
/// Reuses the existing hold-sale → cash-sale mechanism.
class PendingOrdersPage extends StatefulWidget {
  const PendingOrdersPage({super.key});

  @override
  State<PendingOrdersPage> createState() => _PendingOrdersPageState();
}

class _PendingOrdersPageState extends State<PendingOrdersPage> {
  final SalesController salesController = Get.find<SalesController>();
  final ShopController shopController = Get.find<ShopController>();

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    await salesController.getSalesByDate(
      shop: shopController.currentShop.value?.id ?? '',
      status: 'hold',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        backgroundColor: Colors.white,
        elevation: 0.3,
        centerTitle: false,
        leading: IconButton(
          onPressed: () => Get.back(),
          icon: const Icon(Icons.arrow_back_ios, color: Colors.black),
        ),
        title: majorTitle(
            title: "Pending Orders", color: Colors.black, size: 16.0),
        actions: [
          IconButton(
            onPressed: _loadOrders,
            icon: const Icon(Icons.refresh, color: Colors.black),
          ),
        ],
      ),
      body: Obx(
        () => salesController.loadingSales.isTrue
            ? const Center(child: CircularProgressIndicator())
            : salesController.onholdSales.isEmpty
                ? Center(child: noItemsFound(context, false))
                : RefreshIndicator(
                    onRefresh: _loadOrders,
                    child: ListView.builder(
                      itemCount: salesController.onholdSales.length,
                      itemBuilder: (context, index) {
                        final SaleModel sale =
                            salesController.onholdSales.elementAt(index);
                        return _pendingOrderCard(context, sale);
                      },
                    ),
                  ),
      ),
    );
  }

  Widget _pendingOrderCard(BuildContext context, SaleModel sale) {
    final items = sale.items ?? <SaleItem>[];
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header: order number + waiter + time
            Row(
              children: [
                Expanded(
                  child: Text(
                    "Order #${sale.receiptNo ?? ''}",
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ),
                Text(
                  (sale.createdAt ?? '').length >= 16
                      ? sale.createdAt!.substring(11, 16)
                      : '',
                  style: TextStyle(color: Colors.grey[600], fontSize: 12),
                ),
              ],
            ),
            if (sale.attendant?.username != null)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(
                  "Waiter: ${sale.attendant!.username}",
                  style: TextStyle(color: Colors.grey[700], fontSize: 12),
                ),
              ),
            const Divider(height: 16),
            // Items with accompaniment notes
            ...items.map((item) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              "${item.quantity?.toStringAsFixed(0) ?? '1'} x "
                              "${item.product?.name ?? 'Item'}",
                              style: const TextStyle(fontSize: 13),
                            ),
                          ),
                          Text(
                            "${(item.totalLinePrice ?? 0).toStringAsFixed(0)}",
                            style: const TextStyle(
                                fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      if ((item.salesnote ?? '').isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(left: 12),
                          child: Text(
                            item.salesnote!,
                            style: TextStyle(
                                fontSize: 11, color: Colors.purple[700]),
                          ),
                        ),
                    ],
                  ),
                )),
            const Divider(height: 16),
            // Total + collect payment
            Row(
              children: [
                Expanded(
                  child: Text(
                    "Total: ${shopController.currentShop.value?.currency ?? ''} "
                    "${(sale.totalWithDiscount ?? sale.totalAmount ?? 0).toStringAsFixed(0)}",
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.mainColor,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: () => _collectPayment(sale),
                  icon: const Icon(Icons.payments_outlined, size: 18),
                  label: const Text("Collect Payment"),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// Opens the existing held-sale flow: load the sale back into the register
  /// and take the cashier to the normal payment screen (the same path the
  /// current On-Hold Sales page uses to cash a held sale).
  void _collectPayment(SaleModel sale) {
    Get.to(() => SalePreview(saleModel: sale))?.then((_) => _loadOrders());
  }
}
```

> `item.salesnote` requires the `SaleItem` change from section 5e (the
> per-item accompaniments note). If your `SalePreview` constructor differs,
> pass the sale the same way `sales_card.dart` does — the point is to reuse
> the exact screen that already cashes a held sale, so payment logic isn't
> duplicated.

**Menu entry** (attendant home / cashier dashboard), shown only when relevant:

```dart
if (shopController.currentShop.value?.isRestaurant == true &&
    hasPermission('pos', 'cashier'))
  ListTile(
    leading: const Icon(Icons.receipt_long),
    title: const Text("Pending Orders"),
    onTap: () => Get.to(() => const PendingOrdersPage()),
  ),
```

---

## 5. Accompaniments

### 5a. Model — new file `lib/models/accompaniment.dart`
```dart
class AccompanimentOption {
  String id;
  String name;
  AccompanimentOption({required this.id, required this.name});
  factory AccompanimentOption.fromJson(Map<String, dynamic> j) =>
      AccompanimentOption(id: j['id'] ?? '', name: j['name'] ?? '');
  Map<String, dynamic> toJson() => {'id': id, 'name': name};
}

class AccompanimentGroup {
  String id;
  String name;          // e.g. "Starch"
  String type;          // 'fixed' (always included) | 'choice' (pick one/some)
  List<AccompanimentOption> options;
  AccompanimentGroup(
      {required this.id, required this.name, required this.type,
       required this.options});
  factory AccompanimentGroup.fromJson(Map<String, dynamic> j) =>
      AccompanimentGroup(
        id: j['id'] ?? '', name: j['name'] ?? '', type: j['type'] ?? 'choice',
        options: (j['options'] as List? ?? [])
            .map((o) => AccompanimentOption.fromJson(o)).toList(),
      );
  Map<String, dynamic> toJson() => {
        'id': id, 'name': name, 'type': type,
        'options': options.map((o) => o.toJson()).toList(),
      };
}
```

### 5b. Service — new file `lib/services/accompaniment_service.dart`
Same endpoints the web app uses (already live on the backend). Follows your
existing service pattern (`DbBase().databaseRequest` + `EndPoints`).

First add the endpoint to `lib/services/end_points.dart`:

```dart
// ACCOMPANIMENTS (restaurant mode)
static const accompaniment = "${apiEndPoint}accompaniment/";
```

Then the complete service:

```dart
// lib/services/accompaniment_service.dart
import 'dart:convert';

import 'package:pointify/models/accompaniment.dart';
import 'package:pointify/services/client.dart';
import 'package:pointify/services/end_points.dart';

class AccompanimentService {
  /// GET /accompaniment/shop/:shopId
  /// Bulk-load every product's accompaniment config for the shop (used by the
  /// sale screen so product taps don't need a network call each).
  /// Returns a map of productId → groups.
  static Future<Map<String, List<AccompanimentGroup>>> byShop(
      String shopId) async {
    final response = await DbBase().databaseRequest(
      "${EndPoints.accompaniment}shop/$shopId",
      DbBase().getRequestType,
    );
    final decoded = response is String ? jsonDecode(response) : response;
    final Map<String, List<AccompanimentGroup>> result = {};
    final list = decoded is List ? decoded : (decoded?['data'] ?? []);
    for (final entry in list) {
      final productId = entry['productId']?.toString();
      if (productId == null) continue;
      result[productId] = (entry['groups'] as List? ?? [])
          .map((g) => AccompanimentGroup.fromJson(g))
          .toList();
    }
    return result;
  }

  /// GET /accompaniment/:productId?shopId=
  /// One product's groups (used when opening the Edit Product form).
  static Future<List<AccompanimentGroup>> byProduct(
      String productId, String shopId) async {
    final response = await DbBase().databaseRequest(
      "${EndPoints.accompaniment}$productId?shopId=$shopId",
      DbBase().getRequestType,
    );
    final decoded = response is String ? jsonDecode(response) : response;
    if (decoded == null) return [];
    final groups = decoded['groups'] ?? decoded['data']?['groups'] ?? [];
    return (groups as List)
        .map((g) => AccompanimentGroup.fromJson(g))
        .toList();
  }

  /// PUT /accompaniment/:productId  body: { shopId, groups }
  /// Create-or-update the product's accompaniment config. Call this AFTER the
  /// product itself saved successfully (same order the web app uses, so a
  /// failed product save never leaves an orphan config).
  static Future<bool> save(String productId, String shopId,
      List<AccompanimentGroup> groups) async {
    final response = await DbBase().databaseRequest(
      "${EndPoints.accompaniment}$productId",
      DbBase().putRequestType,
      body: {
        "shopId": shopId,
        "groups": groups.map((g) => g.toJson()).toList(),
      },
    );
    return response != null;
  }

  /// DELETE /accompaniment/:productId?shopId=
  /// Remove the config entirely (e.g. product deleted, or all groups cleared).
  static Future<bool> remove(String productId, String shopId) async {
    final response = await DbBase().databaseRequest(
      "${EndPoints.accompaniment}$productId?shopId=$shopId",
      DbBase().deleteRequestType,
    );
    return response != null;
  }
}
```

Usage in the product form save flow:

```dart
// after the product saves successfully:
if (shopController.currentShop.value?.isRestaurant == true) {
  if (accompanimentGroups.isNotEmpty) {
    await AccompanimentService.save(productId, shopId, accompanimentGroups);
  } else {
    await AccompanimentService.remove(productId, shopId);
  }
}
```

Usage in the sale screen (preload once when the register opens):

```dart
Map<String, List<AccompanimentGroup>> shopAccompaniments = {};

if (shopController.currentShop.value?.isRestaurant == true) {
  shopAccompaniments = await AccompanimentService.byShop(shopId);
}

// on product tap:
final groups = shopAccompaniments[product.sId] ?? [];
if (groups.isEmpty) {
  addToCart(product); // normal flow
} else {
  showAccompanimentSheet(product, groups); // builds the salesnote string
}
```

### 5c. Add/Edit product — `lib/screens/product/create_product.dart`
Show an "Accompaniments" section **only when the shop is a restaurant**:
- List of groups; each group: name field, type toggle (Always included /
  Customer chooses), chips for options with an "add option" field.
- On edit: load via `byProduct()`. On save: after the product saves
  successfully, call `AccompanimentService.save(...)` (same order the web app
  uses so a failed product save never leaves orphan configs).

### 5d. Selling — `lib/screens/sales/create_sale.dart` / `product_select.dart`
- When the sale screen opens (restaurant shops only), preload
  `AccompanimentService.byShop(shopId)` into a map keyed by productId.
- When a product with groups is tapped, open a bottom sheet: fixed groups are
  shown pre-ticked and locked; choice groups show selectable chips.
- On confirm, build the note string exactly like the web app —
  `"Starch: Rice | Sides: Salad, Bread"` — and store it on the cart line.

### 5e. Send it with the sale — `lib/models/saleitem.dart`
```dart
class SaleItem {
  // ... existing fields ...
  String? salesnote; // per-item accompaniments note

  // in toJson():
  data['salesnote'] = salesnote ?? '';
}
```
The backend's `createSale` already applies per-item `salesnote` (patched for
the web app), and the kitchen ticket (section 3) prints it under each item.

---

## Suggested build order

1. **Shop model + Restaurant Mode switch** (small, unlocks everything else)
2. **Cashier permission** (template + `hasPermission` helper)
3. **Kitchen ticket printing** on hold (reuses existing hold flow)
4. **Pending Orders page** (reuses existing held-sales fetching + cashing)
5. **Accompaniments** (model → service → product form → sale sheet → salesnote)

No backend changes are required — every endpoint and field is already in
production use by the web app.

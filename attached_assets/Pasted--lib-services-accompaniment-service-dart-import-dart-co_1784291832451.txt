// lib/services/accompaniment_service.dart
import 'dart:convert';

import 'package:pointify/models/accompaniment.dart';
import 'package:pointify/services/client.dart';
import 'package:pointify/services/end_points.dart';

class AccompanimentService {
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
    return (groups as List).map((g) => AccompanimentGroup.fromJson(g)).toList();
  }

  /// PUT /accompaniment/:productId  body: { shopId, groups }
  /// Create-or-update the product's accompaniment config. Call this AFTER the
  /// product itself saved successfully (same order the web app uses, so a
  /// failed product save never leaves an orphan config).
  static Future<bool> save(
      String productId, String shopId, List<AccompanimentGroup> groups) async {
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

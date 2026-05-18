import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/warehousecontroller.dart';

import '../../../functions/functions.dart';
import '../../../models/wahoureinvoice.dart';
import '../../../widgets/major_title.dart';
import '../../../widgets/minor_title.dart';
import '../../../widgets/normal_text.dart';
import '../single_warehouse_invoice.dart';

Widget WareHouseItemInvoice(
    {required WareHouseInvoice warehouseinoivce, String? from = "home"}) {
  return InkWell(
    onTap: () {
      WareHouseController wareHouseController = Get.put(WareHouseController());
      wareHouseController.currentwarehouseItem.value = warehouseinoivce;
      Get.to(() => SingleWarehouseInvoice(from: "home"));
    },
    child: Container(
      margin: const EdgeInsets.all(5),
      padding: const EdgeInsets.all(10),
      width:
          MediaQuery.of(Get.context!).size.width < 600 ? double.infinity : 400,
      decoration: BoxDecoration(
        color: Colors.grey.withOpacity(0.2),
        borderRadius: BorderRadius.circular(5),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              majorTitle(
                  title:
                      "Receipt #${(warehouseinoivce.invoiceNumber)?.toUpperCase()}",
                  color: Colors.black,
                  size: 12.0),
              const SizedBox(height: 3),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  minorTitle(
                      title:
                          "Date: ${DateFormat("yyyy-MM-dd").format(warehouseinoivce.createdDate!)}",
                      color: Colors.black,
                      size: 11),
                  Text(
                    "(${warehouseinoivce.items!.length}) ${warehouseinoivce.status}"
                        .capitalize!,
                    style: TextStyle(
                        color: warehouseinoivce.status == "completed"
                            ? Colors.green
                            : warehouseinoivce.status == "processed"
                                ? Colors.blue
                                : warehouseinoivce.status == "pending"
                                    ? Colors.amber
                                    : Colors.red),
                  ),
                ],
              ),
            ],
          ),
          const Spacer(),
          Column(
            children: [
              minorTitle(
                  title: "Shop: ${warehouseinoivce.shop?.name?.capitalize}",
                  color: Colors.black),
              normalText(
                  size: 12.0,
                  title:
                      "Cashier: ${warehouseinoivce.attendant?.username?.capitalize}",
                  color: Colors.black),
              normalText(
                  title:
                      "Total: ${htmlPrice(warehouseinoivce.items!.fold(0.0, (p, e) => p + (e.product?['buyingPrice'] ?? 0) * e.quantity!))}",
                  color: Colors.black,
                  size: 16.0),
              const SizedBox(height: 3),
            ],
          ),
        ],
      ),
    ),
  );
}

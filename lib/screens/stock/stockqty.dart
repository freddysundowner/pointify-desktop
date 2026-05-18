import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/models/product.dart';

import '../../controllers/stockcontroller.dart';

stockDialog(
    {
    required index,
    required Product product}) {
  final StockController stockTransferController = Get.find<StockController>();

  return showDialog(
      context: Get.context!,
      builder: (context) {
        return AlertDialog(
          title: const Text("Update Qty"),
          content: Padding(
            padding: const EdgeInsets.all(5.0),
            child: TextFormField(
                controller:stockTransferController.textEditingControllerQty ,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                    hintText: "0",
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                    ))),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
              },
              child: Text(
                "Cancel".toUpperCase(),
                style: const TextStyle(color: Colors.blue),
              ),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                if (double.parse(stockTransferController.textEditingControllerQty .text) > product.quantity!) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Text(
                          "Quantity cannot be greater than${product.quantity}")));
                } else {
                  stockTransferController.selectedProducts[index]["quantity"] =
                      double.parse(stockTransferController.textEditingControllerQty .text);
                  stockTransferController.selectedProducts.refresh();
                  stockTransferController.textEditingControllerQty .clear();
                }
              },
              child: Text(
                "Save now".toUpperCase(),
                style: const TextStyle(color: Colors.blue),
              ),
            ),
          ],
        );
      });
}

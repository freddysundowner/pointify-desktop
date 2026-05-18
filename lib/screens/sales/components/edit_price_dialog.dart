import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/widgets/alert.dart';

import '../../../controllers/salescontroller.dart';
import '../../../models/product.dart';

showEditDialogPrice({required Product productModel, required index}) {
  SalesController salesController = Get.find<SalesController>();
  showDialog(
      context: Get.context!,
      builder: (context) {
        return AlertDialog(
          title: const Text("Change Selling Price"),
          content: Padding(
            padding: const EdgeInsets.all(5.0),
            child: TextFormField(
                controller: salesController.textEditingSellingPrice,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
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

                if (double.parse(salesController.textEditingSellingPrice.text) <
                    productModel.buyingPrice!) {
                  generalAlert(
                    message:
                        "selling price cannot be below ${htmlPrice(productModel.buyingPrice)}",
                  );
                } else {
                  salesController.receipt.value!.items![index].unitPrice =
                      double.parse(
                          salesController.textEditingSellingPrice.text);
                  salesController.receipt.refresh();
                  salesController.calculateAmount(index,
                      totalDiscount: salesController
                          .receipt.value!.items![index].lineDiscount!);
                }
                salesController.textEditingSellingPrice.text = "";
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

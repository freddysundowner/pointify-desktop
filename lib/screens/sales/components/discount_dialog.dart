import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/models/saleitem.dart';
import 'package:pointify/widgets/alert.dart';

import '../../../controllers/salescontroller.dart';

discountDialog(
    {required TextEditingController controller,
    required SaleItem receiptItem,
    required index}) {
  SalesController salesController = Get.find<SalesController>();
  // controller.text = receiptItem.product!.maxDiscount.toString();
  return showDialog(
      context: Get.context!,
      builder: (context) {
        return AlertDialog(
          title: const Text("Add Discount"),
          content: Padding(
            padding: const EdgeInsets.all(5.0),
            child: TextFormField(
                controller: controller,
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
                if (int.parse(controller.text) >
                    receiptItem.product!.maxDiscount!) {
                  generalAlert(
                      message:
                          "discount cannot be greater than ${receiptItem.product!.maxDiscount}",
                      title: "Error");
                } else {
                  Navigator.pop(context);
                  var totalDiscount =
                      receiptItem.lineDiscount! + int.parse(controller.text);
                  if (totalDiscount > receiptItem.product!.maxDiscount!) {
                    return;
                  }
                  receiptItem.unitPrice =
                      receiptItem.unitPrice! + receiptItem.lineDiscount!;
                  controller.text = "";
                  salesController.calculateAmount(index,
                      totalDiscount: totalDiscount);
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

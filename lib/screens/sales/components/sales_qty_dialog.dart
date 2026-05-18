import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/productcontroller.dart';
import 'package:pointify/models/saleitem.dart';
import 'package:pointify/widgets/alert.dart';

import '../../../controllers/salescontroller.dart';

salesDialog(
    {required TextEditingController controller,
    required SaleItem receiptItem,
    required index}) {
  SalesController salesController = Get.find<SalesController>();
  ProductController productController = Get.find<ProductController>();
  controller.text = receiptItem.quantity.toString();
  return showDialog(
      context: Get.context!,
      builder: (context) {
        return AlertDialog(
          title: const Text("Update Qty"),
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
                if (receiptItem.product?.type != "service" &&
                    double.parse(controller.text) >
                        receiptItem.product!.quantity!) {
                  generalAlert(
                      message:
                          "quantity cannot be greater than ${receiptItem.product!.quantity}",
                      title: "Error");
                } else {
                  Navigator.pop(context);
                  receiptItem.quantity = double.parse(controller.text);
                  controller.text = "";
                  salesController.calculateAmount(index,
                      totalDiscount: salesController
                          .receipt.value!.items![index].lineDiscount!);
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

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/models/saleitem.dart';
import 'package:pointify/models/salemodel.dart';
import 'package:pointify/utils/themer.dart';
import 'package:pointify/widgets/alert.dart';

import '../../../utils/colors.dart';

returnInvoiceItem({required SaleItem invoiceItem, SaleModel? invoice}) {
  TextEditingController textEditingController = TextEditingController();
  textEditingController.text = invoiceItem.quantity.toString();
  return showDialog(
      context: Get.context!,
      builder: (_) {
        return AlertDialog(
          title: const Text("Return Product?"),
          content: Container(
            decoration: ThemeHelper().inputBoxDecorationShaddow(),
            child: TextFormField(
              controller: textEditingController,
              decoration: ThemeHelper()
                  .textInputDecoration('Quantity', 'Enter quantity'),
            ),
          ),
          actions: [
            TextButton(
                onPressed: () {
                  Get.back();
                },
                child: Text(
                  "Cancel".toUpperCase(),
                  style:  TextStyle(color: AppColors.mainColor),
                )),
            TextButton(
                onPressed: () {
                  if (invoiceItem.quantity! <
                      int.parse(textEditingController.text)) {
                    generalAlert(
                        title: "Error",
                        message:
                            "You cannot return more than ${invoiceItem.quantity}");
                  } else if (int.parse(textEditingController.text) <= 0) {
                    generalAlert(
                        title: "Error",
                        message: "You must atleast return 1 item");
                  } else {
                    Get.back();
                    // purchaseController.returnInvoiceItem(invoiceItem,
                    //     int.parse(textEditingController.text), invoice!);
                  }
                },
                child: Text(
                  "Okay".toUpperCase(),
                  style:  TextStyle(color: AppColors.mainColor),
                ))
          ],
        );
      });
}

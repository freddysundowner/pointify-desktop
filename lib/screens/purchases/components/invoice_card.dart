import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/purchase_controller.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/widgets/alert.dart';
import 'package:pointify/widgets/minor_title.dart';

import '../../../models/invoice.dart';
import '../../../utils/colors.dart';
import '../../../utils/themer.dart';
import '../../../widgets/major_title.dart';

Widget createPurchaseCard({required InvoiceItem invoiceItem, required index}) {
  PurchaseController purchaseController = Get.find<PurchaseController>();
  TextEditingController buyingProceController = TextEditingController();
  TextEditingController sellingPriceController = TextEditingController();
  return Container(
    padding: const EdgeInsets.all(8.0),
    decoration: BoxDecoration(
        border: Border(
            bottom: BorderSide(
      color: Colors.grey.withOpacity(0.3),
    ))),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        majorTitle(
            title: "${invoiceItem.product!.name}",
            color: Colors.black,
            size: 18.0),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            minorTitle(
                title:
                    "${invoiceItem.quantity} X ${htmlPrice(invoiceItem.unitPrice)}\nTotal: ${htmlPrice(invoiceItem.unitPrice! * invoiceItem.quantity!)}",
                color: Colors.grey),
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
                  IconButton(
                      onPressed: () {
                        purchaseController.decrementItem(index);
                      },
                      icon:  Icon(Icons.remove_circle,
                          color: AppColors.mainColor, size: 25)),
                  SizedBox(
                      width: 60,
                      height: 30,
                      child: TextFormField(
                        onChanged: (value) {
                          if (value.isEmpty) {
                            value = "1";
                          }
                          invoiceItem.quantity = double.parse(value);
                          purchaseController.calculateAmount(index: index);
                        },
                        textAlign: TextAlign.center,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          contentPadding:
                              const EdgeInsets.fromLTRB(10, 2, 10, 2),
                          hintText: invoiceItem.quantity.toString(),
                          border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(5),
                              borderSide: const BorderSide(
                                  color: Colors.grey, width: 1)),
                          focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(5),
                              borderSide: const BorderSide(
                                  color: Colors.grey, width: 1)),
                        ),
                      )),
                  IconButton(
                      onPressed: () {
                        purchaseController.incrementItem(index);
                      },
                      icon:  Icon(Icons.add_circle,
                          color: AppColors.mainColor, size: 25)),
                  IconButton(
                    color: Colors.grey,
                    icon: const Icon(
                      Icons.restore_from_trash,
                      size: 25,
                      color: Colors.red,
                    ),
                    onPressed: () {
                      purchaseController.removeFromList(index);
                    },
                  )
                ]),
                if (verifyPermission(
                    category: "purchases", permission: "edit_buying_price"))
                  InkWell(
                    onTap: () {
                      buyingProceController.text =
                          invoiceItem.product!.buyingPrice!.toString();
                      sellingPriceController.text =
                          invoiceItem.product!.sellingPrice.toString();

                      showDialog(
                          context: Get.context!,
                          builder: (_) {
                            return AlertDialog(
                              title: const Text("Edit product prices?"),
                              content: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    decoration: ThemeHelper()
                                        .inputBoxDecorationShaddow(),
                                    child: TextFormField(
                                      onChanged: (value) {
                                        invoiceItem.product!.buyingPrice =
                                            double.parse(value);
                                      },
                                      keyboardType: TextInputType.number,
                                      controller: buyingProceController,
                                      decoration: ThemeHelper()
                                          .textInputDecoration(
                                              'Buying Price',
                                              'Enter buyinng price'),
                                    ),
                                  ),
                                  const SizedBox(
                                    height: 20,
                                  ),
                                  Container(
                                    decoration: ThemeHelper()
                                        .inputBoxDecorationShaddow(),
                                    child: TextFormField(
                                      onChanged: (value) {
                                        invoiceItem.product!.sellingPrice =
                                            double.parse(value);
                                      },
                                      keyboardType: TextInputType.number,
                                      controller: sellingPriceController,
                                      decoration: ThemeHelper()
                                          .textInputDecoration(
                                              'Selling Price',
                                              'Enter selling price'),
                                    ),
                                  ),
                                ],
                              ),
                              actions: [
                                TextButton(
                                    onPressed: () {
                                      Get.back();
                                    },
                                    child: Text(
                                      "Cancel".toUpperCase(),
                                      style:  TextStyle(
                                          color: AppColors.mainColor),
                                    )),
                                TextButton(
                                    onPressed: () {
                                      var buyingprice = double.parse(
                                          buyingProceController.text);
                                      var sellingprice = double.parse(
                                          sellingPriceController.text);
                                      if (buyingprice > sellingprice) {
                                        generalAlert(
                                            title: "Erro",
                                            message:
                                                "Buying price cannot be more than selling price");
                                        return;
                                      }
                                      int i = purchaseController
                                          .invoice.value!.items!
                                          .indexWhere((element) =>
                                              element.product!.sId ==
                                              invoiceItem.product!.sId);
                                      purchaseController.invoice.value!
                                              .items![i].unitPrice =
                                          double.parse(
                                              buyingProceController.text);

                                      Get.back();
                                      purchaseController.calculateAmount(
                                          index: index);
                                      purchaseController.invoice.refresh();
                                    },
                                    child: Text(
                                      "Update".toUpperCase(),
                                      style:  TextStyle(
                                          color: AppColors.mainColor),
                                    ))
                              ],
                            );
                          });
                    },
                    child: const Text(
                      "Change Price",
                      style: TextStyle(fontSize: 11),
                    ),
                  )
              ],
            )
          ],
        ),
      ],
    ),
  );
}

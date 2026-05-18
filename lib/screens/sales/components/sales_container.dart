import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/models/saleitem.dart';
import 'package:pointify/screens/sales/components/sales_qty_dialog.dart';
import 'package:pointify/utils/colors.dart';
import 'package:pointify/widgets/minor_title.dart';

import '../../../controllers/salescontroller.dart';
import '../../../models/product.dart';
import '../../../widgets/major_title.dart';
import 'discount_dialog.dart';
import 'edit_price_dialog.dart';

Widget salesContainer(
    {required SaleItem receiptItem, required index, required type}) {
  SalesController salesController = Get.find<SalesController>();
  TextEditingController textEditingController = TextEditingController();
  Product productModel = receiptItem.product!;

  return Container(
    padding: const EdgeInsets.all(8.0),
    decoration: BoxDecoration(
        border: Border(
            bottom: BorderSide(
      color: Colors.grey.withOpacity(0.3),
    ))),
    child: productModel.manageByPrice == false
        ? Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                  width: MediaQuery.of(Get.context!).size.width * 0.8,
                  child: Text(
                    "${productModel.name}".capitalize!,
                    style: const TextStyle(color: Colors.black, fontSize: 14),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  )),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  minorTitle(
                      title:
                          "${receiptItem.quantity} X ${htmlPrice(receiptItem.unitPrice, currency: receiptItem.product?.shop?.currency)}\nTotal: ${htmlPrice(receiptItem.totalLinePrice, currency: receiptItem.product?.shop?.currency)}",
                      color: Colors.grey),
                  Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            IconButton(
                                onPressed: () {
                                  salesController.decrementItem(index);
                                },
                                icon:  Icon(Icons.remove_circle,
                                    color: AppColors.mainColor, size: 25)),
                            InkWell(
                              onTap: () {
                                salesDialog(
                                  controller:
                                      salesController.salesQtyController,
                                  receiptItem: receiptItem,
                                  index: index,
                                );
                              },
                              child: Container(
                                  padding: const EdgeInsets.only(
                                      top: 5, bottom: 5, right: 8, left: 8),
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(5),
                                    border: Border.all(
                                        color: Colors.black, width: 0.1),
                                  ),
                                  child: majorTitle(
                                      title: "${receiptItem.quantity}",
                                      color: Colors.black,
                                      size: 12.0)),
                            ),
                            IconButton(
                                onPressed: () {
                                  salesController.incrementItem(index);
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
                                salesController.removeFromList(index);
                              },
                            )
                          ]),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          if (verifyPermission(
                                  category: "pos", permission: "discount") &&
                              receiptItem.product!.maxDiscount != null &&
                              receiptItem.product!.maxDiscount! > 0 &&
                              type != "order")
                            InkWell(
                              onTap: () {
                                if (receiptItem.lineDiscount! > 0) {
                                  salesController.removeDiscount(index);
                                } else {
                                  discountDialog(
                                      controller: textEditingController,
                                      receiptItem: receiptItem,
                                      index: index);
                                }
                              },
                              child: receiptItem.lineDiscount! > 0
                                  ? const Text("Remove Discount",
                                      style: TextStyle(
                                          fontSize: 11, color: Colors.red))
                                  : const Text("Discount",
                                      style: TextStyle(fontSize: 11)),
                            ),
                          const SizedBox(
                            width: 20,
                          ),
                          if (verifyPermission(
                              category: "pos", permission: "edit_price"))
                            InkWell(
                              onTap: () {
                                showEditDialogPrice(
                                    productModel: productModel, index: index);
                              },
                              child: const Text(
                                "Change Price",
                                style: TextStyle(fontSize: 11),
                              ),
                            ),
                        ],
                      )
                    ],
                  )
                ],
              ),
            ],
          )
        : Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  "${productModel.name}".capitalize!,
                  style: const TextStyle(color: Colors.black, fontSize: 14),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const Spacer(),
              Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
                    minorTitle(
                        title:
                            "Total: ${htmlPrice(receiptItem.totalLinePrice, currency: receiptItem.product?.shop?.currency)}",
                        color: Colors.grey),
                    InkWell(
                      child: const Icon(
                        Icons.restore_from_trash,
                        size: 25,
                        color: Colors.red,
                      ),
                      onTap: () {
                        salesController.removeFromList(index);
                      },
                    )
                  ]),
                  InkWell(
                    onTap: () {
                      showEditDialogPrice(
                          productModel: productModel, index: index);
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
  );
}

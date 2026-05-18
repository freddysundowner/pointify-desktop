import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/models/saleitem.dart';
import 'package:pointify/screens/sales/components/return_stock.dart';

import '../../../main.dart';

Widget saleOrderItemCard(SaleItem invoiceItem, page) {
  return InkWell(
    onTap: () {
      if (page != "returns") {
        returnInvoiceItem(invoiceItem: invoiceItem);
      }
    },
    child: Card(
      child: Container(
        margin: const EdgeInsets.all(3),
        padding: const EdgeInsets.all(10),
        width: double.infinity,
        decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(5)),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              Icons.warning,
              color: page == "credit" || page == "returns"
                  ? Colors.red
                  : Colors.green,
              size: 25,
            ),
            const SizedBox(
              width: 20,
            ),
            Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          "${invoiceItem.product!.name}".capitalize!,
                          style: const TextStyle(
                              color: Colors.black,
                              fontSize: 16,
                              fontWeight: FontWeight.w600),
                        ),
                        const Spacer(),
                        Text(
                          "Receipt# ${invoiceItem.sale}".toUpperCase(),
                          style: const TextStyle(
                              color: Colors.black,
                              fontSize: 11,
                              fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    const SizedBox(height: 5),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              "Qty :${invoiceItem.quantity} @".capitalize!,
                              style: const TextStyle(
                                  color: Colors.black, fontSize: 16),
                            ),
                            const SizedBox(height: 5),
                            Text(
                              "${userController.currentUser.value!.primaryShop?.currency}.${invoiceItem.unitPrice!}",
                              style: const TextStyle(
                                  color: Colors.black, fontSize: 16),
                            ),
                            const Spacer(),
                            Text(
                              "Total:${userController.currentUser.value!.primaryShop?.currency}.${invoiceItem.unitPrice}",
                              style: TextStyle(
                                  color: page == "credit"
                                      ? Colors.yellow
                                      : Colors.green,
                                  fontSize: 16),
                            )
                          ],
                        ),
                        const SizedBox(
                          height: 5,
                        ),
                        // if (invoiceItem.sale!.creditTotal! > 0 &&
                        //     page != "returns")
                        //   Row(
                        //     children: [
                        //       Text(
                        //         "${invoiceItem.returnedItems} item returned",
                        //         style: const TextStyle(
                        //             color: Colors.red, fontSize: 16),
                        //       ),
                        //       SizedBox(
                        //         width: 30,
                        //       ),
                        //       InkWell(
                        //         onTap: () {},
                        //         child: Container(
                        //           padding: EdgeInsets.symmetric(
                        //               horizontal: 5, vertical: 3),
                        //           decoration: BoxDecoration(
                        //               borderRadius: BorderRadius.circular(5),
                        //               border: Border.all(color: Colors.grey)),
                        //           child: Row(
                        //             children: [
                        //               Text(
                        //                 "View",
                        //                 style:
                        //                     const TextStyle(color: Colors.red),
                        //               ),
                        //               Icon(
                        //                 Icons.receipt_long,
                        //                 size: 10,
                        //               )
                        //             ],
                        //           ),
                        //         ),
                        //       ),
                        //     ],
                        //   ),
                      ],
                    ),
                  ]),
            ),
          ],
        ),
      ),
    ),
  );
}

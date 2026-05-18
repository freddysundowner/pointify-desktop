
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../../functions/functions.dart';
import '../../../models/invoice.dart';

Widget productPurchaseHistoryContainer(InvoiceItem invoiceItem) {
  return Padding(
    padding: const EdgeInsets.all(3.0),
    child: Card(
      color: Colors.white.withOpacity(0.9),
      child: Padding(
        padding: const EdgeInsets.all(8.0),
        child: Row(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "${invoiceItem.product!.name}".capitalize!,
                      style: const TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.bold,
                          fontSize: 16),
                    ),
                    Text(
                        'Qty ${invoiceItem.quantity} @ ${invoiceItem.unitPrice!}  = ${htmlPrice(invoiceItem.unitPrice! * invoiceItem.quantity!)}'),
                    const SizedBox(
                      height: 5,
                    ),
                    if (invoiceItem.createdAt != null)
                      showDate(invoiceItem.createdAt!)
                  ],
                )
              ],
            ),
            const Spacer(),
            Column(
              children: [
                Text('by ~  ${invoiceItem.attendant?.username ?? ""}')
              ],
            )
          ],
        ),
      ),
    ),
  );
}

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/models/salereturn.dart';
import 'package:pointify/screens/receipts/view/sales_returned_receipt.dart';
import 'package:pointify/widgets/snackBars.dart';

import '../../../widgets/major_title.dart';

Widget saleReturnCard(SaleRetuns saleRetuns) {
  return InkWell(
    onTap: () {
      Get.to(() => ReturnedReceipt(
            saleRetuns: saleRetuns,
          ));
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
            const Icon(
              Icons.warning,
              color: Colors.red,
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
                          "${saleRetuns.items!.length} items ".capitalize!,
                          style: const TextStyle(
                              color: Colors.black,
                              fontSize: 16,
                              fontWeight: FontWeight.w600),
                        ),
                        const Spacer(),
                        Text(
                          "Receipt# ${saleRetuns.saleReturnNo}".toUpperCase(),
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
                              "Total Refunded : ${htmlPrice(saleRetuns.refundAmount)}"
                                  .capitalize!,
                              style: const TextStyle(
                                  color: Colors.black, fontSize: 16),
                            ),
                            const Spacer(),
                            Text(
                              "Cashier:${saleRetuns.attendantId?.username}",
                              style: const TextStyle(
                                  fontSize: 12, fontStyle: FontStyle.italic),
                            )
                          ],
                        ),
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

showbottomSheet(historyBody, context, salesId) {
  showModalBottomSheet(
      context: context,
      builder: (_) {
        return Container(
          color: Colors.white,
          width: double.infinity,
          height: MediaQuery.of(context).size.height * 0.1,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ListTile(
                onTap: () {
                  if (historyBody.customerId == null) {
                    showSnackBar(
                        message:
                            "You cannot return a product that ha no customer",
                        color: Colors.red);
                  } else {
                    // salesController.returnSale(historyBody, salesId);
                  }
                  Navigator.pop(context);
                },
                contentPadding: const EdgeInsets.all(10),
                leading: const Icon(
                  Icons.assignment_returned_outlined,
                  color: Colors.black,
                ),
                title: majorTitle(
                    title: "Return to stock", size: 12.0, color: Colors.black),
              )
            ],
          ),
        );
      });
}

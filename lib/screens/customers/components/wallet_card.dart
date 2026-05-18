import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/functions/functions.dart';

import '../../../models/payment.dart';
import 'cash_receipt.dart';

Widget walletUsageCard(
    {required Payment depositBody, required context, customer}) {
  return InkWell(
    onTap: () {
      Get.to(() => CashReceipt(
            receipt: depositBody,
          ));
    },
    child: Container(
      margin: const EdgeInsets.all(5),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
          color: Colors.white, borderRadius: BorderRadius.circular(8)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            depositBody.type == "payment"
                ? Icons.arrow_upward
                : depositBody.recieptNumber != null
                    ? Icons.compare_arrows
                    : Icons.arrow_downward,
            color: depositBody.type == "payment" ? Colors.red : Colors.green,
          ),
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(DateFormat().format(DateTime.parse(depositBody.date!))),
              const SizedBox(height: 10),
              Text("Receipt:#${depositBody.recieptNumber.toString()}"),
              if (depositBody.mpesaCode!.isNotEmpty)
                Text("Mpesa Code :${depositBody.mpesaCode}"),
            ],
          ),
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    htmlPrice(depositBody.amount),
                    style: TextStyle(
                      color: depositBody.type == "payment"
                          ? Colors.red
                          : Colors.green,
                    ),
                  ),
                  if (depositBody.paymentType!.isNotEmpty)
                    Text(
                      " via ${depositBody.paymentType}",
                      style: const TextStyle(
                        fontSize: 11,
                      ),
                    )
                ],
              ),
              if (depositBody.attendantId != null)
                Row(
                  children: [
                    const Text("By:"),
                    Text(
                        " ${depositBody.attendantId?.username!.capitalizeFirst}",
                        style: const TextStyle(fontSize: 12)),
                  ],
                ),
              const SizedBox(
                height: 5,
              ),
              Text(
                htmlPrice(depositBody.balance),
                style: const TextStyle(color: Colors.green, fontSize: 12),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/models/transferhistory.dart';

import '../screens/stock/transfer_history_view.dart';

Widget transferHistoryCard(
    {required TransferHistory stockTransferHistory, String? typeKey = ""}) {
  return InkWell(
    onTap: () {
      Get.to(() => TransferHistoryView(
            stockTransferHistory: stockTransferHistory,
          ));
    },
    child: Container(
      width: double.infinity,
      margin: const EdgeInsets.only(left: 8, right: 8, top: 5),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(10)),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (typeKey == 'in')
                  Text(
                    "Products Received from ${stockTransferHistory.fromShop?.name} Shop ",
                    style: const TextStyle(
                        color: Colors.black,
                        fontSize: 14,
                        fontWeight: FontWeight.w500),
                  ),
                if (typeKey == 'out')
                  Text(
                    "Products Transferred to ${stockTransferHistory.toShop?.name} Shop ",
                    style: const TextStyle(
                        color: Colors.black,
                        fontSize: 14,
                        fontWeight: FontWeight.w500),
                  ),
                Text(
                  "Total Items ${stockTransferHistory.transferItems?.length}",
                  style: const TextStyle(
                    color: Colors.black,
                    fontSize: 14,
                  ),
                ),
                if (stockTransferHistory.createdAt != null)
                  Text(
                    DateFormat("dd/MM/yyyy hh:mm a").format(
                        DateTime.parse(stockTransferHistory.createdAt!)
                            .toLocal()),
                    style: const TextStyle(
                      color: Colors.black,
                      fontSize: 14,
                    ),
                  ),
                const Divider()
              ],
            ),
          ),
          Text("By ~ ${stockTransferHistory.attendant?.username}")
        ],
      ),
    ),
  );
}

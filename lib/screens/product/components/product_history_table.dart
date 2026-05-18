import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/models/saleitem.dart';

import '../../../functions/functions.dart';
import '../../../models/product.dart';
import '../../../widgets/show_receipt_manage_modal.dart';

Widget productHistoryTable(
    {required context,
    required items,
    bool? showAction = false,
    required Product product}) {
  return Container(
    width: double.infinity,
    margin: const EdgeInsets.symmetric(horizontal: 5).copyWith(bottom: 10),
    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 10),
    child: Theme(
      data: Theme.of(context).copyWith(dividerColor: Colors.grey),
      child: DataTable(
        decoration: BoxDecoration(
            border: Border.all(
          width: 1,
          color: Colors.black,
        )),
        columnSpacing: 30.0,
        columns: [
          const DataColumn(label: Text('Product', textAlign: TextAlign.center)),
          const DataColumn(
              label: Text('Quantity', textAlign: TextAlign.center)),
          const DataColumn(label: Text('Total', textAlign: TextAlign.center)),
          if (showAction!)
            const DataColumn(
                label: Text('Attendant', textAlign: TextAlign.center)),
          if (showAction)
            const DataColumn(label: Text('Date', textAlign: TextAlign.center)),
          if (showAction)
            const DataColumn(
                label: Text('Actions', textAlign: TextAlign.center)),
        ],
        rows: List.generate(items.length, (index) {
          SaleItem receiptItems = items.elementAt(index);

          final y = receiptItems.product!.name;
          final h = receiptItems.quantity;
          final x = receiptItems.quantity! * receiptItems.unitPrice!;
          final z = receiptItems.attendant;
          final w = receiptItems.createdAt;

          return DataRow(cells: [
            DataCell(Text(y!)),
            DataCell(Text(h.toString())),
            DataCell(Text(x.toString())),
            if (showAction) DataCell(Text(z.toString())),
            if (showAction)
              DataCell(
                  Text(DateFormat("yyyy-dd-MMM ").format(DateTime.parse(w!)))),
            if (showAction)
              DataCell(
                InkWell(
                  onTap: () {
                    if (verifyPermission(
                        category: "sales", permission: "manage")) {
                      showReceiptManageModal(
                          Get.context!, receiptItems, product);
                    }
                  },
                  child: const Icon(
                    Icons.more_vert,
                    color: Colors.black,
                  ),
                ),
              ),
          ]);
        }),
      ),
    ),
  );
}

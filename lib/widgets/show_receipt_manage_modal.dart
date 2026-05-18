import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/salescontroller.dart';
import 'package:pointify/models/saleitem.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/widgets/alert.dart';

import '../models/product.dart';

showReceiptManageModal(context, SaleItem receiptItem, Product product) {
  SalesController salesController = Get.find<SalesController>();
  return showModalBottomSheet<void>(
      context: context,
      backgroundColor:
          isSmallScreen(context) ? Colors.white : Colors.transparent,
      builder: (BuildContext context) {
        return Container(
          color: Colors.white,
          margin: EdgeInsets.only(
              left: isSmallScreen(context)
                  ? 0
                  : MediaQuery.of(context).size.width * 0.2),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Padding(
                padding: EdgeInsets.all(8.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.start,
                  children: [Text('Manage Receipts')],
                ),
              ),
              ListTile(
                  leading: const Icon(Icons.list),
                  onTap: () {
                    generalAlert(
                        message: "Are you sure you want to return this receipt",
                        title: "Warning",
                        function: () async {
                          await salesController.returnSale(
                            saledId: receiptItem.sale["_id"]!,
                            returnItems: [
                              {
                                "product": receiptItem.product!.sId,
                                "quantity": receiptItem.quantity,
                              }
                            ],
                          );
                          salesController.getProductSales(
                              fromDate: salesController.filterStartDate.value,
                              toDate: salesController.filterEndDate.value,
                              product: product.sId);
                        });
                  },
                  title: const Text('Return Sale')),
              ListTile(
                  leading: const Icon(Icons.delete),
                  onTap: () {
                    generalAlert(
                        message: "Are you sure you want to delete this receipt",
                        function: () async {
                          await salesController.returnSale(
                            saledId: receiptItem.sale["_id"]!,
                            returnItems: [receiptItem],
                            deleteReceipt: true,
                          );
                          salesController.getSalesByProductId(
                              product: product,
                              fromDate: salesController.filterStartDate.value,
                              toDate: salesController.filterEndDate.value);
                        });
                  },
                  title: const Text('Delete')),
              ListTile(
                  leading: const Icon(Icons.clear),
                  onTap: () {
                    Get.back();
                  },
                  title: const Text('Close')),
            ],
          ),
        );
      });
}

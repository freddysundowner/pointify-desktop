import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/salescontroller.dart';
import 'package:pointify/models/saleitem.dart';
import 'package:pointify/models/salemodel.dart';
import 'package:pointify/widgets/minor_title.dart';

import '../../../utils/colors.dart';
import '../../../widgets/delete_dialog.dart';
import '../../../widgets/major_title.dart';
import '../../models/order.dart';
import '../sales/create_sale.dart';

showBottomSheet(BuildContext context, OrderItem salesModel) {
  SalesController salesController = Get.find<SalesController>();
  return showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      builder: (_) {
        return Container(
          color: Colors.white,
          height: MediaQuery.of(context).size.height * 0.4,
          child: Column(
            children: [
              Container(
                color: AppColors.mainColor.withOpacity(0.1),
                width: double.infinity,
                child: const ListTile(
                  title: Text("Manage Receipt"),
                ),
              ),
              ListTile(
                leading: const Icon(Icons.delete),
                onTap: () {
                  salesController.receipt.value = SaleModel(
                      items: salesModel.items
                          .map((item) => SaleItem(
                              product: item.product,
                              quantity: item.quantity,
                              unitPrice: item.sellingPrice,
                              lineDiscount: 0))
                          .toList(),
                      customerId: salesModel.customer,
                      orderId: salesModel.sId,
                      order: "order");
                  salesController.amountPaid.clear();
                  salesController.receipt.refresh();
                  salesController.selectedCustomerController.clear();

                  for (var element in salesController.receipt.value!.items!) {
                    salesController.changeSaleItem(element, status: "onHold");
                  }
                  salesController.selectedCustomerController.text =
                      salesModel.customer!.name!;
                  salesController.currentCustomer.value = salesModel.customer;
                  Get.to(() => CreateSale());
                },
                title: const Text("Complete Order"),
              ),
              ListTile(
                leading: const Icon(Icons.delete),
                onTap: () {
                  deleteDialog(
                      context: context,
                      onPressed: () {
                        salesController.deleteOrder(salesModel);
                      });
                },
                title: const Text("Void"),
              ),
              ListTile(
                leading: const Icon(
                  Icons.clear,
                  color: Colors.red,
                ),
                onTap: () {
                  Get.back();
                },
                title: const Text("Cancel "),
              ),
            ],
          ),
        );
      });
}

Widget orderCard({required OrderItem salesModel, String? from = ""}) {
  return InkWell(
    onTap: () {
      if (salesModel.status! == "pending") {
        showBottomSheet(Get.context!, salesModel);
      }
    },
    child: Container(
      margin: const EdgeInsets.all(5),
      padding: const EdgeInsets.all(10),
      width:
          MediaQuery.of(Get.context!).size.width < 600 ? double.infinity : 400,
      decoration: BoxDecoration(
        color: Colors.grey.withOpacity(0.2),
        borderRadius: BorderRadius.circular(5),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              majorTitle(
                  title: "#${(salesModel.receiptNo)?.toUpperCase()}",
                  color: Colors.black,
                  size: 12.0),
              const SizedBox(height: 3),
              majorTitle(
                  title: "Items: ${(salesModel.items.length)}",
                  color: Colors.black,
                  size: 12.0),
              minorTitle(
                title:
                    "Date: ${DateFormat("yyyy-MM-dd hh:mm").format(DateTime.parse(salesModel.createdAt!).toLocal())}",
                color: Colors.black,
                size: 11,
              ),
            ],
          ),
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 3),
              if (salesModel.customer != null)
                minorTitle(
                    title:
                        "From: ${salesModel.customer?.name}\n${salesModel.customer?.phoneNumber}",
                    color: Colors.black,
                    size: 12),
              const SizedBox(height: 3),
              Container(
                decoration: BoxDecoration(
                    border: Border.all(
                        color: _chechPaymentColor(orderItem: salesModel)),
                    borderRadius: BorderRadius.circular(5)),
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                child: minorTitle(
                    title: _chechPayment(salesModel),
                    size: 11,
                    color: _chechPaymentColor(orderItem: salesModel)),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}

Color _chechPaymentColor({OrderItem? orderItem}) {
  if (orderItem?.status == 'pending') return Colors.amber;
  if (orderItem?.status == 'cancelled') return Colors.red;
  if (orderItem?.status == 'completed') return Colors.green;
  return Colors.black;
}

String _chechPayment(OrderItem? salesModel) {
  if (salesModel?.status == 'pending') return "PENDING";
  if (salesModel?.status == 'cancelled') return "CANCELLED";
  if (salesModel?.status == 'completed') return "PROCESSED";
  return "PENDING";
}

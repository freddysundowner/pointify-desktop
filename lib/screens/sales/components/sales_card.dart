import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/salescontroller.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/screens/discover/orders/order_details.dart';
import 'package:pointify/screens/receipts/view/sales_receipt.dart';
import 'package:pointify/widgets/minor_title.dart';

import '../../../models/salemodel.dart';
import '../../../pdfFiles/pdfquotationpreview.dart';
import '../../../responsive/responsiveness.dart';
import '../../../utils/colors.dart';
import '../../../widgets/delete_dialog.dart';
import '../../../widgets/major_title.dart';
import '../../../widgets/normal_text.dart';

showBottomSheet(BuildContext context, SaleModel salesModel) {
  SalesController salesController = Get.find<SalesController>();
  return showModalBottomSheet(
      context: context,
      backgroundColor:
          isSmallScreen(context) ? Colors.white : Colors.transparent,
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
                leading: const Icon(Icons.edit),
                onTap: () {
                  Get.back();
                  salesController.updateSaleReceipt(
                      data: {"status": "cashed"}, salesModel: salesModel);
                },
                title: const Text("Cash in"),
              ),
              ListTile(
                leading: const Icon(Icons.delete),
                onTap: () {
                  salesController.receipt.value = salesModel;
                  salesController.amountPaid.clear();
                  salesController.receipt.refresh();
                  salesController.selectedCustomerController.clear();

                  for (var element in salesModel.items!) {
                    salesController.changeSaleItem(element, status: "onHold");
                  }
                  Get.back();
                  Get.back();
                },
                title: const Text("Edit"),
              ),
              ListTile(
                leading: const Icon(Icons.delete),
                onTap: () {
                  deleteDialog(
                      context: context,
                      onPressed: () {
                        salesController.voidReceipt(salesModel);
                      });
                },
                title: const Text("Void"),
              ),
              ListTile(
                leading: const Icon(Icons.print),
                onTap: () {
                  Get.to(() =>
                      PdfQuotation(invoice: salesModel, type: "Quotation"));
                },
                title: const Text("Print/Share as a Quotation"),
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

Widget salesCard({required SaleModel salesModel, String? from = ""}) {
  return InkWell(
    onTap: () {
      if (salesModel.status! == "hold") {
        showBottomSheet(Get.context!, salesModel);
      } else {
        if (salesModel.order != null && salesModel.order!.isNotEmpty) {
          Get.to(() => OrderDetails(
                salesModel: salesModel,
                type: "",
                from: from,
              ));
        } else {
          Get.to(() => SalesReceipt(
                salesModel: salesModel,
                type: "",
                from: from,
              ));
        }
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
                  title: "Receipt #${(salesModel.receiptNo)?.toUpperCase()}",
                  color: Colors.black,
                  size: 12.0),
              const SizedBox(height: 3),
              normalText(
                  title:
                      "Total: ${htmlPrice(salesModel.items!.fold(0.0, (previousValue, element) => previousValue + element.quantity!) > 0 ? salesModel.totalWithDiscount : 0)}",
                  color: Colors.black,
                  size: 14.0),
              const SizedBox(height: 3),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (from != "dues")
                    minorTitle(
                      title:
                          "Date: ${DateFormat("yyyy-MM-dd hh:mm").format(DateTime.parse(salesModel.createdAt!).toUtc())}",
                      color: Colors.black,
                      size: 11,
                    ),
                ],
              ),
            ],
          ),
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 3),
              if (salesModel.attendant != null)
                minorTitle(
                    title:
                        "Cashier: ${salesModel.attendant?.username?.capitalize}",
                    color: Colors.black),
              const SizedBox(height: 3),
              if (from != "dues")
                minorTitle(
                    title:
                        "Paid via: ${salesModel.paymentTag ?? salesModel.paymentType}",
                    color: Colors.black),

              if (salesModel.paymentTag == "split")
                Container(
                  decoration: BoxDecoration(
                      border: Border.all(color: Colors.red),
                      borderRadius: BorderRadius.circular(5)),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                  child: minorTitle(
                      title:
                          "Paid by ${Get.find<SalesController>().cashsalesfilterSelected.value}  ${htmlPrice(Get.find<SalesController>().getSaleAmount(saleModel: salesModel))}",
                      color: Colors.black,
                      size: 11),
                ),

              if (salesModel.paymentType == "credit")
                minorTitle(
                    title:
                        "Due on: ${DateFormat("yyyy-MM-dd").format(DateTime.parse(salesModel.dueDate ?? DateTime.now().toString()).toUtc())}",
                    color: Colors.black,
                    size: 11),
              // Get.find<SalesController>().getSaleAmount(),
              // if (showUnpaidBadge(salesModel)) const SizedBox(height: 5),
              // if (showUnpaidBadge(salesModel))
              //   Container(
              //     decoration: BoxDecoration(
              //         border: Border.all(color: Colors.red),
              //         borderRadius: BorderRadius.circular(5)),
              //     padding:
              //         const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
              //     child: Column(
              //       children: [
              //         minorTitle(
              //             title:
              //                 "${from == "dues" ? "Dues: " : "Unpaid"}: ${htmlPrice(salesModel.outstandingBalance)}",
              //             color: Colors.red),
              //       ],
              //     ),
              //   ),
            ],
          ),
        ],
      ),
    ),
  );
}

bool showUnpaidBadge(SaleModel salesModel) {
  return salesModel.status == "cashed" &&
      salesModel.paymentType == "credit" &&
      salesModel.outstandingBalance! > 0 &&
      salesModel.items!.fold(0.0,
              (previousValue, element) => previousValue + element.quantity!) >
          0;
}

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/saleitem.dart';
import 'package:pointify/responsive/responsiveness.dart';

import '../../../controllers/salescontroller.dart';
import '../../../functions/functions.dart';
import '../../../models/product.dart';
import '../../../models/salereturn.dart';
import '../../../utils/colors.dart';
import '../../../utils/date_filter.dart';
import '../../../widgets/alert.dart';
import '../../../widgets/show_receipt_manage_modal.dart';
import '../../../widgets/tab_view.dart';

class ProductReceiptsSales extends StatelessWidget {
  final Product product;
  final int i;

  ProductReceiptsSales({super.key, required this.product, required this.i});

  final SalesController salesController = Get.find<SalesController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: AppColors.mainColor,
        elevation: 0.1,
        leading: IconButton(
          onPressed: () {
            getYearlyRecords(product, function:
                (Product p, String firstDayofYear, String lastDayofYear) {
              salesController.getProductSales(
                  product: product.sId,
                  fromDate: firstDayofYear,
                  toDate: lastDayofYear);
            }, year: salesController.currentYear.value);
            Get.back();
          },
          icon: Icon(
            Icons.arrow_back_ios,
            color: isSmallScreen(context) ? Colors.white : Colors.black,
          ),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              userController.currentUser.value!.primaryShop?.warehouse == true
                  ? "Stock Out"
                  : "Sales",
              style: TextStyle(
                  fontSize: 16,
                  color: isSmallScreen(context) ? Colors.white : Colors.black),
            ),
            Text(
              product.name!,
              style: TextStyle(
                  fontSize: 12,
                  color: isSmallScreen(context) ? Colors.white : Colors.black),
            )
          ],
        ),
        actions: [
          Icon(
            Icons.picture_as_pdf,
            color: isSmallScreen(context) ? Colors.white : Colors.black,
            size: 25,
          ),
          IconButton(
              onPressed: () async {
                Get.to(() => DateFilter(
                      from: "ProductReceiptsSales",
                      i: i,
                      product: product,
                      function: (value) {
                        filterDateFunction(value);
                      },
                    ));
              },
              icon: Icon(
                Icons.filter_alt,
                color: isSmallScreen(context) ? Colors.white : Colors.black,
              ))
        ],
      ),
      body: Obx(
        () => Column(
          children: [
            const SizedBox(
              height: 20,
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                  "From ${'${salesController.filterStartDate.value} - ${salesController.filterEndDate.value}'}"),
            ),
            const SizedBox(
              height: 10,
            ),
            const Divider(),
            Expanded(
              child: DefaultTabController(
                  initialIndex: 0,
                  length: product.type == "service" ? 1 : 2,
                  child: Builder(builder: (context) {
                    return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          TabBar(
                            controller: DefaultTabController.of(context),
                            onTap: (index) {
                              if (index == 0) {
                                salesController.getProductSales(
                                    fromDate:
                                        salesController.filterStartDate.value,
                                    toDate: salesController.filterEndDate.value,
                                    product: product.sId);
                              }
                              if (index == 1) {
                                salesController.getReturns(
                                    product: product,
                                    fromDate:
                                        salesController.filterStartDate.value,
                                    toDate: salesController.filterEndDate.value,
                                    type: "return",
                                    shopid: userController
                                        .currentUser.value!.primaryShop!.id!);
                              }
                            },
                            tabs: [
                              Tab(
                                child: Obx(
                                  () => tabView(
                                      title: userController.currentUser.value!
                                                  .primaryShop?.warehouse ==
                                              true
                                          ? "Stock Out"
                                          : "Sales",
                                      subtitle: htmlPrice(salesController
                                          .productSaleRceipts
                                          .fold(
                                              0.0,
                                              (previousValue, element) =>
                                                  previousValue +
                                                  element.unitPrice! *
                                                      element.quantity!))),
                                ),
                              ),
                              if (product.type == "product")
                                Tab(
                                    child: tabView(
                                        title: "Returns",
                                        subtitle: htmlPrice(salesController
                                            .allSalesReturns
                                            .fold(
                                                0.0,
                                                (previousValue, element) =>
                                                    previousValue +
                                                    element.refundAmount!)))),
                            ],
                          ),
                          Expanded(
                            child: Container(
                              color: Colors.white,
                              child: TabBarView(
                                  controller: DefaultTabController.of(context),
                                  children: [
                                    if (product.type == "product")
                                      Obx(
                                        () {
                                          return salesController
                                                  .loadingSales.isTrue
                                              ? const Center(
                                                  child:
                                                      CircularProgressIndicator(),
                                                )
                                              : salesController
                                                      .productSaleRceipts
                                                      .isEmpty
                                                  ? const Center(
                                                      child: Text(
                                                          "There are no items to display"),
                                                    )
                                                  : ListView.builder(
                                                      shrinkWrap: true,
                                                      itemCount: salesController
                                                          .productSaleRceipts
                                                          .length,
                                                      itemBuilder:
                                                          (context, index) {
                                                        SaleItem receiptItem =
                                                            salesController
                                                                .productSaleRceipts
                                                                .elementAt(
                                                                    index);
                                                        return productSaleContainer(
                                                            receiptItem);
                                                      });
                                        },
                                      ),
                                    Obx(() {
                                      return salesController.loadingSales.isTrue
                                          ? const Center(
                                              child:
                                                  CircularProgressIndicator(),
                                            )
                                          : salesController
                                                  .allSalesReturns.isEmpty
                                              ? const Center(
                                                  child: Text(
                                                      "There are no items to display"),
                                                )
                                              : ListView.builder(
                                                  shrinkWrap: true,
                                                  itemCount: salesController
                                                      .allSalesReturns.length,
                                                  itemBuilder:
                                                      (context, index) {
                                                    SaleRetuns receiptItem =
                                                        salesController
                                                            .allSalesReturns
                                                            .elementAt(index);
                                                    return productSaleReturnContainer(
                                                        receiptItem);
                                                  });
                                    }),
                                  ]),
                            ),
                          )
                        ]);
                  })),
            ),
          ],
        ),
      ),
    );
  }

  Widget productSaleContainer(SaleItem receiptItem) {
    return InkWell(
      onTap: () {
        if (verifyPermission(category: "sales", permission: "manage")) {
          showReceiptManageModal(Get.context!, receiptItem, product);
        }
      },
      child: Container(
          margin: const EdgeInsets.symmetric(vertical: 5, horizontal: 10),
          padding: const EdgeInsets.symmetric(vertical: 5),
          decoration: const BoxDecoration(
              border: Border(
                  bottom: BorderSide(
            color: Colors.grey,
            width: 0.5,
          ))),
          child: Row(
            children: [
              Container(
                decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(40),
                    color: AppColors.mainColor),
                padding: const EdgeInsets.all(10),
                child: const Icon(
                  Icons.check,
                  color: Colors.white,
                  size: 20,
                ),
              ),
              const SizedBox(
                width: 10,
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    margin: const EdgeInsets.only(bottom: 5),
                    decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(5),
                        border: Border.all(color: Colors.grey, width: 0.5)),
                    child: Text(
                      receiptItem.receiptNo!.toUpperCase(),
                      style: const TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.bold,
                          fontSize: 14),
                    ),
                  ),
                  if (receiptItem.quantity! > 0)
                    Text(
                        'Qty ${receiptItem.quantity} @ ${receiptItem.unitPrice}'),
                  if (receiptItem.createdAt != null)
                    Text(
                        '${DateFormat("MMM dd, yyyy, hh:m a").format(DateTime.parse(receiptItem.createdAt!).toLocal())} '),
                ],
              ),
              const Spacer(),
              if (verifyPermission(category: "sales", permission: "manage"))
                const Icon(
                  Icons.more_vert_rounded,
                )
            ],
          )),
    );
  }

  Widget productSaleReturnContainer(SaleRetuns receiptItem) {
    return InkWell(
      onTap: () {
        if (verifyPermission(category: "sales", permission: "manage")) {
          showReceiptReturnManageModal(Get.context!, receiptItem, product);
        }
      },
      child: Container(
          margin: const EdgeInsets.symmetric(vertical: 5, horizontal: 10),
          padding: const EdgeInsets.symmetric(vertical: 5),
          decoration: const BoxDecoration(
              border: Border(
                  bottom: BorderSide(
            color: Colors.grey,
            width: 0.5,
          ))),
          child: Row(
            children: [
              Container(
                decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(40),
                    color: AppColors.mainColor),
                padding: const EdgeInsets.all(10),
                child: const Icon(
                  Icons.check,
                  color: Colors.white,
                  size: 20,
                ),
              ),
              const SizedBox(
                width: 10,
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    margin: const EdgeInsets.only(bottom: 5),
                    decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(5),
                        border: Border.all(color: Colors.grey, width: 0.5)),
                    child: Text(
                      receiptItem.saleReturnNo!.toUpperCase(),
                      style: const TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.bold,
                          fontSize: 14),
                    ),
                  ),
                  if (receiptItem.items!.isNotEmpty)
                    Text(
                        'Qty ${receiptItem.items!.fold(0.0, (previousValue, element) => element.quantity! + previousValue)} @ ${receiptItem.items!.fold(0.0, (previousValue, element) => element.unitPrice! + previousValue)}'),
                  if (receiptItem.createdAt != null)
                    Text(
                        '${DateFormat("MMM dd, yyyy, hh:m a").format(DateTime.parse(receiptItem.createdAt!))} '),
                ],
              ),
              const Spacer(),
              if (verifyPermission(category: "sales", permission: "manage"))
                const Icon(
                  Icons.more_vert_rounded,
                )
            ],
          )),
    );
  }

  showReceiptReturnManageModal(
      context, SaleRetuns receiptItem, Product product) {
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
                    leading: const Icon(Icons.delete),
                    onTap: () {
                      generalAlert(
                          message:
                              "Are you sure you want to delete this receipt",
                          function: () {
                            salesController.deleteSaleReturn(
                              receiptItem.sId!,
                            );
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

  void filterDateFunction(value) {
    // if (value is PickerDateRange) {
    //   final DateTime rangeStartDate = value.startDate!;
    //   final DateTime rangeEndDate = value.endDate!;
    //   salesController.filterStartDate.value = rangeStartDate;
    //   salesController.filterEndDate.value = rangeEndDate;
    // } else if (value is DateTime) {
    //   final DateTime selectedDate = value;
    //   salesController.filterStartDate.value = selectedDate;
    //   salesController.filterEndDate.value = selectedDate;
    // }

    salesController.getProductSales(
        fromDate: salesController.filterStartDate.value,
        toDate: salesController.filterEndDate.value,
        product: product.sId);
    salesController.getReturns(
        product: product,
        fromDate: salesController.filterStartDate.value,
        toDate: salesController.filterEndDate.value,
        type: "return",
        shopid: userController.currentUser.value!.primaryShop!.id!);
  }
}

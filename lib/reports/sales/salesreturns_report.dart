import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/main.dart';
import 'package:pointify/utils/helper.dart';
import 'package:pointify/widgets/no_items_found.dart';
import 'package:syncfusion_flutter_datepicker/datepicker.dart';

import '../../../controllers/homecontroller.dart';
import '../../../controllers/salescontroller.dart';
import '../../../controllers/shopcontroller.dart';
import '../../models/salereturn.dart';
import '../../screens/sales/components/sales_rerurn_card.dart';

class SalesReturnsReport extends StatefulWidget {
  final String? title;
  const SalesReturnsReport({super.key, this.title});

  @override
  State<SalesReturnsReport> createState() => _SalesReturnsReportState();
}

class _SalesReturnsReportState extends State<SalesReturnsReport> {
  final SalesController salesController = Get.find<SalesController>();

  final ShopController shopController = Get.find<ShopController>();

  final HomeController homeController = Get.find<HomeController>();

  @override
  Widget build(BuildContext context) {
    return Helper(
      floatButton: Container(),
      bottomNavigationBar: _bottomView(),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.3,
        centerTitle: false,
        title: Text(
          widget.title!,
          style: const TextStyle(color: Colors.black),
        ),
        leading: IconButton(
          onPressed: () {
            Get.back();
          },
          icon: const Icon(
            Icons.arrow_back_ios,
            color: Colors.black,
          ),
        ),
      ),
      widget: ListView(
        children: [
          const SizedBox(
            height: 10,
          ),
          Obx(() {
            return Column(
              children: [
                searchWidget(),
                salesController.loadingSales.isTrue
                    ? const Center(
                        child: CircularProgressIndicator(),
                      )
                    : salesController.allSalesReturns.isEmpty
                        ? noItemsFound(context, true)
                        : ListView.builder(
                            itemCount: salesController.allSalesReturns.length,
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemBuilder: (context, index) {
                              SaleRetuns receiptItem = salesController
                                  .allSalesReturns
                                  .elementAt(index);
                              return saleReturnCard(receiptItem);
                            }),
              ],
            );
          })
        ],
      ),
    );
  }

  Widget searchWidget() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: TextFormField(
              controller: salesController.searchSaleReceiptController,
              onChanged: (value) {
                if (value == "") {
                  salesController.getSalesByDate(
                    shop: userController.currentUser.value!.primaryShop!.id!,
                    fromDate: salesController.filterStartDate.value,
                    toDate: salesController.filterEndDate.value,
                  );
                } else {
                  salesController.getSalesByDate(
                    shop: userController.currentUser.value!.primaryShop!.id!,
                    fromDate: salesController.filterStartDate.value,
                    toDate: salesController.filterEndDate.value,
                  );
                }
              },
              decoration: InputDecoration(
                contentPadding: const EdgeInsets.fromLTRB(10, 2, 0, 2),
                suffixIcon: IconButton(
                  onPressed: () {
                    salesController.getSalesByDate(
                      shop: userController.currentUser.value!.primaryShop!.id!,
                    );
                  },
                  icon: const Icon(Icons.search),
                ),
                hintText: ""
                    "Search by receipt number",
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  _bottomView() {
    return Obx(
      () => SizedBox(
        height: 40,
        child: Row(
          children: [
            const SizedBox(
              width: 10,
            ),
            Column(
              children: [
                const Text("Items"),
                Text(
                  salesController.allSalesReturns.length.toString(),
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.bold),
                )
              ],
            ),
            const SizedBox(
              width: 20,
            ),
            Column(
              children: [
                const Text("Qty"),
                Text(
                  salesController.allSalesReturns
                      .fold(
                          0.0,
                          (previousValue, element) =>
                              previousValue +
                              element.items!.fold(
                                  0.0,
                                  (previousValue, element) =>
                                      previousValue + element.quantity!))
                      .toString(),
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.bold),
                )
              ],
            ),
            const Spacer(),
            Column(
              children: [
                const Text("Total"),
                Text(
                  htmlPrice(salesController.allSalesReturns.fold(
                      0,
                      (previousValue, element) =>
                          previousValue + element.refundAmount!)),
                  style: const TextStyle(
                      fontSize: 13, fontWeight: FontWeight.bold),
                )
              ],
            ),
            const SizedBox(
              width: 10,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> parseFuncton(value) async {
    if (value is PickerDateRange) {
      final DateTime rangeStartDate = value.startDate!;
      final DateTime rangeEndDate = value.endDate!;
      salesController.filterStartDate.value =
          DateFormat('yyyy-MM-dd').format(rangeStartDate);
      salesController.filterEndDate.value =
          DateFormat('yyyy-MM-dd').format(rangeEndDate);
    } else {
      final DateTime selectedDate = value;
      salesController.filterStartDate.value =
          DateFormat('yyyy-MM-dd').format(selectedDate);
      salesController.filterEndDate.value =
          DateFormat('yyyy-MM-dd').format(selectedDate);
    }
    if (salesController.salesInitialIndex.value == 0) {
      salesController.getSalesByDate(
          fromDate: salesController.filterStartDate.value,
          toDate: salesController.filterEndDate.value,
          shop: userController.currentUser.value!.primaryShop!.id!);
    }
    if (salesController.salesInitialIndex.value == 1) {
      salesController.getReturns(
          fromDate: salesController.filterStartDate.value,
          toDate: salesController.filterEndDate.value,
          shopid: userController.currentUser.value!.primaryShop!.id!);
    }
    if (salesController.salesInitialIndex.value == 2) {
      await callAnalysis();
    }
  }

  Future<void> callAnalysis() async {
    await salesController.getDailySalesGraph(
        fromDate: salesController.filterStartDate.value,
        toDate: salesController.filterEndDate.value);
    await salesController.getProductComparison(
        fromDate: salesController.filterStartDate.value,
        toDate: salesController.filterEndDate.value);
    await salesController.getSalesByAttendants(
        fromDate: salesController.filterStartDate.value,
        toDate: salesController.filterEndDate.value);
    setState(() {});
  }
}

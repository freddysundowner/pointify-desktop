import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/stockcontroller.dart';
import 'package:pointify/models/productcount.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/widgets/no_items_found.dart';
import 'package:printing/printing.dart';

import '../controllers/homecontroller.dart';
import '../controllers/reports_controller.dart';
import '../controllers/shopcontroller.dart';
import '../main.dart';
import '../screens/receipts/pdf/stocktake/stocktake_pdf.dart';
import '../screens/stock/stock_counts.dart';
import '../utils/colors.dart';
import '../widgets/filter_dates.dart';

class StockTakeReport extends StatelessWidget {
  StockTakeReport({Key? key}) : super(key: key) {
    stockController.getCountHistory(
      fromDate: DateFormat("yyyy-MM-dd").format(DateTime.now()),
      toDate: DateFormat("yyyy-MM-dd").format(DateTime.now()),
    );
  }

  final StockController stockController = Get.find<StockController>();
  final ShopController createShopController = Get.find<ShopController>();
  final ReportsController reportsController = Get.find<ReportsController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
            elevation: 0.0,
            actions: [
              IconButton(
                  onPressed: () {
                    List<Item> itemsProduct = [];
                    //for each
                    for (var count in stockController.countHistory) {
                      itemsProduct.addAll(count.items!);
                    }
                    Get.to(() => Scaffold(
                          appBar: AppBar(
                            title: const Text("Sales summary report"),
                          ),
                          body: PdfPreview(
                            build: (context) => salesTakeReportPdf(
                                itemsProduct, "STOCK TAKE REPORT"),
                          ),
                        ));
                  },
                  icon:  Icon(
                    Icons.picture_as_pdf,
                    color: AppColors.mainColor,
                  ))
            ],
            leading: IconButton(
                onPressed: () {
                 Get.back();
                },
                icon: const Icon(
                  Icons.arrow_back_ios,
                  color: Colors.black,
                )),
            backgroundColor: Colors.white,
            title: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Stock Take Report',
                      style: TextStyle(fontSize: 18, color: Colors.black),
                    ),
                    Obx(() {
                      return Text(
                          userController.currentUser.value!.primaryShop == null
                              ? ""
                              : userController
                                  .currentUser.value!.primaryShop!.name!,
                          style: const TextStyle(
                              fontSize: 15, color: Colors.black));
                    })
                  ],
                ),
              ],
            )),
        body: Obx(() {
          return Column(
            children: [
              const SizedBox(height: 20),
              filterByDates(onFilter: (start, end, type) {
                reportsController.activeFilter.value = type;
                reportsController.filterStartDate.value = DateFormat(
                  "yyyy-MM-dd",
                ).format(start);
                reportsController.filterEndDate.value = DateFormat(
                  "yyyy-MM-dd",
                ).format(end);

                stockController.getCountHistory(
                  fromDate: reportsController.filterStartDate.value,
                  toDate: reportsController.filterEndDate.value,
                );
              }),
              const SizedBox(height: 30),
              stockController.isLoadingCount.isTrue
                  ? const Center(
                      child: CircularProgressIndicator(),
                    )
                  : stockController.countHistory.isEmpty
                      ? noItemsFound(context, true)
                      : Expanded(
                          child: ListView.builder(
                              shrinkWrap: true,
                              itemCount: stockController.countHistory.length,
                              itemBuilder: (context, index) {
                                ProductCount productCount = stockController
                                    .countHistory
                                    .elementAt(index);

                                return productHistoryContainer(productCount);
                              }),
                        ),
            ],
          );
        }));
  }

  Widget productHistoryContainer(ProductCount productBody) {
    return Padding(
      padding: const EdgeInsets.all(3.0),
      child: Card(
        color: Colors.white.withOpacity(0.9),
        child: Padding(
          padding: const EdgeInsets.all(8.0),
          child: Row(
            children: [
              Center(
                child: ClipOval(
                  child: Container(
                    height: 40,
                    width: 40,
                    decoration: BoxDecoration(
                      color: AppColors.mainColor,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Icon(Icons.check, color: Colors.white),
                  ),
                ),
              ),
              const SizedBox(
                width: 10,
              ),
              if (productBody.items!.isNotEmpty)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "products counted: ${productBody.items?.length}"
                          .capitalize!,
                      style: const TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.bold,
                          fontSize: 18),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          vertical: 2, horizontal: 5),
                      decoration: BoxDecoration(
                          color: Colors.black12,
                          borderRadius: BorderRadius.circular(5)),
                      child: Text(
                        'System Count ${productBody.items?.first.initialCount}, Physical Count ${productBody.items?.first.physicalCount}',
                        style: const TextStyle(fontSize: 13),
                      ),
                    ),
                    if (productBody.items?.first.createdAt != null)
                      Text(
                          '${DateFormat("MMM dd,yyyy, hh:mm a").format(DateTime.parse(productBody.items!.first.createdAt!).toLocal())} '),
                  ],
                )
            ],
          ),
        ),
      ),
    );
  }
}

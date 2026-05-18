import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/order.dart';
import 'package:pointify/screens/discover/order_card.dart';
import 'package:pointify/utils/helper.dart';
import 'package:pointify/widgets/alert.dart';
import 'package:pointify/widgets/no_items_found.dart';
import 'package:printing/printing.dart';
import 'package:syncfusion_flutter_datepicker/datepicker.dart';

import '../../controllers/homecontroller.dart';
import '../../controllers/reports_controller.dart';
import '../../controllers/salescontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../models/salemodel.dart';
import '../../models/salereturn.dart';
import '../../utils/colors.dart';
import '../../widgets/filter_dates.dart';
import '../../widgets/textbutton.dart';
import '../receipts/pdf/sales/sales_report.dart';
import 'components/sales_card.dart';
import 'components/sales_rerurn_card.dart';

class AllSalesPage extends StatefulWidget {
  final String? page;

  const AllSalesPage({super.key, required this.page});

  @override
  State<AllSalesPage> createState() => _AllSalesPageState();
}

class _AllSalesPageState extends State<AllSalesPage> {
  SalesController salesController = Get.find<SalesController>();

  ShopController shopController = Get.find<ShopController>();

  HomeController homeController = Get.find<HomeController>();

  ReportsController reportsController = Get.find<ReportsController>();
  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: salesController.tabController.length,
      initialIndex: salesController.salesInitialIndex.value,
      child: Helper(
        floatButton: Container(),
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0.3,
          centerTitle: false,
          title: const Text(
            "Sales & Orders",
            style: TextStyle(color: Colors.black),
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
          actions: [
            Center(
                child: textBtn(
                    vPadding: 5,
                    hPadding: 20,
                    text: "Print",
                    bgColor: AppColors.mainColor,
                    color: Colors.white,
                    onPressed: () {
                      if (salesController.salesInitialIndex.value == 2) {
                        generalAlert(
                          title: "Cannot print graph",
                        );
                        return;
                      }
                      if (salesController.salesInitialIndex.value == 0) {
                        Get.to(() => Scaffold(
                              appBar: AppBar(
                                title: const Text("Sales Report"),
                              ),
                              body: PdfPreview(
                                build: (context) =>
                                    salesReportPdf("receipts", "SALES REPORT "),
                              ),
                            ));
                      }
                    })),
            const SizedBox(
              width: 10,
            )
          ],
        ),
        widget: Builder(builder: (context) {
          return Column(
            children: [
              Obx(
                () => filterByDates(onFilter: (start, end, type) {
                  reportsController.activeFilter.value = type;
                  reportsController.filterStartDate.value = DateFormat(
                    "yyyy-MM-dd",
                  ).format(start);
                  reportsController.filterEndDate.value = DateFormat(
                    "yyyy-MM-dd",
                  ).format(end);

                  callData();
                }),
              ),
              TabBar(
                  controller: DefaultTabController.of(context),
                  onTap: (value) {
                    salesController.salesInitialIndex.value = value;
                    callData();
                  },
                  tabs: [
                    Tab(
                        child: Text(
                      "Sales",
                      style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: Colors.black),
                    )),
                    Tab(
                        child: Stack(clipBehavior: Clip.none, children: [
                      Text(
                        "Orders",
                        style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Colors.black),
                      ),
                      Positioned(
                          right: -20,
                          top: -10,
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.red,
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: Colors.white,
                              ),
                            ),
                            padding: EdgeInsets.all(5),
                            child: Text(
                              salesController.orders
                                  .map((e) => e.status)
                                  .where((element) => element == "pending")
                                  .toList()
                                  .length
                                  .toString(),
                              style: const TextStyle(color: Colors.white),
                            ),
                          ))
                    ])),
                    const Tab(
                        child: Text(
                      "Returns",
                      style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: Colors.black),
                    )),
                  ]),
              Expanded(
                flex: 1,
                child: Container(
                  color: Colors.white,
                  child: TabBarView(
                    physics: const NeverScrollableScrollPhysics(),
                    children: [
                      Obx(
                        () => Column(
                          children: [
                            const SizedBox(
                              height: 10,
                            ),
                            if (salesController.salesInitialIndex.value == 0)
                              searchWidget(),
                            Expanded(
                              child: AllSales(
                                type: "sales",
                              ),
                            )
                          ],
                        ),
                      ),
                      Obx(
                        () => Column(
                          children: [
                            const SizedBox(
                              height: 10,
                            ),
                            if (salesController.salesInitialIndex.value == 1)
                              searchWidget(),
                            Expanded(
                              child: AllSales(
                                type: "sales",
                              ),
                            )
                          ],
                        ),
                      ),
                      AllSales(type: "returns"),
                    ],
                  ),
                ),
              )
            ],
          );
        }),
      ),
    );
  }

  void callData() {
    if (salesController.salesInitialIndex.value == 0) {
      salesController.getSalesByDate(
          fromDate: reportsController.filterStartDate.value,
          toDate: reportsController.filterEndDate.value,
          status: "cashed",
          shop: userController.currentUser.value!.primaryShop!.id!);
    }

    if (salesController.salesInitialIndex.value == 1) {
      salesController.getOrders(
        fromDate: reportsController.filterStartDate.value,
        toDate: reportsController.filterEndDate.value,
      );
    }

    if (salesController.salesInitialIndex.value == 2) {
      salesController.getReturns(
          fromDate: reportsController.filterStartDate.value,
          toDate: reportsController.filterEndDate.value,
          type: "returns",
          shopid: userController.currentUser.value!.primaryShop!.id!);
    }

    if (salesController.salesInitialIndex.value == 2) {
      callAnalysis();
    }
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
                salesController.allSalesFiltered.clear();
                if (value == "") {
                  salesController.allSalesFiltered
                      .addAll(salesController.allSales);
                } else {
                  salesController.allSalesFiltered.addAll(salesController
                      .allSales
                      .where((p0) =>
                          p0.receiptNo
                              .toString()
                              .toLowerCase()
                              .contains(value.toLowerCase()) ||
                          p0.items!.any((element) => element.product!.name!
                              .toLowerCase()
                              .contains(value.toLowerCase())))
                      .toList());
                }
              },
              decoration: InputDecoration(
                contentPadding: const EdgeInsets.fromLTRB(10, 2, 0, 2),
                suffixIcon: IconButton(
                  onPressed: () {},
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
        fromDate: reportsController.filterStartDate.value,
        toDate: reportsController.filterEndDate.value);
    await salesController.getProductComparison(
        fromDate: reportsController.filterStartDate.value,
        toDate: reportsController.filterEndDate.value);
    await salesController.getSalesByAttendants(
        fromDate: reportsController.filterStartDate.value,
        toDate: reportsController.filterEndDate.value);
    setState(() {});
  }
}

class AllSales extends StatelessWidget {
  final String? type;
  final SalesController salesController = Get.find<SalesController>();
  final ShopController shopController = Get.find<ShopController>();

  AllSales({super.key, this.type});

  _checkEmptyView() {
    if (salesController.salesInitialIndex.value == 0) {
      return salesController.allSalesFiltered.isEmpty;
    }
    if (salesController.salesInitialIndex.value == 1) {
      return salesController.orders.isEmpty;
    }
    if (salesController.salesInitialIndex.value == 2) {
      return salesController.allSalesReturns.isEmpty;
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      return salesController.loadingSales.isTrue
          ? const Center(
              child: CircularProgressIndicator(),
            )
          : _checkEmptyView()
              ? noItemsFound(context, true)
              : salesController.salesInitialIndex.value == 1
                  ? ListView.builder(
                      itemCount: salesController.orders.length,
                      shrinkWrap: true,
                      controller: salesController.scrollController,
                      itemBuilder: (context, index) {
                        OrderItem orderItem =
                            salesController.orders.elementAt(index);
                        return orderCard(salesModel: orderItem, from: "sales");
                      })
                  : salesController.salesInitialIndex.value == 2
                      ? ListView.builder(
                          itemCount: salesController.allSalesReturns.length,
                          shrinkWrap: true,
                          controller: salesController.scrollController,
                          itemBuilder: (context, index) {
                            SaleRetuns receiptItem = salesController
                                .allSalesReturns
                                .elementAt(index);
                            return saleReturnCard(receiptItem);
                          })
                      : ListView.builder(
                          shrinkWrap: true,
                          itemCount: salesController.allSalesFiltered.length,
                          controller: salesController.scrollController,
                          itemBuilder: (context, index) {
                            SaleModel salesModel = salesController
                                .allSalesFiltered
                                .elementAt(index);
                            return salesCard(
                                salesModel: salesModel, from: "sales");
                          });
    });
  }
}

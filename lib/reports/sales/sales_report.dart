import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/main.dart';
import 'package:pointify/utils/helper.dart';
import 'package:pointify/widgets/alert.dart';
import 'package:printing/printing.dart';

import '../../../controllers/homecontroller.dart';
import '../../../controllers/salescontroller.dart';
import '../../../controllers/shopcontroller.dart';
import '../../controllers/reports_controller.dart';
import '../../models/salemodel.dart';
import '../../screens/receipts/pdf/sales/sales_report.dart';
import '../../screens/receipts/pdf/sales/sales_report_pdf.dart';
import '../../screens/sales/components/sales_card.dart';
import '../../utils/colors.dart';
import '../../widgets/filter_dates.dart';
import '../../widgets/no_items_found.dart';
import '../../widgets/textbutton.dart';

class SalesReport extends StatefulWidget {
  final String? title;
  final String? keyFrom;
  SalesReport({super.key, this.title, this.keyFrom}) {
    SalesController salesController = Get.find<SalesController>();
    if (keyFrom == "dues") {
      salesController.getSalesByDate(
        dueDate: DateFormat('yyyy-MM-dd').format(DateTime.now()),
        fromDate: DateFormat('yyyy-MM-dd').format(DateTime.now()),
        toDate: DateFormat('yyyy-MM-dd').format(DateTime.now()),
        paymentType: "credit",
        shop: userController.currentUser.value!.primaryShop!.id!,
      );
    }
  }

  @override
  State<SalesReport> createState() => _SalesReportState();
}

class _SalesReportState extends State<SalesReport> {
  SalesController salesController = Get.find<SalesController>();

  ShopController shopController = Get.find<ShopController>();

  HomeController homeController = Get.find<HomeController>();

  ReportsController reportsController = Get.find<ReportsController>();
  @override
  Widget build(BuildContext context) {
    return Helper(
      floatButton: Container(),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.3,
        centerTitle: false,
        actions: [
          if (userController.currentUser.value?.usertype == "admin")
            PopupMenuButton<String>(
              icon: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.more_vert),
              ),
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: "report",
                  child: Text("Generate Report"),
                ),
              ],
              onSelected: (value) async {
                DateTime fromDate = DateTime.now();
                DateTime toDate = DateTime.now();

                String paymentType = "all";
                String exportType = "excel";
                String reportMode = "summary";

                await Get.bottomSheet(
                  StatefulBuilder(
                    builder: (context, setState) {
                      return SafeArea(
                        child: Container(
                          padding: const EdgeInsets.all(20),
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.vertical(
                              top: Radius.circular(28),
                            ),
                          ),
                          child: SingleChildScrollView(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Center(
                                  child: Container(
                                    width: 50,
                                    height: 5,
                                    decoration: BoxDecoration(
                                      color: Colors.grey.shade300,
                                      borderRadius: BorderRadius.circular(100),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 20),
                                const Text(
                                  "Generate Sales Report",
                                  style: TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 5),
                                Text(
                                  "Export your sales data as Excel or PDF",
                                  style: TextStyle(
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                                const SizedBox(height: 25),
                                const Text(
                                  "Report Type",
                                  style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    Expanded(
                                      child: InkWell(
                                        onTap: () {
                                          setState(() {
                                            reportMode = "summary";
                                          });
                                        },
                                        child: AnimatedContainer(
                                          duration:
                                              const Duration(milliseconds: 200),
                                          padding: const EdgeInsets.symmetric(
                                            vertical: 14,
                                          ),
                                          decoration: BoxDecoration(
                                            color: reportMode == "summary"
                                                ? AppColors.mainColor
                                                : Colors.grey.shade100,
                                            borderRadius:
                                                BorderRadius.circular(14),
                                          ),
                                          child: Text(
                                            "Summary",
                                            textAlign: TextAlign.center,
                                            style: TextStyle(
                                              color: reportMode == "summary"
                                                  ? Colors.white
                                                  : Colors.black,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: InkWell(
                                        onTap: () {
                                          setState(() {
                                            reportMode = "full";
                                          });
                                        },
                                        child: AnimatedContainer(
                                          duration:
                                              const Duration(milliseconds: 200),
                                          padding: const EdgeInsets.symmetric(
                                            vertical: 14,
                                          ),
                                          decoration: BoxDecoration(
                                            color: reportMode == "full"
                                                ? AppColors.mainColor
                                                : Colors.grey.shade100,
                                            borderRadius:
                                                BorderRadius.circular(14),
                                          ),
                                          child: Text(
                                            "Full Report",
                                            textAlign: TextAlign.center,
                                            style: TextStyle(
                                              color: reportMode == "full"
                                                  ? Colors.white
                                                  : Colors.black,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 25),
                                const Text(
                                  "Date Range",
                                  style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    Expanded(
                                      child: InkWell(
                                        onTap: () async {
                                          DateTime? picked =
                                              await showDatePicker(
                                            context: context,
                                            initialDate: fromDate,
                                            firstDate: DateTime(2020),
                                            lastDate: DateTime.now(),
                                          );

                                          if (picked != null) {
                                            setState(() {
                                              fromDate = picked;
                                            });
                                          }
                                        },
                                        child: Container(
                                          padding: const EdgeInsets.all(14),
                                          decoration: BoxDecoration(
                                            border: Border.all(
                                              color: Colors.grey.shade300,
                                            ),
                                            borderRadius:
                                                BorderRadius.circular(14),
                                          ),
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                "From",
                                                style: TextStyle(
                                                  color: Colors.grey.shade600,
                                                  fontSize: 12,
                                                ),
                                              ),
                                              const SizedBox(height: 5),
                                              Text(
                                                DateFormat(
                                                  "yyyy-MM-dd",
                                                ).format(
                                                  fromDate,
                                                ),
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: InkWell(
                                        onTap: () async {
                                          DateTime? picked =
                                              await showDatePicker(
                                            context: context,
                                            initialDate: toDate,
                                            firstDate: DateTime(2020),
                                            lastDate: DateTime.now(),
                                          );

                                          if (picked != null) {
                                            setState(() {
                                              toDate = picked;
                                            });
                                          }
                                        },
                                        child: Container(
                                          padding: const EdgeInsets.all(14),
                                          decoration: BoxDecoration(
                                            border: Border.all(
                                              color: Colors.grey.shade300,
                                            ),
                                            borderRadius:
                                                BorderRadius.circular(14),
                                          ),
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                "To",
                                                style: TextStyle(
                                                  color: Colors.grey.shade600,
                                                  fontSize: 12,
                                                ),
                                              ),
                                              const SizedBox(height: 5),
                                              Text(
                                                DateFormat(
                                                  "yyyy-MM-dd",
                                                ).format(
                                                  toDate,
                                                ),
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                if (reportMode == "full") ...[
                                  const SizedBox(height: 25),
                                  const Text(
                                    "Paid Via",
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  DropdownButtonFormField<String>(
                                    value: paymentType,
                                    decoration: InputDecoration(
                                      filled: true,
                                      fillColor: Colors.grey.shade100,
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(14),
                                        borderSide: BorderSide.none,
                                      ),
                                    ),
                                    items: [
                                      "all",
                                      "cash",
                                      "mpesa",
                                      "bank",
                                      "credit",
                                      "wallet",
                                    ]
                                        .map(
                                          (e) => DropdownMenuItem(
                                            value: e,
                                            child: Text(
                                              e[0].toUpperCase() +
                                                  e.substring(1),
                                            ),
                                          ),
                                        )
                                        .toList(),
                                    onChanged: (value2) {
                                      setState(() {
                                        paymentType = value2 ?? "all";
                                      });
                                    },
                                  ),
                                ],
                                const SizedBox(height: 25),
                                const Text(
                                  "Export As",
                                  style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    Expanded(
                                      child: InkWell(
                                        onTap: () {
                                          setState(() {
                                            exportType = "excel";
                                          });
                                        },
                                        child: AnimatedContainer(
                                          duration:
                                              const Duration(milliseconds: 200),
                                          padding: const EdgeInsets.symmetric(
                                            vertical: 14,
                                          ),
                                          decoration: BoxDecoration(
                                            color: exportType == "excel"
                                                ? AppColors.mainColor
                                                : Colors.grey.shade100,
                                            borderRadius:
                                                BorderRadius.circular(14),
                                          ),
                                          child: Text(
                                            "Excel",
                                            textAlign: TextAlign.center,
                                            style: TextStyle(
                                              color: exportType == "excel"
                                                  ? Colors.white
                                                  : Colors.black,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: InkWell(
                                        onTap: () {
                                          setState(() {
                                            exportType = "pdf";
                                          });
                                        },
                                        child: AnimatedContainer(
                                          duration:
                                              const Duration(milliseconds: 200),
                                          padding: const EdgeInsets.symmetric(
                                            vertical: 14,
                                          ),
                                          decoration: BoxDecoration(
                                            color: exportType == "pdf"
                                                ? AppColors.mainColor
                                                : Colors.grey.shade100,
                                            borderRadius:
                                                BorderRadius.circular(14),
                                          ),
                                          child: Text(
                                            "PDF",
                                            textAlign: TextAlign.center,
                                            style: TextStyle(
                                              color: exportType == "pdf"
                                                  ? Colors.white
                                                  : Colors.black,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 30),
                                SizedBox(
                                  width: double.infinity,
                                  height: 55,
                                  child: ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.mainColor,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(16),
                                      ),
                                    ),
                                    onPressed: () async {
                                      Get.back();

                                      await reportsController.salesExcelReport(
                                          fromDate: DateFormat(
                                            "yyyy-MM-dd",
                                          ).format(fromDate),
                                          toDate: DateFormat(
                                            "yyyy-MM-dd",
                                          ).format(toDate),
                                          shop: userController.currentUser
                                              .value!.primaryShop!.id!,
                                          paymentType: paymentType == "all"
                                              ? ""
                                              : paymentType,
                                          status: "cashed",
                                          reportType: exportType,
                                          reportMode: reportMode);
                                    },
                                    child: const Text(
                                      "Generate Report",
                                      style: TextStyle(
                                        fontSize: 16,
                                        color: Colors.white,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                  isScrollControlled: true,
                );
              },
            )
        ],
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
      widget: Obx(() {
        return Column(
          children: [
            filterByDates(onFilter: (start, end, type) {
              salesController.salesPaginageSettings['page'] = 1;
              reportsController.activeFilter.value = type;
              reportsController.filterStartDate.value = DateFormat(
                "yyyy-MM-dd",
              ).format(start);
              reportsController.filterEndDate.value = DateFormat(
                "yyyy-MM-dd",
              ).format(end);

              if (widget.keyFrom == "dues") {
                salesController.getSalesByDate(
                    dueDate: reportsController.filterStartDate.value,
                    fromDate: reportsController.filterStartDate.value,
                    toDate: reportsController.filterEndDate.value,
                    paymentType: "credit",
                    shop: userController.currentUser.value!.primaryShop!.id!);
              } else {
                if (widget.keyFrom == "hold") {
                  salesController.getSalesByDate(
                      fromDate: reportsController.filterStartDate.value,
                      toDate: reportsController.filterEndDate.value,
                      shop: userController.currentUser.value!.primaryShop!.id!,
                      status: "hold");
                } else {
                  if (widget.keyFrom == "cash") {
                    salesController.getSalesByDate(
                        fromDate: reportsController.filterStartDate.value,
                        toDate: reportsController.filterEndDate.value,
                        shop:
                            userController.currentUser.value!.primaryShop!.id!,
                        paymentTag:
                            reportsController.cashsalesfilterSelected.value,
                        status: "cashed");
                  } else {
                    salesController.getSalesByDate(
                        fromDate: reportsController.filterStartDate.value,
                        toDate: reportsController.filterEndDate.value,
                        paymentType: widget.keyFrom.toString().trim(),
                        paymentTag:
                            reportsController.cashsalesfilterSelected.value,
                        shop:
                            userController.currentUser.value!.primaryShop!.id!,
                        status: widget.keyFrom.toString().trim() == "cash" ||
                                widget.keyFrom.toString().trim() == "credit" ||
                                widget.keyFrom.toString().trim() == "wallet"
                            ? "cashed"
                            : "");
                  }
                }
              }

              reportsController.getSalesReport(
                startDate: reportsController.filterStartDate.value,
                toDate: reportsController.filterEndDate.value,
                shopid: userController.currentUser.value!.primaryShop!.id!,
              );
            }),
            searchWidget(),
            if (widget.keyFrom == "cash")
              Container(
                margin:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Obx(() => Wrap(
                        direction: Axis.horizontal,
                        spacing: 8,
                        runSpacing: 12,
                        children: List.generate(
                            salesController.cashsalesfilter.length,
                            (index) => InkWell(
                                  onTap: () {
                                    reportsController
                                            .cashsalesfilterSelected.value =
                                        salesController.cashsalesfilter[index];
                                    salesController
                                            .cashsalesfilterSelected.value =
                                        salesController.cashsalesfilter[index];
                                    salesController.getSalesByDate(
                                        fromDate: reportsController
                                            .filterStartDate.value,
                                        toDate: reportsController
                                            .filterEndDate.value,
                                        paymentTag: salesController
                                            .cashsalesfilter[index],
                                        shop: userController.currentUser.value!
                                            .primaryShop!.id!,
                                        status: "cashed");
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.only(
                                        top: 5, bottom: 5, left: 10, right: 15),
                                    decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(
                                            width: 1,
                                            color: AppColors.mainColor),
                                        color: salesController
                                                    .cashsalesfilterSelected
                                                    .value ==
                                                salesController
                                                    .cashsalesfilter[index]
                                            ? AppColors.mainColor
                                            : Colors.white),
                                    child: Row(
                                      children: [
                                        Text(
                                          "${salesController.cashsalesfilter[index].replaceAll("_", " ")}:",
                                          style: TextStyle(
                                              color: salesController
                                                          .cashsalesfilterSelected
                                                          .value ==
                                                      salesController
                                                              .cashsalesfilter[
                                                          index]
                                                  ? Colors.white
                                                  : AppColors.mainColor,
                                              fontSize: 12),
                                        ),
                                        const SizedBox(width: 10),
                                        Obx(
                                          () => Text(
                                            htmlPrice(salesController
                                                .cashsalesfilterTotals[
                                                    salesController
                                                        .cashsalesfilter[index]]
                                                .toStringAsFixed(2)
                                                .toString()),
                                            style: TextStyle(
                                                color: salesController
                                                            .cashsalesfilterSelected
                                                            .value ==
                                                        salesController
                                                                .cashsalesfilter[
                                                            index]
                                                    ? Colors.white
                                                    : AppColors.mainColor),
                                          ),
                                        )
                                      ],
                                    ),
                                  ),
                                )),
                      )),
                ),
              ),
            salesController.loadingSales.isTrue
                ? const Center(
                    child: CircularProgressIndicator(),
                  )
                : salesController.allSalesFiltered.isEmpty
                    ? Expanded(child: noItemsFound(context, true))
                    : Expanded(
                        child: ListView.builder(
                            shrinkWrap: true,
                            controller: salesController.scrollController,
                            itemCount: salesController.allSalesFiltered.length,
                            itemBuilder: (context, index) {
                              SaleModel salesModel = salesController
                                  .allSalesFiltered
                                  .elementAt(index);
                              return salesCard(
                                  salesModel: salesModel, from: widget.keyFrom);
                            }),
                      ),
            if (salesController.loadingMoreSales.isTrue)
              const CircularProgressIndicator()
          ],
        );
      }),
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
                  salesController.allSalesCashFiltered.clear();
                  salesController.allSalesCashFiltered
                      .addAll(salesController.allSalesCash);
                  return;
                }
                salesController.allSalesCashFiltered.clear();
                salesController.allSalesCashFiltered.addAll(salesController
                    .allSalesCash
                    .where((p0) =>
                        p0.receiptNo
                            .toString()
                            .toLowerCase()
                            .contains(value.toLowerCase()) ||
                        p0.items!.any((element) => element.product!.name!
                            .toLowerCase()
                            .contains(value.toLowerCase())))
                    .toList());
              },
              decoration: InputDecoration(
                contentPadding: const EdgeInsets.fromLTRB(10, 2, 0, 2),
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
}

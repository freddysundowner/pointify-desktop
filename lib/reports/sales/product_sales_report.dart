import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/saleitem.dart';
import 'package:pointify/utils/helper.dart';
import 'package:printing/printing.dart';

import '../../../controllers/homecontroller.dart';
import '../../../controllers/shopcontroller.dart';
import '../../controllers/reports_controller.dart';
import '../../screens/receipts/pdf/sales/product_sales_report.dart';
import '../../utils/colors.dart';
import '../../widgets/bottom_widget_count_view.dart';
import '../../widgets/filter_dates.dart';
import '../../widgets/no_items_found.dart';
import '../../widgets/textbutton.dart';

class ProductSalesReport extends StatefulWidget {
  final String? title;
  final String? keyFrom;
  ProductSalesReport({Key? key, this.title, this.keyFrom})
      : super(
          key: key,
        ) {
    ReportsController reportsController = Get.find<ReportsController>();
    if (keyFrom == "productsales") {
      reportsController.productsWisereport(
        shop: userController.currentUser.value!.primaryShop!.id!,
        fromDate: DateFormat('yyyy-MM-dd').format(DateTime.now()),
        toDate: DateFormat('yyyy-MM-dd').format(DateTime.now()),
      );
    }
  }

  @override
  State<ProductSalesReport> createState() => _ProductSalesReportState();
}

class _ProductSalesReportState extends State<ProductSalesReport> {
  ShopController shopController = Get.find<ShopController>();

  HomeController homeController = Get.find<HomeController>();

  ReportsController reportsController = Get.find<ReportsController>();
  @override
  Widget build(BuildContext context) {
    return Helper(
      floatButton: Container(),
      bottomNavigationBar: Obx(
        () => SizedBox(
          height: 40,
          child: bottomWidgetCountView(
              count: reportsController.productsReportFiltered.length.toString(),
              qty: reportsController.productsReportFiltered
                  .fold(
                      0.0,
                      (previousValue, element) =>
                          previousValue + element.quantity!)
                  .toString(),
              cash: reportsController.productsReportFiltered.fold(
                  0.0,
                  (previousValue, element) =>
                      previousValue + element.currentSale!.amountPaid!)),
        ),
      ),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.3,
        centerTitle: false,
        actions: [
          if (userController.currentUser.value?.usertype == "admin")
            Center(
              child: textBtn(
                vPadding: 5,
                hPadding: 20,
                text: "Print",
                bgColor: AppColors.mainColor,
                color: Colors.white,
                onPressed: () {
                  Get.to(() => Scaffold(
                        appBar: AppBar(
                          title: const Text("Product Wise Sales Report"),
                        ),
                        body: PdfPreview(
                          build: (context) => ProductsalesReportPdf(
                              "receipts", "Product Wise Sales Report  "),
                        ),
                      ));
                },
              ),
            ),
          const SizedBox(
            width: 10,
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
              reportsController.activeFilter.value = type;
              reportsController.filterStartDate.value = DateFormat(
                "yyyy-MM-dd",
              ).format(start);
              reportsController.filterEndDate.value = DateFormat(
                "yyyy-MM-dd",
              ).format(end);

              reportsController.productsWisereport(
                  shop: userController.currentUser.value!.primaryShop!.id!,
                  fromDate: reportsController.filterStartDate.value,
                  toDate: reportsController.filterEndDate.value);
            }),
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              child: Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: reportsController.searchProductSoldController,
                      decoration: InputDecoration(
                          contentPadding:
                              const EdgeInsets.fromLTRB(10, 2, 0, 2),
                          hintText: ""
                              "Search by receipt number / product name",
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                          hintStyle: const TextStyle(
                              fontSize: 13, fontWeight: FontWeight.normal),
                          suffixIcon: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              InkWell(
                                onTap: () {
                                  reportsController.productsWisereport(
                                      shop: userController
                                          .currentUser.value!.primaryShop!.id!,
                                      fromDate: reportsController
                                          .filterStartDate.value,
                                      toDate:
                                          reportsController.filterEndDate.value,
                                      product: reportsController
                                          .searchProductSoldController.text
                                          .toString());
                                },
                                child: Container(
                                  decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(10),
                                      color: AppColors.mainColor),
                                  padding: const EdgeInsets.symmetric(
                                      vertical: 15, horizontal: 15),
                                  child: const Text("Search",
                                      style: TextStyle(
                                          fontSize: 12, color: Colors.white)),
                                ),
                              ),
                              IconButton(
                                icon: const Icon(
                                  Icons.filter_list,
                                ),
                                onPressed: () {
                                  //drop down with whole, retail and dealer
                                  Get.dialog(
                                    Dialog(
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                            vertical: 15, horizontal: 15),
                                        child: Column(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            const Text(
                                              "Filter by type",
                                              style: TextStyle(
                                                  fontSize: 18,
                                                  fontWeight: FontWeight.bold),
                                            ),
                                            const SizedBox(height: 10),
                                            Obx(
                                              () => DropdownButton<String>(
                                                value: reportsController
                                                    .salesFilterSelected.value,
                                                items: reportsController
                                                    .salesFilter
                                                    .map((String value) {
                                                  return DropdownMenuItem<
                                                      String>(
                                                    value: value,
                                                    child: Text(value),
                                                  );
                                                }).toList(),
                                                onChanged: (value) {
                                                  reportsController
                                                      .salesFilterSelected
                                                      .value = value!;
                                                  reportsController.productsWisereport(
                                                      shop: userController
                                                          .currentUser
                                                          .value!
                                                          .primaryShop!
                                                          .id!,
                                                      fromDate:
                                                          reportsController
                                                              .filterStartDate
                                                              .value,
                                                      toDate: reportsController
                                                          .filterEndDate.value,
                                                      product: reportsController
                                                          .searchProductSoldController
                                                          .text,
                                                      saleType: value);
                                                  Get.back();
                                                },
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  );
                                },
                              )
                            ],
                          )),
                    ),
                  ),
                ],
              ),
            ),
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Obx(() => Wrap(
                      direction: Axis.horizontal,
                      spacing: 8,
                      runSpacing: 12,
                      children: [
                        ...List.generate(
                            reportsController.paymentypes.length,
                            (index) => InkWell(
                                  onTap: () {
                                    reportsController
                                            .cashsalesfilterSelected.value =
                                        reportsController.paymentypes[index];
                                    reportsController.getProductSaleFilter(
                                        type: reportsController
                                            .paymentypes[index]);
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.only(
                                        top: 5, bottom: 5, left: 10, right: 15),
                                    decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(
                                            width: 1,
                                            color: AppColors.mainColor),
                                        color: reportsController
                                                    .cashsalesfilterSelected
                                                    .value ==
                                                reportsController
                                                    .paymentypes[index]
                                            ? AppColors.mainColor
                                            : Colors.white),
                                    child: Column(
                                      children: [
                                        Text(
                                          reportsController.paymentypes[index]
                                              .toUpperCase(),
                                          style: TextStyle(
                                              color: reportsController
                                                          .cashsalesfilterSelected
                                                          .value ==
                                                      reportsController
                                                          .paymentypes[index]
                                                  ? Colors.white
                                                  : AppColors.mainColor,
                                              fontSize: 12),
                                        ),
                                        const SizedBox(width: 10),
                                        Obx(
                                          () => Text(
                                            htmlPrice(reportsController
                                                .filterPaymentTypeTotals[
                                                    reportsController
                                                        .paymentypes[index]]
                                                .toStringAsFixed(2)
                                                .toString()),
                                            style: TextStyle(
                                                color: reportsController
                                                            .cashsalesfilterSelected
                                                            .value ==
                                                        reportsController
                                                            .paymentypes[index]
                                                    ? Colors.white
                                                    : AppColors.mainColor),
                                          ),
                                        )
                                      ],
                                    ),
                                  ),
                                ))
                      ],
                    )),
              ),
            ),
            reportsController.isLoadingReports.isTrue
                ? const Center(
                    child: CircularProgressIndicator(),
                  )
                : reportsController.productsReportFiltered.isEmpty
                    ? Expanded(child: noItemsFound(context, true))
                    : Expanded(
                        child: ListView.builder(
                            shrinkWrap: true,
                            itemCount:
                                reportsController.productsReportFiltered.length,
                            itemBuilder: (context, index) {
                              SaleItem saleitem = reportsController
                                  .productsReportFiltered
                                  .elementAt(index);
                              return Container(
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 10),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            saleitem.product!.name!,
                                            style: const TextStyle(
                                                fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.all(3),
                                          decoration: BoxDecoration(
                                              border: Border.all(
                                                  color: AppColors.mainColor),
                                              borderRadius:
                                                  BorderRadius.circular(5)),
                                          child: Text(
                                            saleitem.receiptNo!.toUpperCase(),
                                            style:
                                                const TextStyle(fontSize: 12),
                                          ),
                                        )
                                      ],
                                    ),
                                    const SizedBox(height: 5),
                                    reportListItems(saleitem),
                                  ],
                                ),
                              );
                            }),
                      )
          ],
        );
      }),
    );
  }

  showBottomSheet(BuildContext context, SaleItem saleItem) {
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
                  leading: const Icon(Icons.edit),
                  onTap: () {
                    Get.back();
                  },
                  title: const Text("Cash in"),
                ),
                ListTile(
                  leading: const Icon(Icons.delete),
                  onTap: () {},
                  title: const Text("Edit"),
                ),
                ListTile(
                  leading: const Icon(Icons.delete),
                  onTap: () {},
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

  reportListItems(SaleItem saleitem) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text(
                        "Total:",
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        "${saleitem.quantity!} x ${htmlPrice(saleitem.unitPrice!)}",
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 5),
                  Row(
                    children: [
                      Text(
                        'sold by: ${saleitem.attendant?.username} on ',
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      ),
                      Text(
                        ' ${DateFormat('yyyy-MM-dd hh:mm').format(DateTime.parse(saleitem.createdAt!))}',
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Text(htmlPrice(saleitem.totalLinePrice!.toStringAsFixed(2))),
          ],
        ),
        const Divider(),
      ],
    );
  }
}

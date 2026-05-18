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
import '../../screens/receipts/pdf/sales/discount_sales_report.dart';
import '../../utils/colors.dart';
import '../../widgets/bottom_widget_count_view.dart';
import '../../widgets/filter_dates.dart';
import '../../widgets/no_items_found.dart';
import '../../widgets/textbutton.dart';

class DiscountSalesReport extends StatefulWidget {
  final String? title;
  final String? keyFrom;
  DiscountSalesReport({Key? key, this.title, this.keyFrom})
      : super(
          key: key,
        ) {
    ReportsController reportsController = Get.find<ReportsController>();
    reportsController.discountReport(
      shop: userController.currentUser.value!.primaryShop!.id!,
      fromDate: DateFormat('yyyy-MM-dd').format(DateTime.now()),
      toDate: DateFormat('yyyy-MM-dd').format(DateTime.now()),
    );
  }

  @override
  State<DiscountSalesReport> createState() => _DiscountSalesReportState();
}

class _DiscountSalesReportState extends State<DiscountSalesReport> {
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
              count: reportsController.discountReportFiltered.length.toString(),
              qty: reportsController.discountReportFiltered
                  .fold(
                      0.0,
                      (previousValue, element) =>
                          previousValue + element.quantity!)
                  .toString(),
              cash: reportsController.discountReportFiltered.fold(
                  0.0,
                  (previousValue, element) =>
                      previousValue + element.lineDiscount!)),
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
                          title: const Text("Discount Sales Report"),
                        ),
                        body: PdfPreview(
                          build: (context) => DiscountsalesReportPdf(
                              "receipts", "Discount Sales Report  "),
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

              reportsController.discountReport(
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
                          suffixIcon: InkWell(
                            onTap: () {
                              reportsController.discountReport(
                                  shop: userController
                                      .currentUser.value!.primaryShop!.id!,
                                  fromDate:
                                      reportsController.filterStartDate.value,
                                  toDate: reportsController.filterEndDate.value,
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
                          )),
                    ),
                  ),
                ],
              ),
            ),
            reportsController.isLoadingReports.isTrue
                ? const Center(
                    child: CircularProgressIndicator(),
                  )
                : reportsController.discountReportFiltered.isEmpty
                    ? Expanded(child: noItemsFound(context, true))
                    : Expanded(
                        child: ListView.builder(
                            shrinkWrap: true,
                            itemCount:
                                reportsController.discountReportFiltered.length,
                            itemBuilder: (context, index) {
                              SaleItem saleitem = reportsController
                                  .discountReportFiltered
                                  .elementAt(index);
                              return InkWell(
                                onTap: () {
                                  // showModalBottomSheet(
                                  //     context: Get.context!,
                                  //     builder: (_) {
                                  //       return Container(
                                  //         color: Colors.white,
                                  //         width: double.infinity,
                                  //         height: MediaQuery.of(Get.context!)
                                  //                 .size
                                  //                 .height *
                                  //             0.1,
                                  //         child: Column(
                                  //           crossAxisAlignment:
                                  //               CrossAxisAlignment.start,
                                  //           children: [
                                  //             ListTile(
                                  //               onTap: () {
                                  //                 Get.back();
                                  //                 saleReceiptActions(
                                  //                     saleItem: saleitem,
                                  //                     from: "productsales");
                                  //               },
                                  //               contentPadding:
                                  //                   const EdgeInsets.all(10),
                                  //               leading: const Icon(
                                  //                 Icons
                                  //                     .assignment_returned_outlined,
                                  //                 color: Colors.black,
                                  //               ),
                                  //               title: majorTitle(
                                  //                   title: "Return to stock",
                                  //                   size: 12.0,
                                  //                   color: Colors.black),
                                  //             )
                                  //           ],
                                  //         ),
                                  //       );
                                  //     });
                                },
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 10),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        saleitem.product!.name!,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold),
                                      ),
                                      const SizedBox(height: 5),
                                      reportListItems(saleitem),
                                    ],
                                  ),
                                ),
                              );
                            }),
                      )
          ],
        );
      }),
    );
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
                  Text(
                    "${saleitem.quantity} X ${htmlPrice(saleitem.lineDiscount!)}",
                    style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[600],
                        fontWeight: FontWeight.bold),
                  ),
                  Row(
                    children: [
                      Text(
                        "Max Disc: ",
                        style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                      ),
                      Text(
                        htmlPrice(saleitem.product?.maxDiscount ?? 0.0),
                        style: TextStyle(fontSize: 14, color: Colors.grey[600]),
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
            Text(htmlPrice(saleitem.lineDiscount ?? 0.0 * saleitem.quantity!),
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
          ],
        ),
        const Divider(),
      ],
    );
  }
}

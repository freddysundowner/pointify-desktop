import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/main.dart';
import 'package:pointify/screens/product/tabs/receipts_sales.dart';

import '../../../controllers/homecontroller.dart';
import '../../../controllers/salescontroller.dart';
import '../../../functions/functions.dart';
import '../../../models/product.dart';
import '../../../pdfFiles/pdf/productmonthlypdf/monthlypreview.dart';
import '../../../pdfFiles/pdf/productmonthlypdf/product_monthly_report.dart';
import '../../../responsive/responsiveness.dart';
import '../../../utils/colors.dart';

class SalesPages extends StatelessWidget {
  final Product product;
  final SalesController salesController = Get.find<SalesController>();

  SalesPages({
    Key? key,
    required this.product,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(
          height: 20,
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Obx(
                () => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("SALES HISTORY ${salesController.currentYear.value}"),
                    const SizedBox(
                      height: 3,
                    ),
                    Text(
                      htmlPrice(salesController.productMonthSales.fold(
                          0,
                          (previousValue, element) =>
                              previousValue + element["sales"] as int)),
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.bold),
                    )
                  ],
                ),
              ),
              InkWell(
                onTap: () {
                  isSmallScreen(context)
                      ? Get.to(() => MonthlyPreviewPage(
                          sales: salesController.productMonthSales
                              .map((e) => [
                                    e["month"],
                                    htmlPrice(e["sales"]),
                                  ])
                              .toList(),
                          type: "Product Sales",
                          product: product,
                          title: "Monthly sales for ${product.name!}",
                          total: salesController.productMonthSales.fold(
                              0,
                              (previousValue, element) =>
                                  previousValue! + (element["sales"] as int))))
                      : Get.find<HomeController>().selectedWidget.value =
                          MonthlyPreviewPage(
                              sales: salesController.productMonthSales
                                  .map((e) => [
                                        e["month"],
                                        htmlPrice(getSalesTotal(e["month"],
                                            salesController.productSales)),
                                      ])
                                  .toList(),
                              type: "Product Sales",
                              product: product,
                              title: "Monthly sales for ${product.name!}",
                              total: salesController.productMonthSales.fold(
                                  0.0,
                                  (previousValue, element) =>
                                      previousValue! + element["sales"]));
                },
                child: Container(
                  padding: const EdgeInsets.all(5),
                  decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(10),
                      color: AppColors.mainColor),
                  child: const Icon(
                    Icons.download_rounded,
                    color: Colors.white,
                    size: 15,
                  ),
                ),
              )
            ],
          ),
        ),
        const SizedBox(
          height: 20,
        ),
        Expanded(
            child: Obx(
          () => ListView.builder(
              itemCount: salesController.productMonthSales.length,
              itemBuilder: (c, i) {
                var month = salesController.productMonthSales[i];
                return InkWell(
                  onTap: () {
                    getMonthlyProductSales(product, i, function:
                        (Product product, String firstday, String lastday) {
                      salesController.filterStartDate.value = firstday;
                      salesController.filterEndDate.value = lastday;
                      salesController.getProductSales(
                          product: product.sId,
                          fromDate: firstday,
                          toDate: lastday);
                      salesController.getReturns(
                          product: product,
                          fromDate: firstday,
                          shopid: userController
                              .currentUser.value!.primaryShop!.id!,
                          toDate: lastday,
                          type: "return");
                    }, year: salesController.currentYear.value);
                    Get.to(() => ProductReceiptsSales(
                          product: product,
                          i: i,
                        ));
                  },
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 20, vertical: 10),
                        child: Row(
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  month["month"].toString().capitalize!,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.bold),
                                ),
                                Text(
                                  "Total Sales (${month["totalQuantity"].toString()})",
                                  style: const TextStyle(fontSize: 11),
                                ),
                              ],
                            ),
                            const Spacer(),
                            Row(
                              children: [
                                Text(
                                  htmlPrice("${month["sales"]}/="),
                                  style: const TextStyle(fontSize: 11),
                                ),
                                const Icon(
                                  Icons.arrow_forward_ios_rounded,
                                  color: Colors.grey,
                                  size: 15,
                                ),
                              ],
                            )
                          ],
                        ),
                      ),
                      const Divider()
                    ],
                  ),
                );
              }),
        ))
      ],
    );
  }
}

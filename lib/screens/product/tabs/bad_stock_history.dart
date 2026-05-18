import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:syncfusion_flutter_datepicker/datepicker.dart';

import '../../../controllers/homecontroller.dart';
import '../../../controllers/productcontroller.dart';
import '../../../functions/functions.dart';
import '../../../models/badstock.dart';
import '../../../models/product.dart';
import '../../../pdfFiles/pdf/productmonthlypdf/monthlypreview.dart';
import '../../../pdfFiles/pdf/productmonthlypdf/product_monthly_report.dart';
import '../../../utils/colors.dart';
import '../../../utils/date_filter.dart';

class ProductBadStcokHistory extends StatelessWidget {
  final Product? product;
  final ProductController productController = Get.find<ProductController>();

  ProductBadStcokHistory({Key? key, this.product}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
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
                    Text(
                        "BAD STOCK HISTORY ${productController.currentYear.value}"),
                    const SizedBox(
                      height: 3,
                    ),
                    Text(
                      htmlPrice(productController.monthlyBadStocks.fold(
                          0,
                          (previousValue, element) =>
                              previousValue + (element['totalLost'] as int))),
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
                          sales: productController.monthlyBadStocks
                              .map((e) => [
                                    e["month"],
                                    "${e["count"]} - ${htmlPrice(e["totalLost"])}",
                                  ])
                              .toList(),
                          type: "Product Bad Stock",
                          product: product,
                          title: "Monthly bad stock for ${product!.name!}",
                          total: productController.badstocks.fold(
                              0.0,
                              (previousValue, element) =>
                                  previousValue! +
                                  (element.quantity! *
                                      element.product!.buyingPrice!))))
                      : Get.find<HomeController>().selectedWidget.value =
                          MonthlyPreviewPage(
                              sales: productController.monthlyBadStocks
                                  .map((e) => [
                                        e["month"],
                                        htmlPrice(getSalesTotal(e["month"],
                                            productController.badstocks,
                                            type: "badstock")),
                                      ])
                                  .toList(),
                              type: "Product Bad Stock",
                              product: product,
                              title: "Monthly bad stock for ${product!.name!}",
                              total: productController.badstocks.fold(
                                  0,
                                  (previousValue, element) =>
                                      previousValue! +
                                      (element.quantity! *
                                          element.unitPrice!)));
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
              itemCount: productController.monthlyBadStocks.length,
              itemBuilder: (c, i) {
                var month = productController.monthlyBadStocks[i];
                return InkWell(
                  onTap: () {
                    var month = i + 1;
                    var firstday = DateFormat('yyyy-MM-dd').format(DateTime(
                        productController.currentYear.value, month, 1));
                    var lastday = DateFormat('yyyy-MM-dd').format(DateTime(
                        productController.currentYear.value, month + 1, 1));
                    productController.getBadStock(
                        product: product!.sId,
                        fromDate: firstday,
                        toDate: lastday);
                    isSmallScreen(context)
                        ? Get.to(() => BadStockHistory(
                              product: product!,
                              fromDate: firstday,
                              toDate: lastday,
                              i: i,
                            ))
                        : Get.find<HomeController>().selectedWidget.value =
                            BadStockHistory(
                            product: product!,
                            fromDate: firstday,
                            toDate: lastday,
                            i: i,
                          );
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
                                  "Count (${month["count"].toString()})",
                                  style: const TextStyle(fontSize: 11),
                                ),
                              ],
                            ),
                            const Spacer(),
                            Row(
                              children: [
                                Text(
                                  htmlPrice("${month["totalLost"]}/="),
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

class BadStockHistory extends StatelessWidget {
  final Product product;
  final int i;
  final String? fromDate;
  final String? toDate;

  BadStockHistory(
      {Key? key,
      required this.product,
      this.fromDate,
      this.toDate,
      required this.i})
      : super(key: key);
  final ProductController productController = Get.find<ProductController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor:
            isSmallScreen(context) ? AppColors.mainColor : Colors.white,
        elevation: 0.1,
        leading: IconButton(
          onPressed: () {
            getYearlyRecords(product, function:
                (Product product, String firstDayofYear, String lastDayofYear) {
              productController.getBadStock(
                  product: product.sId,
                  fromDate: firstDayofYear,
                  toDate: lastDayofYear);
            }, year: productController.currentYear.value);
            Get.back();
          },
          icon: Icon(Icons.arrow_back_ios,
              color: isSmallScreen(context) ? Colors.white : Colors.black),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Bad stock",
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
                Widget w = DateFilter(
                  from: "BadStockHistory",
                  product: product,
                  i: i,
                  function: (value) {
                    if (value is PickerDateRange) {
                      productController.badstockFromDate.value =
                          DateFormat("yyy-MM-dd").format(value.startDate!);
                      productController.badstockToDate.value =
                          DateFormat("yyy-MM-dd").format(value.endDate!);
                    }

                    productController.getBadStock(
                      product: product.sId,
                      fromDate: fromDate,
                      toDate: toDate,
                    );
                  },
                );

                isSmallScreen(context)
                    ? Get.to(() => w)
                    : Get.find<HomeController>().selectedWidget.value = w;
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
              child: Text("From ${'$fromDate - $toDate}'}"),
            ),
            const SizedBox(
              height: 10,
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                "TOTAL ${htmlPrice(productController.badstocks.fold(0.0, (previousValue, element) => previousValue + (element.quantity! * element.unitPrice!)))} /=",
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
            const Divider(),
            isSmallScreen(context)
                ? Expanded(
                    child: ListView.builder(
                        shrinkWrap: true,
                        itemCount: productController.badstocks.length,
                        itemBuilder: (context, index) {
                          BadStock badStock =
                              productController.badstocks.elementAt(index);
                          return productBadStockHistory(badStock);
                        }),
                  )
                : Container(
                    width: double.infinity,
                    margin: const EdgeInsets.symmetric(horizontal: 5)
                        .copyWith(bottom: 10),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 5, vertical: 10),
                    child: Theme(
                      data:
                          Theme.of(context).copyWith(dividerColor: Colors.grey),
                      child: DataTable(
                        decoration: BoxDecoration(
                            border: Border.all(
                          width: 1,
                          color: Colors.black,
                        )),
                        columnSpacing: 30.0,
                        columns: const [
                          DataColumn(
                              label:
                                  Text('Product', textAlign: TextAlign.center)),
                          DataColumn(
                              label: Text('Quantity',
                                  textAlign: TextAlign.center)),
                          DataColumn(
                              label: Text('Buying Price',
                                  textAlign: TextAlign.center)),
                          DataColumn(
                              label: Text('Selling Price',
                                  textAlign: TextAlign.center)),
                          DataColumn(
                              label: Text('attendant',
                                  textAlign: TextAlign.center)),
                          DataColumn(
                              label: Text('Date', textAlign: TextAlign.center)),
                        ],
                        rows: List.generate(productController.badstocks.length,
                            (index) {
                          BadStock badStock =
                              productController.badstocks.elementAt(index);

                          final p = badStock.product?.name;
                          final y = badStock.quantity;
                          final h = badStock.unitPrice;
                          final z = badStock.product?.sellingPrice;
                          final b = badStock.attendant?.username;
                          final w = badStock.createdAt;

                          return DataRow(cells: [
                            DataCell(Text(p.toString())),
                            DataCell(Text(y.toString())),
                            DataCell(Text(h.toString())),
                            DataCell(Text(z.toString())),
                            DataCell(Text(b.toString())),
                            DataCell(Text(DateFormat("yyyy-dd-MMM ")
                                .format(DateTime.parse(w!)))),
                          ]);
                        }),
                      ),
                    )),
          ],
        ),
      ),
    );
  }

  Widget productBadStockHistory(BadStock badStock) {
    return Padding(
      padding: const EdgeInsets.all(3.0),
      child: Card(
        color: Colors.white.withOpacity(0.9),
        child: Padding(
          padding: const EdgeInsets.all(8.0),
          child: Row(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "${badStock.product!.name}".capitalize!,
                        style: const TextStyle(
                            color: Colors.black,
                            fontWeight: FontWeight.bold,
                            fontSize: 16),
                      ),
                      Text('Qty ${badStock.quantity}'),
                      Text(
                          '${DateFormat("MMM dd,yyyy, hh:m a").format(DateTime.parse(badStock.createdAt!))} '),
                    ],
                  )
                ],
              ),
              const Spacer(),
              Column(
                children: [
                  Text('BP/=  ${htmlPrice(badStock.unitPrice)}'),
                  Text(
                    'by:  ${badStock.attendant?.username}',
                    style: const TextStyle(fontStyle: FontStyle.italic),
                  )
                ],
              )
            ],
          ),
        ),
      ),
    );
  }
}

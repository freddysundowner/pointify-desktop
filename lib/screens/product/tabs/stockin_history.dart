import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/screens/receipts/pdf/single_product_purchase_pdf.dart';
import 'package:printing/printing.dart';
import 'package:syncfusion_flutter_datepicker/datepicker.dart';

import '../../../controllers/homecontroller.dart';
import '../../../controllers/productcontroller.dart';
import '../../../controllers/salescontroller.dart';
import '../../../functions/functions.dart';
import '../../../models/invoice.dart';
import '../../../models/product.dart';
import '../../../pdfFiles/pdf/productmonthlypdf/monthlypreview.dart';
import '../../../pdfFiles/pdf/productmonthlypdf/product_monthly_report.dart';
import '../../../utils/colors.dart';
import '../../../utils/date_filter.dart';
import '../components/product_history_card.dart';

class ProductStockInHistory extends StatelessWidget {
  final ProductController productController = Get.find<ProductController>();
  final  Product? product;

  ProductStockInHistory({Key? key, this.product}):super(key:key);

  final  SalesController salesController = Get.find<SalesController>();

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
                        "STOCKINS HISTORY ${productController.currentYear.value}"),
                    const SizedBox(
                      height: 3,
                    ),
                    Text(
                      htmlPrice(productController.productMonthPurchases.fold(
                          0,
                          (previousValue, element) =>
                              previousValue +
                              (element['totalBuyingPrice'] as int))),
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
                          sales: productController.productMonthPurchases
                              .map((e) => [
                                    e["month"],
                                    htmlPrice(e["totalBuyingPrice"]),
                                  ])
                              .toList(),
                          type: "Product Stockin",
                          product: product,
                          title: "Monthly stocking for ${product!.name!}",
                          total: productController.productInvoices.fold(
                              0,
                              (previousValue, element) =>
                                  previousValue! + element.quantity!)))
                      : Get.find<HomeController>().selectedWidget.value =
                          MonthlyPreviewPage(
                              sales: productController.productMonthPurchases
                                  .map((e) => [
                                        e["month"],
                                        htmlPrice(getSalesTotal(e["month"],
                                            productController.productInvoices,
                                            type: "stockin")),
                                      ])
                                  .toList(),
                              type: "Product Stockin",
                              product: product,
                              title: "Monthly stocking for ${product!.name!}",
                              total: productController.productInvoices.fold(
                                  0,
                                  (previousValue, element) =>
                                      previousValue! + element.quantity!));
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
              itemCount: productController.productMonthPurchases.length,
              itemBuilder: (c, i) {
                var month = productController.productMonthPurchases[i];
                return InkWell(
                  onTap: () {
                    var month = i + 1;
                    var firstday = DateFormat('yyyy-MM-dd').format(
                        DateTime(salesController.currentYear.value, month, 1));

                    var lastday = DateFormat('yyyy-MM-dd').format(DateTime(
                        salesController.currentYear.value, month + 1, 1));
                    productController.getProductPurchaseHistory(product,
                        fromDate: firstday, toDate: lastday);
                    Get.to(() => ProductStockHistory(
                      product: product!,
                      i: month,
                      fromDate: firstday,
                      toDate: lastday,
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
                                  "Total Purchases (${month["totalQuantity"].toString()})",
                                  style: const TextStyle(fontSize: 11),
                                ),
                              ],
                            ),
                            const Spacer(),
                            Row(
                              children: [
                                Text(
                                  htmlPrice("${month["totalBuyingPrice"]}/="),
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

class ProductStockHistory extends StatelessWidget {
  final Product product;
  final int i;
  final  String? fromDate;
   final String? toDate;

  ProductStockHistory(
      {Key? key,
      required this.product,
      required this.i,
      this.fromDate,
      this.toDate})
      : super(key: key){
    productController.fromDate.value=fromDate!;
    productController.toDate.value=toDate!;
  }
  final ProductController productController = Get.find<ProductController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor:
            isSmallScreen(context) ? AppColors.mainColor : Colors.white,
        elevation: 0.2,
        leading: IconButton(
          onPressed: () {
            Get.back();
          },
          icon: Icon(Icons.arrow_back_ios,
              color: isSmallScreen(context) ? Colors.white : Colors.black),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Stock-in",
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
          InkWell(
            onTap: () async {
              Get.to(() => Scaffold(
                    appBar: AppBar(
                      title: Text(
                          "${product.name!.capitalizeFirst} Purchase Report"),
                    ),
                    body: PdfPreview(
                      build: (context) => singleProductStockPurchases(
                          productController.productPurchases,
                          "${product.name!.capitalizeFirst} Purchase Report"),
                    ),
                  ));
            },
            child: Icon(
              Icons.picture_as_pdf,
              color: isSmallScreen(context) ? Colors.white : Colors.black,
              size: 25,
            ),
          ),
          IconButton(
              onPressed: () async {
                Widget w = DateFilter(
                  from: "ProductStockHistory",
                  product: product,
                  i: i,
                  function: (value) {
                    if (value is PickerDateRange) {
                      productController.fromDate.value =
                          DateFormat("yyy-MM-dd").format(value.startDate!);
                      productController.toDate.value = DateFormat("yyy-MM-dd").format(value.endDate!);
                    } else if (value is DateTime) {
                      productController.fromDate.value = DateFormat("yyy-MM-dd").format(value);
                      productController.toDate.value = DateFormat("yyy-MM-dd").format(value);
                    }

                    productController.getProductPurchaseHistory(
                      product,
                      fromDate: fromDate!,
                      toDate: toDate!,
                    );
                  },
                );
                Get.to(() => w);
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
              child: Text("From ${'$fromDate - $toDate'}"),
            ),
            const SizedBox(
              height: 10,
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                "TOTAL ${htmlPrice(productController.productPurchases.fold(0.0, (previousValue, element) => previousValue + (element.unitPrice! * element.quantity!)))} /=",
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
            const Divider(),
            Expanded(
              child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: productController.productPurchases.length,
                  itemBuilder: (context, index) {
                    InvoiceItem productBody =
                        productController.productPurchases.elementAt(index);
                    return productPurchaseHistoryContainer(productBody);
                  }),
            ),
          ],
        ),
      ),
    );
  }
}

import 'package:data_table_2/data_table_2.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/productcontroller.dart';

import '../../controllers/reports_controller.dart';
import '../../models/product.dart';
import '../../widgets/filter_dates.dart';
import '../../widgets/no_items_found.dart';

class StockAdjustmentHistory extends StatelessWidget {
  Product? product;
  StockAdjustmentHistory({super.key, this.product}) {
    productController.getProductAdjustmentHistory(
        product: product!,
        fromDate: productController.filterStartDate.value,
        toDate: productController.filterEndDate.value);
  }
  ProductController productController = Get.find<ProductController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          "Stock Adjustment History",
          style: TextStyle(fontSize: 16),
        ),
      ),
      body: Column(
        children: [
          Obx(
            () => filterByDates(onFilter: (start, end, type) {
              Get.find<ReportsController>().activeFilter.value = type;
              productController.activeAdjustmentFilter.value = type;
              productController.filterStartDate.value = DateFormat(
                "yyyy-MM-dd",
              ).format(start);
              productController.filterEndDate.value = DateFormat(
                "yyyy-MM-dd",
              ).format(end);

              productController.getProductAdjustmentHistory(
                  product: product!,
                  fromDate: productController.filterStartDate.value,
                  toDate: productController.filterEndDate.value);
            }),
          ),
          const SizedBox(
            height: 20,
          ),
          Text("${product?.name} Adjustment History",
              style: Theme.of(context).textTheme.bodySmall),
          Expanded(
              child: Obx(() => productController.loadingAdjustments.isTrue
                  ? const Center(
                      child: CircularProgressIndicator(),
                    )
                  : productController.adjustment.isEmpty
                      ? noItemsFound(context, true)
                      : DataTable2(
                          columnSpacing: 5,
                          horizontalMargin: 5,
                          minWidth: 400,
                          columns: const [
                              DataColumn(
                                label: Text('Date'),
                              ),
                              DataColumn(
                                label: Text('Before'),
                              ),
                              DataColumn(
                                label: Text('After'),
                              ),
                              DataColumn(
                                label: Text('Adjusted'),
                              ),
                            ],
                          rows: [
                              ...productController.adjustment.map(
                                (element) => DataRow(cells: [
                                  DataCell(Text(DateFormat("yyy-MM-dd").format(
                                      DateTime.parse(element.createdAt!)))),
                                  DataCell(Text(element.before.toString())),
                                  DataCell(Text(element.after.toString())),
                                  DataCell(Text(element.adjusted.toString())),
                                ]),
                              )
                            ])))
        ],
      ),
    );
  }
}

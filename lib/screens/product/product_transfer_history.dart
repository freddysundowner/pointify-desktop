import 'package:data_table_2/data_table_2.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/productcontroller.dart';

import '../../controllers/reports_controller.dart';
import '../../models/product.dart';
import '../../widgets/filter_dates.dart';
import '../../widgets/no_items_found.dart';

class ProductTransferHistory extends StatelessWidget {
  Product? product;
  ProductTransferHistory({super.key, this.product}) {
    productController.getProductTrasferHistory(
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
          "Product Transfer History",
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
          Expanded(
              child: Obx(() => productController.loadingAdjustments.isTrue
                  ? const Center(
                      child: CircularProgressIndicator(),
                    )
                  : productController.historytrasfer.isEmpty
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
                                label: Text('Qty'),
                              ),
                              DataColumn(
                                label: Text(
                                  'From/To Shop',
                                ),
                              ),
                            ],
                          rows: [
                              ...productController.historytrasfer.map(
                                (element) => DataRow(cells: [
                                  DataCell(Text(DateFormat("yyy-MM-dd").format(
                                      DateTime.parse(element.createdAt!)))),
                                  DataCell(Text(
                                    element.toShopId?.id == product?.shop?.id
                                        ? "+${element.quantity}"
                                        : "-${element.quantity}",
                                    style: TextStyle(
                                        color: element.toShopId?.id ==
                                                product?.shop?.id
                                            ? Colors.green
                                            : Colors.red),
                                  )),
                                  DataCell(Text(
                                      element.toShopId?.id == product?.shop?.id
                                          ? element.fromShopId!.name!
                                          : element.toShopId!.name!)),
                                ]),
                              )
                            ])))
        ],
      ),
    );
  }
}

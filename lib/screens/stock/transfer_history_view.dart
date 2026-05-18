// ignore_for_file: prefer_const_literals_to_create_immutables, prefer_const_constructors
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/stockcontroller.dart';
import 'package:pointify/models/transferhistory.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/screens/stock/transfer_history.dart';

import '../../controllers/homecontroller.dart';
import '../../controllers/productcontroller.dart';
import '../../models/transferitems.dart';
import '../../widgets/no_items_found.dart';

class TransferHistoryView extends StatelessWidget {
  final TransferHistory stockTransferHistory;
  TransferHistoryView({Key? key, required this.stockTransferHistory})
      : super(key: key);

  final ProductController productController = Get.find<ProductController>();
  final StockController stockTransferController = Get.find<StockController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
            backgroundColor: Colors.white,
            elevation: 0.0,
            leading: IconButton(
              onPressed: () {
                if (isSmallScreen(context)) {
                  Get.back();
                } else {
                  Get.find<HomeController>().selectedWidget.value =
                      TransferHistoryPage();
                }
              },
              icon: Icon(Icons.arrow_back_ios, color: Colors.black),
            ),
            title: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Products Transferred',
                      style: TextStyle(color: Colors.black),
                    ),
                  ],
                ),
              ],
            )),
        body: stockTransferHistory.transferItems!.isEmpty
            ? noItemsFound(context, true)
            : isSmallScreen(context)
                ? ListView.builder(
                    itemCount: stockTransferHistory.transferItems!.length,
                    shrinkWrap: true,
                    itemBuilder: (context, index) {
                      TransferItem transferItem =
                          stockTransferHistory.transferItems!.elementAt(index);
                      return Container(
                        margin: EdgeInsets.all(5),
                        padding: EdgeInsets.all(8),
                        decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(5),
                            boxShadow: [
                              BoxShadow(
                                  color: Colors.grey.withOpacity(0.3),
                                  offset: Offset(1, 1),
                                  blurRadius: 2,
                                  spreadRadius: 2)
                            ]),
                        child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    transferItem.name!.capitalize!,
                                    style: TextStyle(
                                        color: Colors.black,
                                        fontWeight: FontWeight.bold),
                                  ),
                                  SizedBox(
                                    height: 10,
                                  ),
                                  if (transferItem.product?.type == 'product')
                                    Text(
                                      "Qty ${transferItem.quantity}",
                                      style: TextStyle(
                                          color: Colors.grey,
                                          fontWeight: FontWeight.w400),
                                    )
                                ],
                              ),
                            ]),
                      );
                    })
                : Theme(
                    data: Theme.of(context).copyWith(dividerColor: Colors.grey),
                    child: Container(
                      width: double.infinity,
                      padding:
                          EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      child: DataTable(
                        decoration: BoxDecoration(
                            border: Border.all(
                          width: 1,
                          color: Colors.black,
                        )),
                        columnSpacing: 30.0,
                        columns: [
                          DataColumn(
                              label: Text('Name', textAlign: TextAlign.center)),
                          DataColumn(
                              label: Text('Quantity',
                                  textAlign: TextAlign.center)),
                          DataColumn(
                              label: Text('Date', textAlign: TextAlign.center)),
                        ],
                        rows: List.generate(
                            productController.productHistoryList.length,
                            (index) {
                          TransferItem productModel = productController
                              .productHistoryList
                              .elementAt(index);
                          final y = productModel.name;
                          final x = productModel.quantity;

                          return DataRow(cells: [
                            DataCell(Text(y!)),
                            DataCell(Text(x.toString())),
                          ]);
                        }),
                      ),
                    ),
                  ));
  }
}

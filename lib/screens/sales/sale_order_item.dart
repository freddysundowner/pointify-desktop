import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/models/saleitem.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/screens/home/home_page.dart';
import 'package:pointify/screens/sales/all_sales.dart';
import 'package:pointify/utils/colors.dart';
import 'package:pointify/widgets/no_items_found.dart';

import '../../controllers/homecontroller.dart';
import '../../controllers/salescontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../main.dart';
import '../../widgets/major_title.dart';
import 'components/sales_history_card.dart';

class SaleOrderItem extends StatelessWidget {
  final String id;
  final String page;

  SaleOrderItem({Key? key, required this.id, required this.page})
      : super(key: key);
  final SalesController salesController = Get.find<SalesController>();
  final ShopController shopController = Get.find<ShopController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        titleSpacing: 0,
        backgroundColor: Colors.white,
        elevation: 0.3,
        centerTitle: false,
        leading: IconButton(
          onPressed: () {
            if (MediaQuery.of(context).size.width > 600) {
              if (page == "home") {
                Get.find<HomeController>().selectedWidget.value = HomePage();
              } else {
                Get.find<HomeController>().selectedWidget.value =
                    const AllSalesPage(
                  page: "saleOrder",
                );
              }
            } else {
              Get.back();
            }
          },
          icon: const Icon(
            Icons.arrow_back_ios,
            color: Colors.black,
          ),
        ),
        title: majorTitle(title: "Sale Items", color: Colors.black, size: 16.0),
      ),
      body: ResponsiveWidget(
        largeScreen: SingleChildScrollView(
          child: Obx(
            () {
              return salesController.salesOrderItemLoad.value
                  ? Column(
                      children: [
                        SizedBox(
                            height: MediaQuery.of(context).size.height * 0.4),
                        const Center(child: CircularProgressIndicator()),
                      ],
                    )
                  : salesController.salesHistory.isEmpty
                      ? noItemsFound(context, true)
                      : Container(
                          width: double.infinity,
                padding: const EdgeInsets.symmetric(
                              horizontal: 15, vertical: 10),
                          child: Theme(
                            data: Theme.of(context)
                                .copyWith(dividerColor: Colors.grey),
                            child: DataTable(
                              decoration: BoxDecoration(
                                  border: Border.all(
                                width: 1,
                                color: Colors.black,
                              )),
                              columnSpacing: 30.0,
                              columns: [
                                const DataColumn(
                                    label: Text('Product',
                                        textAlign: TextAlign.center)),
                                DataColumn(
                                    label: Text(
                                        'Amount(${userController.currentUser.value!.primaryShop?.currency})',
                                        textAlign: TextAlign.center)),
                                const DataColumn(
                                    label: Text('Payment Method',
                                        textAlign: TextAlign.center)),
                                const DataColumn(
                                    label: Text('Date',
                                        textAlign: TextAlign.center)),
                                const DataColumn(
                                    label:
                                        Text('', textAlign: TextAlign.center)),
                              ],
                              rows: List.generate(
                                  salesController.salesHistory.length, (index) {
                                SaleItem saleOrderItemModel = salesController
                                    .salesHistory
                                    .elementAt(index) as SaleItem;
                                final y =
                                    saleOrderItemModel.product!.name.toString();
                                final x =
                                    saleOrderItemModel.unitPrice.toString();
                                final z =
                                    saleOrderItemModel.quantity.toString();
                                final w = saleOrderItemModel.createdAt;


                                return DataRow(cells: [
                                  DataCell(SizedBox(width: 75, child: Text(y))),
                                  DataCell(SizedBox(width: 75, child: Text(x))),
                                  DataCell(Text(z)),
                                  DataCell(Text(DateFormat("MM-dd-yyyy")
                                      .format(w as DateTime))),
                                  DataCell(InkWell(
                                    onTap: () {
                                      // if (saleOrderItemModel.returned ==
                                      //     false) {
                                      //   returnStockDialog(
                                      //       saleItem: saleOrderItemModel);
                                      // }
                                    },
                                    child:  Text(
                                      "Return to stock",
                                      style:
                                          TextStyle(color: AppColors.mainColor),
                                    ),
                                  )),
                                ]);
                              }),
                            ),
                          ),
                        );
            },
          ),
        ),
        smallScreen: Obx(
          () {
            return salesController.salesOrderItemLoad.value
                ? const Center(
                    child: CircularProgressIndicator(),
                  )
                : salesController.salesHistory.isEmpty
                    ? const Center(
                        child: Text("No Entries Found"),
                      )
                    : ListView.builder(
                        shrinkWrap: true,
                        itemCount: salesController.salesHistory.length,
                        itemBuilder: (context, index) {
                          SaleItem saleOrderItemModel =
                              salesController.salesHistory.elementAt(index)
                                  as SaleItem;
                          return saleOrderItemCard(saleOrderItemModel, "page");
                        });
          },
        ),
      ),
    );
  }
}

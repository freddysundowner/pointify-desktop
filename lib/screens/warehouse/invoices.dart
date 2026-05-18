import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/warehousecontroller.dart';
import 'package:pointify/models/wahoureinvoice.dart';
import 'package:pointify/screens/warehouse/widgets/wh_invoice_card.dart';
import 'package:pointify/widgets/no_items_found.dart';
import 'package:printing/printing.dart';

import '../../controllers/homecontroller.dart';
import '../../controllers/reports_controller.dart';
import '../../controllers/shopcontroller.dart';
import '../../main.dart';
import '../../utils/colors.dart';
import '../../widgets/filter_dates.dart';
import '../../widgets/textbutton.dart';
import '../receipts/pdf/sales/warehouse_requests_report.dart';

class Invoices extends StatelessWidget {
  final String? page;

  Invoices({super.key, required this.page}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      wareHouseController.getRequests(
        status: "",
        from: reportsController.filterStartDate.value,
        to: reportsController.filterEndDate.value,
        warehouse:
            userController.currentUser.value?.primaryShop?.warehouse == true
                ? userController.currentUser.value?.primaryShop?.id
                : "",
        shop: userController.currentUser.value?.primaryShop?.warehouse == false
            ? userController.currentUser.value?.primaryShop?.id
            : "",
      );
    });
  }

  ShopController shopController = Get.find<ShopController>();

  HomeController homeController = Get.find<HomeController>();

  ReportsController reportsController = Get.find<ReportsController>();

  WareHouseController wareHouseController = Get.put(WareHouseController());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.3,
        centerTitle: false,
        title: const Text(
          "Invoices",
          style: TextStyle(color: Colors.black),
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
        actions: [
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
                            title: const Text("Invoices Report"),
                          ),
                          body: PdfPreview(
                            build: (context) => warehouseRequestsReportPdf(
                                "receipts",
                                "Invoices Report ",
                                wareHouseController.warehouseInvoices.value),
                          ),
                        ));
                  })),
          const SizedBox(
            width: 10,
          )
        ],
      ),
      body: Column(
        children: [
          Obx(
            () => filterByDates(onFilter: (start, end, type) {
              reportsController.activeFilter.value = type;
              reportsController.filterStartDate.value = DateFormat(
                "yyyy-MM-dd",
              ).format(start);
              reportsController.filterEndDate.value = DateFormat(
                "yyyy-MM-dd",
              ).format(end);
              wareHouseController.getRequests(
                  warehouse: userController
                              .currentUser.value?.primaryShop?.warehouse ==
                          true
                      ? userController.currentUser.value?.primaryShop?.id
                      : '',
                  shop: userController
                              .currentUser.value?.primaryShop?.warehouse ==
                          false
                      ? userController.currentUser.value?.primaryShop?.id
                      : '',
                  from: reportsController.filterStartDate.value,
                  to: reportsController.filterEndDate.value);
            }),
          ),
          Expanded(
            child: Obx(() {
              return wareHouseController.isLoadingCount.isTrue
                  ? const Center(
                      child: CircularProgressIndicator(),
                    )
                  : wareHouseController.warehouseInvoices.isEmpty
                      ? noItemsFound(context, true)
                      : ListView.builder(
                          itemBuilder: (context, index) {
                            WareHouseInvoice wareHouseInvoice =
                                wareHouseController.warehouseInvoices
                                    .elementAt(index);
                            return WareHouseItemInvoice(
                                warehouseinoivce: wareHouseInvoice,
                                from: "invoices");
                          },
                          itemCount:
                              wareHouseController.warehouseInvoices.length,
                        );
            }),
          )
        ],
      ),
    );
  }

  Widget searchWidget() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: TextFormField(
              // controller: wareHouseController.searchSaleReceiptController,
              onChanged: (value) {},
              decoration: InputDecoration(
                contentPadding: const EdgeInsets.fromLTRB(10, 2, 0, 2),
                suffixIcon: IconButton(
                  onPressed: () {},
                  icon: const Icon(Icons.search),
                ),
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

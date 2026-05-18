import 'package:data_table_2/data_table_2.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/reports_controller.dart';
import 'package:pointify/models/debtor.dart';
import 'package:pointify/widgets/no_items_found.dart';

import '../functions/functions.dart';
import '../main.dart';
import '../utils/colors.dart';

class DebtorsReportScreen extends StatelessWidget {
  DebtorsReportScreen({super.key}) {
    reportsController.getDebtors(
        shopid: userController.currentUser.value!.primaryShop!.id);
  }
  final ReportsController reportsController = Get.find<ReportsController>();
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title:  Text(
          "Debtors Report",
          style: TextStyle(color: AppColors.mainColor),
        ),
        actions: [
          IconButton(
              onPressed: () async {
                // reportsController.downloadExcelFile();

                List<List<Object?>> data = [
                  ['Name', 'Contacts', 'Total Debt', "Total Paid"],
                ];

                data.addAll(reportsController.debtors
                    .map((element) => [
                          element.name,
                          element.phone,
                          element.totalDebt,
                          element.totalPaid,
                        ])
                    .toList());

                String? filePath = await exportToExcel(data, "debtors");
                await openFile(filePath!);
              },
              icon:  Icon(
                Icons.print,
                color: AppColors.mainColor,
              ))
        ],
        leading: IconButton(
          onPressed: () {
            Get.back();
          },
          icon:  Icon(
            Icons.clear,
            color: AppColors.mainColor,
          ),
        ),
      ),
      body: Obx(
        () => reportsController.isLoadingReports.isTrue
            ? const Center(
                child: CircularProgressIndicator(),
              )
            : reportsController.debtors.isEmpty
                ? Center(child: noItemsFound(context, true))
                : DataTable2(
                    horizontalMargin: 5,
                    columns: const [
                      DataColumn2(
                        label: Text('Name'),
                      ),
                      DataColumn(
                        label: Text('Total Debt'),
                      ),
                      DataColumn(
                        label: Text('Total Paid'),
                      )
                    ],
                    rows: List<DataRow>.generate(
                        reportsController.debtors.length, (index) {
                      Debtor? stockReport =
                          reportsController.debtors.elementAt(index);

                      return DataRow(cells: [
                        DataCell(Text(
                            "${stockReport.name.toString()}\n${stockReport.phone.toString()}")),
                        DataCell(Text(htmlPrice(stockReport.totalDebt))),
                        DataCell(Text(htmlPrice(stockReport.totalPaid))),
                      ]);
                    }),
                  ),
      ),
    );
  }
}

import 'package:data_table_2/data_table_2.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/functions/functions.dart';

import '../../controllers/homecontroller.dart';
import '../../controllers/salescontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../responsive/responsiveness.dart';
import '../../utils/colors.dart';
import 'financial_page.dart';

class GraphAnalysis extends StatefulWidget {
  const GraphAnalysis({Key? key}) : super(key: key);

  @override
  State<GraphAnalysis> createState() => _GraphAnalysisState();
}

class _GraphAnalysisState extends State<GraphAnalysis> {
  SalesController salesController = Get.find<SalesController>();

  ShopController shopController = Get.find<ShopController>();

  List<int> getYears(int year) {
    int currentYear = DateTime.now().year;

    List<int> yearsTilPresent = [];

    while (year <= currentYear) {
      yearsTilPresent.add(year);
      year++;
    }

    return yearsTilPresent;
  }

  @override
  void initState() {
    // TODO: implement initState
    super.initState();

    _getData();
  }

  _getData() async {
    var year = DateTime.now().year;
    salesController.currentYear.value = year;
    DateTime now = DateTime(year, 1);
    var firstDayofYear = DateTime(now.year, now.month, 1);

    DateTime now2 = DateTime(year, 12);
    var lastDayofYear = DateTime(now2.year, now2.month + 1, 0);
    await salesController.getGraphSales(
        fromDate: DateFormat("yyy-MM-dd").format(firstDayofYear),
        toDate: DateFormat("yyy-MM-dd").format(lastDayofYear));
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Graph Analysis',
          style: TextStyle(
              color: isSmallScreen(context) ? Colors.white : Colors.black),
        ),
        elevation: 0.1,
        backgroundColor:
            isSmallScreen(context) ? AppColors.mainColor : Colors.white,
        leading: IconButton(
            onPressed: () {
              if (isSmallScreen(context)) {
                Get.back();
              } else {
                Get.find<HomeController>().selectedWidget.value =
                    FinancialPage();
              }
            },
            icon: Icon(
              Icons.arrow_back_ios,
              color: isSmallScreen(context) ? Colors.white : Colors.black,
            )),
      ),
      body: Obx(
        () => Column(
          children: [
            const SizedBox(
              height: 20,
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text("Filter by ~"),
                InkWell(
                  onTap: () {
                    showDialog(
                      context: context,
                      builder: (BuildContext context) {
                        return Dialog(
                          child: Container(
                            height: 300,
                            width: MediaQuery.of(context).size.width * 0.2,
                            color: Colors.white,
                            child: ListView.builder(
                                itemCount: getYears(2019).length,
                                itemBuilder: (c, i) {
                                  var year = getYears(2019)[i];
                                  return InkWell(
                                    onTap: () {
                                      salesController.currentYear.value = year;
                                      DateTime now = DateTime(year, 1);
                                      var firstDayofYear =
                                          DateTime(now.year, now.month, 1);

                                      DateTime now2 = DateTime(year, 12);
                                      var lastDayofYear = DateTime(
                                          now2.year, now2.month + 1, 0);

                                      salesController.getGraphSales(
                                          fromDate: DateFormat("yyy-MM-dd")
                                              .format(firstDayofYear),
                                          toDate: DateFormat("yyy-MM-dd")
                                              .format(lastDayofYear));
                                      salesController.salesdata.refresh();

                                      Get.back();
                                    },
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 20, vertical: 10),
                                          child: Text(
                                            year.toString().capitalize!,
                                            style: const TextStyle(
                                                color: Colors.black,
                                                fontSize: 16),
                                          ),
                                        ),
                                        const Divider()
                                      ],
                                    ),
                                  );
                                }),
                          ),
                        );
                      },
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.only(right: 10),
                    child: Row(
                      children: [
                        Obx(() =>
                            Text(salesController.currentYear.value.toString())),
                        const Icon(Icons.arrow_drop_down)
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const Divider(),
            const SizedBox(
              height: 10,
            ),
            Text(
              "TOTAL PROFIT(net) ${htmlPrice(salesController.netProfit.value)}",
              style:  TextStyle(
                  color: AppColors.mainColor,
                  fontSize: 18,
                  fontWeight: FontWeight.bold),
            ),
            const SizedBox(
              height: 10,
            ),
            Expanded(
              child: DefaultTabController(
                initialIndex: salesController.tableInitialIndex.value,
                length: 2,
                child: Builder(builder: (context) {
                  return Column(
                    children: [
                      TabBar(
                        controller: DefaultTabController.of(context),
                        tabs:  [
                          Tab(
                            child: Text(
                              "Graph View",
                              style: TextStyle(color: AppColors.mainColor),
                            ),
                          ),
                          Tab(
                            child: Text(
                              "List View",
                              style: TextStyle(color: AppColors.mainColor),
                            ),
                          )
                        ],
                        onTap: (i) {
                          salesController.tableInitialIndex.value = i;
                        },
                      ),
                    ],
                  );
                }),
              ),
            )
          ],
        ),
      ),
      bottomNavigationBar: Obx(
        () => salesController.tableInitialIndex.value == 0
            ? Container(
                height: 0,
              )
            : SizedBox(
                height: 120,
                child: DataTable2(
                    columnSpacing: 12,
                    horizontalMargin: 12,
                    minWidth: 400,
                    columns: const [
                      DataColumn2(
                        label: Text(''),
                        size: ColumnSize.L,
                      ),
                      DataColumn(
                        label: Text(''),
                      ),
                      DataColumn(
                        label: Text(''),
                      ),
                      DataColumn(
                        label: Text(''),
                      ),
                      DataColumn(
                        label: Text(''),
                      ),
                    ],
                    rows: List<DataRow>.generate(1, (index) {
                      var salestotal = salesController.salesdata.fold(
                          0,
                          (previousValue, element) =>
                              previousValue + element.sales.toInt());
                      var expenses = salesController.expensesdata.fold(
                          0,
                          (previousValue, element) =>
                              previousValue + element.sales.toInt());
                      var profitdata = salesController.profitdata.fold(
                          0,
                          (previousValue, element) =>
                              previousValue + element.sales.toInt());

                      return DataRow(cells: [
                        const DataCell(Text(
                          "Totals",
                          style: TextStyle(fontWeight: FontWeight.bold),
                        )),
                        DataCell(Text(htmlPrice(salestotal))),
                        DataCell(Text(
                          htmlPrice(profitdata.toString()),
                          style: const TextStyle(color: Colors.green),
                        )),
                        DataCell(Text(htmlPrice(expenses.toString()),
                            style: const TextStyle(color: Colors.red))),
                        DataCell(Text(
                            htmlPrice((profitdata - expenses).toString()),
                            style: TextStyle(
                                color: (profitdata - expenses) < 0
                                    ? Colors.red
                                    : Colors.green)))
                      ]);
                    })),
              ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/utils/colors.dart';

import '../../controllers/homecontroller.dart';
import '../../controllers/salescontroller.dart';
import 'financial_page.dart';

class ProductAnalysis extends StatefulWidget {
  const ProductAnalysis({Key? key}) : super(key: key);

  @override
  State<ProductAnalysis> createState() => _ProductAnalysisState();
}

class _ProductAnalysisState extends State<ProductAnalysis> {
  SalesController salesController = Get.find<SalesController>();

  List<int> getYears(int year) {
    int currentYear = DateTime.now().year;

    List<int> yearsTilPresent = [];

    while (year <= currentYear) {
      yearsTilPresent.add(year);
      year++;
    }

    return yearsTilPresent;
  }

  String getMonth(int monthNumber) {
    String? month = "";
    switch (monthNumber) {
      case 1:
        month = "January";
        break;
      case 2:
        month = "February";
        break;
      case 3:
        month = "March";
        break;
      case 4:
        month = "April";
        break;
      case 5:
        month = "May";
        break;
      case 6:
        month = "June";
        break;
      case 7:
        month = "July";
        break;
      case 8:
        month = "August";
        break;
      case 9:
        month = "September";
        break;
      case 10:
        month = "October";
        break;
      case 11:
        month = "November";
        break;
      case 12:
        month = "December";
        break;
    }
    return month;
  }

  @override
  void initState() {
    // TODO: implement initState
    super.initState();
    _getData();
  }

  _getData() {
    var monthIndex = salesController.selectedMonth.value;
    var year = salesController.currentYear.value;
    salesController.selectedMonth.value = monthIndex;
    DateTime now = DateTime(year, monthIndex);
    var firstDayofYear = DateTime(now.year, monthIndex, 1);

    DateTime now2 = DateTime(year, monthIndex);
    var lastDayofYear = DateTime(now2.year, now2.month + 1, 0);

    salesController.getProductComparison(
        fromDate: DateFormat('yyyy-MM-dd').format(firstDayofYear),
        toDate: DateFormat('yyyy-MM-dd').format(lastDayofYear));
    salesController.productsDatadata.refresh();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
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
        () => Container(
          margin: const EdgeInsets.symmetric(horizontal: 10),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const SizedBox(
              height: 20,
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(salesController.filterTitle.value),
                const SizedBox(
                  width: 20,
                ),
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
                                itemCount: 12,
                                itemBuilder: (c, i) {
                                  var monthIndex = i + 1;
                                  var month = getMonth(monthIndex);
                                  return InkWell(
                                    onTap: () {
                                      _filterProductsComparion(monthIndex);
                                    },
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 20, vertical: 10),
                                          child: Text(
                                            month,
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
                        Obx(() => Text(
                            getMonth(salesController.selectedMonth.value))),
                        const Icon(Icons.arrow_drop_down)
                      ],
                    ),
                  ),
                ),
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
                                      _filterProductsComparion(
                                          salesController.selectedMonth.value);
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
            const SizedBox(
              height: 20,
            ),
            const SizedBox(
              height: 10,
            ),
            const Text(
              "Fast & Slow moving products",
              style: TextStyle(fontSize: 21),
            ),
            const SizedBox(
              height: 20,
            ),
          ]),
        ),
      ),
    );
  }

  void _filterProductsComparion(int monthIndex) {
    var year = salesController.currentYear.value;
    salesController.selectedMonth.value = monthIndex;
    DateTime now = DateTime(year, monthIndex);
    var firstDayofYear = DateTime(now.year, monthIndex, 1);

    DateTime now2 = DateTime(year, monthIndex);
    var lastDayofYear = DateTime(now2.year, now2.month + 1, 0);

    salesController.getProductComparison(
        fromDate: DateFormat('yyyy-MM-dd').format(firstDayofYear),
        toDate: DateFormat('yyyy-MM-dd').format(lastDayofYear));
    salesController.productsDatadata.refresh();
    Get.back();
  }
}

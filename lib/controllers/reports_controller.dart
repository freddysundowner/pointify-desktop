import 'dart:io';

import 'package:dio/dio.dart' as dio;
import 'package:dio/dio.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:open_file/open_file.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:pointify/controllers/salescontroller.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/models/saleitem.dart';
import 'package:pointify/models/stockreport.dart';
import 'package:pointify/services/end_points.dart';
import 'package:pointify/services/reports.dart';
import 'package:pointify/widgets/snackbars.dart';

import '../main.dart';
import '../models/debtor.dart';
import '../models/payment.dart';

class ReportsController extends GetxController {
  RxBool isLoadingReports = RxBool(false);
  RxMap<String, dynamic> salesReportData = RxMap({});

  RxMap<String, dynamic> grossProfit = RxMap({"gross": 0, "netprofit": 0});
  List<Map<String, dynamic>> salesCard = [];
  List<Map<String, dynamic>> purchasesCard = [];
  List<StockReport> stockReports = RxList([]);
  TextEditingController textStartDate = TextEditingController();
  TextEditingController searchProductSoldController = TextEditingController();
  TextEditingController textEndDate = TextEditingController();
  TextEditingController searchProductController = TextEditingController();
  RxBool exportingReport = RxBool(false);
  RxList<String> salesFilter =
      RxList(['Wholesale', 'Retail', 'Dealer', "Receipt"]);
  RxList<String> paymentypes = RxList(['cash', 'mpesa', 'bank']);
  RxString cashsalesfilterSelected = RxString("cash");
  RxString salesFilterSelected = RxString("Retail");
  RxMap<String, dynamic> filterPaymentTypeTotals =
      RxMap({'cash': 0, 'mpesa': 0, 'bank': 0});
  RxString activeFilter = RxString('today');
  RxDouble totalSales = RxDouble(0.0);
  var filterStartDate = DateFormat("yyy-MM-dd").format(DateTime.now()).obs;
  var filterEndDate = DateFormat("yyy-MM-dd").format(DateTime.now()).obs;
  RxList<Payment> payments = RxList([]);
  RxList<Debtor> debtors = RxList([]);
  RxList<SaleItem> productsReport = RxList([]);
  RxList<SaleItem> discountsReport = RxList([]);
  RxList<SaleItem> productsReportFiltered = RxList([]);
  RxList<SaleItem> discountReportFiltered = RxList([]);
  String paymentType = "all";
  String exportType = "excel";
  RxBool isPaymentLoading = false.obs;
  getStockReport(
      {String? shopid, int page = 1, int limit = 50, String? name = ""}) async {
    isLoadingReports.value = true;
    Map<String, dynamic> respose = await ReportsService()
        .getStockReport(shopid: shopid, page: page, limit: limit, name: name);
    List result = respose['data'];
    List<StockReport> stockreports =
        result.map((e) => StockReport.fromJson(e)).toList();
    stockReports.assignAll(stockreports);
    isLoadingReports.value = false;
  }

  getPurchasesReport({
    String? startDate,
    String? toDate,
    String? shopid,
  }) async {
    var types = [
      {
        "title": "Total Purchases",
        "key": "cash",
        "amount": 0,
        "description": "Click to view more details"
      },
      {
        "title": "Credit Purchases",
        "key": "credit",
        "amount": 0,
        "description": "Purchases made on credit"
      },
      // {
      //   "title": "Paid Debt",
      //   "key": "paid",
      //   "amount": 0,
      //   "description": "Total debt paid to creditors"
      // },
      {
        "title": "Returns",
        "key": "returns",
        "amount": 0,
        "description": "Purchases returned to suppliers"
      },
      // {
      //   "title": "Wallet Sales",
      //   "key": "wallet",
      //   "amount": 0,
      //   "description": "Sales sold through customer wallets"
      // },
      {
        "title": "On hold sales",
        "key": "hold",
        "amount": 0,
        "description": "Sales that has not been cashed in"
      },
    ];
    isLoadingReports.value = true;
    var respose = await ReportsService().getPurchasesReport(
        startDate: startDate, toDate: toDate, shopid: shopid);
    salesCard.clear();
    totalSales.value = 0;
    for (var element in types) {
      if (respose[element["key"]] != null) {
        element["amount"] = respose[element["key"]];
        salesCard.add(element);
        if (element["key"] == "cash" ||
            element["key"] == "credit" ||
            // element["key"] == "paid" ||
            element["key"] == "wallet") {
          totalSales.value += respose[element["key"]] as int;
        }
      }
    }
    salesReportData.value = respose;
    isLoadingReports.value = false;
  }

  getGrossProfit({
    String? startDate,
    String? toDate,
    String? shopid,
  }) async {
    isLoadingReports.value = true;
    var respose = await ReportsService()
        .getGrossProfit(startDate: startDate, toDate: toDate, shopid: shopid);
    grossProfit.value = respose;
    isLoadingReports.value = false;
  }

  getSalesReport({
    String? startDate,
    String? toDate,
    String? shopid,
  }) async {
    var types = [
      {
        "title": "Cash Sales",
        "key": "cash",
        "amount": 0,
        "description": "All Sales made on cash"
      },
      {
        "title": "Credit Sales",
        "key": "credit",
        "amount": 0,
        "description": "Sales made on credit"
      },
      {
        "title": "Collected Debt",
        "key": "debtpaid",
        "amount": 0,
        "description": "Total credit paid by debtors"
      },
      {
        "title": "Returns",
        "key": "returns",
        "amount": 0,
        "description": "Sales returned from customers"
      },
      {
        "title": "Wallet Sales",
        "key": "wallet",
        "amount": 0,
        "description": "Sales sold through customer wallets"
      },
      {
        "title": "On hold sales",
        "key": "hold",
        "amount": 0,
        "description": "Sales that has not been cashed in"
      },
    ];
    isLoadingReports.value = true;
    var respose = await ReportsService()
        .getSalesReport(startDate: startDate, toDate: toDate, shopid: shopid);
    salesCard.clear();
    totalSales.value = 0.0;

    for (var element in Get.find<SalesController>().cashsalesfilter) {
      if (element == 'cash') {
        Get.find<SalesController>().cashsalesfilterTotals['cash'] =
            respose['cash_sales'];
      } else {
        Get.find<SalesController>().cashsalesfilterTotals[element] =
            respose[element];
      }
    }

    for (var element in types) {
      if (respose[element["key"]] != null) {
        element["amount"] = respose[element["key"]];
        salesCard.add(element);
        if (element["key"] == "cash" ||
            element["key"] == "credit" ||
            element["key"] == "debtpaid" ||
            element["key"] == "mpesa" ||
            element["key"] == "bank" ||
            element["key"] == "wallet") {
          totalSales.value += respose[element["key"]];
        }
      }
    }
    salesReportData.value = respose;
    isLoadingReports.value = false;
  }

  void getDebtors({String? shopid}) async {
    debtors.clear();
    isLoadingReports.value = true;
    var response = await ReportsService().getDebtors(shopid: shopid!);
    if (response['message'] != null) {
      debtors.value = [];
      isLoadingReports.value = false;
      return;
    }
    List result = response['data'];
    debtors.addAll(result.map((e) => Debtor.fromJson(e)).toList());
    isLoadingReports.value = false;
  }

  Future<void> downloadExcelFile() async {
    try {
      var status = await Permission.storage.status;
      if (!status.isGranted) {
        status = await Permission.storage.request();
        if (!status.isGranted) {
          return;
        }
      }

      final dio.Dio dioInstance = dio.Dio();
      final directory = await getApplicationDocumentsDirectory();
      final filePath = '${directory.path}/customers_with_debt.xlsx';

      // Download the file
      dio.Response response = await dioInstance.get(
        '${EndPoints.debtorexcel}?shopId=${userController.currentUser.value!.primaryShop!.id!}',
        options: Options(
          responseType: ResponseType.bytes,
          followRedirects: false,
          validateStatus: (status) {
            return status! < 500;
          },
        ),
      );

      // Ensure the response data is not empty
      if (response.data != null && response.data is List<int>) {
        // Save the file
        File file = File(filePath);
        await file.writeAsBytes(response.data);

        // Open the file using the `open_file` package
        final result = await OpenFile.open(filePath);
      }
    } catch (e) {}
  }

  // Future<void> downloadExcelFile() async {
  //   // try {
  //   var response = await DbBase().databaseRequest(
  //       '${EndPoints.debtorexcel}?shopId=${userController.currentUser.value!.primaryShop!.id!}',
  //       DbBase().getRequestType);
  //
  //   // Since `databaseRequest` returns the data directly, we need to handle it accordingly
  //   if (response != null) {
  //     final directory = await getApplicationDocumentsDirectory();
  //     final file = File('${directory.path}/customers_with_debt.xlsx');
  //
  //     // Write the response data as bytes to the file
  //     await file.writeAsBytes(List<int>.from(response));
  //
  //     // Notify the user or open the file using a suitable package if needed
  //   }
  //   // } catch (e) {
  //   //   // Handle exceptions
  //   // }
  // }

  void getDebtorExcel() async {
    isLoadingReports.value = true;
    var response = await ReportsService().getDebtorExcel(
        shopid: userController.currentUser.value!.primaryShop!.id!);
    if (response['message'] != null) {
      debtors.value = [];
      isLoadingReports.value = false;
      return;
    }
    List result = response['data'];
    debtors.addAll(result.map((e) => Debtor.fromJson(e)).toList());
    isLoadingReports.value = false;
  }

  getProductSaleFilter({String? type}) {
    productsReportFiltered.clear();
    if (type == "mpesa") {
      productsReportFiltered.addAll(productsReport
          .where((element) =>
              element.currentSale != null &&
              element.currentSale!.mpesatotal! > 0)
          .toList());
    }
    if (type == "bank") {
      productsReportFiltered.addAll(productsReport
          .where((element) =>
              element.currentSale != null &&
              element.currentSale!.banktotal! > 0)
          .toList());
    }
    if (type == "cash") {
      productsReportFiltered.addAll(productsReport
          .where((element) =>
              element.currentSale != null &&
              element.totalLinePrice! > 0 &&
              element.currentSale!.paymentTag == "cash")
          .toList());
    }
  }

  void productsWisereport(
      {String? shop,
      String? fromDate,
      String? toDate,
      String? product,
      String? saleType = "Retail",
      showLoader = true}) async {
    if (showLoader == true) {
      if (isLoadingReports.isTrue) {
        return;
      }
      isLoadingReports.value = true;
    }
    productsReport.clear();
    productsReportFiltered.clear();
    var response = await ReportsService().productsWisereport(
        shop: shop,
        fromDate: fromDate,
        toDate: toDate,
        product: product,
        saleType: saleType);
    List result = response['items'];
    productsReport.addAll(result.map((e) => SaleItem.fromJson(e)).toList());
    for (var element in productsReport) {
      if (element.currentSale != null) {
        productsReportFiltered.add(element);
      }
    }

    isLoadingReports.value = false;

    getTotals();
    getProductSaleFilter(type: cashsalesfilterSelected.value);
  }

  void discountReport(
      {String? shop,
      String? fromDate,
      String? toDate,
      String? product,
      String? saleType = "Retail",
      showLoader = true}) async {
    if (showLoader == true) {
      if (isLoadingReports.isTrue) {
        return;
      }
      isLoadingReports.value = true;
    }
    discountsReport.clear();
    discountReportFiltered.clear();
    var response = await ReportsService().discountReport(
        shop: shop,
        fromDate: fromDate,
        toDate: toDate,
        product: product,
        saleType: saleType);
    List result = response['items'];
    discountsReport.addAll(result.map((e) => SaleItem.fromJson(e)).toList());
    for (var element in discountsReport) {
      if (element.currentSale != null) {
        discountReportFiltered.add(element);
      }
    }

    isLoadingReports.value = false;

    getTotals();
    getProductSaleFilter(type: cashsalesfilterSelected.value);
  }

  getTotals() {
    var data = {"total": 0.0, "mpesa": 0.0, "bank": 0.0, "cash": 0.0};
    for (var element in productsReportFiltered) {
      if (element.currentSale != null) {
        if (element.currentSale!.mpesatotal! > 0) {
          data["mpesa"] = element.currentSale!.mpesatotal! + data["mpesa"]!;
        }
        if (element.currentSale!.banktotal! > 0) {
          data["bank"] = element.currentSale!.banktotal! + data["bank"]!;
        }
        if (element.totalLinePrice! > 0 &&
            element.currentSale!.paymentTag == "cash") {
          data["cash"] = element.totalLinePrice! + data["cash"]!;
        }
        data["total"] = data["total"]! + 1;
      }
    }
    filterPaymentTypeTotals.value = data;
  }

  Future<void> salesExcelReport({
    required String fromDate,
    required String toDate,
    required String shop,
    String? paymentType,
    required String status,
    required String reportType,
    required String reportMode,
  }) async {
    try {
      Get.dialog(
        PopScope(
          canPop: false,
          child: const Center(
            child: CircularProgressIndicator(),
          ),
        ),
        barrierDismissible: false,
      );

      final directory = await getApplicationDocumentsDirectory();

      final extension = reportType == "pdf" ? "pdf" : "xlsx";

      final filePath =
          '${directory.path}/sales-report-${DateTime.now().millisecondsSinceEpoch}.$extension';

      var response = await ReportsService().salesExcelReport(
        fromDate: fromDate,
        toDate: toDate,
        shop: shop,
        paymentType: paymentType,
        status: status,
        reportType: reportType,
        reportMode: reportMode,
      );

      if (Get.isDialogOpen ?? false) {
        Get.back();
      }

      if (response != null) {
        File file = File(filePath);

        await file.writeAsBytes(response);

        await OpenFile.open(filePath);

        showSnackBar(
          message: "Sales report generated successfully",
          color: Colors.green,
        );
      } else {
        showSnackBar(
          message: "Failed to generate report",
          color: Colors.red,
        );
      }
    } catch (e) {
      if (Get.isDialogOpen ?? false) {
        Get.back();
      }

      debugPrintMessage(e);

      showSnackBar(
        message: e.toString(),
        color: Colors.red,
      );
    }
  }
}

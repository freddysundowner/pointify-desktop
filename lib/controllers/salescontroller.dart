import 'dart:async';
import 'dart:io';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pointify/controllers/expensecontroller.dart';
import 'package:pointify/controllers/printercontroller.dart';
import 'package:pointify/controllers/productcontroller.dart';
import 'package:pointify/controllers/reports_controller.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/analysis.dart';
import 'package:pointify/models/cashflow.dart';
import 'package:pointify/models/order.dart';
import 'package:pointify/models/payment.dart';
import 'package:pointify/models/salereturn.dart';
import 'package:pointify/screens/sales/onholdsales.dart';
import 'package:pointify/sqlite/helper.dart';
import 'package:pointify/utils/helper.dart';
import 'package:pointify/widgets/snackBars.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:share_plus/share_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/customer.dart';
import '../models/product.dart';
import '../models/saleitem.dart';
import '../models/salemodel.dart';
import '../models/shop.dart';
import '../screens/customers/wallet_page.dart';
import '../screens/receipts/pdf/sales/sales_receipt.dart';
import '../screens/receipts/view/sales_receipt.dart';
import '../services/sales_service.dart';
import '../utils/colors.dart';
import '../utils/cs50Setup.dart';
import '../utils/sunmi.dart';
import '../widgets/alert.dart';
import '../widgets/loading_dialog.dart';
import 'customercontroller.dart';

// ───────────────────────────────────────────────────────────────────────────
// CHART/DATA MODELS
// ───────────────────────────────────────────────────────────────────────────

class SalesData {
  final String year;
  final double sales;
  SalesData(this.year, this.sales);
}

class ChartData {
  final String x;
  final double y;
  ChartData(this.x, this.y);
}

class HomeCard {
  final double? total;
  final String? name;
  final String? key;
  final Color? color;
  final IconData? iconData;

  HomeCard({this.total, this.name, this.key, this.color, this.iconData});
}

// ───────────────────────────────────────────────────────────────────────────
// SALES CONTROLLER
// ───────────────────────────────────────────────────────────────────────────

class SalesController extends GetxController with GetTickerProviderStateMixin {
  // ─── constants ─────────────────────────────────────────────────────────
  static const _dateFmt = "yyyy-MM-dd";
  static const _isoDateFmt = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'";

  static const List<String> _months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sept',
    'Oct',
    'Nov',
    'Dec'
  ];

  // ─── tab + scroll ──────────────────────────────────────────────────────
  late TabController tabController;
  final ScrollController scrollController = ScrollController();

  final PageController pageController = PageController(
    initialPage: 1,
    viewportFraction: 0.8,
    keepPage: false,
  );

  // ─── text controllers ──────────────────────────────────────────────────
  final TextEditingController textEditingSellingPrice = TextEditingController();
  final TextEditingController textEditingReturnProduct =
      TextEditingController();
  final TextEditingController emailController = TextEditingController();
  final TextEditingController textEditingCredit = TextEditingController();
  final TextEditingController amountPaid = TextEditingController();
  final TextEditingController cashPaid = TextEditingController();
  final TextEditingController readyDateController = TextEditingController();
  final TextEditingController laundryNoteController = TextEditingController();
  final TextEditingController mpesaCashPaid = TextEditingController();
  final TextEditingController bankCashPaid = TextEditingController();
  final TextEditingController saleDiscount = TextEditingController();
  final TextEditingController mpesaTransId = TextEditingController();
  final TextEditingController bankTransId = TextEditingController();
  final TextEditingController creditAmount = TextEditingController();
  final TextEditingController salesnote = TextEditingController();
  final TextEditingController amountController = TextEditingController();
  final TextEditingController mpesaCode = TextEditingController();
  final TextEditingController salesQtyController = TextEditingController();
  final TextEditingController creditPaidAmountController =
      TextEditingController();
  final TextEditingController selectedCustomerController =
      TextEditingController();
  final TextEditingController searchSaleReceiptController =
      TextEditingController();
  final TextEditingController receiptCoutController =
      TextEditingController(text: '1');

  // ─── reactive state: collections ───────────────────────────────────────
  final RxList<SaleModel> allSales = RxList([]);
  final RxList<SaleModel> allSalesFiltered = RxList([]);
  final RxList<SaleModel> allSalesCash = RxList([]);
  final RxList<SaleModel> allSalesCashFiltered = RxList([]);
  final RxList<SaleItem?> productSales = RxList([]);
  final RxList<SaleModel> onholdSales = RxList([]);
  final RxList<SaleRetuns> allSalesReturns = RxList([]);
  final RxList<OrderItem> orders = RxList([]);
  final RxList<SaleModel> todaySales = RxList([]);
  final RxList<SaleItem> productSaleRceipts = RxList([]);
  final RxList<Map<String, dynamic>> productMonthSales = RxList([]);
  final RxList<SaleModel> salesHistory = RxList([]);
  final RxList<Payment> paymenHistory = RxList([]);
  final RxList<SaleItem> currentReceiptReturns = RxList([]);
  final RxList<SaleModel> creditSales = RxList([]);
  final RxList<Map<String, dynamic>> extraCharges = RxList([]);

  final RxList<String> cashsalesfilter = RxList(['cash', 'mpesa', 'bank']);
  final RxMap<String, dynamic> cashsalesfilterTotals =
      RxMap({'cash': 0, 'mpesa': 0, 'bank': 0});

  final RxList paymentMethods =
      RxList(['Cash', 'Credit', 'Wallet', 'Split Payment', 'Mpesa', 'Bank']);
  final RxList customerType = RxList(['Retail', 'Wholesale', 'Dealer']);
  final RxList receiptpaymentMethods =
      RxList(['Cash', 'Wallet', 'Mpesa', 'Bank']);

  // ─── reactive state: singletons & primitives ───────────────────────────
  final RxnInt allSalesTotal = RxnInt(0);
  final RxMap<String, dynamic> salesPaginageSettings = RxMap({
    'page': 1,
    'limit': 100,
    'total': 0,
    'totalPages': 0,
  });

  final RxDouble change = RxDouble(0);
  final RxString selectedCustomerType = RxString('Retail');
  final RxString changeText = RxString('Change: ');
  final RxString cashsalesfilterSelected = RxString('cash');
  final RxnInt netProfit = RxnInt(0);
  final RxnInt totalbadStock = RxnInt(0);
  final RxnInt totalSalesReturned = RxnInt(0);
  final RxString duesByDate = RxString('');

  final Rxn<Customer> currentCustomer = Rxn(null);
  final Rxn<String> paymentType = Rxn('Cash');
  final Rxn<SaleModel> currentReceipt = Rxn(null);
  final Rxn<SaleModel> receipt = Rxn(SaleModel(items: []));
  final Rxn<Product> selecteProduct = Rxn(null);
  final Rxn<Analysis> analysis = Rxn(null);
  final Rxn<DateTime> sellingDate = Rxn(null);

  final RxInt currentYear = RxInt(DateTime.now().year);
  final RxInt totalSalesByDate = RxInt(0);
  final RxInt salesInitialIndex = RxInt(0);
  final RxInt tableInitialIndex = RxInt(0);
  final RxInt offlinesales = 0.obs;
  final RxInt selectedMonth = RxInt(DateTime.now().month);

  final RxBool showSalesDiscount = RxBool(false);
  final RxBool saveSaleLoad = RxBool(false);
  final RxBool showReceipt = RxBool(false);
  final RxBool isVoiding = RxBool(false);
  final RxBool getSalesByLoad = RxBool(false);
  final RxBool getPaymentHistoryLoad = RxBool(false);
  final RxBool isUpdating = RxBool(false);
  final RxBool salesOrderItemLoad = RxBool(false);
  final RxBool salesOnCreditLoad = RxBool(false);
  final RxBool loadingMoreSales = RxBool(false);
  final RxBool loadingSales = RxBool(false);
  final RxBool showReadyDate = false.obs;
  final RxBool showAllPayments = false.obs;

  final RxString range = RxString('');
  final RxString salesRange = RxString('');
  final RxString paynowMethod = RxString('Cash');
  final RxString activeItem = RxString('All Sales');
  final RxString filterTitle = RxString('Filter by ~');

  late final RxString filterStartDate;
  late final RxString filterEndDate;

  // ─── chart data ────────────────────────────────────────────────────────
  final RxList<SalesData> salesdata = RxList([]);
  final RxList<ChartData> dailySales = RxList([]);
  final RxList<SalesData> expensesdata = RxList([]);
  final RxList<ChartData> productsDatadata = RxList([]);
  final RxList<ChartData> productSalesAnalysis = RxList([]);
  final RxList<ChartData> productSalesByAttendantsAnalysis = RxList([]);
  final RxList<SalesData> profitdata = RxList([]);
  final RxList<HomeCard> homecards = RxList([]);

  // ─── loading dialog keys ───────────────────────────────────────────────
  final GlobalKey<State> keyLoader = GlobalKey<State>();
  final GlobalKey<State> _keyLoader = GlobalKey<State>();

  // ─── lifecycle ─────────────────────────────────────────────────────────

  @override
  void onInit() {
    super.onInit();

    final now = DateTime.now();
    filterStartDate =
        DateFormat(_dateFmt).format(DateTime(now.year, now.month, 1)).obs;
    filterEndDate =
        DateFormat(_dateFmt).format(now.add(const Duration(days: 1))).obs;

    tabController = TabController(length: 3, vsync: this);
    scrollController.addListener(_onScroll);
  }

  @override
  void onClose() {
    scrollController.removeListener(_onScroll);
    scrollController.dispose();
    pageController.dispose();
    tabController.dispose();
    super.onClose();
  }

  void _onScroll() {
    if (loadingMoreSales.value) return;
    if (scrollController.position.pixels <
        scrollController.position.maxScrollExtent) return;
    _loadMoreData();
  }

  Future<void> _loadMoreData() async {
    if (salesPaginageSettings['totalPages'] == salesPaginageSettings['page']) {
      return;
    }
    salesPaginageSettings['page'] = salesPaginageSettings['page'] + 1;
    final reports = Get.find<ReportsController>();
    getSalesByDate(
      shop: userController.currentUser.value!.primaryShop!.id!,
      fromDate: reports.filterStartDate.value,
      toDate: reports.filterEndDate.value,
      loadMore: true,
    );
  }

  // ─── helpers ───────────────────────────────────────────────────────────

  String? get _shopId => userController.currentUser.value?.primaryShop?.id;

  String? get _attendantId =>
      userController.currentUser.value?.attendantId?.sId;

  bool isInteger(num value) => value is int || value == value.roundToDouble();

  double _parseOrZero(String s) => double.tryParse(s.trim()) ?? 0.0;

  String _todayDate() => DateFormat(_dateFmt).format(DateTime.now());

  List<SalesData> _emptyMonthlySeries() =>
      _months.map((m) => SalesData(m, 0)).toList();

  // ─── extra charges ─────────────────────────────────────────────────────

  double get extraChargesTotal => extraCharges.fold(
        0.0,
        (sum, item) => sum + (item['amount'] ?? 0),
      );

  void addExtraCharge({required String name, required double amount}) {
    extraCharges.add({'name': name, 'amount': amount});
    calculateCartTotal();
  }

  void removeExtraCharge(int index) {
    extraCharges.removeAt(index);
    calculateCartTotal();
  }

  void calculateCartTotal() {
    final r = receipt.value;
    if (r == null || r.items == null) return;

    final itemsTotal = r.items!.fold<double>(
      0,
      (sum, item) => sum + ((item.unitPrice ?? 0) * (item.quantity ?? 0)),
    );

    r.totalWithDiscount = itemsTotal + extraChargesTotal;
    getTotalCredit();
    receipt.refresh();
  }

  // ─── split payment totals ──────────────────────────────────────────────

  void calculateSplitTotals() {
    final total = _parseOrZero(cashPaid.text) +
        _parseOrZero(mpesaCashPaid.text) +
        _parseOrZero(bankCashPaid.text);

    amountPaid.text = total.toStringAsFixed(2);
    _applyPaidToReceipt(total);
    receipt.refresh();
  }

  void getTotalCredit() {
    final total = paymentType.value == 'Split Payment'
        ? _parseOrZero(cashPaid.text) +
            _parseOrZero(mpesaCashPaid.text) +
            _parseOrZero(bankCashPaid.text)
        : _parseOrZero(amountPaid.text);

    if (paymentType.value == 'Split Payment') {
      amountPaid.text = total.toStringAsFixed(2);
    }

    _applyPaidToReceipt(total);
  }

  /// Updates [receipt] balance + change/changeText based on amount paid.
  void _applyPaidToReceipt(double paid) {
    final r = receipt.value;
    if (r == null) return;

    final total = r.totalWithDiscount ?? 0;

    r.outstandingBalance = paid > 0 ? total - paid : total;
    change.value = paid - total;
    creditAmount.text =
        change.value > 0 ? '0' : change.value.abs().toStringAsFixed(2);

    if (total < paid) {
      changeText.value = 'Change: ';
      r.outstandingBalance = 0;
    } else {
      changeText.value = 'Balance Remaining: ';
    }
  }
  // ─── product pricing & cart ────────────────────────────────────────────

  double getProductSellingPrice(Product product) {
    final type = selectedCustomerType.value;
    if (type == 'Wholesale' && (product.wholesalePrice ?? 0) > 0) {
      return product.wholesalePrice!;
    }
    if (type == 'Dealer' && (product.dealerPrice ?? 0) > 0) {
      return product.dealerPrice!;
    }
    return product.sellingPrice ?? 0;
  }

  void addToCart(Product product, {double qty = 1, double lineDiscount = 0}) {
    final unitPrice = getProductSellingPrice(product);
    final total = unitPrice * qty;
    final shopTax = userController.currentUser.value?.primaryShop?.tax ?? 0.0;

    final item = SaleItem(
      product: product,
      tax: product.taxable == true ? shopTax * total / 100 : 0,
      quantity: qty,
      attendant: Attendant(sId: _attendantId ?? ''),
      lineDiscount: lineDiscount,
      totalLinePrice: total,
      createdAt: DateFormat('yyyy-MM-dd').format(DateTime.now()),
      unitPrice: unitPrice,
    );

    Get.back();
    changeSaleItem(item, status: 'cashed');
  }

  void refreshCart() {
    final items = receipt.value?.items;
    if (items == null) return;
    for (final item in items) {
      changeSaleItem(item);
    }
  }

  /// Adds [value] to the receipt (or increments qty if it already exists).
  /// When called from on-hold, pass [status]="onHold" to avoid auto-increment.
  void changeSaleItem(SaleItem value, {String? status = 'onHold'}) {
    final existingItems = receipt.value?.items;
    final existingIndex = existingItems == null
        ? -1
        : existingItems.indexWhere(
            (e) => e.product?.sId == value.product?.sId,
          );

    if (existingIndex == -1) {
      // New item — create or append.
      final customer = Get.find<CustomerController>().currentCustomer.value;
      if (receipt.value == null) {
        receipt.value = SaleModel(
          items: [value],
          paymentType: paymentType.value?.toLowerCase(),
          customerId: customer,
        );
      } else {
        receipt.value = SaleModel(
          items: [...?receipt.value!.items, value],
          customerId: customer,
          paymentType: paymentType.value?.toLowerCase(),
        );
      }

      final newIndex = receipt.value!.items!.indexWhere(
        (e) => e.product?.sId == value.product?.sId,
      );
      receipt.value!.items![newIndex].id = receipt.value?.sId;
      _recalcLine(newIndex);
    } else {
      // Existing item — increment qty unless restoring from on-hold.
      if (status != 'onHold') {
        final item = receipt.value!.items![existingIndex];
        if (item.product?.quantity == 0) return;
        item.quantity = (item.quantity ?? 0) + 1;
      }
      _recalcLine(existingIndex);
    }

    receipt.refresh();
    refresh();
  }

  void decrementItem(int index) {
    final item = receipt.value?.items?[index];
    if (item == null || item.quantity == 1) return;

    item.quantity = item.quantity! - 1;
    receipt.refresh();
    _recalcLine(index);
  }

  void incrementItem(int index) {
    final item = receipt.value?.items?[index];
    if (item == null) return;

    final isPhysicalProduct = item.product?.type == 'product';
    if (isPhysicalProduct && item.product?.quantity == 0) return;

    item.quantity = (item.quantity ?? 0) + 1;
    receipt.refresh();
    _recalcLine(index);
  }

  void _recalcLine(int index) {
    calculateAmount(
      index,
      totalDiscount: receipt.value?.items?[index].lineDiscount ?? 0,
    );
  }

  void calculateAmount(int index, {required double totalDiscount}) {
    final r = receipt.value;
    if (r == null || r.items == null) return;

    r.totalWithDiscount = 0;
    r.outstandingBalance = 0;

    // Apply customer-type pricing across the cart.
    final type = selectedCustomerType.value;
    if (type == 'Wholesale' || type == 'Dealer') {
      for (final item in r.items!) {
        item.unitPrice = type == 'Wholesale'
            ? item.product?.wholesalePrice
            : item.product?.dealerPrice;
      }
    }

    // Total tax (only taxable items contribute).
    r.totaltax = r.items!.fold<double>(
      0,
      (sum, item) =>
          item.product?.taxable == true ? sum + (item.tax ?? 0) : sum,
    );

    if (index < 0 || index >= r.items!.length) {
      r.totalWithDiscount = _sumLineTotals(r.items!);
      getTotalCredit();
      receipt.refresh();
      return;
    }

    final line = r.items![index];

    // Determine effective unit price after discount.
    final basePrice = getProductSellingPrice(line.product!);
    final currentUnit = line.unitPrice ?? 0;

    line.unitPrice = totalDiscount == 0
        ? (currentUnit > 0 ? currentUnit - totalDiscount : basePrice)
        : basePrice - totalDiscount;

    line.lineDiscount = totalDiscount;
    line.totalLinePrice = (line.unitPrice ?? 0) * (line.quantity ?? 0);

    r.totalWithDiscount = _sumLineTotals(r.items!);
    getTotalCredit();
    receipt.refresh();
  }

  double _sumLineTotals(List<SaleItem> items) => items.fold<double>(
        0,
        (sum, e) => sum + ((e.unitPrice ?? 0) * (e.quantity ?? 0)),
      );

  void removeDiscount(int index) {
    final item = receipt.value?.items?[index];
    if (item == null) return;
    item.unitPrice = (item.unitPrice ?? 0) + (item.lineDiscount ?? 0);
    calculateAmount(index, totalDiscount: 0);
    receipt.refresh();
  }

  void removeFromList(int index) {
    final r = receipt.value;
    if (r == null || r.items == null) return;

    calculateAmount(index, totalDiscount: r.items![index].lineDiscount ?? 0);
    r.items!.removeAt(index);

    r.totalWithDiscount = r.items!.fold<double>(
      0,
      (sum, e) =>
          sum +
          (((e.unitPrice ?? 0) - (e.lineDiscount ?? 0)) * (e.quantity ?? 0)),
    );
    receipt.refresh();
  }
  // ─── save sale ─────────────────────────────────────────────────────────

  Future<void> saveSale({String? screen, String? status}) async {
    await saveReceipt(status: status);
  }

  Future<void> saveReceipt({String? page, String? status}) async {
    Map<String, dynamic> response = {};

    try {
      _normalizeBlankPaidFields();
      getTotalCredit();
      final receiptData = receipt.value;
      if (receiptData == null) return;

      // Use the cash-paid amount for split payments, otherwise the entered amount.
      final amountTotalPaid = paymentType.value == 'Split Payment'
          ? _parseOrZero(cashPaid.text)
          : _parseOrZero(amountPaid.text);

      if (paymentType.value == 'Cash' || paymentType.value == 'Split Payment') {
        amountPaid.text = amountTotalPaid.toStringAsFixed(2);
      }

      final sale = _buildSalePayload(
        receiptData: receiptData,
        status: status,
        amountTotalPaid: amountTotalPaid,
      );

      print(sale);

      // Validate split payment is fully paid.
      if (sale['paymentTag'] == 'split' &&
          (receiptData.outstandingBalance ?? 0) > 0) {
        generalAlert(
          title: 'Error',
          message:
              'Split payment must be paid in full, balance is ${htmlPrice(receiptData.outstandingBalance)}',
          function: Get.back,
        );
        return;
      }

      Get.back();
      saveSaleLoad.value = true;
      LoadingDialog.showLoadingDialog(
        context: Get.context!,
        title: 'Please wait...',
        key: _keyLoader,
      );

      if (receiptData.sId != null) {
        response = await SalesService.updateSale(sale, receiptData.sId!);
      } else if (!await isConnected()) {
        generalAlert(
          title: 'There is no internet connection, proceed with cash sale?',
          function: () => saveOfflinesale(sale, receiptData),
        );
        return;
      } else {
        response = await SalesService.createSale(sale);
      }

      Get.back(); // close loader
      saveSaleLoad.value = false;

      if (response['error'] != null) {
        _handleSaveError(response['error'], receiptData);
        return;
      }

      if (status == 'hold') {
        showSnackBar(message: 'sale put on hold', color: Colors.green);
        getSalesByDate(shop: _shopId!, status: 'hold');
        Get.to(() => OnHoldSales());
        refresh();
      } else {
        Get.back();
      }

      receipt.value = null;
      _clearAfterSale();
    } catch (e) {
      showSnackBar(message: e.toString(), color: Colors.red);
      saveSaleLoad.value = false;
    } finally {
      getSalesByDate(type: 'today', shop: _shopId!);
      getNetAnalysis(type: 'today', shopId: _shopId!);

      if (response['sale'] != null) {
        final sale = SaleModel.fromJson(response['sale']);
        _printReceipt(sale);
      }

      Get.find<ProductController>().getProductsBySort(type: 'all');
      sellingDate.value = null;
    }
  }

  void _normalizeBlankPaidFields() {
    if (cashPaid.text.isEmpty) cashPaid.text = '0.0';
    if (mpesaCashPaid.text.isEmpty) mpesaCashPaid.text = '0.0';
    if (bankCashPaid.text.isEmpty) bankCashPaid.text = '0.0';
    if (creditAmount.text.isEmpty) creditAmount.text = '0.0';
  }

  Map<String, dynamic> _buildSalePayload({
    required SaleModel receiptData,
    required String? status,
    required double amountTotalPaid,
  }) {
    final shop = userController.currentUser.value?.primaryShop;
    final total = receiptData.totalWithDiscount ?? 0;
    final isFullyPaid = amountTotalPaid >= total;
    final isSplit = paymentType.value == 'Split Payment';

    final createdAt = sellingDate.value == null
        ? DateFormat(_isoDateFmt).format(DateTime.now())
        : DateFormat(_isoDateFmt).format(sellingDate.value!);

    return {
      'products': receiptData.items?.map((e) => e.toJson()).toList(),
      'shopId': shop?.id ?? '',
      'attendantId': _attendantId,
      'saleType': selectedCustomerType.value,
      'extraCharges': extraCharges,
      'extraChargesTotal': extraChargesTotal,
      'createdAt': createdAt,
      'status': status ?? receiptData.status,
      'totaltax': receiptData.totaltax,
      'salesnote': salesnote.text,
      'orderId': receiptData.orderId,
      'duedate': receiptData.dueDate,
      'ready_date': readyDateController.text,
      'batchTrack': shop?.allowbatchtracking ?? false,
      'allownegativeselling': shop?.allownegativeselling ?? false,
      'mpesaTransId': mpesaTransId.text.isNotEmpty ? mpesaTransId.text : '',
      'mpesaTotal': paymentType.value?.toLowerCase() == 'mpesa'
          ? _parseOrZero(amountPaid.text)
          : 0.0,
      'bankTotal': _splitChannelAmount(
        channel: 'Bank',
        controller: bankCashPaid,
      ),
      'amountPaid': _parseOrZero(amountPaid.text),
      'outstandingBalance': receiptData.outstandingBalance,
      'paymentType': isSplit ? 'cash' : paymentType.value?.toLowerCase(),
      'paymentTag': isSplit ? 'split' : paymentType.value?.toLowerCase(),
      'totalDiscount': receiptData.items?.fold<double>(
        0.0,
        (sum, e) => sum + (e.lineDiscount ?? 0),
      ),
      'customerId': currentCustomer.value?.sId,
      'saleDiscount': _parseOrZero(saleDiscount.text),
    };
  }

  double _splitChannelAmount({
    required String channel,
    required TextEditingController controller,
  }) {
    final isPrimary = paymentType.value == channel;
    final isSplitWithAmount =
        paymentType.value == 'Split Payment' && controller.text.isNotEmpty;
    return (isPrimary || isSplitWithAmount)
        ? _parseOrZero(controller.text)
        : 0.0;
  }

  void _handleSaveError(dynamic errorMessage, SaleModel receiptData) {
    generalAlert(
      message: errorMessage,
      title: 'Error',
      function: () {
        if (receiptData.customerId != null) {
          Get.find<CustomerController>().currentCustomer.value =
              receiptData.customerId!;
          Get.to(() => WalletPage());
        }
      },
      positiveText: 'Okay',
    );
  }

  void _clearAfterSale() {
    currentCustomer.value = null;
    receipt.value?.items = [];
    paymentType.value = 'Cash';
    selectedCustomerType.value = 'Retail';

    for (final c in [
      saleDiscount,
      mpesaCashPaid,
      readyDateController,
      bankCashPaid,
      creditAmount,
      textEditingSellingPrice,
      cashPaid,
      salesnote,
      amountPaid,
      selectedCustomerController,
    ]) {
      c.clear();
    }

    extraCharges.clear();
    receipt.refresh();
  }

  // ─── offline sale ──────────────────────────────────────────────────────

  Future<void> saveOfflinesale(
    Map<String, dynamic> sale,
    SaleModel receiptData,
  ) async {
    Get.back();
    DatabaseHelper().insertSale(sale);

    receiptData.items?.forEach((item) {
      DatabaseHelper().updateProduct({
        'id': item.product?.sId,
        'quantity': item.product?.quantity,
      });
    });

    offlinesales.value += 1;
    Get.find<ProductController>().getProductsBySort(type: 'all');
    saveSaleLoad.value = false;

    receipt.value = null;
    _clearAfterSale();

    Get.back();
    Get.back();
  }

  // ─── update sale receipt ───────────────────────────────────────────────

  Future<void> updateSaleReceipt({
    required Map<String, dynamic> data,
    SaleModel? salesModel,
    OrderItem? orderItem,
  }) async {
    if (salesModel == null) return;

    LoadingDialog.showLoadingDialog(
      context: Get.context!,
      title: 'Please wait...',
      key: _keyLoader,
    );
    isUpdating.value = true;

    final response = await SalesService.updateSale(data, salesModel.sId!);
    isUpdating.value = false;

    if (response['error'] != null) {
      generalAlert(
        message: response['error'],
        title: 'Error',
        function: Get.back,
        positiveText: 'Okay',
      );
      return;
    }

    receipt.value = null;
    receipt.value?.items = [];
    selectedCustomerType.value = 'Retail';
    amountPaid.clear();
    receipt.refresh();
    selectedCustomerController.clear();

    Get.back();

    if (salesModel.saleType != 'Order') {
      Get.to(() => SalesReceipt(salesModel: salesModel, type: ''));
      getSalesByDate(type: 'today', shop: _shopId!, status: 'hold');
      getNetAnalysis(type: 'today', shopId: _shopId!);
    }
  }

  // ─── print receipt dialog ──────────────────────────────────────────────

  Future<dynamic> _printReceipt(SaleModel saleModel) {
    return showDialog(
      context: Get.context!,
      builder: (_) => AlertDialog(
        title: const Text(
          'Print Receipt?',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('How many receipts to print?'),
            const SizedBox(height: 5),
            TextFormField(
              controller: receiptCoutController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10.0),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Get.back();
              Get.back();
            },
            child: Text(
              'NO',
              style: TextStyle(
                color: AppColors.mainColor,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          TextButton(
            onPressed: () {
              Get.back();
              Get.back();
              reprintReceipt(saleModel: saleModel);
            },
            child: Text(
              'YES PRINT',
              style: TextStyle(
                color: AppColors.mainColor,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> reprintReceipt({required SaleModel saleModel}) async {
    final count = int.tryParse(receiptCoutController.text) ?? 1;

    for (int i = 0; i < count; i++) {
      await _tryPrintSunmi(saleModel);
      await _tryPrintCs50(saleModel);
      await _printBluetoothTicket(saleModel);
    }
  }

  Future<void> _tryPrintSunmi(SaleModel saleModel) async {
    try {
      await Sunmi().printReceipt(
        saleModel: saleModel,
        receiptTitle: 'Cash Sale Receipt',
      );
    } catch (e) {
      print('Sunmi print skipped: $e');
    }
  }

  Future<void> _tryPrintCs50(SaleModel saleModel) async {
    try {
      await Cs50PrinterSetup().printReceipt(
        saleModel: saleModel,
        receiptTitle: 'Cash Sale Receipt',
      );
    } catch (e) {
      print('CS50 print skipped: $e');
    }
  }

  Future<void> _printBluetoothTicket(SaleModel saleModel) async {
    final shop = userController.currentUser.value?.primaryShop;
    final items = saleModel.items!
        .map((e) => {
              'name': '${e.product?.name} ${e.product?.measureUnit ?? ''}',
              'qty': e.quantity,
              'price': e.unitPrice,
            })
        .toList();

    final prefs = await SharedPreferences.getInstance();

    final paperSize = prefs.getString('printer_paper_size') ?? '58 mm';
    print("saleModel.extraCharges ${saleModel.extraCharges}");

    final ticket = await Get.find<PrinterController>().printSalesReceipt(
      items: items,
      storeName: shop?.name ?? 'Pointify',
      phone: shop?.contact ?? '',
      email: shop?.receiptemail ?? '',
      address: shop?.addressReceipt ?? '',
      paybill: shop?.paybillTill ?? '',
      paybillAccount: shop?.paybillAccount ?? '',
      paymentType: saleModel.paymentType ?? 'Cash',
      customer: saleModel.customerId?.name ?? '',
      date: saleModel.createdAt ?? '',
      receiptUrl: 'https://store.pointifypos.com',
      is80mm: paperSize == '80 mm',
      extraCharges: saleModel.extraCharges,
    );
    if (Platform.isIOS) {
      await Get.find<PrinterController>().printIosBleBytes(ticket);
      return;
    }

    final connected =
        await Get.find<PrinterController>().ensurePrinterConnected();
    if (!connected) {
      generalAlert(
        title: 'Printer Error',
        message: 'Could not connect to Bluetooth printer.',
        function: () {},
      );
      return;
    }

    await Future.delayed(const Duration(milliseconds: 800));
    final result = await PrintBluetoothThermal.writeBytes(ticket);
    print('Bluetooth print result: $result');

    await Future.delayed(const Duration(seconds: 2));
    await PrintBluetoothThermal.disconnect;
  }
  // ─── credit-payment ask dialog ─────────────────────────────────────────

  void askCreditPaidAmount() {
    creditPaidAmountController.clear();

    showDialog(
      context: Get.context!,
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        child: Stack(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 4),
                  const Text(
                    'Any Payment Received?',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Enter amount paid (leave empty if none).',
                    style: TextStyle(fontSize: 13, color: Colors.grey),
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: creditPaidAmountController,
                    keyboardType: TextInputType.number,
                    autofocus: true,
                    decoration: InputDecoration(
                      hintText: 'Amount paid',
                      prefix: Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: Text(
                          userController
                                  .currentUser.value?.primaryShop?.currency ??
                              '',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 12,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.mainColor,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      onPressed: () async {
                        final entered = creditPaidAmountController.text.trim();
                        amountPaid.text = entered.isEmpty ? '0.0' : entered;

                        getTotalCredit();
                        Get.back();
                        Get.back();

                        await saveReceipt(status: 'cashed');
                      },
                      child: const Text(
                        'Save',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Positioned(
              right: 8,
              top: 8,
              child: GestureDetector(
                onTap: Get.back,
                child: const Icon(
                  Icons.close,
                  size: 20,
                  color: Colors.grey,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── due-date picker ───────────────────────────────────────────────────

  void showSaleDatePicker() {
    showModalBottomSheet(
      context: Get.context!,
      backgroundColor: Colors.white,
      builder: (context) => Container(
        color: Colors.white,
        height: MediaQuery.of(context).size.height * 0.50,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.all(3.0),
              child: Text(
                'Select Due date',
                style: TextStyle(
                  color: Colors.black,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            SizedBox(
              height: MediaQuery.of(context).size.height * 0.3,
              child: CupertinoDatePicker(
                mode: CupertinoDatePickerMode.dateAndTime,
                onDateTimeChanged: (value) {
                  receipt.value!.dueDate = value.toIso8601String();
                  receipt.refresh();
                },
                initialDateTime: DateTime.now(),
                minimumYear: 2022,
                maximumYear: 2050,
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text(
                    'CANCEL',
                    style: TextStyle(
                      color: AppColors.mainColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                TextButton(
                  onPressed: () {
                    receipt.value!.dueDate ??= DateTime.now().toIso8601String();
                    Get.back();
                    askCreditPaidAmount();
                  },
                  child: Text(
                    'OK',
                    style: TextStyle(
                      color: AppColors.mainColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 2),
          ],
        ),
      ),
    );
  }

  // ─── analytics / charts ────────────────────────────────────────────────

  Future<void> getDailySalesGraph({String? fromDate, String? toDate}) async {
    dailySales.clear();

    if (fromDate == null) {
      final y = DateTime.now().year;
      fromDate = DateFormat('MMM-dd').format(DateTime(y, 1, 1));
      toDate = DateFormat('MMM-dd').format(DateTime(y, 12, 31));
    }

    final response = await SalesService.getSales(
      shopId: _shopId,
      fromDate: fromDate,
      toDate: toDate,
    );

    final sales = (response['sales'] as List<dynamic>?)
            ?.map((e) => SaleModel.fromJson(e))
            .toList() ??
        [];

    for (final s in sales) {
      final day =
          DateFormat('MMM-dd').format(DateTime.parse(s.createdAt!).toUtc());
      final i = dailySales.indexWhere((e) => e.x == day);
      final amount = s.totalWithDiscount!.toDouble();
      if (i == -1) {
        dailySales.add(ChartData(day, amount));
      } else {
        dailySales[i] = ChartData(day, dailySales[i].y + amount);
      }
    }
  }

  Future<void> getOrders({String? fromDate, String? toDate}) async {
    final response = await SalesService.getOrders(
      fromDate: fromDate,
      toDate: toDate,
      shop: _shopId,
    );
    if (response == null || response['data'] == null) return;

    orders.value = (response['data'] as List<dynamic>)
        .map((e) => OrderItem.fromJson(e))
        .toList();
  }

  num? getSaleAmount({SaleModel? saleModel}) {
    if (saleModel == null) return null;
    switch (cashsalesfilterSelected.value) {
      case 'cash':
        return saleModel.amountPaid;
      case 'mpesa':
        return saleModel.mpesatotal;
      case 'bank':
        return saleModel.banktotal;
      default:
        return null;
    }
  }

  Future<SaleModel> getSingleSaleById({required String id}) async {
    final response = await SalesService.getSingleSaleById(id: id);
    final saleModel = SaleModel.fromJson(response);
    currentReceipt.value = saleModel;
    currentReceipt.refresh();
    return saleModel;
  }

  Future<void> getGraphSales(
      {String? fromDate = '', String? toDate = ' '}) async {
    final Shop shop = userController.currentUser.value!.primaryShop!;
    final salesResponse = await SalesService.getSales(
      shopId: shop.id,
      fromDate: fromDate,
      toDate: toDate,
    );

    final sales = (salesResponse['data'] as List)
        .map((e) => SaleModel.fromJson(e))
        .toList();

    // Sales per month.
    salesdata.value = _emptyMonthlySeries();
    for (final s in sales) {
      final month =
          DateFormat('MMM').format(DateTime.parse(s.createdAt!).toUtc());
      final i = salesdata.indexWhere((e) => e.year == month);
      final value = s.totalWithDiscount!.toDouble();
      if (i == -1) {
        salesdata.add(SalesData(month, value));
      } else {
        salesdata[i] = SalesData(month, salesdata[i].sales + value);
      }
    }
    salesdata.refresh();

    // Profit per month.
    profitdata.value = _emptyMonthlySeries();
    for (final s in sales) {
      final month =
          DateFormat('MMM').format(DateTime.parse(s.createdAt!).toUtc());
      final totalBuyingPrice = s.items!.fold<double>(
        0,
        (sum, e) => sum + (e.product!.buyingPrice! * e.quantity!),
      );
      final profit = s.totalWithDiscount! - totalBuyingPrice;
      final i = profitdata.indexWhere((e) => e.year == month);
      if (i == -1) {
        profitdata.add(SalesData(month, profit.toDouble()));
      } else {
        profitdata[i] = SalesData(month, profitdata[i].sales + profit);
      }
    }
    profitdata.refresh();

    // Expenses per month.
    final expenseResponse = await ExpenseController().getExpenses(
      shop: shop.id,
      fromDate: fromDate,
      toDate: toDate,
    );
    expensesdata.value = _emptyMonthlySeries();
    final expenses = (expenseResponse as List)
        .map((e) => CashFlowModel.fromJson(e))
        .toList();

    for (final ex in expenses) {
      final month =
          DateFormat('MMM').format(DateTime.parse(ex.createAt!).toUtc());
      final amount = double.parse(ex.amount!.toString());
      final i = expensesdata.indexWhere((e) => e.year == month);
      if (i == -1) {
        expensesdata.add(SalesData(month, amount));
      } else {
        expensesdata[i] = SalesData(month, expensesdata[i].sales + amount);
      }

      // Net profit for that month.
      final pi = profitdata.indexWhere((e) => e.year == month);
      final ei = expensesdata.indexWhere((e) => e.year == month);
      if (pi != -1 && ei != -1) {
        netProfit.value =
            (profitdata[pi].sales - expensesdata[ei].sales).toInt();
      }
    }
  }

  Future<void> getSalesByAttendants({
    String? fromDate = '',
    String? toDate = '',
    String? attendantId,
  }) async {
    productSalesByAttendantsAnalysis.clear();

    final sales = await SalesService.getMostSellingProduct(
      shopId: _shopId,
      fromDate: fromDate,
      toDate: toDate,
      attendantId: _attendantId,
    );

    for (final e in sales) {
      final name = e['attendantName'] as String;
      final value = double.parse(e['totalSales'].toString());
      final i = productSalesByAttendantsAnalysis.indexWhere((c) => c.x == name);
      if (i == -1) {
        productSalesByAttendantsAnalysis.add(ChartData(name, value));
      } else {
        productSalesByAttendantsAnalysis[i] = ChartData(
          name,
          productSalesByAttendantsAnalysis[i].y + value,
        );
      }
    }
    productSalesByAttendantsAnalysis.refresh();
  }

  Future<void> getProductComparison({
    String? fromDate = '',
    String? toDate = '',
  }) async {
    productsDatadata.clear();
    productSalesAnalysis.clear();

    final sales = await SalesService.getMostSellingProduct(
      shopId: _shopId,
      fromDate: fromDate,
      toDate: toDate,
    );

    for (final e in sales) {
      final name = e['product'] as String;
      final qty = (e['totalQuantity'] as num).toDouble();

      final i = productSalesAnalysis.indexWhere((c) => c.x == name);
      if (i == -1) {
        productSalesAnalysis.add(ChartData(name, qty));
      } else {
        productSalesAnalysis[i] =
            ChartData(name, productSalesAnalysis[i].y + qty);
      }

      productsDatadata.add(ChartData(name, qty));
    }

    productsDatadata.refresh();
    productSalesAnalysis.refresh();
    filterTitle.refresh();
  }

  // ─── sales by date / pagination ────────────────────────────────────────

  Future<void> getSalesByDate({
    String? fromDate = '',
    String? toDate = '',
    String? dueDate = '',
    String? paymentTag = '',
    String? type = '',
    String? order = '',
    String? status = '',
    String? paymentType = '',
    String? receiptNo = '',
    String? saleType = '',
    bool? production = false,
    bool? loadMore = false,
    String? customerid = '',
    String? shop = '',
  }) async {
    if (loadingSales.value) return;

    if (loadMore == true) {
      loadingMoreSales.value = true;
    } else {
      salesPaginageSettings['page'] = 1;
      loadingSales.value = true;
      allSalesFiltered.clear();
      allSales.clear();
      if (status == 'hold') {
        onholdSales.clear();
        refresh();
      } else {
        todaySales.clear();
        creditSales.clear();
      }
    }

    if (type == 'today') {
      fromDate = _todayDate();
      toDate = _todayDate();
    }

    final response = await SalesService.getSales(
      fromDate: fromDate,
      saleType: saleType,
      dueDate: dueDate,
      toDate: toDate,
      paymentTag: paymentTag,
      order: order,
      production: production,
      receiptNo: receiptNo,
      status: status,
      shopId: shop,
      paymentType: paymentType,
      customerId: customerid,
      page: salesPaginageSettings['page'] ?? 1,
      limit: 50,
    );

    loadingMoreSales.value = false;
    loadingSales.value = false;

    if (response['error'] != null) {
      showSnackBar(message: response['error'], color: Colors.red);
      return;
    }

    final salesObjects = (response['data'] as List<dynamic>)
        .map((e) => SaleModel.fromJson(e))
        .toList();

    if (loadMore == true) {
      allSales.addAll(salesObjects);
    } else {
      allSales.value = salesObjects;
    }
    allSalesFiltered.value = allSales;
    salesPaginageSettings['total'] = response['total'];
    salesPaginageSettings['page'] = response['currentPage'];
    salesPaginageSettings['totalPages'] = response['totalPages'];

    if (status == 'hold') {
      onholdSales.addAll(salesObjects);
    } else {
      creditSales.addAll(
        salesObjects.where(
          (s) => s.paymentType == 'credit' && (s.outstandingBalance ?? 0) > 0,
        ),
      );
    }
  }

  Future<void> getProductSales({
    String? fromDate = '',
    String? toDate = '',
    String? product = '',
  }) async {
    loadingSales.value = true;
    productSaleRceipts.clear();

    final response = await SalesService.getProductSales(
      fromDate: fromDate,
      toDate: toDate,
      product: product,
    );
    loadingSales.value = false;

    if (response['error'] != null) {
      showSnackBar(message: response['error'], color: Colors.red);
      return;
    }

    productSaleRceipts.addAll(
      (response['sales'] as List<dynamic>)
          .map((e) => SaleItem.fromJson(e))
          .toList(),
    );
    productSaleRceipts.refresh();
  }

  // ─── net analysis (home cards) ─────────────────────────────────────────

  Future<void> getNetAnalysis({
    required String shopId,
    String? fromDate = '',
    String? toDate = '',
    String? type,
    String? duesales = '',
  }) async {
    if (type == 'today') {
      fromDate = _todayDate();
      toDate = _todayDate();
    }

    final response = await SalesService.netAnalysis(
      fromDate: fromDate,
      toDate: toDate,
      shopId: _shopId,
      type: type,
      duesales: duesales,
    );

    if (response['error'] != null) {
      showSnackBar(message: response['error'], color: Colors.red);
    }

    homecards.clear();
    if (response['totalProfitAndSalesValue'] == null) return;

    final data = response['totalProfitAndSalesValue'] as Map<String, dynamic>;
    final expensedata = response['totalExpenses'] as Map<String, dynamic>;
    final badstockdata = response['badStockValue'] as Map<String, dynamic>;

    homecards.add(HomeCard(
      total: double.parse(data['totalSales'].toString()),
      name: 'Today Sales',
      key: 'sales',
      color: AppColors.secondary_color,
      iconData: Icons.auto_graph_rounded,
    ));

    if (verifyPermission(category: 'sales', permission: 'view_profit')) {
      final net = double.parse(response['net'].toStringAsFixed(2));
      final taxes = double.parse(response['totalTaxes'].toStringAsFixed(2));
      homecards.add(HomeCard(
        total: net + taxes,
        name: 'Today Profit',
        key: 'profit',
        color: AppColors.button_color,
        iconData: Icons.auto_graph_rounded,
      ));
    }

    homecards.add(HomeCard(
      total: double.parse(response['creditTotals'].toString()),
      name: 'Today Dues',
      key: 'dues',
      color: AppColors.mainColor,
      iconData: Icons.auto_graph_rounded,
    ));

    if (verifyPermission(category: 'expenses', permission: 'view')) {
      homecards.add(HomeCard(
        total: double.parse(expensedata['totalExpenses'].toString()),
        name: 'Today Expenses',
        key: 'expenses',
        color: AppColors.secondary_color,
        iconData: Icons.auto_graph_rounded,
      ));
    }

    analysis.value = Analysis(
      totalExpenses: expensedata['totalExpenses'],
      totalPurchases: data['totalPurchases'] ?? 0,
      totalSales: data['totalSales'],
      debtPaid: response['debtPaid'] ?? 0,
      totalCashSales: data['totalCashSales'] ?? 0,
      creditTotals: response['creditTotals'] ?? 0,
      totalTaxes: isInteger(data['totalTaxes'])
          ? data['totalTaxes'].toDouble()
          : data['totalTaxes'] ?? 0.0,
      gross: response['gross'],
      net: isInteger(response['net'])
          ? response['net'].toDouble()
          : response['net'] ?? 0.0,
      profitOnSales: data['totalProfit'],
      badStockValue: badstockdata['badStockValue'],
    );
  }

  // ─── returns ───────────────────────────────────────────────────────────

  Future<void> returnSale({
    String? saledId,
    List<dynamic>? returnItems,
    bool deleteReceipt = false,
    String from = 'sales',
  }) async {
    try {
      LoadingDialog.showLoadingDialog(
        context: Get.context!,
        title: deleteReceipt ? 'Deleting receipt...' : 'Returning receipt...',
        key: _keyLoader,
      );

      final i = allSales.indexWhere((e) => e.sId == saledId);
      if (i != -1) allSales.removeAt(i);

      final returnData = {
        'saleid': saledId,
        'attendantId': _attendantId,
        'shopId': _shopId,
        'items': returnItems,
        'reason': 'test',
        'deleteReceipt': deleteReceipt,
      };
      print(returnData);

      final response = await SalesService.returnItem(returnData);

      // Auto-close current-receipt view if fully returned.
      if (currentReceipt.value != null && returnItems != null) {
        final returnQty = returnItems.fold<double>(
          0,
          (sum, e) => sum + (e['quantity'] as num),
        );
        final totalQty = currentReceipt.value!.items!.fold<double>(
          0,
          (sum, e) => sum + (e.quantity ?? 0),
        );
        if (returnQty == totalQty) Get.back();
      }

      if (response['error'] != null) {
        Get.back();
        generalAlert(title: 'Error', message: response['error']);
        return;
      }

      if (from == 'customerpage') {
        Get.back();
      }

      if (from == 'productsales') {
        Get.back();
        Get.find<ReportsController>().productsWisereport(
          fromDate: _todayDate(),
          toDate: _todayDate(),
          shop: _shopId!,
          showLoader: false,
        );
        return;
      }

      // Refresh dashboards.
      final activeFilter = Get.find<ReportsController>().activeFilter.value;
      getSalesByDate(
        type: activeFilter,
        fromDate: filterStartDate.value,
        toDate: filterEndDate.value,
        status: 'cashed',
        shop: _shopId!,
      );
      getNetAnalysis(
        type: activeFilter,
        fromDate: filterStartDate.value,
        toDate: filterEndDate.value,
        shopId: _shopId!,
      );

      if ((deleteReceipt || response['deleteReceipt'] != null) &&
          from != 'productsales') {
        Get.back();
      } else if (response['deleted'] == true) {
        Get.back();
        return;
      } else {
        currentReceipt.value = SaleModel.fromJson(response['saleReturn']);
        currentReceipt.refresh();
        Get.back();
      }

      generalAlert(
        title: 'Return receipt',
        message: 'receipt returned successfully',
      );
    } catch (e) {
      Get.back();
      showSnackBar(message: e.toString(), color: Colors.red);
    } finally {
      Get.find<ProductController>().getProductsBySort(type: 'all');
    }
  }

  Future<void> payCredit({
    required SaleModel salesBody,
    required int amount,
  }) async {
    LoadingDialog.showLoadingDialog(
      context: Get.context!,
      title: 'Please wait...',
      key: _keyLoader,
    );

    final response = await SalesService.payCredit({
      'saleId': salesBody.sId,
      'paymentAmount': amount,
      'paymentType': paynowMethod.value,
      'mpesaCode': mpesaCode.text,
      'attendantId': _attendantId,
    });

    Get.back();

    if (response['error'] != null) {
      showSnackBar(message: response['error'], color: Colors.red);
      return;
    }

    currentReceipt.value?.outstandingBalance =
        toDouble(response['outstandingBalance']);
    currentReceipt.refresh();
    amountController.clear();
  }

  Future<void> getReturns({
    Customer? customerModel,
    SaleModel? salesModel,
    Product? product,
    String? fromDate,
    required String shopid,
    String? type,
    String? toDate,
  }) async {
    if (loadingSales.value) return;

    currentReceiptReturns.clear();
    allSalesReturns.clear();
    loadingSales.value = true;

    final response = await SalesService.getSalesRetuns(
      salesModel: salesModel,
      customerModel: customerModel,
      product: product,
      type: type,
      fromDate: fromDate,
      shopid: shopid,
      toDate: toDate,
    );

    loadingSales.value = false;
    List res = response;
    allSalesReturns.addAll(
      res.map((e) => SaleRetuns.fromJson(e)).toList(),
    );
    allSalesReturns.refresh();
  }

  Future<void> deleteSaleReturn(String saleReturnId) async {
    allSalesReturns.removeWhere((e) => e.sId == saleReturnId);
    Get.back();
    await SalesService.deleteSaleReturn(saleReturnId);
  }

  Future<void> getSalesByProductId({
    Product? product,
    String? fromDate,
    String? toDate,
  }) async {
    productMonthSales.clear();

    fromDate ??= _todayDate();
    toDate ??= DateFormat(_dateFmt)
        .format(DateTime.now().add(const Duration(days: 1)));

    final response = await SalesService.getProductSalesGroupedByMonth(
      startDate: fromDate,
      endDate: toDate,
      product: product?.sId,
      shopId: _shopId,
    );

    productMonthSales.addAll(
      (response as List).map<Map<String, dynamic>>((e) => {
            'month': e['month'],
            'sales': e['sales'],
            'count': e['count'],
            'totalQuantity': e['totalQuantity'],
          }),
    );
    productMonthSales.refresh();
  }

  Future<void> voidReceipt(SaleModel salesModel) async {
    LoadingDialog.showLoadingDialog(
      context: Get.context!,
      title: 'Voiding receipt...',
      key: _keyLoader,
    );
    isVoiding.value = true;

    final response = await SalesService.voidSale(salesModel.sId!);
    Get.back();

    if (response['error'] != null) {
      showSnackBar(message: response['error'], color: Colors.red);
      return;
    }

    isVoiding.value = false;

    final i = onholdSales.indexWhere((e) => e.sId == salesModel.sId);
    if (i != -1) {
      showSnackBar(message: response['message'], color: Colors.green);
      onholdSales.removeAt(i);
      onholdSales.refresh();
    } else {
      Get.back();
    }
  }

  Future<void> sharePdf(SaleModel salesModel) async {
    final pdfBytes = await salesReceipt(salesModel, '');
    final dir = await getTemporaryDirectory();
    final path = '${dir.path}/${salesModel.sId!}.pdf';

    await File(path).writeAsBytes(pdfBytes);
    Share.shareXFiles([XFile(path)], text: 'Poinitify receipt');
  }

  Future<void> sendReportEmail({
    String? fromDate = '',
    String? toDate = '',
    String? email = '',
    String? shop = '',
    String? paymentTag = '',
    String? status = '',
  }) async {
    LoadingDialog.showLoadingDialog(
      context: Get.context!,
      title: 'Please wait...',
      key: _keyLoader,
    );

    final response = await SalesService.sendReportEmail(
      fromDate: fromDate,
      toDate: toDate,
      email: email,
      shop: shop,
      paymentTag: paymentTag,
      status: status,
    );

    Get.back();
    Get.back();
    generalAlert(message: response['message'], title: 'Success');
    print(response);
  }

  void deleteOrder(OrderItem salesModel) {
    orders.removeWhere((e) => e.sId == salesModel.sId);
    SalesService.deleteOrder(salesModel.sId!);
  }

  Future<void> getDuesByDate({
    required String shop,
    required String dueDate,
  }) async {
    final response = await SalesService.getDuesByDate(
      shop: shop,
      dueDate: dueDate,
    );

    if (response['error'] != null) {
      showSnackBar(message: response['error'], color: Colors.red);
      return;
    }

    duesByDate.value = response['dues'];
    duesByDate.refresh();
  }
}

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/productcontroller.dart';
import 'package:pointify/controllers/reports_controller.dart';
import 'package:pointify/controllers/shopcontroller.dart';
import 'package:pointify/controllers/suppliercontroller.dart';
import 'package:pointify/screens/suppliers/suppliers_page.dart';

import '../functions/functions.dart';
import '../main.dart';
import '../models/invoice.dart';
import '../models/payment.dart';
import '../models/product.dart';
import '../models/supplier.dart';
import '../screens/receipts/view/invoice_screen.dart';
import '../screens/suppliers/create_suppliers.dart';
import '../services/purchase_service.dart';
import '../utils/colors.dart';
import '../widgets/alert.dart';
import '../widgets/loading_dialog.dart';
import '../widgets/major_title.dart';
import '../widgets/minor_title.dart';
import '../widgets/snackBars.dart';

class PurchaseController extends GetxController {
  Rxn<Invoice> invoice = Rxn(null);
  RxList<Invoice> invoices = RxList([]);
  RxList<Invoice> filteredInvoices = RxList([]);
  RxDouble balance = RxDouble(0);
  RxString balanceText = RxString("Credit Balance");
  RxInt purchasedTotal = RxInt(0);
  RxList<Invoice> creditPurchases = RxList([]);
  RxBool showReceipt = RxBool(false);
  TextEditingController emailController = TextEditingController();
  TextEditingController searchInvoiceController = TextEditingController();
  TextEditingController mpesaTransId = TextEditingController();
  TextEditingController bankTransId = TextEditingController();
  Rxn<Supplier> selectedSupplier = Rxn(null);
  Rxn<Invoice> currentInvoice = Rxn(null);
  RxList<Invoice> invoicereturns = RxList([]);
  RxList<Payment> paymenHistory = RxList([]);

  RxList paymentMethods = RxList(["Cash", "Credit", "Mpesa", "Bank"]);
  RxList reportpaymentMethods = RxList(["Cash", "Bank", "Mpesa"]);
  RxString selectedpaymentMethod = RxString("Cash");
  RxBool returningIvoiceLoad = RxBool(false);
  RxBool isLoadingPurchases = RxBool(false);
  RxBool isReturnning = RxBool(false);
  RxBool getPurchaseByDateLoad = RxBool(false);
  RxBool getPurchaseOrderItemLoad = RxBool(false);
  TextEditingController selectedSupplierController = TextEditingController();
  TextEditingController textEditingControllerAmount = TextEditingController();
  ProductController productController = Get.find<ProductController>();
  ShopController shopController = Get.find<ShopController>();
  final GlobalKey<State> _keyLoader = GlobalKey<State>();

  var filterStartDate = DateFormat("yyy-MM-dd").format(DateTime.now()).obs;
  var filterEndDate = DateFormat("yyy-MM-dd").format(DateTime.now()).obs;
  RxMap totals = {"cash": 0.0, "bank": 0.0, "mpesa": 0.0}.obs;
  Rx bankTotal = 0.obs;
  Rx cashTotal = 0.obs;
  RxString selectedItem = 'cash'.obs;

  RxInt page = 1.obs;
  final int limit = 20;

  RxBool hasMore = true.obs;
  RxBool isLoadingMore = false.obs;

  getfilterTotals() {
    totals["cash"] = invoices
        .where((element) => element.paymentType == "cash")
        .map((e) => e.items!.fold(
            0.0,
            (previousValue, element) =>
                previousValue + (element.unitPrice! * element.quantity!)))
        .fold<double>(0.0, (value, element) => value + (element ?? 0.0));

    totals["bank"] = invoices
        .where((element) => element.paymentType == "bank")
        .map((e) => e.items!.fold(
            0.0,
            (previousValue, element) =>
                previousValue + (element.unitPrice! * element.quantity!)))
        .fold<double>(0.0, (value, element) => value + (element ?? 0.0));

    totals["mpesa"] = invoices
        .where((element) => element.paymentType == "mpesa")
        .map((e) => e.items!.fold(
            0.0,
            (previousValue, element) =>
                previousValue + (element.unitPrice! * element.quantity!)))
        .fold<double>(0.0, (value, element) => value + (element ?? 0.0));
  }

  createPurchase() async {
    LoadingDialog.showLoadingDialog(
        context: Get.context!, title: "Please wait...", key: _keyLoader);
    var items = invoice.value?.items!
        .map((e) => {
              "product": e.product?.sId,
              "quantity": e.quantity,
              "unitPrice": e.unitPrice,
              "sellingPrice": e.product?.sellingPrice,
              "lineDiscount": e.lineDiscount,
              "attendantId": userController.currentUser.value?.attendantId?.sId
            })
        .toList();

    var totalPaid = int.parse(textEditingControllerAmount.text.isEmpty
        ? "0"
        : textEditingControllerAmount.text.trim());
    var paymentType = selectedpaymentMethod.value.toLowerCase();
    if (selectedSupplier.value == null && paymentType == "credit") {
      generalAlert(
          title: "You have to select supplier to purchase on credit ",
          function: () {
            Get.to(() => Scaffold(
                  appBar: AppBar(
                    backgroundColor: Colors.white,
                    titleSpacing: 0.0,
                    elevation: 0.3,
                    centerTitle: false,
                    leading: IconButton(
                      onPressed: () {
                        Get.back();
                      },
                      icon: const Icon(
                        Icons.arrow_back_ios,
                        color: Colors.black,
                      ),
                    ),
                    title: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        majorTitle(
                            title: "Supplier", color: Colors.black, size: 16.0),
                        minorTitle(
                            title:
                                "${userController.currentUser.value!.primaryShop?.name}",
                            color: Colors.grey)
                      ],
                    ),
                    actions: [
                      if (verifyPermission(
                          category: "suppliers", permission: "manage"))
                        InkWell(
                          onTap: () {
                            Get.to(() => CreateSuppliers(
                                  page: "createPurchase",
                                ));
                          },
                          child: Padding(
                            padding: const EdgeInsets.all(10),
                            child: Container(
                              padding: const EdgeInsets.fromLTRB(5, 2, 5, 2),
                              decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: (BorderRadius.circular(10)),
                                  border: Border.all(
                                      color: AppColors.mainColor, width: 1)),
                              child: Center(
                                child: majorTitle(
                                    title: "Add Supplier",
                                    color: AppColors.mainColor,
                                    size: 12.0),
                              ),
                            ),
                          ),
                        )
                    ],
                  ),
                  body: Suppliers(
                    from: "purchases",
                    function: () {
                      generalAlert(
                          title: "Credit purchase",
                          message:
                              "Are you sure you want to make credit purchase?",
                          function: () {
                            Get.find<PurchaseController>().createPurchase();
                          });
                    },
                  ),
                ));
          });
      return;
    }

    var invoiceData = {
      "purchase": {
        "shopId": userController.currentUser.value?.primaryShop?.id,
        "supplierId": selectedSupplier.value?.id,
        "attendantId": userController.currentUser.value?.attendantId?.sId,
        "paymentType": paymentType,
      },
      "purchaseItems": items,
      "amountpaid": totalPaid,
      'trackBatches':
          userController.currentUser.value?.primaryShop?.allowbatchtracking ??
              false,
      "useWarehouse":
          userController.currentUser.value?.primaryShop?.useWarehouse ?? false
    };
    print(invoiceData);

    var response = await PurchaseService.createPurchase(invoiceData);
    Get.back();
    if (response["error"] != null) {
      showSnackBar(message: response["error"], color: Colors.red);
      Get.back();
      return;
    }
    Get.back();
    Invoice invoiceDataRes = Invoice.fromJson(response["purchase"]);
    Get.back();
    Get.to(() => InvoiceScreen(
          invoice: invoiceDataRes,
          type: "",
        ));
    selectedSupplier.value = null;
    selectedpaymentMethod.value = "Cash";
    invoice.value = null;
    selectedSupplierController.clear();
    productController.getProductsAnalysis(type: "all");
    productController.getProductsBySort(type: "all");
    textEditingControllerAmount.clear();
  }

  getPurchases({
    String? supplier = "",
    bool? onCredit,
    String? fromDate = "",
    String? shopid = "",
    String? toDate = "",
    bool loadMore = false,
  }) async {
    if (!loadMore) {
      page.value = 1;
      hasMore.value = true;
      invoices.clear();
      isLoadingPurchases.value = true;
    } else {
      isLoadingMore.value = true;
    }
    if (!hasMore.value) return;
    var response = await PurchaseService.getPurchases(
      fromDate: fromDate,
      toDate: toDate,
      shopId: shopid,
      supplier: supplier,
      paymentType: onCredit == true ? "credit" : "cash",
      page: page.value,
      limit: limit,
    );

    List<dynamic> purchasesresponse = response['purchases'];

    if (purchasesresponse.length < limit) {
      hasMore.value = false;
    }

    invoices.addAll(
      purchasesresponse.map((e) => Invoice.fromJson(e)).toList(),
    );

    if (onCredit == true) {
      filteredInvoices.value = invoices;
    } else {
      filteredInvoices.value =
          invoices.where((p0) => p0.paymentType == "cash").toList();
      getfilterTotals();
      selectedItem.value = 'cash';
    }

    page.value++;

    isLoadingPurchases.value = false;
    isLoadingMore.value = false;
  }

  //
  getReturnedPurchases(
      {String? supplier = "",
      String? fromDate = "",
      String? shopid = "",
      String? toDate = ""}) async {
    invoices.clear();
    isLoadingPurchases.value = true;
    List<dynamic> response = await PurchaseService.getReturnedPurchases(
        fromDate: fromDate, toDate: toDate, shopId: shopid, supplier: supplier);
    isLoadingPurchases.value = false;
    invoices.addAll(response.map((e) => Invoice.fromJson(e)).toList());
    filteredInvoices.value =
        invoices.where((p0) => p0.paymentType == "cash").toList();
    getfilterTotals();
    selectedItem.value = 'cash';
  }

  addNewPurchase(Product product) {
    final DateTime now = DateTime.now();
    final DateFormat formatter = DateFormat('yyyy-MM-dd');
    final String formatted = formatter.format(now);
    InvoiceItem value = InvoiceItem(
        product: product,
        quantity: 1,
        attendantId: userController.currentUser.value?.id ?? "",
        lineDiscount: 0,
        createdAt: formatted,
        unitPrice: product.buyingPrice);
    textEditingControllerAmount.text = "";
    var index = -1;
    if (invoice.value != null) {
      index = invoice.value!.items!
          .indexWhere((element) => element.product!.sId == value.product!.sId);
    }
    if (index == -1) {
      if (invoice.value == null) {
        invoice.value = Invoice(items: [value]);
      } else {
        invoice.value = Invoice(items: [...?invoice.value!.items, value]);
      }
      index = invoice.value!.items!
          .indexWhere((element) => element.product!.sId == value.product!.sId);
    } else {
      var data = invoice.value!.items![index].quantity! + 1;
      invoice.value?.items![index].quantity = data;
    }
    calculateAmount(index: index);
    invoice.refresh();
  }

  decrementItem(index) {
    if (invoice.value!.items![index].quantity! > 1) {
      invoice.value?.items![index].quantity =
          invoice.value!.items![index].quantity! - 1;
      invoice.refresh();
    }
    calculateAmount(index: index);
  }

  incrementItem(index) {
    invoice.value?.items![index].quantity =
        invoice.value!.items![index].quantity! + 1;
    invoice.refresh();

    calculateAmount(index: index);
  }

  calculateAmount({int? index}) {
    double total = invoice.value!.items!.fold(
        0,
        (previousValue, element) =>
            previousValue + (element.quantity! * element.unitPrice!));
    invoice.value!.totalAmount = total;
    double paid = textEditingControllerAmount.text.isEmpty
        ? 0.0
        : double.parse(textEditingControllerAmount.text);
    balance.value = total;
    var balancee = total;
    if (paid > total) {
      total = total;
      balancee = 0;
      balance.value = paid - total;
      balanceText.value = "Change";
    } else if (paid > 0) {
      balance.value = paid - total;
      total = paid;
      balancee = balancee - paid;
      balanceText.value = "Credit Balance";
    } else if (paid == 0) {
      balancee = total;
      balance.value = total;
      balanceText.value = "Balance";
      // total = 0;
    }
    // invoice.value!.totalAmount = total;
    balance.refresh();
    if (index == -1) {
      return;
    }
    invoice.refresh();
  }

  removeFromList(index) {
    invoice.value?.items!.removeAt(index);
    invoice.refresh();
    calculateAmount(index: -1);
  }

  calculateSalesAmount() {
    double subTotal = 0;
    for (var element in invoice.value!.items!) {
      subTotal = subTotal + (element.unitPrice! * element.quantity!);
    }
    return subTotal;
  }

  calculatePurchasemount() {
    var subTotal = 0;
    return subTotal;
  }

  Future<void> returnInvoiceItem(List<InvoiceItem> items,
      {deleteReceipt = false, String invoiceType = ''}) async {
    var returnData = {
      "purchaseId": currentInvoice.value?.sId,
      "invoiceType": invoiceType,
      "items": items
          .map((e) => {"product": e.product?.sId, "quantity": e.quantity})
          .toList(),
      "reason": "test reason",
      "deleteReceipt": deleteReceipt
    };

    LoadingDialog.showLoadingDialog(
        context: Get.context!, title: "Please wait...", key: _keyLoader);
    var response = await PurchaseService.createInvoiceReturn(returnData);
    Get.back();
    if (response["error"] != null) {
      generalAlert(
        title: "Error",
        message: response["error"],
      );
      return;
    }
    productController.getProductsAnalysis(type: "all");
    if (response["deleteReceipt"] != null &&
        response["deleteReceipt"] == true) {
      Get.back();
      ReportsController reportsController = Get.find<ReportsController>();
      getPurchases(
          shopid: userController.currentUser.value!.primaryShop!.id!,
          fromDate: reportsController.filterStartDate.value,
          onCredit:
              currentInvoice.value?.paymentType == "credit" ? true : false,
          toDate: reportsController.filterEndDate.value);
    } else {
      invoices.refresh();
      currentInvoice.value = Invoice.fromJson(response);

      currentInvoice.refresh();
    }

    getReturnedPurchases(
        fromDate: Get.find<ReportsController>().filterStartDate.value,
        toDate: Get.find<ReportsController>().filterEndDate.value,
        shopid: userController.currentUser.value!.primaryShop!.id!);
  }

  paySupplierCredit({required String amount, required Invoice invoice}) async {
    var data = {
      "purchaseId": invoice.sId,
      "paymentAmount": amount,
      "attendantId": userController.currentUser.value?.attendantId
    };
    var response = await PurchaseService.createPayment(data);
    Get.find<SupplierController>().amountController.clear();
    if (response["error"] != null) {
      generalAlert(
        title: "Error",
        message: response["error"],
      );
      return;
    } else {
      invoices.refresh();
      getPurchases(onCredit: true, supplier: invoice.supplierId!.id);
      currentInvoice.value?.outstandingBalance = response['outstandingBalance'];
      currentInvoice.refresh();
    }
  }

  Future<void> getReturns({Supplier? supplier, Invoice? invoice}) async {
    invoicereturns.clear();
    if (returningIvoiceLoad.isTrue) {
      return;
    }
    returningIvoiceLoad.value = true;
    List<dynamic> response =
        await PurchaseService.getReturns(invoice: invoice, supplier: supplier);
    returningIvoiceLoad.value = false;
    List<Invoice> invoiceReturn =
        response.map((e) => Invoice.fromJson(e)).toList();
    invoicereturns.addAll(invoiceReturn);
  }

  void sendReportEmail({
    String? fromDate = "",
    String? toDate = "",
    String? email = "",
    String? shop = "",
    String? paymentTag = "",
    String? status = "",
  }) async {
    LoadingDialog.showLoadingDialog(
      context: Get.context!,
      title: "Please wait...",
      key: _keyLoader,
    );
    var response = await PurchaseService.sendReportEmail(
        fromDate: fromDate,
        toDate: toDate,
        email: email,
        shop: shop,
        paymentTag: paymentTag,
        status: status);
    Get.back();
    Get.back();
    generalAlert(message: response["message"], title: "Success");
    print(response);
  }
}

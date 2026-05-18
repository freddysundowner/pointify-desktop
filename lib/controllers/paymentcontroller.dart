import 'package:get/get.dart';
import 'package:pointify/controllers/customercontroller.dart';
import 'package:pointify/controllers/salescontroller.dart';
import 'package:pointify/models/customer.dart';
import 'package:pointify/services/payment.dart';

import '../models/awards.dart';
import '../models/payment.dart';
import '../models/payment_methods.dart';

class PaymentController extends GetxController {
  RxBool isPaymentLoading = false.obs;
  RxList<Payment> payments = RxList([]);
  RxList<PaymentMethods> paymentmethods = RxList([]);
  RxList<Awards> awardpayments = RxList([]);

  getSalesPaymentByPurchaseId(String id) async {
    isPaymentLoading.value = true;
    List<dynamic> response =
        await PaymentService.getSalesPaymentByPurchaseId(id);
    List<Payment> paymentData =
        response.map((e) => Payment.fromJson(e)).toList();
    paymentData.sort((a, b) => b.date!.compareTo(a.date!));
    payments.assignAll(paymentData);
    isPaymentLoading.value = false;
  }

  getAwardTransactions(String id) async {
    isPaymentLoading.value = true;
    List<dynamic> response = await PaymentService.getAwardTransactions(id);
    List<Awards> paymentData = response.map((e) => Awards.fromJson(e)).toList();
    paymentData.sort((a, b) => b.date!.compareTo(a.date!));
    awardpayments.assignAll(paymentData);
    isPaymentLoading.value = false;
  }

  getPaymentsByShopAndDate(String shop, String fromDate, String toDate) async {
    isPaymentLoading.value = true;
    List<dynamic> response = await PaymentService.getPaymentsByShopAndDate(
      shop,
      fromDate,
      toDate,
    );
    List<Payment> paymentData =
        response.map((e) => Payment.fromJson(e)).toList();
    payments.assignAll(paymentData);
    isPaymentLoading.value = false;
  }

  deleteReceiptById(String id, String rId) async {
    isPaymentLoading.value = true;
    await PaymentService.deleteReceiptById(id, rId);
    PaymentController paymentController = Get.find<PaymentController>();
    int i =
        paymentController.payments.indexWhere((element) => element.id == rId);
    Get.find<PaymentController>().payments.removeAt(i);
    Get.find<PaymentController>().payments.refresh();
    isPaymentLoading.value = false;
  }

  deleteReceipt(Payment payment) async {
    isPaymentLoading.value = true;
    var response = await PaymentService.deleteReceipt(
        payment.sId!, Get.find<SalesController>().currentReceipt.value?.sId!);
    Get.find<CustomerController>().currentCustomer.value =
        Customer.fromJson(response);
    isPaymentLoading.value = false;
    Get.find<CustomerController>().currentCustomer.refresh();

    Get.find<PaymentController>().getSalesPaymentBySaleId(
        Get.find<SalesController>().currentReceipt.value!.sId!);

    Get.find<SalesController>().getSingleSaleById(
        id: Get.find<SalesController>().currentReceipt.value!.sId!);
  }

  getSalesPaymentBySaleId(String id) async {
    isPaymentLoading.value = true;
    List<dynamic> response = await PaymentService.getSalesPaymentBySaleId(id);
    List<Payment> paymentData =
        response.map((e) => Payment.fromJson(e)).toList();
    payments.assignAll(paymentData);
    isPaymentLoading.value = false;
  }

  getPaymentMethods() async {
    isPaymentLoading.value = true;
    List<dynamic> response = await PaymentService.getPaymentMethods();
    List<PaymentMethods> paymentData =
        response.map((e) => PaymentMethods.fromJson(e)).toList();
    paymentmethods.assignAll(paymentData);
    isPaymentLoading.value = false;
  }
}

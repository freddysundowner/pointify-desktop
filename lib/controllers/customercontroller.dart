import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/salescontroller.dart';
import 'package:pointify/main.dart';
import 'package:pointify/services/customer.dart';
import 'package:pointify/sqlite/helper.dart';
import 'package:pointify/utils/helper.dart';
import 'package:pointify/widgets/snackBars.dart';

import '../functions/functions.dart';
import '../models/customer.dart';
import '../models/payment.dart';
import '../models/salemodel.dart';
import '../responsive/responsiveness.dart';
import '../screens/customers/customers_page.dart';
import '../widgets/alert.dart';
import '../widgets/loading_dialog.dart';
import 'homecontroller.dart';

class CustomerController extends GetxController
    with SingleGetTickerProviderMixin {
  final GlobalKey<State> _keyLoader = GlobalKey<State>();
  TextEditingController nameController = TextEditingController();
  TextEditingController phoneController = TextEditingController();
  TextEditingController emailController = TextEditingController();
  TextEditingController creditLimitController = TextEditingController();
  TextEditingController searchCustomerController = TextEditingController();
  TextEditingController genderController = TextEditingController();
  TextEditingController addressController = TextEditingController();
  TextEditingController amountpaid = TextEditingController();
  TextEditingController amountController = TextEditingController();
  RxBool creatingCustomerLoad = RxBool(false);
  RxBool isLoadingcustomerPayments = RxBool(false);
  RxBool gettingCustomersLoad = RxBool(false);
  RxBool loadingcustomerReturns = RxBool(false);
  RxBool gettingCustomer = RxBool(false);
  RxBool customerPurchaseLoad = RxBool(false);
  RxBool loadingImportedCustomers = RxBool(false);
  RxList<Customer> customers = RxList([]);
  RxList<Customer> filteredCustomers = RxList([]);

  Rxn<Customer> currentCustomer = Rxn(null);
  RxList<SaleModel> customerSales = RxList([]);
  Rxn<Customer> customer = Rxn(null);
  RxInt walletDebtsTotal = RxInt(0);
  RxInt walletbalancessTotal = RxInt(0);

  RxString activeItem = RxString("All");
  RxString customerReceiptType = RxString("deposit");
  RxString customerActiveItem = RxString("Credit");

  RxBool gettingWalletLoad = RxBool(false);
  RxBool createWalletLoad = RxBool(false);
  RxBool updateWalletLoad = RxBool(false);
  RxList<Payment> deposits = RxList([]);
  RxList<Payment> downloadPaymentsHistory = RxList([]);
  late TabController tabController;
  late TabController customersController;
  RxInt initialPage = RxInt(0);

  @override
  void onInit() {
    tabController = TabController(length: 2, vsync: this);
    customersController = TabController(length: 2, vsync: this);
    super.onInit();
  }

  createCustomer({String? page, Function? function}) async {
    try {
      if (phoneController.text == "") {
        showSnackBar(
            message: "Please enter a valid phone number", color: Colors.red);
        return;
      }
      creatingCustomerLoad.value = true;
      LoadingDialog.showLoadingDialog(
          context: Get.context!,
          title: "Creating customer...",
          key: _keyLoader);
      Customer customerModel = Customer(
          name: nameController.text,
          address: addressController.text,
          email: emailController.text,
          phoneNumber: phoneController.text,
          wallet: 0,
          attendantId: userController.currentUser.value?.attendantId?.sId,
          shopId: userController.currentUser.value!.primaryShop!.id);
      var response =
          await CustomerService.createCustomer(customerModel, page: null);
      if (response["error"] != null) {
        showSnackBar(message: response["error"], color: Colors.red);
        return;
      }
      Get.back();
      clearTexts();
      Get.back();
      getCustomersInShop('');
      creatingCustomerLoad.value = false;
    } catch (e) {
      debugPrintMessage(e);
      Navigator.of(Get.context!, rootNavigator: true).pop();
      creatingCustomerLoad.value = false;
    }
  }

  getCustomersInShop(type) async {
    try {
      if (userController.currentUser.value?.primaryShop == null) {
        return;
      }
      gettingCustomersLoad.value = true;
      customers.clear();
      DatabaseHelper db = DatabaseHelper();
      if (type == "debtors") {
        customers
            .assignAll(customers.where((p0) => p0.totalDebt! > 0).toList());
      } else {
        List<dynamic> customerresponse = [];
        if (!await isConnected()) {
          customers.clear();
          customerresponse = await db.getCustomers();
        } else {
          customerresponse = await CustomerService.getCustomersByShopId(
              type, userController.currentUser.value!.primaryShop!);
          for (var element in customerresponse) {
            db.inserCustomer(element);
          }
        }
        customers.value =
            customerresponse.map((e) => Customer.fromJson(e)).toList();
      }
      filteredCustomers.value = customers;
      customers.refresh();
      gettingCustomersLoad.value = false;
    } catch (e) {
      debugPrintMessage(e);
      gettingCustomersLoad.value = false;
    }
  }

  clearTexts() {
    nameController.text = "";
    phoneController.text = "";
    genderController.text = "";
    emailController.text = "";
    addressController.text = "";
    amountController.text = "";
  }

  getTransactions(String type, String customerId,
      {String? reason = "", bool clear = false}) async {
    isLoadingcustomerPayments.value = true;
    if (reason != "download" || clear == true) {
      deposits.clear();
    }
    List response =
        await CustomerService.getCustomersPayments(type, customerId);
    if (reason == "download") {
      downloadPaymentsHistory.value =
          response.map((e) => Payment.fromJson(e)).toList();
    } else {
      deposits.value = response.map((e) => Payment.fromJson(e)).toList();
      deposits.refresh();
    }
    isLoadingcustomerPayments.value = false;
  }

  getCustomersById(
    String customerId,
  ) async {
    var response = await CustomerService.getCustomersById(customerId);
    currentCustomer.value = Customer.fromJson(response);
  }

  assignTextFields(Customer customerModel) {
    nameController.text = customerModel.name ?? "";
    phoneController.text = customerModel.phoneNumber ?? "";
    emailController.text = customerModel.email ?? "";
    addressController.text = customerModel.address ?? "";
  }

  updateCustomer(context, Customer customerModel) async {
    try {
      var customerData = {
        "name": nameController.text,
        "shopId": userController.currentUser.value!.primaryShop?.id,
        "phonenumber": phoneController.text,
        "creditLimit": creditLimitController.text,
        "email": emailController.text,
        "address": addressController.text,
        "attendantId": userController.currentUser.value!.attendantId
      };
      debugPrintMessage(customerData);
      var response = await CustomerService.updateCustomer(
          customerData, customerModel.sId!);
      debugPrintMessage(response);
      currentCustomer.value = Customer.fromJson(response);
      currentCustomer.refresh();
    } catch (e) {
      debugPrintMessage(e);
    }
  }

  deleteCustomer(Customer customerModel) async {
    try {
      LoadingDialog.showLoadingDialog(
          context: Get.context!,
          title: "deleting customer...",
          key: _keyLoader);
      await CustomerService.deleteCustomer(customerModel: customerModel);
      getCustomersInShop('');
      Get.back();
      Get.back();
    } catch (e) {
      Navigator.of(Get.context!, rootNavigator: true).pop();
    }
  }

  deposit(Customer customerModel, context, page, size) async {
    if (amountController.text == "") {
      generalAlert(title: "Error", message: "Please enter a valid amount");
    } else {
      LoadingDialog.showLoadingDialog(
        context: Get.context!,
        title: "Please wait...",
        key: _keyLoader,
      );
      try {
        var customerData = {
          "wallet": int.parse(amountController.text),
          "shopId": userController.currentUser.value!.primaryShop?.id,
          "attendantId": userController.currentUser.value!.attendantId,
          "payment_method": Get.find<SalesController>().paynowMethod.value,
          "mpesaCode": Get.find<SalesController>().mpesaCode.text
        };
        var response = await CustomerService.updateCustomer(
            customerData, customerModel.sId!);
        Get.back();
        if (response['error'] != null) {
          generalAlert(title: "Error", message: response["error"]);
          return;
        }
        currentCustomer.value = Customer.fromJson(response);
        getTransactions("deposit", customerModel.sId!, clear: false);
      } catch (e) {
        debugPrintMessage(e);
        generalAlert(title: "Error", message: e.toString());
      } finally {
        Get.find<SalesController>().paynowMethod.value = "Cash";
        amountController.text = "";
        Get.find<SalesController>().mpesaCode.text = "";
      }
    }
  }

  Future<void> importCustomers(List<List<dynamic>> excelData) async {
    excelData.removeAt(0);
    List<Map<String, dynamic>> customers = [];
    for (var element in excelData) {
      if (element[0].isNotEmpty) {
        customers.add({
          "name": element[0],
          "phonenumber": element[1] ?? 0.0,
          "debt": element[2] ?? 0.0,
          "wallet": element[3] ?? 0.0,
          "shopId": userController.currentUser.value!.primaryShop!.id,
          "attendantId": userController.currentUser.value!.attendantId?.sId,
        });
      }
    }

    generalAlert(
        title: "Warning",
        message: 'Do you want to import ${customers.length} customers?',
        negativeCallback: () {
          Get.back();
        },
        function: () async {
          LoadingDialog.showLoadingDialog(
              context: Get.context!,
              title: "Importing customers please wait",
              key: _keyLoader);
          var response = await CustomerService().importCustomers(customers);
          Get.back();
          if (response['error'] != null) {
            generalAlert(message: response['error'], title: "Error");
            return;
          }
          generalAlert(
            message: response['message'],
            title: "Success",
          );
        });
  }
}

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:location/location.dart';
import 'package:pointify/controllers/salescontroller.dart';
import 'package:pointify/main.dart';
import 'package:pointify/services/customer.dart';
import 'package:pointify/services/order_services.dart';
import 'package:pointify/utils/themer.dart';

import '../models/customer.dart';
import '../models/salemodel.dart';
import '../models/shop.dart';
import '../screens/discover/customer_profile.dart';
import '../screens/discover/orders/order_preview.dart';
import '../screens/discover/thankyou.dart';
import '../services/preference_manager.dart';
import '../services/sales_service.dart';
import '../utils/colors.dart';
import '../widgets/alert.dart';
import '../widgets/loading_dialog.dart';

class OrderController extends GetxController {
  TextEditingController trackingNumber = TextEditingController();
  TextEditingController emailController = TextEditingController();
  TextEditingController nameController = TextEditingController();
  RxBool showPassword = true.obs;
  TextEditingController comment = TextEditingController();
  GlobalKey<FormState> signupkey = GlobalKey();
  TextEditingController phoneController = TextEditingController();
  RxBool creatingorder = RxBool(false);
  RxBool isLoading = RxBool(false);
  RxBool checkEmailExists = RxBool(false);
  RxBool nocustomernumber = RxBool(false);
  Rxn<LocationData> locationData = Rxn(null);
  Rxn<Shop> currentShop = Rxn(null);
  Rxn<Customer> currentCustomer = Rxn(null);
  var prefs = PreferenceManager();

  RxList orderMethods = RxList([
    // {"key": "mpesa", "value": "Pay with mpesa"},
    {"key": "later", "value": "Pay Later"},
    // {"key": "card", "value": "Use Card"},
  ]);
  RxMap currentOrderMethod = RxMap({"key": "later", "value": "Pay Later"});
  RxList filterOptions = RxList(["All", "Pending", "Completed"]);
  RxString selectedOption = RxString("All");

  final GlobalKey<State> _keyLoader = GlobalKey<State>();
  validateEmail(String email) {
    return RegExp(
            r"^[a-zA-Z0-9.a-zA-Z0-9.!#$%&'*+-/=?^_`{|}~]+@[a-zA-Z0-9]+\.[a-zA-Z]+")
        .hasMatch(email);
  }

  Future<void> verifyUser() async {
    LoadingDialog.showLoadingDialog(
        context: Get.context!, title: "Please wait..", key: _keyLoader);
    var response = await OrderService().verifyCustomer(
      email: emailController.text,
      phone: phoneController.text,
    );
    Get.back();
    if (response["error"] != null) {
      generalAlert(message: response["error"]);
      return;
    }
    Get.to(() => OrderPreview());
  }

  Future<void> placeOrder() async {
    SalesController salesController = Get.find<SalesController>();
    SaleModel receiptData = salesController.receipt.value!;
    var sale = {
      "products": receiptData.items?.map((e) => e.toJson()).toList(),
      "shopId": currentShop.value?.id,
      "status": 'order',
      "order": 'pending',
      "totaltax": receiptData.totaltax,
      "amountPaid": 0,
      "online": true,
      "customerdata": {
        "name":
            userController.currentUser.value?.username ?? nameController.text,
        "email":
            userController.currentUser.value?.email ?? emailController.text,
        "phonenumber": phoneController.text
      },
      "paymentType": currentOrderMethod["key"],
      "customerId": userController.currentUser.value == null
          ? currentCustomer.value ?? currentCustomer.value?.sId
          : null
    };
    creatingorder.value = true;
    var response = await SalesService.createSale(sale);

    creatingorder.value = false;

    if (response["error"] != null) {
      generalAlert(
          message: response["error"], title: "Error", positiveText: "Okay");
      return;
    }

    SaleModel saleModel = SaleModel.fromJson(response["sale"]);
    prefs.saveString('customerNo', saleModel.customerId!.customerNo.toString());
    Get.offAll(() => ThankYouPage(
          order: saleModel,
        ));
    salesController.receipt.value = null;
    currentCustomer.value = null;
  }

  getCustomerdata(String customerNo,
      {bool confirm = true, String? to = "sales"}) async {
    isLoading.value = true;

    LoadingDialog.showLoadingDialog(
        context: Get.context!, title: "Please wait...", key: _keyLoader);
    if (customerNo == "") {
      customerNo = (await prefs.getString('customerNo'))!;
    }

    var response = await CustomerService.getCustomersByNo(
        customerno: customerNo.toString());
    if (confirm == false) {
      Get.back();
      isLoading.value = false;
      currentCustomer.value = Customer.fromJson(response);
      if (to == "sales") {
        Get.to(() => OrderPreview());
      } else {
        Get.offAll(() => CustomerProfile(
              customerNo: currentCustomer.value!.customerNo.toString(),
            ));
      }
      return;
    }
    Get.back();
    if (response["error"] != null) {
      generalAlert(
        message: response["error"],
        title: "Error",
      );
      isLoading.value = false;
      return;
    } else {
      isLoading.value = false;
      showDialog(
          context: Get.context!,
          builder: (_) {
            return AlertDialog(
                content: Column(mainAxisSize: MainAxisSize.min, children: [
              const Text(
                "Enter otp sent in your email",
              ),
              const SizedBox(
                height: 10,
              ),
              TextFormField(
                controller: emailController,
                keyboardType: TextInputType.number,
                decoration: ThemeHelper().textInputDecoration(
                  "Otp",
                  "Enter your otp",
                ),
              ),
              const SizedBox(
                height: 10,
              ),
              Column(children: [
                InkWell(
                    onTap: () async {
                      if (emailController.text.isEmpty) {
                        generalAlert(
                          message: "Please enter a valid otp",
                          title: "Error",
                        );
                        return;
                      }
                      LoadingDialog.showLoadingDialog(
                          context: Get.context!,
                          title: "Please wait...",
                          key: _keyLoader);
                      var response = await CustomerService.getCustomersByNo(
                          otp: emailController.text);
                      Get.back();
                      if (response["error"] != null) {
                        generalAlert(
                          message: response["error"],
                          title: "Error",
                        );
                        return;
                      }
                      currentCustomer.value = Customer.fromJson(response);
                      emailController.clear();
                      if (to == "sales") {
                        Get.to(() => OrderPreview());
                      } else {
                        Get.find<SalesController>().loadingSales.value = false;
                        Get.find<SalesController>().getSalesByDate(
                            customerid: currentCustomer.value?.sId,
                            order: "all");
                        Get.offAll(() => CustomerProfile(
                              customerNo:
                                  currentCustomer.value!.customerNo.toString(),
                            ));
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      child:  Text(
                        "Confirm Otp",
                        style: TextStyle(color: AppColors.mainColor),
                      ),
                    )),
                const SizedBox(
                  height: 10,
                ),
                InkWell(
                    onTap: () {
                      Get.back();
                    },
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      child:  Text(
                        "Cancel",
                        style: TextStyle(color: AppColors.mainColor),
                      ),
                    )),
              ])
            ]));
          });
    }

    isLoading.value = false;
  }

  allowLocation() async {
    Location location = Location();

    bool serviceEnabled;
    PermissionStatus permissionGranted;

    serviceEnabled = await location.serviceEnabled();
    if (!serviceEnabled) {
      serviceEnabled = await location.requestService();
      if (!serviceEnabled) {
        return;
      }
    }

    permissionGranted = await location.hasPermission();
    if (permissionGranted == PermissionStatus.denied) {
      permissionGranted = await location.requestPermission();
      if (permissionGranted != PermissionStatus.granted) {
        return;
      }
    }
    locationData.value = await location.getLocation();
    location.onLocationChanged.listen((LocationData currentLocation) {
      locationData.value = currentLocation;
    });
  }
}

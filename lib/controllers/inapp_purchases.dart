import 'dart:async';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:in_app_purchase_storekit/store_kit_wrappers.dart';
import 'package:pointify/controllers/authcontroller.dart';
import 'package:pointify/controllers/homecontroller.dart';
import 'package:pointify/controllers/plancontroller.dart';
import 'package:pointify/controllers/shopcontroller.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/package.dart';

import '../services/client.dart';
import '../services/end_points.dart';
import '../widgets/alert.dart';

class InappPurchasesController extends GetxController {
  late StreamSubscription<List<PurchaseDetails>> _purchaseUpdates;
  RxList<ProductDetails> productsList = RxList([]);
  RxBool loading = RxBool(false);

  InappPurchasesController._();
  static final InappPurchasesController _instance =
      InappPurchasesController._();
  Timer? timer;

  // Getter to access the instance
  static InappPurchasesController get inAppPurchaseUtilsInstance => _instance;

  // Create a private variable
  final InAppPurchase _inAppPurchase = InAppPurchase.instance;

  @override
  void onInit() {
    super.onInit();
    initialize();
  }

  restorePurchases() async {
    try {
      await _inAppPurchase.restorePurchases();
    } catch (error) {
      //you can handle error if restore purchase fails
    }
  }

  Future<void> initialize() async {
    if (!(await _inAppPurchase.isAvailable())) return;
    _purchaseUpdates = InAppPurchase.instance.purchaseStream.listen(
      (List<PurchaseDetails> purchaseDetailsList) {
        handlePurchaseUpdates(purchaseDetailsList);
      },
      onDone: () {
        _purchaseUpdates.cancel();
      },
      onError: (error) {},
    );
  }

  handlePurchaseUpdates(List<PurchaseDetails> purchaseDetailsList) async {
    for (int index = 0; index < purchaseDetailsList.length; index++) {
      var purchaseStatus = purchaseDetailsList[index].status;
      switch (purchaseDetailsList[index].status) {
        case PurchaseStatus.pending:
          print(' purchase is in pending ');
          continue;
        case PurchaseStatus.error:
          print(' purchase error ');
          break;
        case PurchaseStatus.canceled:
          print(' purchase cancel ');
          break;
        case PurchaseStatus.purchased:
          Get.defaultDialog(
              title: "Please wait",
              contentPadding: const EdgeInsets.all(10),
              content: const CircularProgressIndicator(),
              barrierDismissible: false);
          PlanController planController = Get.find<PlanController>();
          var payload = {
            "package": purchaseDetailsList[index].productID,
            "transaction_code": purchaseDetailsList[index].purchaseID,
            "shops": Get.find<ShopController>()
                .shopsRenew
                .map((shop) => shop.id)
                .toList(),
            'userId': userController.currentUser.value?.id,
            "amount": planController.plans
                .where((element) =>
                    element.id == purchaseDetailsList[index].productID)
                .first
                .amountDouble,
          };
          print("payload ${payload}");
          var response = await DbBase().databaseRequest(
              EndPoints.inpappsubscribe, DbBase().postRequestType,
              body: payload);
          print("payload ${response}");

          loading.value = false;
          Get.back();
          if (response["status"] == 400) {
            generalAlert(
                title: "Error",
                message: response["message"],
                function: () async {
                  final paymentWrapper = SKPaymentQueueWrapper();
                  final transactions = await paymentWrapper.transactions();
                  transactions.forEach((transaction) async {
                    await paymentWrapper.finishTransaction(transaction);
                  });
                });
          } else {
            generalAlert(
              title: "Success",
              message: response["message"],
              function: () async {
                Get.find<HomeController>().selectedIndex.value = 0;
                Get.find<ShopController>().shopsRenew.clear();
                Get.back();
                await Get.find<AuthController>().initUser();
                Get.back();
              },
            );
          }

          break;
        case PurchaseStatus.restored:
          print(' purchase restore ');
          break;
      }

      if (purchaseDetailsList[index].pendingCompletePurchase) {
        await _inAppPurchase
            .completePurchase(purchaseDetailsList[index])
            .then((value) async {
          print("purchased ${PurchaseStatus}");
          if (purchaseStatus == PurchaseStatus.purchased) {
            //on purchase success you can call your logic and your API here.
          }
        });
      }
    }
  }

  @override
  void onClose() {
    // _purchaseUpdates.cancel();
    super.onClose();
  }

  Future<void> buyNonConsumableProduct(String id) async {
    loading.value = true;
    // timer = Timer.periodic(const Duration(seconds: 10), (Timer t) async {
    final paymentWrapper = SKPaymentQueueWrapper();
    final transactions = await paymentWrapper.transactions();
    transactions.forEach((transaction) async {
      await paymentWrapper.finishTransaction(transaction);
    });
    // });
    try {
      final ProductDetailsResponse productDetails =
          await _inAppPurchase.queryProductDetails({id}.toSet());

      final PurchaseParam purchaseParam =
          PurchaseParam(productDetails: productDetails.productDetails.first);
      await _inAppPurchase.buyNonConsumable(purchaseParam: purchaseParam);
    } catch (e) {
      // Handle purchase error
      print('Failed to buy plan: $e');
    } finally {
      timer?.cancel();
    }
  }

  Future<void> buySubscription(ProductDetails productDetails) async {
    print("buySubscription called");
    final PurchaseParam purchaseParam =
        PurchaseParam(productDetails: productDetails);
    _inAppPurchase.buyNonConsumable(purchaseParam: purchaseParam);
  }

  Future<void> fetchSubscriptions() async {
    print("Fetching subscriptions...");
    final ProductDetailsResponse response =
        await _inAppPurchase.queryProductDetails({
      '656730258f38fe9d1d7bef5b1',
      // '656735e3dddb0ceff5243405',
      // '65673711072fb2ad5957da39',
      // '6567373c072fb2ad5957da3c',
    }.toSet());
    print(response.productDetails);
    if (response.error != null) {
      print('Error fetching subscription products: ${response.error}');
      return;
    }
    productsList.clear();
    List<ProductDetails> subscriptions = response.productDetails;
    PlanController planController = Get.find<PlanController>();
    planController.plans.clear();
    for (var product in subscriptions) {
      print("product ${product.id}");
      Package package = Package(
        shopOptions: [],
        id: product.id == '656730258f38fe9d1d7bef5b'
            ? '656730258f38fe9d1d7bef51'
            : product.id,
        title: product.title,
        description: product.description,
        displayprice: product.price,
        amountDouble: product.rawPrice,
        maxShops: 3,
      );
      planController.plans.add(package);
    }
    productsList.addAll(subscriptions);
  }
}

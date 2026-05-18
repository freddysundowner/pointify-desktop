import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pointify/controllers/productcontroller.dart';
import 'package:pointify/controllers/reports_controller.dart';
import 'package:pointify/models/wahoureinvoice.dart';
import 'package:pointify/widgets/alert.dart';
import 'package:share_plus/share_plus.dart';

import '../main.dart';
import '../models/product.dart';
import '../models/shop.dart';
import '../models/warehouseitem.dart';
import '../screens/receipts/pdf/sales/warehouse_invoice.dart';
import '../services/product_service.dart';
import '../utils/colors.dart';
import '../widgets/loading_dialog.dart';

class WareHouseController extends GetxController {
  final GlobalKey<State> _keyLoader = GlobalKey<State>();
  RxList<WareHouseInvoice> warehouseInvoices = <WareHouseInvoice>[].obs;
  Rxn<WareHouseInvoice> currentwarehouseItem = Rxn<WareHouseInvoice>();
  TextEditingController textEditingControllerQty = TextEditingController();
  TextEditingController textEditingQtyReceived = TextEditingController();
  TextEditingController textEditingControllerCount = TextEditingController();
  RxList<Product> productsCountCart = RxList([]);
  RxList<Product> productsCount = RxList([]);
  RxList<WareHouseInvoice> requests = RxList([]);
  RxBool isLoadingCount = RxBool(false);

  @override
  void onInit() {
    super.onInit();
  }

  incrementQuantityWidget(context,
      {Product? product, WareHouseInvoice? wareHouseInvoice, String? type}) {
    return showDialog(
        context: context,
        builder: (_) {
          return AlertDialog(
            title: const Text(
              "Enter Quantity",
              style: TextStyle(
                  color: Colors.black,
                  fontWeight: FontWeight.bold,
                  fontSize: 16),
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: textEditingControllerCount,
                  style: const TextStyle(color: Colors.black),
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: InputDecoration(
                    contentPadding: const EdgeInsets.symmetric(
                        vertical: 10, horizontal: 10),
                    hintStyle: const TextStyle(color: Colors.grey),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5),
                    ),
                  ),
                  onChanged: (v) => {},
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Get.back();
                },
                child: Text(
                  "Cancel".toUpperCase(),
                  style:  TextStyle(
                    color: AppColors.mainColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              TextButton(
                onPressed: () {
                  if (type == "updateinvoice") {
                    if (textEditingControllerCount.text.isEmpty) {
                      generalAlert(
                          message: "Please enter quantity", title: "Error");
                      return;
                    }
                    updateInvoice({
                      "quantity": textEditingControllerCount.text,
                      "productId": product!.sId
                    }, "");
                    getRequests(
                        warehouse: userController.currentUser.value!
                                    .primaryShop!.warehouse ==
                                true
                            ? userController.currentUser.value?.primaryShop?.id
                            : "",
                        shop: userController.currentUser.value!.primaryShop!
                                    .warehouse ==
                                false
                            ? userController.currentUser.value?.primaryShop?.id
                            : "",
                        status: "");
                    Get.back();
                  } else {
                    if (textEditingControllerCount.text.isEmpty) {
                      generalAlert(
                          message: "Please enter quantity", title: "Error");
                      return;
                    }
                    if (product!.quantity! <
                            double.parse(textEditingControllerCount.text) &&
                        product.virtual == false &&
                        product.bundleItems!.isEmpty) {
                      generalAlert(
                          message: "There are not have sufficient stock",
                          title: "Error");
                      return;
                    }
                    int index = productsCountCart
                        .indexWhere((element) => element.sId == product.sId);
                    if (index != -1) {
                      productsCountCart[index].lastCount =
                          int.parse(textEditingControllerCount.text);
                    } else {
                      product.lastCount =
                          int.parse(textEditingControllerCount.text);
                      productsCountCart.add(product);
                    }
                    productsCountCart.refresh();
                    productsCount.refresh();
                  }
                  Get.back();
                  textEditingControllerCount.clear();
                },
                child: Text(
                  "Update".toUpperCase(),
                  style:  TextStyle(
                    color: AppColors.mainColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          );
        });
  }

  //crumbs

  Future<void> productStockinRequest({required Shop shop}) async {
    List<Map<String, dynamic>> items = [];
    for (var element in productsCountCart) {
      if (element.bundleItems!.isNotEmpty) {
        for (var item in element.bundleItems!) {
          items.add({
            "product": item.product?.sId,
            "inventoryId": item.inventoryId,
            "requestedQty": item.quantity! * element.lastCount!
          });
        }
      } else {
        items.add({
          "product": element.sId,
          "inventoryId": element.inventoryId,
          "requestedQty": element.lastCount
        });
      }
    }
    print(items);
    var productdata = {
      "attendantId": userController.currentUser.value!.attendantId?.sId,
      "useWarehouse": true,
      "shopId": userController.currentUser.value!.primaryShop!.id,
      "warehouse": shop.id,
      "inventory": productsCountCart
          .map((element) => {
                "product": element.sId,
                "inventoryId": element.inventoryId,
                "requestedQty": element.lastCount
              })
          .toList()
    };
    print(productdata);

    LoadingDialog.showLoadingDialog(
        context: Get.context!, title: "Please wait", key: _keyLoader);
    var response = await ProductService.productStockinRequest(productdata);
    print(response);
    Get.back();
    if (response["error"] != null) {
      generalAlert(message: response["error"], title: "Error");
      return;
    }
    productsCountCart.clear();
    Get.find<ProductController>()
        .getProductsBySort(type: "all", warehouse: true, shop: shop.id!);
    Get.back();
  }

  Future<void> getRequests(
      {String? warehouse = "",
      String? from = "",
      String? to = "",
      String? shop = "",
      String? status = ""}) async {
    try {
      isLoadingCount.value = true;
      warehouseInvoices.clear();
      List<dynamic> response = await ProductService().getRequests(
          warehouse: warehouse,
          from: from,
          to: to,
          status: status,
          shop:
              userController.currentUser.value!.primaryShop!.production == true
                  ? userController.currentUser.value!.primaryShop!.id
                  : shop,
          production:
              userController.currentUser.value!.primaryShop!.production);
      warehouseInvoices
          .addAll(response.map((e) => WareHouseInvoice.fromJson(e)).toList());
      isLoadingCount.value = false;
      refresh();
    } catch (e) {
      isLoadingCount.value = false;
    }
  }

  Future<void> updateStatus(
      WareHouseInvoice wareHouseInvoice, String status) async {
    Get.back();
    await ProductService()
        .updateStatusWareHouseInvoice(wareHouseInvoice, status);
    getRequests(
        warehouse:
            userController.currentUser.value!.primaryShop!.warehouse == true
                ? userController.currentUser.value?.primaryShop?.id
                : "",
        shop: userController.currentUser.value!.primaryShop!.warehouse == false
            ? userController.currentUser.value?.primaryShop?.id
            : "",
        status: "");
  }

  Future<void> delete(WareHouseInvoice wareHouseInvoice) async {
    warehouseInvoices.remove(wareHouseInvoice);
    refresh();
    Get.back();
    await ProductService().deleteWareHouseInvoice(wareHouseInvoice);
  }

  Future<void> updateInvoice(Map<String, dynamic> data, String type) async {
    if (type == "receive") {
      var i = currentwarehouseItem.value?.items?.indexWhere(
          (element) => element.product?["_id"] == data["productId"]);
      currentwarehouseItem.value?.items![i!].received =
          double.parse(data["received"]);
    }
    currentwarehouseItem.refresh();
    textEditingQtyReceived.clear();
    Get.back();
    await ProductService().updateWareHouseInvoice(data,
        requestId: currentwarehouseItem.value!.id);
  }

  Future<void> deleteSingleItem({required item}) async {
    await ProductService().deleteSigleItem({
      "item": item,
    }, requestId: currentwarehouseItem.value!.id);
  }

  Future<void> acceptOrder(
      WareHouseInvoice wareHouseInvoice, String from) async {
    LoadingDialog.showLoadingDialog(
        context: Get.context!, title: "Please wait", key: _keyLoader);

    var response = await ProductService().acceptOrder(wareHouseInvoice);
    if (response["error"] != null) {
      generalAlert(
        title: "Error",
        message: response["error"],
        function: () {
          Get.back();
        },
      );
      return;
    }
    Get.back();
    Get.back();
    getRequests(
      shop: userController.currentUser.value?.primaryShop?.id,
      warehouse:
          userController.currentUser.value!.primaryShop!.warehouse == true
              ? userController.currentUser.value?.primaryShop?.id
              : "",
      from: from == "home"
          ? ""
          : Get.find<ReportsController>().filterStartDate.value,
      to: from == "home"
          ? ""
          : Get.find<ReportsController>().filterEndDate.value,
    );
    Get.find<ProductController>().getProductsBySort(
        type: "all",
        useWarehouse: true,
        shop: userController.currentUser.value!.primaryShop!.id!,
        showLoader: false);
  }

  Future<void> approve(WareHouseInvoice wareHouseInvoice) async {
    LoadingDialog.showLoadingDialog(
        context: Get.context!, title: "Please wait", key: _keyLoader);

    var response =
        await ProductService().approveWareHouseInvoice(wareHouseInvoice);
    if (response["error"] != null) {
      Get.back();
      generalAlert(
        title: "Error",
        message: response["error"],
        function: () {
          Get.back();
        },
      );
      return;
    }
    Get.back();
    Get.back();
    getRequests(
        warehouse:
            userController.currentUser.value!.primaryShop!.warehouse == true
                ? userController.currentUser.value?.primaryShop?.id
                : "",
        shop: userController.currentUser.value!.primaryShop!.warehouse == false
            ? userController.currentUser.value?.primaryShop?.id
            : "",
        status: "");
    Get.find<ProductController>().getProductsBySort(
        type: "all",
        warehouse: true,
        shop: userController.currentUser.value!.primaryShop!.id!,
        showLoader: false);
  }

  Future<void> sharePdfInvoice(List<WareHouseItem>? wareHouseItems) async {
    var f =
        warehouseInvoicePdf("WareHouseInvoice", wareHouseItems: wareHouseItems);
    final directory = await getTemporaryDirectory();
    final path = '${directory.path}/${currentwarehouseItem.value?.id}.pdf';

    await File(path).writeAsBytes(await f);
    Share.shareXFiles([XFile(path)], text: 'WareHouse Invoice');
  }
}

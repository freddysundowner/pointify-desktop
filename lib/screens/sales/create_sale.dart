import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/main.dart';
import 'package:pointify/screens/product/barcode_scanner.dart';
import 'package:pointify/screens/product/products_page.dart';
import 'package:pointify/screens/sales/onholdsales.dart';
import 'package:pointify/screens/sales/sale_preview.dart';
import 'package:pointify/widgets/alert.dart';

import '../../controllers/customercontroller.dart';
import '../../controllers/productcontroller.dart';
import '../../controllers/salescontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../models/product.dart';
import '../../models/saleitem.dart';
import '../../utils/colors.dart';
import '../../widgets/major_title.dart';
import '../customers/customers_page.dart';
import 'components/sales_container.dart';

class CreateSale extends StatelessWidget {
  final String? page;
  final String? shop;

  CreateSale({super.key, this.page, this.shop});

  final SalesController salesController = Get.find<SalesController>();
  final ShopController shopController = Get.find<ShopController>();
  final ProductController productController = Get.find<ProductController>();
  final CustomerController customersController = Get.find<CustomerController>();

  @override
  Widget build(BuildContext context) {
    return PopScope(
        canPop: true,
        onPopInvoked: (val) {
          salesController.receipt.value = null;
        },
        child: Obx(
          () => Scaffold(
            backgroundColor: Colors.white,
            body: SafeArea(
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      IconButton(
                          onPressed: () {
                            Get.back();
                            salesController.receipt.value = null;
                          },
                          icon: Icon(
                            Icons.clear,
                            color: AppColors.mainColor,
                          )),
                      Text(
                        "Create sale",
                        style: TextStyle(
                            color: AppColors.mainColor,
                            fontWeight: FontWeight.bold,
                            fontSize: 16),
                      ),
                      InkWell(
                        onTap: () {
                          salesController.getSalesByDate(
                              shop: userController
                                  .currentUser.value!.primaryShop!.id!,
                              status: "hold");
                          Get.to(() => OnHoldSales());
                        },
                        child: Container(
                          margin: const EdgeInsets.only(right: 10),
                          decoration: BoxDecoration(
                              color: AppColors.mainColor,
                              borderRadius: BorderRadius.circular(6),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.grey.withOpacity(0.5),
                                  spreadRadius: 5,
                                )
                              ]),
                          padding: const EdgeInsets.symmetric(
                              vertical: 6, horizontal: 10),
                          child: Row(
                            children: [
                              const Text(
                                "On-hold",
                                style: TextStyle(
                                    color: Colors.white, fontSize: 12),
                              ),
                              const SizedBox(
                                width: 5,
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 1),
                                decoration: BoxDecoration(
                                    color: Colors.amber,
                                    borderRadius: BorderRadius.circular(50)),
                                child: Text(salesController.onholdSales.length
                                    .toString()),
                              )
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (verifyPermission(
                      category: 'pos', permission: "set_sale_date"))
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 3.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Obx(() => Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  InkWell(
                                    onTap: () async {
                                      await showDateSelection(context: context);
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 15, vertical: 5),
                                      decoration: BoxDecoration(
                                          borderRadius:
                                              BorderRadius.circular(10),
                                          color: AppColors.mainColor),
                                      child: Row(children: [
                                        if (salesController.sellingDate.value !=
                                            null)
                                          Text(
                                            DateFormat("yyyy-MM-dd").format(
                                                salesController
                                                    .sellingDate.value!),
                                            style: const TextStyle(
                                                color: Colors.white),
                                          ),
                                        if (salesController.sellingDate.value ==
                                            null)
                                          Text(
                                            DateFormat("yyyy-MM-dd")
                                                .format(DateTime.now()),
                                            style: const TextStyle(
                                                color: Colors.white),
                                          ),
                                        const SizedBox(
                                          width: 20,
                                        ),
                                        const Icon(
                                          Icons.calendar_month,
                                          color: Colors.white,
                                          size: 20,
                                        )
                                      ]),
                                    ),
                                  ),
                                ],
                              )),
                          Divider(
                            color: AppColors.mainColor,
                          ),
                        ],
                      ),
                    ),
                  Expanded(
                    child: Column(
                      children: [
                        Material(
                          elevation: 1,
                          child: Container(
                            width: double.infinity,
                            color: Colors.white,
                            padding: const EdgeInsets.fromLTRB(5, 0, 5, 5),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: TextFormField(
                                        controller: salesController
                                            .selectedCustomerController,
                                        onTap: () {
                                          Get.to(() => Customers(type: "sale"));
                                        },
                                        style: const TextStyle(fontSize: 12),
                                        decoration: InputDecoration(
                                          contentPadding:
                                              const EdgeInsets.fromLTRB(
                                                  10, 2, 10, 2),
                                          suffixIcon: IconButton(
                                            onPressed: () {
                                              if (salesController.receipt.value
                                                          ?.customerId !=
                                                      null ||
                                                  salesController
                                                      .selectedCustomerController
                                                      .text
                                                      .isNotEmpty) {
                                                salesController
                                                    .selectedCustomerController
                                                    .clear();
                                                salesController.currentCustomer
                                                    .value = null;
                                              } else {
                                                Get.to(() =>
                                                    Customers(type: "sale"));
                                              }
                                            },
                                            icon: salesController
                                                    .selectedCustomerController
                                                    .text
                                                    .isEmpty
                                                ? Icon(
                                                    Icons.search,
                                                    color: AppColors.mainColor,
                                                  )
                                                : Icon(
                                                    Icons.cancel,
                                                    color: AppColors.mainColor,
                                                  ),
                                          ),
                                          hintText: "Select Customer",
                                          border: OutlineInputBorder(
                                            borderRadius:
                                                BorderRadius.circular(5),
                                          ),
                                          focusedBorder: OutlineInputBorder(
                                            borderRadius:
                                                BorderRadius.circular(5),
                                          ),
                                        ),
                                        readOnly: true,
                                      ),
                                    ),
                                    const SizedBox(
                                      width: 10,
                                    ),
                                    if (verifyPermission(
                                        category: 'pos',
                                        permission:
                                            "can_sell_to_dealer_&_wholesaler"))
                                      Expanded(
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 20, vertical: 8),
                                          decoration: BoxDecoration(
                                              border: Border.all(
                                                  color: Colors.grey),
                                              borderRadius:
                                                  BorderRadius.circular(5)),
                                          child: InkWell(
                                            onTap: () {
                                              showDialog(
                                                  context: context,
                                                  builder: (context) {
                                                    return SimpleDialog(
                                                      children: List.generate(
                                                          salesController
                                                              .customerType
                                                              .length,
                                                          (index) =>
                                                              SimpleDialogOption(
                                                                onPressed: () {
                                                                  salesController
                                                                      .selectedCustomerType
                                                                      .value = salesController
                                                                          .customerType[
                                                                      index];
                                                                  salesController
                                                                      .refreshCart();
                                                                  Navigator.pop(
                                                                      context);
                                                                  salesController
                                                                      .receipt
                                                                      .value!
                                                                      .items
                                                                      ?.forEach(
                                                                          (element) {
                                                                    int i = salesController
                                                                        .receipt
                                                                        .value!
                                                                        .items!
                                                                        .indexOf(
                                                                            element);

                                                                    salesController
                                                                            .receipt
                                                                            .value!
                                                                            .items![
                                                                                i]
                                                                            .unitPrice =
                                                                        salesController
                                                                            .receipt
                                                                            .value!
                                                                            .items![i]
                                                                            .product!
                                                                            .sellingPrice!;

                                                                    salesController
                                                                        .calculateAmount(
                                                                            i,
                                                                            totalDiscount:
                                                                                0);
                                                                  });
                                                                },
                                                                child:
                                                                    Container(
                                                                  padding: const EdgeInsets
                                                                      .symmetric(
                                                                      vertical:
                                                                          5),
                                                                  child: Text(
                                                                    "${salesController.customerType[index]}",
                                                                    style: const TextStyle(
                                                                        fontSize:
                                                                            18),
                                                                  ),
                                                                ),
                                                              )),
                                                    );
                                                  });
                                            },
                                            child: Row(
                                              mainAxisAlignment:
                                                  MainAxisAlignment
                                                      .spaceBetween,
                                              children: [
                                                Obx(
                                                  () => Text(salesController
                                                              .receipt.value ==
                                                          null
                                                      ? salesController
                                                          .customerType.first
                                                      : salesController
                                                          .selectedCustomerType
                                                          .value),
                                                ),
                                                const Icon(
                                                    Icons.arrow_drop_down)
                                              ],
                                            ),
                                          ),
                                        ),
                                      )
                                  ],
                                ),
                                const SizedBox(
                                  height: 10,
                                ),
                                Row(
                                  children: [
                                    Expanded(
                                      child: InkWell(
                                        onTap: () {
                                          Get.to(() => ProductPage(
                                              type: "salemodule",
                                              function: (Product product) {
                                                if (product.manageByPrice ==
                                                    true) {
                                                  showDialog(
                                                      context: context,
                                                      builder: (context) {
                                                        return AlertDialog(
                                                          title: const Text(
                                                            "Enter amount",
                                                            style: TextStyle(
                                                                fontSize: 14),
                                                          ),
                                                          content:
                                                              TextFormField(
                                                            decoration: const InputDecoration(
                                                                border: OutlineInputBorder(
                                                                    borderRadius:
                                                                        BorderRadius.all(
                                                                            Radius.circular(10)))),
                                                            keyboardType:
                                                                TextInputType
                                                                    .number,
                                                            onChanged:
                                                                (amount) {
                                                              productController
                                                                  .sellingPriceController
                                                                  .text = amount;
                                                            },
                                                          ),
                                                          actions: [
                                                            TextButton(
                                                                onPressed: () {
                                                                  Get.back();
                                                                  product.sellingPrice =
                                                                      double.parse(productController
                                                                          .sellingPriceController
                                                                          .text);
                                                                  salesController
                                                                      .addToCart(
                                                                          product);
                                                                },
                                                                child:
                                                                    Text("ok"))
                                                          ],
                                                        );
                                                      });
                                                  return;
                                                }
                                                salesController
                                                    .addToCart(product);
                                              }));
                                        },
                                        child: Container(
                                          padding: const EdgeInsets.fromLTRB(
                                              5, 10, 5, 10),
                                          decoration: BoxDecoration(
                                              borderRadius:
                                                  BorderRadius.circular(10),
                                              color: AppColors.lightDeepPurple),
                                          child: Row(
                                            mainAxisAlignment:
                                                MainAxisAlignment.center,
                                            children: [
                                              Text(
                                                "Choose ${salesController.receipt.value != null ? "more items" : "items to sell"}",
                                                style: const TextStyle(
                                                    color: Colors.black,
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 18),
                                              ),
                                              const Icon(
                                                Icons.add,
                                                color: Colors.white,
                                                size: 18,
                                              )
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                    IconButton(
                                      onPressed: () async {
                                        Get.to(
                                          () => BarcodeScannerPage(
                                            popAfterScan: false,
                                            onScanned: (barcode) async {
                                              await productController
                                                  .getProductsBySort(
                                                type: "search",
                                                barcodeId: barcode,
                                                page: 1,
                                                scanningFrom: 'sale',
                                                limit: 50,
                                              );
                                            },
                                          ),
                                        );
                                      },
                                      icon: const Icon(Icons.qr_code),
                                    )
                                  ],
                                ),
                                const SizedBox(
                                  height: 5,
                                ),
                              ],
                            ),
                          ),
                        ),
                        Expanded(
                          child: Obx(() {
                            return salesController.receipt.value == null
                                ? InkWell(
                                    onTap: () {
                                      Get.to(() => ProductPage(
                                          type: "salemodule",
                                          function: (Product product) {
                                            salesController.addToCart(product);
                                          }));
                                    },
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.center,
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Icon(
                                          Icons.add_circle_outline_outlined,
                                          size: 40,
                                          color: AppColors.mainColor,
                                        ),
                                        SizedBox(
                                          height: 10,
                                        ),
                                        Text(
                                          "add items",
                                          style: TextStyle(
                                              color: AppColors.mainColor,
                                              fontSize: 18),
                                        ),
                                      ],
                                    ),
                                  )
                                : ListView.builder(
                                    shrinkWrap: true,
                                    itemCount: salesController
                                        .receipt.value!.items?.length,
                                    itemBuilder: (context, index) {
                                      SaleItem receiptItem = salesController
                                          .receipt.value!.items
                                          ?.elementAt(index) as SaleItem;
                                      return salesContainer(
                                          receiptItem: receiptItem,
                                          index: index,
                                          type: "small");
                                    });
                          }),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            bottomNavigationBar: SafeArea(
              child: Container(
                width: double.infinity,
                decoration: BoxDecoration(
                    border: Border.all(width: 1, color: Colors.grey)),
                child: salesController.saveSaleLoad.value
                    ? const Center(child: CircularProgressIndicator())
                    : Container(
                        padding: const EdgeInsets.all(10),
                        width: double.infinity,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceEvenly,
                                  children: [
                                    const Text("Total : "),
                                    Text(
                                      htmlPrice(salesController.receipt.value
                                              ?.totalWithDiscount ??
                                          0),
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 20),
                                    ),
                                  ],
                                ),
                                const SizedBox(
                                  width: 20,
                                ),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceEvenly,
                                  children: [
                                    const Text("Items : "),
                                    Text(
                                      salesController.receipt.value == null ||
                                              salesController
                                                  .receipt.value!.items!.isEmpty
                                          ? "0"
                                          : salesController
                                              .receipt.value!.items!
                                              .fold(
                                                  0.0,
                                                  (previousValue, element) =>
                                                      previousValue +
                                                      element.quantity!)
                                              .toString(),
                                      style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 20),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                            const SizedBox(
                              height: 20,
                            ),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                InkWell(
                                  onTap: () {
                                    salesController.amountPaid.text = '0.0';
                                    if (salesController.receipt.value == null ||
                                        salesController
                                            .receipt.value!.items!.isEmpty) {
                                      generalAlert(
                                          title: "Error!",
                                          message:
                                              "Please select products to sell");
                                      return;
                                    }
                                    Get.to(() => SalePreview(
                                          page: page,
                                        ));
                                  },
                                  child: Container(
                                    width:
                                        MediaQuery.of(context).size.width * .4,
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 10),
                                    decoration: BoxDecoration(
                                        color: AppColors.mainColor,
                                        borderRadius:
                                            BorderRadius.circular(10)),
                                    child: Center(
                                      child: majorTitle(
                                          title: "Cash in",
                                          color: Colors.white,
                                          size: 18.0),
                                    ),
                                  ),
                                ),
                                InkWell(
                                  onTap: () async {
                                    // if (salesController.receipt.value == null ||
                                    //     salesController
                                    //         .receipt.value!.items!.isEmpty) {
                                    //   generalAlert(title: "No items to pay");
                                    //   return;
                                    // }
                                    // await salesController.saveSale(
                                    //     screen: page ?? "admin",
                                    //     status: "hold");
                                    if (salesController.receipt.value == null ||
                                        salesController
                                            .receipt.value!.items!.isEmpty) {
                                      generalAlert(title: "No items to pay");
                                      return;
                                    }

                                    Get.to(() => SalePreview(
                                          page: page,
                                        ));
                                  },
                                  child: Container(
                                    width:
                                        MediaQuery.of(context).size.width * .4,
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 10),
                                    decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(
                                          color: AppColors.mainColor,
                                        )),
                                    child: Center(
                                      child: Row(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.center,
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          majorTitle(
                                              title: "Hold",
                                              color: AppColors.mainColor,
                                              size: 18.0),
                                          const Icon(
                                            Icons.pause_rounded,
                                          )
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            )
                          ],
                        ),
                      ),
              ),
            ),
          ),
        ));
  }

  Future<void> showDateSelection({required BuildContext context}) async {
    final DateTime? d = await showDatePicker(
        context: context,
        lastDate: DateTime(2079),
        firstDate: DateTime(2019),
        builder: (context, child) {
          return Column(
            children: [
              ConstrainedBox(
                constraints: BoxConstraints(
                  maxWidth: MediaQuery.of(context).size.width,
                ),
                child: Container(
                    margin: EdgeInsets.only(
                      left: MediaQuery.of(context).size.width * 0.2,
                    ),
                    child: child),
              )
            ],
          );
        },
        initialDate: DateTime(
            DateTime.now().year, DateTime.now().month, DateTime.now().day));
    if (d != null) {
      salesController.sellingDate.value = d;
    }
  }
}

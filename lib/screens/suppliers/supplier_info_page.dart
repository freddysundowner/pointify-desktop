import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/purchase_controller.dart';
import 'package:pointify/controllers/suppliercontroller.dart';
import 'package:pointify/models/salemodel.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/screens/suppliers/edit_supplier.dart';
import 'package:pointify/utils/helper.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../controllers/shopcontroller.dart';
import '../../models/invoice.dart';
import '../../models/supplier.dart';
import '../../reports/purchases/invoice_order_card.dart';
import '../../utils/colors.dart';
import '../../widgets/snackBars.dart';
import '../purchases/components/invoice_table.dart';

class SupplierInfoPage extends StatelessWidget {
  final Supplier supplierModel;

  SupplierInfoPage({Key? key, required this.supplierModel}) : super(key: key) {
    supplierController.initialPage.value = 0;
    purchaseController.getPurchases(onCredit: true, supplier: supplierModel.id);
  }

  final SupplierController supplierController = Get.find<SupplierController>();
  final ShopController shopController = Get.find<ShopController>();
  final PurchaseController purchaseController = Get.find<PurchaseController>();
  final ShopController createShopController = Get.find<ShopController>();

  launchWhatsApp({required number, required message}) async {
    String url = "whatsapp://send?phone=+254$number&text=$message";
    await canLaunchUrl(Uri.parse(url))
        ? canLaunchUrl(Uri.parse(url))
        : showSnackBar(message: "Cannot open whatsapp", color: Colors.red);
  }

  launchMessage({required number, required message}) async {
    Uri sms = Uri.parse('sms:$number?body=$message');
    if (await launchUrl(sms)) {
      //app opened
    } else {
      //app is not opened
    }
  }

  @override
  Widget build(BuildContext context) {
    return Helper(
        widget: SingleChildScrollView(
          child: Column(
            children: [
              Container(
                height: MediaQuery.of(context).size.height * 0.2,
                color: AppColors.mainColor,
                child: Column(
                  children: [
                    Center(
                      child: Container(
                        decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white,
                            border: Border.all(color: Colors.white, width: 2)),
                        child: const Icon(
                          Icons.person,
                          color: Colors.grey,
                          size: 50,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Center(
                        child: Text(
                      supplierModel.name!,
                      style: const TextStyle(
                          color: Colors.white, fontWeight: FontWeight.bold),
                    )),
                    const SizedBox(height: 15),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.only(
                          left: 20, right: 20, bottom: 10),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          IconButton(
                              onPressed: () {
                                launchMessage(
                                    number: supplierModel.phoneNumber,
                                    message:
                                        "A quick reminder that you owe our shop please pay your debt ");
                              },
                              icon: const Icon(Icons.message),
                              color: Colors.white),
                          IconButton(
                              onPressed: () {
                                launchWhatsApp(
                                    number: supplierModel.phoneNumber,
                                    message:
                                        "A quick reminder that you owe our shop please pay your debt ");
                              },
                              icon: const Icon(Icons.whatshot),
                              color: Colors.white),
                          IconButton(
                              onPressed: () async {
                                final Uri launchUri = Uri(
                                  scheme: 'tel',
                                  path: supplierController
                                      .supplier.value?.phoneNumber,
                                );
                                await launchUrl(launchUri);
                              },
                              icon: const Icon(Icons.phone),
                              color: Colors.white),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              customerInfoBody(context)
            ],
          ),
        ),
        appBar: AppBar(
          elevation: 0.0,
          backgroundColor: AppColors.mainColor,
          leading: IconButton(
              onPressed: () {
                supplierController.initialPage.value = 0;
                Get.back();
              },
              icon: const Icon(Icons.arrow_back_ios)),
          actions: [
            IconButton(
                onPressed: () {
                  supplierController.assignTextFields(supplierModel);
                  supplierController.supplier.value = supplierModel;
                  Get.to(() => EditSupplier());
                },
                icon: const Icon(Icons.edit)),
          ],
        ));
  }

  Widget customerInfoBody(context) {
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.9,
      child: Container(
        color: Colors.white,
        width: double.infinity,
        height: kToolbarHeight,
        child: DefaultTabController(
          initialIndex: 0,
          length: 3,
          child: Builder(builder: (context) {
            return Column(
              children: [
                TabBar(
                    controller: DefaultTabController.of(context),
                    onTap: (index) {
                      supplierController.initialPage.value = index;
                      if (index == 0) {
                        purchaseController.getPurchases(
                            onCredit: true, supplier: supplierModel.id);
                      } else if (index == 1) {
                        if (purchaseController.isLoadingPurchases.value ==
                            true) {
                          return;
                        }
                        purchaseController.getPurchases(
                          supplier: supplierModel.id,
                          onCredit: false,
                        );
                      } else {
                        purchaseController.getReturns(
                          supplier: supplierModel,
                        );
                      }
                    },
                    tabs: const [
                      Tab(
                          child: Row(children: [
                        Text(
                          "Pending",
                          style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: Colors.black),
                        )
                      ])),
                      Tab(
                          child: Text(
                        "Invoices",
                        style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Colors.black),
                      )),
                      Tab(
                          child: Text(
                        "Returns",
                        style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Colors.black),
                      )),
                    ]),
                Expanded(
                  flex: 1,
                  child: Container(
                    color: Colors.white,
                    child: TabBarView(
                      physics: const NeverScrollableScrollPhysics(),
                      children: [
                        CreditInfo(supplierModel: supplierModel),
                        Purchase(supplierModel: supplierModel),
                        ReturnedPurchases(id: supplierModel.id)
                      ],
                    ),
                  ),
                )
              ],
            );
          }),
        ),
      ),
    );
  }

  showModalSheet(context) {
    return showModalBottomSheet<void>(
        context: context,
        builder: (BuildContext context) {
          return SizedBox(
              height: 200,
              child: Center(
                  child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                      padding: const EdgeInsets.all(10),
                      width: double.infinity,
                      color: Colors.grey.withOpacity(0.7),
                      child: const Text('Select Download Option')),
                  Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: GestureDetector(
                      onTap: () {
                        Navigator.pop(context);
                      },
                      child: const SizedBox(
                        width: double.infinity,
                        child: Row(
                          children: [
                            Icon(Icons.arrow_downward),
                            SizedBox(
                              width: 10,
                            ),
                            Text('Credit History ')
                          ],
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: GestureDetector(
                      onTap: () {
                        Navigator.pop(context);
                      },
                      child: const SizedBox(
                        width: double.infinity,
                        child: Row(
                          children: [
                            Icon(Icons.cloud_download_outlined),
                            SizedBox(
                              width: 10,
                            ),
                            Text('Purchase History')
                          ],
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: GestureDetector(
                      onTap: () {
                        Navigator.pop(context);
                      },
                      child: const SizedBox(
                        width: double.infinity,
                        child: Row(
                          children: [
                            Icon(Icons.clear),
                            SizedBox(
                              width: 10,
                            ),
                            Text(
                              'Cancel',
                              style: TextStyle(color: Colors.red),
                            )
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              )));
        });
  }
}

class Purchase extends StatelessWidget {
  final Supplier supplierModel;

  Purchase({Key? key, required this.supplierModel}) : super(key: key);

  final SupplierController supplierController = Get.find<SupplierController>();
  final ShopController createShopController = Get.find<ShopController>();
  final PurchaseController purchaseController = Get.find<PurchaseController>();

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      return purchaseController.isLoadingPurchases.value
          ? const Center(child: CircularProgressIndicator())
          : purchaseController.invoices.isEmpty
              ? Container(
                  margin: const EdgeInsets.only(top: 50),
                  child: const Text(
                    "No entries",
                    textAlign: TextAlign.center,
                  ))
              : isSmallScreen(context)
                  ? ListView.builder(
                      itemCount: purchaseController.invoices.length,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemBuilder: (context, index) {
                        Invoice invoice =
                            purchaseController.invoices.elementAt(index);
                        return InkWell(
                          onTap: () {
                            // showBottomSheet(context, purchaseOrder, supplier);
                          },
                          child: invoiceCard(
                            invoice: invoice,
                          ),
                        );
                      })
                  : SingleChildScrollView(
                      child: invoiceTable(
                          context: context, supplierModel: supplierModel),
                    );
    });
  }
}

class ReturnedPurchases extends StatelessWidget {
  final String? id;

  ReturnedPurchases({Key? key, required this.id}) : super(key: key);

  final ShopController createShopController = Get.find<ShopController>();
  final PurchaseController purchaseController = Get.find<PurchaseController>();

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      return purchaseController.returningIvoiceLoad.isTrue
          ? const Center(child: CircularProgressIndicator())
          : purchaseController.invoicereturns.isEmpty
              ? Container(
                  margin: const EdgeInsets.only(top: 50),
                  child: const Text(
                    "No entries",
                    textAlign: TextAlign.center,
                  ))
              : ListView.builder(
                  itemCount: purchaseController.invoicereturns.length,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemBuilder: (context, index) {
                    Invoice invoice =
                        purchaseController.invoicereturns.elementAt(index);
                    return InkWell(
                      onTap: () {
                        // showBottomSheet(context, purchaseOrder, supplier);
                      },
                      child: invoiceCard(invoice: invoice),
                    );
                  });
    });
  }
}

class CreditInfo extends StatelessWidget {
  final Supplier supplierModel;
  final SupplierController supplierController = Get.find<SupplierController>();
  final ShopController createShopController = Get.find<ShopController>();
  final PurchaseController purchaseController = Get.find<PurchaseController>();

  CreditInfo({Key? key, required this.supplierModel}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      return purchaseController.invoices.isEmpty
          ? const Center(
              child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Center(
                  child: Text(
                    "No entries found.",
                    style: TextStyle(color: Colors.black),
                  ),
                ),
                Center(
                  child: Text(
                    "For now",
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
              ],
            ))
          : isSmallScreen(context)
              ? ListView.builder(
                  itemCount: purchaseController.invoices.length,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemBuilder: (context, index) {
                    Invoice purchaseOrder =
                        purchaseController.invoices.elementAt(index);

                    return invoiceCard(invoice: purchaseOrder, tab: "credit");
                  })
              : SingleChildScrollView(
                  child: invoiceTable(
                      context: context, supplierModel: supplierModel),
                );
    });
  }
}

showBottomSheet(
  BuildContext context,
  SaleModel salesBody,
  Supplier customerModel,
) {
  return showModalBottomSheet<void>(
      context: context,
      builder: (BuildContext context) {
        return SizedBox(
            height: MediaQuery.of(context).size.height * 0.40,
            child: Center(
                child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                    padding: const EdgeInsets.all(10),
                    width: double.infinity,
                    color: Colors.grey.withOpacity(0.7),
                    child: const Text('Select Action')),
                ListTile(
                  leading: const Icon(Icons.list),
                  onTap: () {
                    // Navigator.pop(context);
                    // if (MediaQuery.of(context).size.width > 600) {
                    //   Get.find<HomeController>().selectedWidget.value =
                    //       PurchaseOrderItems(
                    //     id: salesBody.id,
                    //     page: "customeInfo",
                    //   );
                    // } else {
                    //   Get.to(() => PurchaseOrderItems(
                    //         id: salesBody.id,
                    //         page: "customeInfo",
                    //       ));
                    // }
                  },
                  title: const Text('View Purchases'),
                ),
                if (salesBody.totalWithDiscount! > 0)
                  ListTile(
                    leading: const Icon(Icons.payment),
                    onTap: () {
                      Navigator.pop(context);
                      showAmountDialog(context, salesBody);
                    },
                    title: const Text('Pay'),
                  ),
                ListTile(
                  leading: const Icon(Icons.wallet),
                  onTap: () {
                    Navigator.pop(context);
                    // if (MediaQuery.of(context).size.width > 600) {
                    //   Get.find<HomeController>().selectedWidget.value =
                    //       PaymentHistory(
                    //     id: salesBody.id!,
                    //   );
                    // } else {
                    //   Get.to(() => PaymentHistory(
                    //         id: salesBody.id!,
                    //         type: "purchase",
                    //       ));
                    // }
                  },
                  title: const Text('Payment History'),
                ),
                ListTile(
                  leading: const Icon(Icons.file_copy_outlined),
                  onTap: () async {
                    Navigator.pop(context);
                    // await salesController.getPaymentHistory(
                    //     id: salesBody.id!, type: "");

                    // PaymentHistoryPdf(
                    //     shop:
                    //         Get.find<ShopController>().currentShop.value!.name,
                    //     deposits: salesController.paymenHistory.value);
                  },
                  title: const Text('Generate Report'),
                ),
              ],
            )));
      });
}

showAmountDialog(context, SaleModel salesBody) {
  SupplierController supplierController = Get.find<SupplierController>();
  // PurchaseController purchaseController = Get.find<PurchaseController>();
  showDialog(
      context: context,
      builder: (_) {
        return AlertDialog(
          title: const Text(
            "Enter Amount",
            style: TextStyle(
              color: Colors.black,
              fontWeight: FontWeight.bold,
            ),
          ),
          content: SizedBox(
            height: MediaQuery.of(context).size.height * 0.2,
            child: Form(
                child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextFormField(
                  controller: supplierController.amountController,
                  keyboardType: TextInputType.text,
                  decoration: InputDecoration(
                      hintText: "eg ${salesBody.totalWithDiscount}",
                      hintStyle: const TextStyle(color: Colors.black),
                      fillColor: Colors.white,
                      filled: true,
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8))),
                )
              ],
            )),
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
                // Get.back();
                // if (salesBody.total! <
                //     int.parse(supplierController.amountController.text)) {
                // } else {
                //   purchaseController.paySupplierCredit(
                //       invoice: salesBody,
                //       amount: supplierController.amountController.text);
                // }
              },
              child: Text(
                "Save".toUpperCase(),
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

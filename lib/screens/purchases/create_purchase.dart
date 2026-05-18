import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/screens/product/barcode_scanner.dart';
import 'package:pointify/screens/purchases/purchases_preview.dart';
import 'package:pointify/screens/suppliers/suppliers_page.dart';
import 'package:pointify/widgets/alert.dart';

import '../../../../utils/colors.dart';
import '../../controllers/productcontroller.dart';
import '../../controllers/purchase_controller.dart';
import '../../controllers/shopcontroller.dart';
import '../../controllers/suppliercontroller.dart';
import '../../models/invoice.dart';
import '../../models/product.dart';
import '../../widgets/major_title.dart';
import '../product/products_page.dart';
import 'components/invoice_card.dart';

class CreatePurchase extends StatelessWidget {
  CreatePurchase({Key? key}) : super(key: key) {
    purchaseController.selectedpaymentMethod.value = "Cash";
    supplierController.getSuppliers("all");
  }

  final PurchaseController purchaseController = Get.find<PurchaseController>();
  final ShopController shopController = Get.find<ShopController>();
  final SupplierController supplierController = Get.find<SupplierController>();
  final ProductController productController = Get.find<ProductController>();

  @override
  Widget build(BuildContext context) {
    return PopScope(
        canPop: true,
        onPopInvoked: (val) => purchaseController.invoice.value?.items!.clear(),
        child: Scaffold(
          backgroundColor: Colors.white,
          appBar: AppBar(
            backgroundColor: Colors.white,
            elevation: 0.3,
            titleSpacing: 0.0,
            leading: IconButton(
                onPressed: () {
                  purchaseController.invoice.value = null;

                  Get.back();
                },
                icon: const Icon(
                  Icons.arrow_back_ios,
                  color: Colors.black,
                )),
            title: majorTitle(
                title: "Create a purchase", color: Colors.black, size: 20.0),
          ),
          body: Column(
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
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () {
                                _addItems(context);
                              },
                              child: Container(
                                padding:
                                    const EdgeInsets.fromLTRB(15, 10, 15, 10),
                                decoration: BoxDecoration(
                                    border: Border.all(color: Colors.grey),
                                    borderRadius: BorderRadius.circular(15)),
                                child: const Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text("Select products to stock"),
                                    Icon(Icons.arrow_drop_down,
                                        color: Colors.grey)
                                  ],
                                ),
                              ),
                            ),
                          ),
                          IconButton(
                              onPressed: () {
                                Get.to(
                                  () => BarcodeScannerPage(
                                    popAfterScan: true,
                                    onScanned: (barcode) async {
                                      await productController.getProductsBySort(
                                        type: "search",
                                        barcodeId: barcode,
                                        page: 1,
                                        scanningFrom: 'purchase',
                                        limit: 50,
                                      );
                                    },
                                  ),
                                );
                              },
                              icon: const Icon(Icons.qr_code))
                        ],
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            flex: 2,
                            child: TextFormField(
                              controller:
                                  purchaseController.selectedSupplierController,
                              onTap: () {
                                Get.to(() => Suppliers(
                                      from: "purchases",
                                    ));
                              },
                              decoration: InputDecoration(
                                contentPadding:
                                    const EdgeInsets.fromLTRB(10, 2, 10, 2),
                                suffixIcon: IconButton(
                                  onPressed: () {
                                    if (purchaseController
                                            .selectedSupplier.value !=
                                        null) {
                                      purchaseController
                                          .selectedSupplierController
                                          .clear();
                                      purchaseController
                                          .selectedSupplier.value = null;
                                    } else {
                                      // Get.to(() => _gotoSupplierPage(context));
                                      Get.to(() => Suppliers(
                                            from: "purchases",
                                          ));
                                    }
                                  },
                                  icon: Icon(
                                    Icons.cancel,
                                    color: AppColors.mainColor,
                                  ),
                                ),
                                hintText: "Select supplier",
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                              readOnly: true,
                            ),
                          ),
                          const SizedBox(
                            width: 10,
                          ),
                        ],
                      )
                    ],
                  ),
                ),
              ),
              Expanded(
                child: Obx(() {
                  return purchaseController.invoice.value == null
                      ? InkWell(
                          onTap: () {
                            _addItems(context);
                          },
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            mainAxisAlignment: MainAxisAlignment.center,
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
                                "purchase items",
                                style: TextStyle(
                                    color: AppColors.mainColor, fontSize: 21),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          itemCount:
                              purchaseController.invoice.value!.items!.length,
                          itemBuilder: (context, index) {
                            InvoiceItem invoiceItem = purchaseController
                                .invoice.value!.items!
                                .elementAt(index);
                            return createPurchaseCard(
                                invoiceItem: invoiceItem, index: index);
                          });
                }),
              ),
            ],
          ),
          bottomNavigationBar: Obx(() {
            return BottomAppBar(
              color: Colors.white,
              child: purchaseController.invoice.value == null
                  ? Container(height: 0)
                  : createPurchase(context),
            );
          }),
        ));
  }

  void _addItems(BuildContext context) {
    Get.to(() => ProductPage(
          type: "purchase",
          function: (Product product) {
            purchaseController.addNewPurchase(product);
            Get.back();
          },
        ));
  }

  Widget createPurchase(context) {
    return InkWell(
      splashColor: Colors.transparent,
      onTap: () {
        saveFunction(context);
      },
      child: Container(
        padding: const EdgeInsets.all(10),
        width: double.infinity,
        decoration: BoxDecoration(
            border: Border.all(width: 3, color: AppColors.mainColor),
            borderRadius: BorderRadius.circular(40)),
        child: Center(
            child: majorTitle(
                title: "Create Purchase",
                color: AppColors.mainColor,
                size: 18.0)),
      ),
    );
  }

  saveFunction(context) {
    if (purchaseController.invoice.value == null ||
        purchaseController.invoice.value!.items!.isEmpty) {
      generalAlert(title: "Error!", message: "Please select products to sell");
      return;
    }
    Get.to(() => PurchaesPreview(
          page: 'admin',
        ));
  }
}

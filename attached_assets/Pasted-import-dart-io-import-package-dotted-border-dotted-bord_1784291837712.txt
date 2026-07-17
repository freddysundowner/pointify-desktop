import 'dart:io';

import 'package:dotted_border/dotted_border.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/accompaniment.dart';
import 'package:pointify/screens/product/product_categories.dart';
import 'package:pointify/screens/product/products_page.dart';
import 'package:pointify/screens/suppliers/suppliers_page.dart';
import 'package:qr_code_scanner_plus/qr_code_scanner_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../utils/colors.dart';
import '../../../widgets/major_title.dart';
import '../../../widgets/minor_title.dart';
import '../../controllers/productcontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../controllers/suppliercontroller.dart';
import '../../models/bundleitem.dart';
import '../../models/product.dart';
import '../../services/local_files_access_service.dart';
import '../../widgets/snackBars.dart';

enum ImageType {
  local,
  network,
}

class CustomImage {
  final ImageType imgType;
  final String path;
  CustomImage({this.imgType = ImageType.local, required this.path});
  @override
  String toString() {
    return "Instance of Custom Image: {imgType: $imgType, path: $path}";
  }
}

class CreateProduct extends StatelessWidget {
  final String page;
  final Product? productModel;
  final bool? clearInputs;

  CreateProduct(
      {Key? key,
      required this.page,
      required this.productModel,
      this.clearInputs = true})
      : super(key: key) {
    if (page == "create") {
      if (clearInputs!) {
        productController.clearControllers();
      }
    } else {
      productController.assignTextFields(productModel!);
    }
  }

  final ShopController shopController = Get.find<ShopController>();
  final ProductController productController = Get.find<ProductController>();
  final SupplierController supplierController = Get.find<SupplierController>();
  void pickProductImage(BuildContext context) async {
    try {
      String path;
      path = await choseImageFromLocalFiles(context,
          aspectRatio: const CropAspectRatio(ratioX: 3, ratioY: 2));
      productController.image.value = XFile(path);
    } finally {}
  }

  Future<void> addImageButtonCallback(BuildContext context,
      {int? index}) async {
    String path = "";
    path = await choseImageFromLocalFiles(context);
    if (index == null) {
      productController.selectedImages
          .add(CustomImage(imgType: ImageType.local, path: path));
    } else {
      if (index < productController.selectedImages.length) {
        productController.selectedImages[index] =
            CustomImage(imgType: ImageType.local, path: path);
      }
    }
  }

  void _addGroupDialog(BuildContext context) {
    final nameCtrl = TextEditingController();
    String type = 'choice';
    showDialog(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text("New accompaniment group"),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(
                    hintText: "Group name e.g. Starch, Sides"),
              ),
              const SizedBox(height: 8),
              RadioListTile<String>(
                value: 'choice',
                groupValue: type,
                title: const Text("Customer chooses"),
                onChanged: (v) => setState(() => type = v!),
              ),
              RadioListTile<String>(
                value: 'fixed',
                groupValue: type,
                title: const Text("Always included"),
                onChanged: (v) => setState(() => type = v!),
              ),
            ],
          ),
          actions: [
            TextButton(
                onPressed: () => Get.back(), child: const Text("Cancel")),
            TextButton(
              onPressed: () {
                if (nameCtrl.text.trim().isEmpty) return;
                productController.accompanimentGroups.add(AccompanimentGroup(
                  id: DateTime.now().millisecondsSinceEpoch.toString(),
                  name: nameCtrl.text.trim(),
                  type: type,
                  options: [],
                ));
                Get.back();
              },
              child: const Text("Add"),
            ),
          ],
        ),
      ),
    );
  }

  void _addOptionDialog(BuildContext context, AccompanimentGroup group) {
    final nameCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text("Add option to ${group.name}"),
        content: TextField(
          controller: nameCtrl,
          autofocus: true,
          decoration:
              const InputDecoration(hintText: "e.g. Rice, Ugali, Chips"),
        ),
        actions: [
          TextButton(onPressed: () => Get.back(), child: const Text("Cancel")),
          TextButton(
            onPressed: () {
              if (nameCtrl.text.trim().isEmpty) return;
              group.options.add(AccompanimentOption(
                id: DateTime.now().millisecondsSinceEpoch.toString(),
                name: nameCtrl.text.trim(),
              ));
              productController.accompanimentGroups.refresh();
              Get.back();
            },
            child: const Text("Add"),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: true,
      onPopInvoked: (val) {
        productController.managexpiry.value = false;
        productController.manageorderlevel.value = false;
      },
      child: Scaffold(
        resizeToAvoidBottomInset: true,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0.1,
          titleSpacing: 0.0,
          centerTitle: false,
          leading: IconButton(
            onPressed: () {
              Get.back();
              productController.managexpiry.value = false;
              productController.managediscount.value = false;
              productController.manageorderlevel.value = false;
              productController.managediscount.value = false;
              productController.manageorderlevel.refresh();
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
                  title: page == "edit" ? "Edit Product" : "duct",
                  color: Colors.black,
                  size: 16.0),
              minorTitle(
                  title:
                      "${userController.currentUser.value?.primaryShop?.name}",
                  color: Colors.grey)
            ],
          ),
        ),
        body: Container(
          padding: const EdgeInsets.only(
              left: 8.0, right: 8.0, top: 5.0, bottom: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Obx(
                () => Row(children: [
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        productController.productType.value = "product";
                        if (productModel?.type == 'product') {
                          productController.assignTextFields(productModel!);
                        } else {
                          productController.clearControllers();
                        }
                      },
                      child: Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.grey),
                            color: productController.isProduct()
                                ? AppColors.mainColor
                                : Colors.white,
                          ),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 10),
                          child: Center(
                            child: Text(
                              "Product",
                              style: TextStyle(
                                color: productController.isProduct()
                                    ? Colors.white
                                    : AppColors.mainColor,
                              ),
                            ),
                          )),
                    ),
                  ),
                  const SizedBox(
                    width: 20,
                  ),
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        productController.productType.value = "service";
                        if (productModel?.type == 'service') {
                          productController.assignTextFields(productModel!);
                        } else {
                          productController.clearControllers();
                        }
                      },
                      child: Container(
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.grey),
                            color: productController.isProduct() == false
                                ? AppColors.mainColor
                                : Colors.white,
                          ),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 10),
                          child: Center(
                              child: Text(
                            "Service",
                            style: TextStyle(
                              color: productController.isProduct() == false
                                  ? Colors.white
                                  : AppColors.mainColor,
                            ),
                          ))),
                    ),
                  ),
                ]),
              ),
              Expanded(
                child: Obx(
                  () => ListView(
                    shrinkWrap: true,
                    children: [
                      const SizedBox(height: 10),
                      if (productController.managebyPrice.isFalse)
                        Obx(
                          () => Row(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            mainAxisAlignment: MainAxisAlignment.start,
                            children: [
                              InkWell(
                                onTap: () {
                                  productController.bundleEnabled.value =
                                      !productController.bundleEnabled.value;
                                },
                                child: Row(
                                  children: [
                                    const Text("Is this a bundle?"),
                                    Checkbox(
                                        value: productController
                                            .bundleEnabled.value,
                                        onChanged: (v) {
                                          productController
                                              .bundleEnabled.value = v!;
                                        }),
                                  ],
                                ),
                              ),
                              const Spacer(),
                              InkWell(
                                onTap: productController.managebyPrice.isTrue
                                    ? null
                                    : () {
                                        productController.virtualProduct.value =
                                            !productController
                                                .virtualProduct.value;
                                      },
                                child: Row(
                                  children: [
                                    const Text("Virtual Product?"),
                                    Checkbox(
                                        value: productController
                                            .virtualProduct.value,
                                        onChanged: (v) {
                                          productController
                                              .virtualProduct.value = v!;
                                        }),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      if (productController.bundleEnabled.isTrue)
                        InkWell(
                          onTap: () {
                            Get.to(() => ProductPage(
                                type: "bundle",
                                function: (Product product) {
                                  if (product.bundle == true) {
                                    showSnackBar(
                                        message: "Product is already a bundle",
                                        color: Colors.red);
                                    return;
                                  }
                                  showDialog(
                                      context: Get.context!,
                                      builder: (_) {
                                        return AlertDialog(
                                          title: Row(
                                            mainAxisAlignment:
                                                MainAxisAlignment.spaceBetween,
                                            children: [
                                              const Text("Enter Quantity"),
                                              InkWell(
                                                onTap: () {
                                                  Get.back();
                                                },
                                                child: const Icon(
                                                  Icons.cancel,
                                                  color: Colors.red,
                                                ),
                                              )
                                            ],
                                          ),
                                          actions: [
                                            TextFormField(
                                              decoration: const InputDecoration(
                                                hintText: "Quantity",
                                              ),
                                              keyboardType:
                                                  TextInputType.number,
                                              controller:
                                                  productController.bundleQty,
                                            ),
                                            Row(
                                                mainAxisAlignment:
                                                    MainAxisAlignment
                                                        .spaceEvenly,
                                                children: [
                                                  TextButton(
                                                      onPressed: () {
                                                        if (productController
                                                            .bundleQty
                                                            .text
                                                            .isEmpty) {
                                                          productController
                                                              .bundleQty
                                                              .text = "1";
                                                        }
                                                        List<BundleItem>
                                                            bundles =
                                                            productController
                                                                .bundledProducts;
                                                        if (bundles
                                                            .isNotEmpty) {
                                                          int i = productController
                                                              .bundledProducts
                                                              .indexWhere((element) =>
                                                                  element
                                                                      .inventoryId ==
                                                                  product
                                                                      .inventoryId);
                                                          if (i != -1) {
                                                            productController
                                                                    .bundledProducts[
                                                                        i]
                                                                    .quantity =
                                                                double.parse(
                                                                    productController
                                                                        .bundleQty
                                                                        .text);
                                                            productController
                                                                .bundledProducts
                                                                .refresh();
                                                            productController
                                                                .bundleQty
                                                                .text = "1";
                                                            Get.back();
                                                            Get.back();
                                                            return;
                                                          } else {
                                                            productController
                                                                .bundledProducts
                                                                .add(BundleItem(
                                                                    product:
                                                                        product,
                                                                    inventoryId:
                                                                        product
                                                                            .inventoryId,
                                                                    quantity: double.parse(productController
                                                                        .bundleQty
                                                                        .text)));
                                                            productController
                                                                .bundledProducts
                                                                .refresh();
                                                            productController
                                                                .bundleQty
                                                                .text = "1";
                                                            Get.back();
                                                            Get.back();
                                                            return;
                                                          }
                                                        }
                                                        print(product
                                                            .inventoryId);
                                                        print(productController
                                                            .bundleQty.text);
                                                        productController
                                                            .bundledProducts
                                                            .add(BundleItem(
                                                                product:
                                                                    product,
                                                                inventoryId: product
                                                                    .inventoryId,
                                                                quantity: double.parse(
                                                                    productController
                                                                        .bundleQty
                                                                        .text)));
                                                        productController
                                                            .bundleQty
                                                            .text = "1";
                                                        Get.back();
                                                        Get.back();
                                                      },
                                                      child: const Text(
                                                        "Add",
                                                        style: TextStyle(
                                                            color:
                                                                Colors.green),
                                                      )),
                                                ])
                                          ],
                                        );
                                      });
                                }));
                          },
                          child: Container(
                            padding: const EdgeInsets.fromLTRB(5, 10, 5, 10),
                            decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(10),
                                color: AppColors.lightDeepPurple),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  "Select bundle items",
                                  style: TextStyle(
                                      color: Colors.black,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 18),
                                ),
                                Icon(
                                  Icons.add,
                                  color: Colors.white,
                                  size: 18,
                                )
                              ],
                            ),
                          ),
                        ),
                      if (productController.bundleEnabled.isTrue)
                        const SizedBox(height: 10),
                      if (productController.bundleEnabled.isTrue)
                        Obx(
                          () => Wrap(
                            spacing: 10,
                            children: List.generate(
                                productController.bundledProducts.length,
                                (i) => InkWell(
                                      onTap: () {
                                        var bundleId = productController
                                            .bundledProducts[i].inventoryId;
                                        productController.bundledProducts
                                            .removeWhere((p) =>
                                                p.inventoryId ==
                                                productController
                                                    .bundledProducts[i]
                                                    .inventoryId!);
                                        if (productModel?.bundle == true) {
                                          productController.removeBundleItem(
                                              bundleId!, productModel!);
                                        }
                                      },
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 10, vertical: 5),
                                        decoration: BoxDecoration(
                                            borderRadius:
                                                BorderRadius.circular(10),
                                            color: AppColors.mainColor),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Text(
                                              "${productController.bundledProducts[i].product?.name} - ${productController.bundledProducts[i].quantity} ${productController.bundledProducts[i].product?.measureUnit}",
                                              style: const TextStyle(
                                                  color: Colors.white),
                                            ),
                                            const Icon(
                                              Icons.clear,
                                              color: Colors.white,
                                              size: 18,
                                            )
                                          ],
                                        ),
                                      ),
                                    )),
                          ),
                        ),
                      const SizedBox(height: 10),
                      Text(productController.isProduct()
                          ? "${productController.bundleEnabled.isFalse ? "Product" : "Bundle"} Name"
                          : "Service Name *"),
                      const SizedBox(height: 5),
                      TextFormField(
                        controller: productController.itemNameController,
                        keyboardType: TextInputType.text,
                        decoration: InputDecoration(
                          fillColor: Colors.white,
                          filled: true,
                          labelStyle: const TextStyle(
                              fontFamily: 'Montserrat',
                              fontWeight: FontWeight.bold,
                              color: Colors.grey),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: const BorderSide(color: Colors.grey),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: const BorderSide(color: Colors.grey),
                          ),
                        ),
                      ),
                      if (productController.virtualProduct.isFalse)
                        InkWell(
                          onTap: () {
                            productController.managebyPrice.value =
                                !productController.managebyPrice.value;
                          },
                          child: Row(
                            children: [
                              const Text(
                                "Manage inventory using price?",
                                style: TextStyle(fontSize: 12),
                              ),
                              Checkbox(
                                  value: productController.managebyPrice.value,
                                  onChanged: (v) {
                                    productController.managebyPrice.value = v!;
                                  }),
                            ],
                          ),
                        ),
                      const SizedBox(height: 5),
                      Row(
                        children: [
                          if (productController.virtualProduct.isFalse)
                            const SizedBox(width: 3),
                          if (productController.isProduct() &&
                              productController.virtualProduct.isFalse)
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(productController.managebyPrice.isTrue
                                      ? "Unit Cost "
                                      : "Buying Price "),
                                  const SizedBox(height: 5),
                                  TextFormField(
                                    controller:
                                        productController.buyingPriceController,
                                    keyboardType: TextInputType.number,
                                    inputFormatters: [
                                      FilteringTextInputFormatter.digitsOnly
                                    ],
                                    decoration: InputDecoration(
                                      hintText: "0",
                                      fillColor: Colors.white,
                                      filled: true,
                                      labelStyle: const TextStyle(
                                          fontFamily: 'Montserrat',
                                          fontWeight: FontWeight.bold,
                                          color: Colors.grey),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(
                                            color: Colors.grey),
                                      ),
                                      focusedBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(
                                            color: Colors.grey),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          if (productController.isProduct() &&
                              productController.virtualProduct.isFalse)
                            const SizedBox(width: 15),
                          if (productController.virtualProduct.isFalse ||
                              productController.managebyPrice.isTrue)
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(productController.isProduct()
                                      ? "${productController.managebyPrice.isFalse ? "Selling Price" : "Unit Price"} "
                                      : "Service Cost"),
                                  const SizedBox(height: 5),
                                  TextFormField(
                                    controller: productController
                                        .sellingPriceController,
                                    keyboardType: TextInputType.number,
                                    inputFormatters: [
                                      FilteringTextInputFormatter.digitsOnly
                                    ],
                                    decoration: InputDecoration(
                                      hintText: "0",
                                      fillColor: Colors.white,
                                      filled: true,
                                      labelStyle: const TextStyle(
                                          fontFamily: 'Montserrat',
                                          fontWeight: FontWeight.bold,
                                          color: Colors.grey),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(
                                            color: Colors.grey),
                                      ),
                                      focusedBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(
                                            color: Colors.grey),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Obx(() => productController.addminPrice.isFalse &&
                              productController.isProduct() &&
                              productController.virtualProduct.isFalse &&
                              productController.managebyPrice.isFalse
                          ? InkWell(
                              onTap: () {
                                productController.addminPrice.value =
                                    !productController.addminPrice.value;
                              },
                              child: const Text(
                                "+ Add min selling price",
                                style: TextStyle(color: Colors.blue),
                              ),
                            )
                          : productController.isProduct() == false ||
                                  productController.virtualProduct.isTrue ||
                                  productController.managebyPrice.isTrue
                              ? Container()
                              : Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          const Text("Min Selling price "),
                                          const SizedBox(height: 5),
                                          TextFormField(
                                            controller: productController
                                                .minsellingPriceController,
                                            keyboardType: TextInputType.number,
                                            inputFormatters: [
                                              FilteringTextInputFormatter
                                                  .digitsOnly
                                            ],
                                            decoration: InputDecoration(
                                              hintText: "0",
                                              fillColor: Colors.white,
                                              filled: true,
                                              labelStyle: const TextStyle(
                                                  fontFamily: 'Montserrat',
                                                  fontWeight: FontWeight.bold,
                                                  color: Colors.grey),
                                              border: OutlineInputBorder(
                                                borderRadius:
                                                    BorderRadius.circular(8),
                                                borderSide: const BorderSide(
                                                    color: Colors.grey),
                                              ),
                                              focusedBorder: OutlineInputBorder(
                                                borderRadius:
                                                    BorderRadius.circular(8),
                                                borderSide: const BorderSide(
                                                    color: Colors.grey),
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    IconButton(
                                        onPressed: () {
                                          productController
                                              .minsellingPriceController
                                              .clear();
                                          productController.addminPrice.value =
                                              !productController
                                                  .addminPrice.value;
                                        },
                                        icon: const Icon(
                                          Icons.delete,
                                          color: Colors.red,
                                        ))
                                  ],
                                )),
                      if (productController.virtualProduct.isFalse)
                        const SizedBox(height: 10),
                      if (productController.isProduct())
                        Row(
                          children: [
                            if (productController.virtualProduct.isFalse)
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text("Quantity "),
                                    const SizedBox(height: 5),
                                    TextFormField(
                                      controller:
                                          productController.qtyController,
                                      keyboardType:
                                          const TextInputType.numberWithOptions(
                                              decimal: true),
                                      inputFormatters: [
                                        FilteringTextInputFormatter.allow(
                                            RegExp(r"[0-9.]")),
                                        TextInputFormatter.withFunction(
                                            (oldValue, newValue) {
                                          final text = newValue.text;
                                          return text.isEmpty
                                              ? newValue
                                              : double.tryParse(text) == null
                                                  ? oldValue
                                                  : newValue;
                                        }),
                                      ],
                                      decoration: InputDecoration(
                                        fillColor: Colors.white,
                                        filled: true,
                                        hintText: "0",
                                        labelStyle: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            color: Colors.grey),
                                        border: OutlineInputBorder(
                                          borderRadius:
                                              BorderRadius.circular(8),
                                          borderSide: const BorderSide(
                                              color: Colors.grey),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius:
                                              BorderRadius.circular(8),
                                          borderSide: const BorderSide(
                                              color: Colors.grey),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            if (productController.virtualProduct.isFalse)
                              const SizedBox(width: 15),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text("Unit of Measure "),
                                  const SizedBox(width: 5),
                                  TextFormField(
                                    controller:
                                        productController.measureController,
                                    keyboardType: TextInputType.text,
                                    decoration: InputDecoration(
                                      fillColor: Colors.white,
                                      filled: true,
                                      labelStyle: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: Colors.grey),
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(
                                            color: Colors.grey),
                                      ),
                                      focusedBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(
                                            color: Colors.grey),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            )
                          ],
                        ),
                      if (productController.managediscount.value == true)
                        const SizedBox(height: 10),
                      Row(
                        children: [
                          Obx(
                            () => productController.managediscount.value ==
                                    false
                                ? Container(
                                    height: 0,
                                  )
                                : Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Text("Max Discount "),
                                        const SizedBox(height: 5),
                                        TextFormField(
                                          controller: productController
                                              .discountController,
                                          keyboardType: TextInputType.number,
                                          inputFormatters: [
                                            FilteringTextInputFormatter
                                                .digitsOnly
                                          ],
                                          decoration: InputDecoration(
                                            fillColor: Colors.white,
                                            filled: true,
                                            hintText: "0",
                                            labelStyle: const TextStyle(
                                                fontWeight: FontWeight.bold,
                                                color: Colors.grey),
                                            border: OutlineInputBorder(
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                              borderSide: const BorderSide(
                                                  color: Colors.grey),
                                            ),
                                            focusedBorder: OutlineInputBorder(
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                              borderSide: const BorderSide(
                                                  color: Colors.grey),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                          ),
                          Obx(() => productController.managediscount.value &&
                                  productController.manageorderlevel.value
                              ? const SizedBox(width: 15)
                              : Container()),
                          Obx(
                            () => productController.manageorderlevel.value ==
                                    false
                                ? Container()
                                : Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Text("Re-Order Level "),
                                        const SizedBox(height: 5),
                                        TextFormField(
                                          controller: productController
                                              .reOrderController,
                                          keyboardType: TextInputType.number,
                                          inputFormatters: [
                                            FilteringTextInputFormatter
                                                .digitsOnly
                                          ],
                                          decoration: InputDecoration(
                                            fillColor: Colors.white,
                                            filled: true,
                                            hintText: "0",
                                            labelStyle: const TextStyle(
                                                fontWeight: FontWeight.bold,
                                                color: Colors.grey),
                                            border: OutlineInputBorder(
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                              borderSide: const BorderSide(
                                                  color: Colors.grey),
                                            ),
                                            focusedBorder: OutlineInputBorder(
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                              borderSide: const BorderSide(
                                                  color: Colors.grey),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                          ),
                        ],
                      ),
                      if (productController.managediscount.value == true)
                        const SizedBox(height: 10),
                      Row(
                        children: [
                          Obx(
                            () => productController.managewholesale.value ==
                                    false
                                ? Container()
                                : Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const SizedBox(height: 10),
                                        const Text("Wholesale Price"),
                                        const SizedBox(height: 5),
                                        TextFormField(
                                          controller: productController
                                              .wholeSalePriceController,
                                          keyboardType: TextInputType.number,
                                          inputFormatters: [
                                            FilteringTextInputFormatter
                                                .digitsOnly
                                          ],
                                          decoration: InputDecoration(
                                            fillColor: Colors.white,
                                            filled: true,
                                            hintText: "0",
                                            labelStyle: const TextStyle(
                                                fontFamily: 'Montserrat',
                                                fontWeight: FontWeight.bold,
                                                color: Colors.grey),
                                            border: OutlineInputBorder(
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                              borderSide: const BorderSide(
                                                  color: Colors.grey),
                                            ),
                                            focusedBorder: OutlineInputBorder(
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                              borderSide: const BorderSide(
                                                  color: Colors.grey),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                          ),
                          Obx(() => productController.managedealer.value &&
                                  productController.managewholesale.value
                              ? const SizedBox(width: 15)
                              : Container()),
                          Obx(
                            () => productController.managedealer.value == false
                                ? Container(
                                    height: 0,
                                  )
                                : Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Text("Dealer Price"),
                                        const SizedBox(height: 5),
                                        TextFormField(
                                          controller: productController
                                              .dealerPriceController,
                                          keyboardType: TextInputType.number,
                                          inputFormatters: [
                                            FilteringTextInputFormatter
                                                .digitsOnly
                                          ],
                                          decoration: InputDecoration(
                                            fillColor: Colors.white,
                                            filled: true,
                                            hintText: "0",
                                            labelStyle: const TextStyle(
                                                fontWeight: FontWeight.bold,
                                                color: Colors.grey),
                                            border: OutlineInputBorder(
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                              borderSide: const BorderSide(
                                                  color: Colors.grey),
                                            ),
                                            focusedBorder: OutlineInputBorder(
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                              borderSide: const BorderSide(
                                                  color: Colors.grey),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                          ),
                        ],
                      ),
                      if (productController.managewholesale.value == true ||
                          productController.managexpiry.value == true)
                        const SizedBox(height: 10),
                      Obx(() => productController.managexpiry.isFalse
                          ? Container(
                              height: 0,
                            )
                          : Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      const Text("Expiry Date"),
                                      const SizedBox(height: 5),
                                      TextFormField(
                                        onTap: () async {
                                          DateTime? expirydate =
                                              await showDatePicker(
                                            context: Get.context!,
                                            initialDate: DateTime.now(),
                                            firstDate:
                                                DateTime(1900, 5, 5, 20, 50),
                                            lastDate:
                                                DateTime(2030, 6, 7, 05, 09),
                                            builder: (BuildContext context,
                                                Widget? child) {
                                              return Theme(
                                                data: ThemeData.dark().copyWith(
                                                  colorScheme:
                                                      const ColorScheme.dark(
                                                    onPrimary: Colors.white,
                                                    onSurface: Colors.white,
                                                  ),
                                                  dialogBackgroundColor:
                                                      Colors.white,
                                                ),
                                                child: child!,
                                              );
                                            },
                                          );
                                          productController.expiryDate.value =
                                              expirydate!;
                                          productController
                                                  .expiryController.text =
                                              DateFormat("yyyy-MM-dd")
                                                  .format(expirydate);
                                        },
                                        controller:
                                            productController.expiryController,
                                        readOnly: true,
                                        inputFormatters: [
                                          FilteringTextInputFormatter.digitsOnly
                                        ],
                                        decoration: InputDecoration(
                                          fillColor: Colors.white,
                                          prefixIcon:
                                              const Icon(Icons.calendar_month),
                                          filled: true,
                                          hintText: DateFormat("yyyy-MM-dd")
                                              .format(DateTime.now()),
                                          labelStyle: const TextStyle(
                                              fontFamily: 'Montserrat',
                                              fontWeight: FontWeight.bold,
                                              color: Colors.grey),
                                          border: OutlineInputBorder(
                                            borderRadius:
                                                BorderRadius.circular(8),
                                            borderSide: const BorderSide(
                                                color: Colors.grey),
                                          ),
                                          focusedBorder: OutlineInputBorder(
                                            borderRadius:
                                                BorderRadius.circular(8),
                                            borderSide: const BorderSide(
                                                color: Colors.grey),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                InkWell(
                                  child: const Center(
                                      child: Icon(Icons.delete,
                                          color: Colors.red)),
                                  onTap: () {
                                    productController.managexpiry.value =
                                        !productController.managexpiry.value;
                                  },
                                ),
                              ],
                            )),
                      if (productController.manufacturer.value == true)
                        const SizedBox(height: 10),
                      if (productController.manufacturer.value == true)
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text("Manufacturer"),
                            const SizedBox(height: 5),
                            TextFormField(
                              controller:
                                  productController.manufacturerController,
                              decoration: InputDecoration(
                                fillColor: Colors.white,
                                filled: true,
                                hintText: 'Manufacturer',
                                labelStyle: const TextStyle(
                                    fontFamily: 'Montserrat',
                                    fontWeight: FontWeight.bold,
                                    color: Colors.grey),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide:
                                      const BorderSide(color: Colors.grey),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide:
                                      const BorderSide(color: Colors.grey),
                                ),
                              ),
                            ),
                          ],
                        ),
                      const SizedBox(height: 10),
                      if (userController.currentUser.value?.primaryShop?.tax !=
                              null &&
                          userController.currentUser.value!.primaryShop!.tax! >
                              0)
                        DottedBorder(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 10),
                          radius: const Radius.circular(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Obx(
                                () => InkWell(
                                  onTap: () {
                                    productController.taxable.value =
                                        !productController.taxable.value;
                                  },
                                  child: Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.center,
                                    mainAxisAlignment: MainAxisAlignment.start,
                                    children: [
                                      Text(
                                          "Taxable? ${userController.currentUser.value?.primaryShop?.tax}%"),
                                      Checkbox(
                                          value:
                                              productController.taxable.value,
                                          onChanged: (v) {
                                            productController.taxable.value =
                                                v!;
                                          }),
                                    ],
                                  ),
                                ),
                              ),
                              Text(
                                "By ticking this box, the system assumes the ${productController.isProduct() ? "selling price" : "cost"} is tax inclusive",
                                style: const TextStyle(fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                      const SizedBox(height: 10),
                      Obx(
                        () => productController.pickedSupplier.value == null
                            ? Container(
                                height: 0,
                              )
                            : Row(
                                children: [
                                  const Text(
                                    "Supplier: ",
                                    style: TextStyle(color: Colors.black),
                                  ),
                                  Text(
                                    productController
                                        .pickedSupplier.value!.name!,
                                    style: const TextStyle(
                                        color: Colors.black,
                                        fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(
                                    width: 10,
                                  ),
                                  InkWell(
                                      onTap: () {
                                        productController.pickedSupplier.value =
                                            null;
                                      },
                                      child: const Icon(
                                        Icons.delete,
                                        color: Colors.red,
                                        size: 18,
                                      )),
                                ],
                              ),
                      ),
                      const SizedBox(height: 10),
                      Obx(
                        () => productController.selecteProductCategoty.value ==
                                null
                            ? Container()
                            : Row(
                                children: [
                                  const Text(
                                    "Category: ",
                                    style: TextStyle(color: Colors.black),
                                  ),
                                  Text(
                                    productController
                                        .selecteProductCategoty.value!.name!,
                                    style: const TextStyle(
                                        color: Colors.black,
                                        fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(
                                    width: 10,
                                  ),
                                  InkWell(
                                      onTap: () {
                                        productController.selecteProductCategoty
                                            .value = null;
                                      },
                                      child: const Icon(
                                        Icons.delete,
                                        color: Colors.red,
                                        size: 18,
                                      )),
                                ],
                              ),
                      ),
                      if (productController.selecteProductCategoty.value !=
                          null)
                        const SizedBox(height: 10),
                      if (productController.isProduct() &&
                          productController.managebyPrice.isFalse)
                        Wrap(
                          spacing: 10,
                          runSpacing: 5,
                          children: [
                            InkWell(
                              child: Obx(
                                  () => productController.manufacturer.isTrue
                                      ? Container(
                                          width: 0,
                                        )
                                      : const Text(
                                          "+ Manufacturer",
                                          style: TextStyle(color: Colors.blue),
                                        )),
                              onTap: () {
                                productController.manufacturer.value =
                                    !productController.manufacturer.value;
                              },
                            ),
                            if (productController.virtualProduct.isFalse)
                              InkWell(
                                child: Obx(() => productController
                                        .managewholesale.isTrue
                                    ? Container(
                                        width: 0,
                                      )
                                    : const Text(
                                        "+ Wholesale Price",
                                        style: TextStyle(color: Colors.blue),
                                      )),
                                onTap: () {
                                  productController.managewholesale.value =
                                      !productController.managewholesale.value;
                                },
                              ),
                            if (productController.virtualProduct.isFalse)
                              InkWell(
                                child: Obx(
                                    () => productController.managedealer.isTrue
                                        ? Container(
                                            width: 0,
                                          )
                                        : const Text(
                                            "+ Dealer Price",
                                            style:
                                                TextStyle(color: Colors.blue),
                                          )),
                                onTap: () {
                                  productController.managedealer.value =
                                      !productController.managedealer.value;
                                },
                              ),
                            if (productController.virtualProduct.isFalse)
                              InkWell(
                                child: Obx(() => productController
                                            .selecteProductCategoty.value !=
                                        null
                                    ? Container(
                                        width: 0,
                                      )
                                    : Text(
                                        "+ add category",
                                        style: TextStyle(
                                            color: productController
                                                        .selecteProductCategoty
                                                        .value !=
                                                    null
                                                ? Colors.red
                                                : Colors.blue),
                                      )),
                                onTap: () {
                                  if (productController
                                          .selecteProductCategoty.value ==
                                      null) {
                                    Get.to(() => ProductCategories());
                                  } else {
                                    productController
                                        .selecteProductCategoty.value = null;
                                  }
                                },
                              ),
                            InkWell(
                              child: Obx(() =>
                                  productController.pickedSupplier.value != null
                                      ? Container(
                                          width: 0,
                                        )
                                      : Text(
                                          "+ add supplier",
                                          style: TextStyle(
                                              color: productController
                                                          .pickedSupplier
                                                          .value !=
                                                      null
                                                  ? Colors.red
                                                  : Colors.blue),
                                        )),
                              onTap: () {
                                if (productController.pickedSupplier.value ==
                                    null) {
                                  Get.to(() => Suppliers(
                                        from: "addproduct",
                                      ));
                                } else {
                                  productController.pickedSupplier.value = null;
                                }
                              },
                            ),
                            InkWell(
                              child:
                                  Obx(() => productController.managexpiry.isTrue
                                      ? Container(
                                          width: 0,
                                        )
                                      : const Text(
                                          "+ Expiry Date",
                                          style: TextStyle(color: Colors.blue),
                                        )),
                              onTap: () {
                                productController.managexpiry.value =
                                    !productController.managexpiry.value;
                              },
                            ),
                            InkWell(
                              child: Obx(
                                  () => productController.manageBarcode.isTrue
                                      ? Container()
                                      : const Text(
                                          "+ Barcode",
                                          style: TextStyle(color: Colors.blue),
                                        )),
                              onTap: () {
                                productController.manageBarcode.value = true;
                              },
                            ),
                            if (userController.currentUser.value?.primaryShop
                                    ?.isRestaurant ==
                                true)
                              InkWell(
                                child: Obx(() => productController
                                        .manageAccompaniments.isTrue
                                    ? Container()
                                    : const Text(
                                        "+ Accompaniments",
                                        style: TextStyle(color: Colors.blue),
                                      )),
                                onTap: () {
                                  productController.manageAccompaniments.value =
                                      true;
                                },
                              ),
                            InkWell(
                              child: const Text(
                                "+ Description",
                                style: TextStyle(color: Colors.blue),
                              ),
                              onTap: () {
                                productController.manageDescription.value =
                                    !productController.manageDescription.value;
                              },
                            ),
                            if (productController.virtualProduct.isFalse)
                              InkWell(
                                child: Obx(() => productController
                                        .manageorderlevel.isTrue
                                    ? Container(
                                        width: 0,
                                      )
                                    : const Text(
                                        "+ Reorder Level",
                                        style: TextStyle(color: Colors.blue),
                                      )),
                                onTap: () {
                                  productController.manageorderlevel.value =
                                      !productController.manageorderlevel.value;
                                },
                              ),
                            if (productController.virtualProduct.isFalse)
                              InkWell(
                                child: Obx(() => productController
                                        .managediscount.isTrue
                                    ? Container(
                                        width: 0,
                                      )
                                    : const Text(
                                        "+ Discount",
                                        style: TextStyle(color: Colors.blue),
                                      )),
                                onTap: () {
                                  productController.managediscount.value =
                                      !productController.managediscount.value;
                                },
                              ),
                          ],
                        ),
                      if (userController
                              .currentUser.value?.primaryShop?.isRestaurant ==
                          true)
                        Obx(() => productController.manageAccompaniments.isFalse
                            ? Container()
                            : Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const SizedBox(height: 10),
                                  Row(
                                    children: [
                                      const Expanded(
                                        child: Text("Accompaniments",
                                            style: TextStyle(
                                                fontWeight: FontWeight.bold)),
                                      ),
                                      TextButton.icon(
                                        onPressed: () =>
                                            _addGroupDialog(context),
                                        icon: const Icon(Icons.add, size: 18),
                                        label: const Text("Add group"),
                                      ),
                                    ],
                                  ),
                                  ...productController.accompanimentGroups.map(
                                    (group) => Card(
                                      margin: const EdgeInsets.only(bottom: 8),
                                      child: Padding(
                                        padding: const EdgeInsets.all(8),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                Expanded(
                                                  child: Text(group.name,
                                                      style: const TextStyle(
                                                          fontWeight:
                                                              FontWeight.w600)),
                                                ),
                                                Text(
                                                  group.type == 'fixed'
                                                      ? "Always included"
                                                      : "Customer chooses",
                                                  style: TextStyle(
                                                      fontSize: 11,
                                                      color: Colors.grey[600]),
                                                ),
                                                IconButton(
                                                  icon: const Icon(
                                                      Icons.delete_outline,
                                                      size: 18,
                                                      color: Colors.red),
                                                  onPressed: () =>
                                                      productController
                                                          .accompanimentGroups
                                                          .remove(group),
                                                ),
                                              ],
                                            ),
                                            Wrap(
                                              spacing: 6,
                                              children: [
                                                ...group.options
                                                    .map((o) => Chip(
                                                          label: Text(o.name,
                                                              style:
                                                                  const TextStyle(
                                                                      fontSize:
                                                                          12)),
                                                          onDeleted: () {
                                                            group.options
                                                                .remove(o);
                                                            productController
                                                                .accompanimentGroups
                                                                .refresh();
                                                          },
                                                        )),
                                                ActionChip(
                                                  label: const Text("+ option"),
                                                  onPressed: () =>
                                                      _addOptionDialog(
                                                          context, group),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              )),
                      if (productController.managebyPrice.isFalse)
                        const SizedBox(height: 10),
                      Obx(() => productController.manageDescription.isFalse
                          ? Container()
                          : Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Text("Description"),
                                    const Spacer(),
                                    InkWell(
                                      onTap: () {
                                        productController.descriptionController
                                            .clear();
                                        productController
                                            .manageDescription.value = false;
                                      },
                                      child: const Icon(
                                        Icons.delete,
                                        color: Colors.red,
                                        size: 18,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 5),
                                TextFormField(
                                  controller:
                                      productController.descriptionController,
                                  minLines: 3,
                                  maxLines: 6,
                                  decoration: InputDecoration(
                                    fillColor: Colors.white,
                                    filled: true,
                                    hintText: "Optional",
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                ),
                              ],
                            )),
                      const SizedBox(height: 5),
                      Obx(() => productController.manageBarcode.isFalse
                          ? Container()
                          : Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Text("Barcode"),
                                    const Spacer(),
                                    InkWell(
                                      onTap: () {
                                        productController.barcodeController
                                            .clear();
                                        productController.manageBarcode.value =
                                            false;
                                      },
                                      child: const Icon(
                                        Icons.delete,
                                        color: Colors.red,
                                        size: 18,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 5),
                                TextFormField(
                                  controller:
                                      productController.barcodeController,
                                  keyboardType: TextInputType.text,
                                  decoration: InputDecoration(
                                    fillColor: Colors.white,
                                    filled: true,
                                    hintText: "Type or scan barcode",
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    suffixIcon: IconButton(
                                      tooltip: 'Scan barcode',
                                      icon: Icon(
                                        Icons.qr_code_scanner,
                                        color: AppColors.mainColor,
                                      ),
                                      onPressed: () => _scanBarcode(context),
                                    ),
                                  ),
                                ),
                              ],
                            )),
                      const SizedBox(height: 10),
                      buildUploadImagesTile(context),
                      if (productController.isProduct())
                        Obx(
                          () => InkWell(
                            onTap: () {
                              productController.generateBarcodeOnSave.value =
                                  !productController
                                      .generateBarcodeOnSave.value;
                            },
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Text("Generate Barcode on save?"),
                                Checkbox(
                                    value: productController
                                        .generateBarcodeOnSave.value,
                                    onChanged: (v) async {
                                      final SharedPreferences storage =
                                          await SharedPreferences.getInstance();
                                      productController
                                          .generateBarcodeOnSave.value = v!;
                                      storage.setString(
                                          "print_barcode", v.toString());
                                    }),
                              ],
                            ),
                          ),
                        ),
                      const SizedBox(height: 5),
                      Obx(() => productController.creatingProductLoad.value
                          ? const Center(
                              child: CircularProgressIndicator(),
                            )
                          : InkWell(
                              splashColor: Colors.transparent,
                              onTap: () async {
                                if (page == "edit") {
                                  await productController.updateProducts(
                                      productData: productModel);
                                } else {
                                  await productController.saveProducts(
                                      productData: productModel);
                                }
                              },
                              child: Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                    border: Border.all(
                                        width: 3, color: AppColors.mainColor),
                                    borderRadius: BorderRadius.circular(40)),
                                child: Center(
                                    child: majorTitle(
                                        title: page == "create"
                                            ? productController.isProduct()
                                                ? "Add Product"
                                                : "Add Service"
                                            : "Update",
                                        color: AppColors.mainColor,
                                        size: 18.0)),
                              )))
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _scanBarcode(BuildContext context) {
    final GlobalKey qrKey = GlobalKey(debugLabel: 'QR');
    QRViewController? qrController;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.black,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => SizedBox(
        height: MediaQuery.of(context).size.height * 0.5,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Scan Barcode",
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold)),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: () {
                      qrController?.dispose();
                      Navigator.pop(context);
                    },
                  ),
                ],
              ),
            ),
            Expanded(
              child: QRView(
                key: qrKey,
                onQRViewCreated: (controller) {
                  qrController = controller;
                  controller.scannedDataStream.listen((scanData) {
                    final code = scanData.code;
                    if (code != null && code.isNotEmpty) {
                      productController.barcodeController.text = code;
                      controller.dispose();
                      Navigator.pop(context);
                    }
                  });
                },
                overlay: QrScannerOverlayShape(
                  borderColor: AppColors.mainColor,
                  borderRadius: 10,
                  borderLength: 30,
                  borderWidth: 8,
                  cutOutSize: 220,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                "Point camera at barcode or QR code",
                style: TextStyle(color: Colors.grey[400], fontSize: 13),
              ),
            ),
          ],
        ),
      ),
    ).whenComplete(() => qrController?.dispose());
  }

  Widget buildUploadImagesTile(BuildContext context) {
    return ExpansionTile(
      maintainState: true,
      iconColor: AppColors.mainColor,
      initiallyExpanded: true,
      collapsedIconColor: AppColors.mainColor,
      title: Text(
        productController.isProduct() ? "Product Images" : "Service Images",
        style: TextStyle(
            color: AppColors.mainColor,
            fontSize: 18,
            fontWeight: FontWeight.w600),
      ),
      leading: Icon(Icons.image, color: AppColors.mainColor),
      childrenPadding: const EdgeInsets.symmetric(horizontal: 20),
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0),
          child: IconButton(
              icon: Icon(Icons.add_a_photo, color: AppColors.mainColor),
              color: AppColors.lightDeepPurple,
              onPressed: () {
                addImageButtonCallback(context);
              }),
        ),
        Obx(() => SizedBox(
              height: productController.selectedImages.isEmpty ? 0 : 90,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: productController.selectedImages.length,
                itemBuilder: (context, index) {
                  return SizedBox(
                    width: 90,
                    height: 90,
                    child: Padding(
                      padding: const EdgeInsets.all(5.0),
                      child: GestureDetector(
                        onTap: () {
                          addImageButtonCallback(context, index: index);
                        },
                        child: productController
                                    .selectedImages[index].imgType ==
                                ImageType.local
                            ? Image.memory(
                                File(productController
                                        .selectedImages[index].path)
                                    .readAsBytesSync(),
                                fit: BoxFit.fitWidth,
                              )
                            : Image.network(
                                productController.selectedImages[index].path),
                      ),
                    ),
                  );
                },
              ),
            )),
      ],
    );
  }
}

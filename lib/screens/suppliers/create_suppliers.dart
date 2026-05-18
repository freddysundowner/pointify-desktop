import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/screens/product/create_product.dart';
import 'package:pointify/screens/sales/create_sale.dart';
import 'package:pointify/screens/suppliers/suppliers_page.dart';

import '../../../../utils/colors.dart';
import '../../controllers/customercontroller.dart';
import '../../controllers/homecontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../controllers/suppliercontroller.dart';
import '../../main.dart';
import '../../widgets/major_title.dart';
import '../../widgets/minor_title.dart';

class CreateSuppliers extends StatelessWidget {
  final String? page;

  CreateSuppliers({
    Key? key,
    required this.page,
  }) : super(key: key) {
    supplierController.nameController.clear();
    supplierController.phoneController.clear();
  }

  final CustomerController customersController = Get.find<CustomerController>();

  final SupplierController supplierController = Get.find<SupplierController>();

  final ShopController shopController = Get.find<ShopController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff7f7fb),
      appBar: AppBar(
        elevation: 0,
        titleSpacing: 0,
        centerTitle: false,
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        leading: IconButton(
          onPressed: () {
            if (!isSmallScreen(context)) {
              if (page == "suppliersPage") {
                Get.find<HomeController>().selectedWidget.value =
                    SuppliersPage();
              }

              if (page == "createSale") {
                Get.find<HomeController>().selectedWidget.value = CreateSale();
              }

              if (page == "createProduct") {
                Get.find<HomeController>().selectedWidget.value = CreateProduct(
                  page: "create",
                  productModel: null,
                );
              }
            } else {
              Get.back();
            }
          },
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            color: Colors.black,
            size: 20,
          ),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            majorTitle(
              title: "New Supplier",
              color: Colors.black,
              size: 17.0,
            ),
            minorTitle(
              title: userController.currentUser.value?.primaryShop?.name,
              color: Colors.grey,
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        child: customerInfoCard(context),
      ),
    );
  }

  Widget customerInfoCard(context) {
    return Center(
      child: Container(
        constraints: const BoxConstraints(
          maxWidth: 500,
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(
                  color: Colors.grey.shade200,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(.03),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Supplier Name",
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: Colors.grey.shade700,
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: supplierController.nameController,
                    keyboardType: TextInputType.text,
                    decoration: InputDecoration(
                      hintText: "eg. John Suppliers Ltd",
                      prefixIcon: const Icon(
                        Icons.person_outline,
                      ),
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(
                          16,
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(
                          16,
                        ),
                        borderSide: BorderSide(
                          color: Colors.grey.shade300,
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(
                          16,
                        ),
                        borderSide: BorderSide(
                          color: AppColors.mainColor,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 22),
                  Text(
                    "Phone Number",
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: Colors.grey.shade700,
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextFormField(
                    controller: supplierController.phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: InputDecoration(
                      hintText: "eg. 07XXXXXXXX",
                      prefixIcon: const Icon(
                        Icons.phone_outlined,
                      ),
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(
                          16,
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(
                          16,
                        ),
                        borderSide: BorderSide(
                          color: Colors.grey.shade300,
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(
                          16,
                        ),
                        borderSide: BorderSide(
                          color: AppColors.mainColor,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        elevation: 0,
                        backgroundColor: AppColors.mainColor,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(
                            16,
                          ),
                        ),
                      ),
                      onPressed: () async {
                        await supplierController.createSupplier(
                          context: context,
                          page: page,
                        );
                      },
                      child: const Text(
                        "Save Supplier",
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

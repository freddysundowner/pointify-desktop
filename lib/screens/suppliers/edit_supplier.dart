import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/screens/suppliers/supplier_info_page.dart';

import '../../controllers/homecontroller.dart';
import '../../controllers/suppliercontroller.dart';
import '../../utils/colors.dart';

class EditSupplier extends StatelessWidget {
  final String? userType;

  EditSupplier({Key? key, this.userType}) :super(key: key){
    supplierController.nameController.text =
        supplierController.supplier.value!.name!;
    supplierController.phoneController.text =
        supplierController.supplier.value!.phoneNumber ?? "";
    supplierController.emailController.text =
        supplierController.supplier.value!.email ?? "";
    supplierController.addressController.text =
        supplierController.supplier.value!.address ?? "";
  }

  final SupplierController supplierController = Get.find<SupplierController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        elevation: 0.0,
        title: Text(
          "Edit Supplier".capitalize!,
          style:
              const TextStyle(fontWeight: FontWeight.bold, color: Colors.black),
        ),
        leading: IconButton(
            onPressed: () {
              if (isSmallScreen(context)) {
                Get.back();
              } else {
                Get.find<HomeController>().selectedWidget.value =
                    SupplierInfoPage(
                        supplierModel: supplierController.supplier.value!);
              }
            },
            icon: const Icon(
              Icons.arrow_back_ios,
              color: Colors.black,
            )),
        backgroundColor: Colors.transparent,
        actions: [
          if (!isSmallScreen(context))
            Padding(
              padding: const EdgeInsets.only(right: 8.0, top: 3),
              child: TextButton(
                  onPressed: () {
                    supplierController
                        .updateSupplier(supplierController.supplier.value!);
                  },
                  child: Text("Save Changes".toUpperCase(),
                      style:  TextStyle(
                          color: AppColors.mainColor, fontWeight: FontWeight.bold))),
            )
        ],
      ),
      body: Container(
        padding: EdgeInsets.symmetric(
                horizontal: isSmallScreen(context) ? 10 : 25,
                vertical: isSmallScreen(context) ? 10 : 20)
            .copyWith(bottom: 3),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextFormField(
              controller: supplierController.nameController,
              decoration: InputDecoration(
                  hintText: "name",
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5))),
            ),
            const SizedBox(
              height: 7,
            ),
            TextFormField(
              controller: supplierController.phoneController,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                  hintText: "phone number",
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5))),
            ),
            const SizedBox(
              height: 7,
            ),
            TextFormField(
              controller: supplierController.emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                  hintText: "Email",
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5))),
            ),
            const SizedBox(
              height: 7,
            ),
            const SizedBox(
              height: 7,
            ),
            TextFormField(
              controller: supplierController.addressController,
              decoration: InputDecoration(
                  hintText: "Address",
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5))),
            ),
            const SizedBox(
              height: 10,
            ),
            if (isSmallScreen(context))
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () {
                      Navigator.pop(context);
                    },
                    child: Text(
                      "Cancel".toUpperCase(),
                      style:  TextStyle(
                          color: AppColors.mainColor, fontWeight: FontWeight.bold),
                    ),
                  ),
                  TextButton(
                      onPressed: () {
                        supplierController
                            .updateSupplier(supplierController.supplier.value!);
                      },
                      child: Text("Save Changes".toUpperCase(),
                          style:  TextStyle(
                              color: AppColors.mainColor,
                              fontWeight: FontWeight.bold)))
                ],
              )
          ],
        ),
      ),
    );
  }
}

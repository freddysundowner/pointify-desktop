import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/screens/customers/customer_info_page.dart';

import '../../controllers/customercontroller.dart';
import '../../controllers/homecontroller.dart';
import '../../utils/colors.dart';

class EditCustomer extends StatelessWidget {
  final String? userType;

  EditCustomer({Key? key, this.userType}) : super(key: key);

  final CustomerController customersController = Get.find<CustomerController>();

  @override
  Widget build(BuildContext context) {
    customersController.nameController.text =
        customersController.currentCustomer.value?.name ?? '';
    customersController.phoneController.text =
        customersController.currentCustomer.value?.phoneNumber ?? '';
    return Scaffold(
      appBar: AppBar(
        elevation: 0.0,
        title: Text(
          "Edit ${userType ?? "Customer"}".capitalize!,
          style:
              const TextStyle(fontWeight: FontWeight.bold, color: Colors.black),
        ),
        leading: IconButton(
            onPressed: () {
              Get.back();
            },
            icon: const Icon(
              Icons.arrow_back_ios,
              color: Colors.black,
            )),
        backgroundColor: Colors.transparent,
      ),
      body: Container(
        padding: EdgeInsets.only(left: 10, right: 10, top: 10, bottom: 3),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextFormField(
              controller: customersController.nameController,
              decoration: InputDecoration(
                  hintText: "name",
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5))),
            ),
            SizedBox(
              height: 7,
            ),
            TextFormField(
              controller: customersController.phoneController,
              keyboardType: TextInputType.phone,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: InputDecoration(
                  hintText: "phone number",
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5))),
            ),
            SizedBox(
              height: 7,
            ),
            TextFormField(
              controller: customersController.emailController,
              decoration: InputDecoration(
                  hintText: "Email",
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5))),
            ),
            SizedBox(
              height: 7,
            ),
            TextFormField(
              controller: customersController.addressController,
              decoration: InputDecoration(
                  hintText: "Address",
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5))),
            ),
            const SizedBox(
              height: 10,
            ),
            TextFormField(
              controller: customersController.creditLimitController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                  hintText: "Credit Limit e.g 10000",
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(5))),
            ),
            const SizedBox(
              height: 10,
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () {
                    Navigator.pop(context);
                  },
                  child: Text(
                    "Cancel".toUpperCase(),
                    style: TextStyle(
                        color: AppColors.mainColor,
                        fontWeight: FontWeight.bold),
                  ),
                ),
                TextButton(
                    onPressed: () {
                      Navigator.pop(context);
                      customersController.updateCustomer(
                          context, customersController.currentCustomer.value!);
                    },
                    child: Text("Save Changes".toUpperCase(),
                        style: TextStyle(
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

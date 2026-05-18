import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/homecontroller.dart';
import 'package:pointify/responsive/responsiveness.dart';

import '../../controllers/ordercontroller.dart';
import '../../utils/colors.dart';
import '../../utils/themer.dart';

class CustomerSignUp extends StatelessWidget {
  final String? toPage;
  CustomerSignUp({super.key, this.toPage});
  final OrderController orderController = Get.find<OrderController>();
  final HomeController homeController = Get.find<HomeController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
            backgroundColor: Colors.white,
            elevation: 0.0,
            leading: IconButton(
                onPressed: () {
                  Get.back();
                },
                icon: const Icon(
                  Icons.clear,
                  color: Colors.black,
                ))),
        backgroundColor: Colors.white,
        body: Obx(
          () => ListView(
            children: [
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  children: [
                    const Text("Are you an existing customer?"),
                    const SizedBox(
                      height: 10,
                    ),
                    TextFormField(
                      keyboardType: TextInputType.number,
                      controller: orderController.trackingNumber,
                      decoration: InputDecoration(
                        hintText: "Enter Customer Email",
                        fillColor: Colors.white,
                        filled: true,
                        suffix: InkWell(
                          onTap: () {
                            orderController.getCustomerdata(
                                orderController.trackingNumber.text,
                                to: toPage);
                          },
                          child:  Icon(
                            Icons.search,
                            color: AppColors.mainColor,
                          ),
                        ),
                        contentPadding:
                            const EdgeInsets.fromLTRB(20, 10, 20, 10),
                        focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(100.0),
                            borderSide: const BorderSide(color: Colors.grey)),
                        enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(100.0),
                            borderSide:
                                BorderSide(color: Colors.grey.shade400)),
                        errorBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(100.0),
                            borderSide: const BorderSide(
                                color: Colors.red, width: 2.0)),
                        focusedErrorBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(100.0),
                            borderSide: const BorderSide(
                                color: Colors.red, width: 2.0)),
                      ),
                    ),
                    const SizedBox(
                      height: 20,
                    ),
                    const Text("OR"),
                    const SizedBox(
                      height: 10,
                    ),
                  ],
                ),
              ),
              InkWell(
                onTap: () {
                  orderController.nocustomernumber.value =
                      !orderController.nocustomernumber.value;
                },
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text("You don't have an account?"),
                      Obx(
                        () => Checkbox(
                            value: orderController.nocustomernumber.value,
                            onChanged: (value) {
                              orderController.nocustomernumber.value =
                                  !orderController.nocustomernumber.value;
                            }),
                      ),
                    ],
                  ),
                ),
              ),
              if (orderController.nocustomernumber.isTrue)
                Column(
                  children: [
                    const SizedBox(height: 10),
                    const Padding(
                      padding: EdgeInsets.only(left: 20.0, right: 20),
                      child: Text(
                        "Let us know your contact details",
                        style: TextStyle(
                            color: Colors.black,
                            fontSize: 20,
                            fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.all(10),
                      margin: const EdgeInsets.all(10),
                      child: Form(
                        key: orderController.signupkey,
                        child: Column(
                          children: [
                            Container(
                              decoration:
                                  ThemeHelper().inputBoxDecorationShaddow(),
                              child: TextFormField(
                                controller: orderController.nameController,
                                validator: (value) {
                                  if (value == null || value.isEmpty) {
                                    return 'Please enter your name';
                                  }
                                  return null;
                                },
                                keyboardType: TextInputType.text,
                                decoration: ThemeHelper().textInputDecoration(
                                        'Full Names*', 'Enter your full names'),
                              ),
                            ),
                            const SizedBox(height: 20.0),
                            Container(
                              decoration:
                                  ThemeHelper().inputBoxDecorationShaddow(),
                              child: TextFormField(
                                controller: orderController.emailController,
                                decoration: ThemeHelper().textInputDecoration(
                                        "E-mail address*", "Enter your email"),
                                keyboardType: TextInputType.emailAddress,
                                validator: (value) {
                                  if (value == null || value.isEmpty) {
                                    return 'Please enter your email';
                                  } else if (!orderController
                                      .validateEmail(value)) {
                                    return 'Please enter a valid email';
                                  } else {
                                    return null;
                                  }
                                },
                              ),
                            ),
                            const SizedBox(height: 20.0),
                            Container(
                              decoration:
                                  ThemeHelper().inputBoxDecorationShaddow(),
                              child: TextFormField(
                                controller: orderController.phoneController,
                                decoration: ThemeHelper().textInputDecoration(
                                    "Mobile Number*",
                                    "Enter your mobile number"),
                                keyboardType: TextInputType.phone,
                                validator: (value) {
                                  if (value == null || value.isEmpty) {
                                    return 'Please enter your phone number';
                                  }
                                  return null;
                                },
                              ),
                            ),
                            const SizedBox(height: 20.0),
                            Container(
                              decoration:
                                  ThemeHelper().inputBoxDecorationShaddow(),
                              child: TextFormField(
                                controller: orderController.comment,
                                decoration: InputDecoration(
                                  hintText: "Additional information (optional)",
                                  fillColor: Colors.white,
                                  filled: true,
                                  contentPadding:
                                      const EdgeInsets.fromLTRB(20, 10, 20, 10),
                                  focusedBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(10.0),
                                      borderSide:
                                          const BorderSide(color: Colors.grey)),
                                  enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(10.0),
                                      borderSide: BorderSide(
                                          color: Colors.grey.shade400)),
                                  errorBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(10.0),
                                      borderSide: const BorderSide(
                                          color: Colors.red, width: 2.0)),
                                  focusedErrorBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(10.0),
                                      borderSide: const BorderSide(
                                          color: Colors.red, width: 2.0)),
                                ),
                                keyboardType: TextInputType.text,
                                maxLines: 6,
                                validator: (value) {
                                  if (value == null || value.isEmpty) {
                                    return 'Please enter your phone number';
                                  }
                                  return null;
                                },
                              ),
                            ),
                            const SizedBox(height: 20.0),
                            Obx(
                              () => orderController.checkEmailExists.isTrue
                                  ? const Center(
                                      child: CircularProgressIndicator(),
                                    )
                                  : ElevatedButton(
                                      style: ThemeHelper().buttonStyle(),
                                      child: Padding(
                                        padding: const EdgeInsets.fromLTRB(
                                            40, 10, 40, 10),
                                        child: Text(
                                          "Continue".toUpperCase(),
                                          style: const TextStyle(
                                            fontSize: 20,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ),
                                      onPressed: () {
                                        orderController.verifyUser();
                                      },
                                    ),
                            ),
                            const SizedBox(height: 10.0),
                          ],
                        ),
                      ),
                    ),
                  ],
                )
            ],
          ),
        ));
  }
}

// ignore_for_file: prefer_const_constructors
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/responsive/responsiveness.dart';

import '../../../controllers/authcontroller.dart';
import '../../../controllers/homecontroller.dart';
import '../../../utils/themer.dart';

class AttendantLogin extends StatelessWidget {
  AttendantLogin({Key? key}) : super(key: key);
  final AuthController authController = Get.find<AuthController>();
  final HomeController homeController = Get.find<HomeController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
            backgroundColor: MediaQuery.of(context).size.width <= 600
                ? Colors.transparent
                : Colors.white,
            elevation: 0.0,
            leading: IconButton(
                onPressed: () {
                  Get.back();
                },
                icon: Icon(
                  Icons.clear,
                  color: Colors.black,
                ))),
        backgroundColor: Colors.white,
        body: SingleChildScrollView(
          child: Column(
            children: [
              Column(
                children: [
                  Image.asset(
                    "assets/images/logo2.png",
                    width: 250,
                  ),
                  Text("An enterprise in your hands."),
                  SizedBox(
                    height: 20,
                  ),
                ],
              ),
              SizedBox(
                height: 40,
              ),
              Column(
                children: [
                  Text(
                    'Login as a cashier',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 30.0),
                  loginAttendant(context),
                ],
              ),
            ],
          ),
        ));
  }

  Widget loginAttendant(context) {
    return Form(
        key: authController.loginAttendantKey,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 25),
          child: Column(
            children: [
              Container(
                decoration: ThemeHelper().inputBoxDecorationShaddow(),
                child: TextFormField(
                  controller: authController.attendantUidController,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter your userid';
                    }
                    return null;
                  },
                  keyboardType: TextInputType.number,
                  decoration: ThemeHelper()
                      .textInputDecoration('UserId', 'Enter your UserID'),
                ),
              ),
              SizedBox(height: 20.0),
              Container(
                decoration: ThemeHelper().inputBoxDecorationShaddow(),
                child: TextFormField(
                  controller: authController.attendantPasswordController,
                  obscureText: true,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter your password';
                    }
                    return null;
                  },
                  decoration: ThemeHelper()
                      .textInputDecoration('Password', 'Enter your password'),
                ),
              ),
              SizedBox(height: 25.0),
              Obx(() {
                return authController.loginAttendantLoad.value
                    ? Center(
                        child: CircularProgressIndicator(),
                      )
                    : Container(
                        decoration: ThemeHelper().buttonBoxDecoration(context),
                        child: ElevatedButton(
                          style: ThemeHelper().buttonStyle(),
                          child: Padding(
                            padding: EdgeInsets.fromLTRB(40, 10, 40, 10),
                            child: Text(
                              'Next'.toUpperCase(),
                              style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white),
                            ),
                          ),
                          onPressed: () {
                            authController.attendantLogin(context);
                          },
                        ),
                      );
              }),
            ],
          ),
        ));
  }
}

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/homecontroller.dart';
import 'package:pointify/responsive/responsiveness.dart';

import '../../../controllers/authcontroller.dart';
import '../../../utils/app_config.dart';
import '../../../utils/themer.dart';

class ForgotPassword extends StatelessWidget {
  ForgotPassword({Key? key}) : super(key: key);
  final AuthController authController = Get.find<AuthController>();
  final HomeController homeController = Get.find<HomeController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        backgroundColor: Colors.white,
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
        body: SingleChildScrollView(
          child: Column(
            children: [
              Column(
                children: [
                 if(AppConfig.app_logo.isNotEmpty)CachedNetworkImage(imageUrl: AppConfig.app_logo ,width: 250,),
                  Text(AppConfig.app_slogan ?? "An enterprise in your hands."),
                  const SizedBox(
                    height: 40,
                  ),
                ],
              ),
              const SizedBox(
                height: 40,
              ),
              Column(
                children: [
                  _title(),
                  const SizedBox(height: 30.0),
                  loginForm(context),
                ],
              ),
            ],
          ),
        ));
  }

  Padding _title() {
    return const Padding(
      padding: EdgeInsets.only(left: 20.0),
      child: Text(
        'Forgot password',
        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget loginForm(context) {
    return Obx(
      () => Form(
          key: authController.adminresetPassWordFormKey,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 25),
            child: Column(
              children: [
                if (authController.resetPassword.isFalse)
                  Container(
                    decoration: ThemeHelper().inputBoxDecorationShaddow(),
                    child: TextFormField(
                      controller: authController.emailController,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Please enter your email';
                        }
                        return null;
                      },
                      keyboardType: TextInputType.emailAddress,
                      decoration: ThemeHelper().textInputDecoration(
                              'Email', 'Enter your email'),
                    ),
                  ),
                if (authController.resetPassword.isFalse)
                  const SizedBox(height: 15.0),
                if (authController.resetPassword.isTrue)
                  Container(
                    decoration: ThemeHelper().inputBoxDecorationShaddow(),
                    child: TextFormField(
                      controller: authController.otpController,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Please enter otp';
                        }
                        return null;
                      },
                      keyboardType: TextInputType.number,
                      decoration: ThemeHelper().textInputDecoration(
                          'Otp', 'Enter otp in your email'),
                    ),
                  ),
                if (authController.resetPassword.isTrue)
                  const SizedBox(height: 15.0),
                if (authController.resetPassword.isTrue)
                  Container(
                    decoration: ThemeHelper().inputBoxDecorationShaddow(),
                    child: TextFormField(
                      controller: authController.passwordController,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Please enter new password';
                        }
                        return null;
                      },
                      keyboardType: TextInputType.emailAddress,
                      decoration: ThemeHelper().textInputDecoration(
                              'new password', 'Enter your new password'),
                    ),
                  ),
                if (authController.resetPassword.isTrue)
                  const SizedBox(height: 15.0),
                if (authController.resetPassword.isTrue)
                  Container(
                    decoration: ThemeHelper().inputBoxDecorationShaddow(),
                    child: TextFormField(
                      controller: authController.passwordControllerConfirm,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Please confirm password';
                        }
                        if (value != authController.passwordController.text) {
                          return "Password must match";
                        }
                        return null;
                      },
                      keyboardType: TextInputType.emailAddress,
                      decoration: ThemeHelper().textInputDecoration(
                              'confirm password', 'Please confirm password'),
                    ),
                  ),
                if (authController.resetPassword.isTrue)
                  const SizedBox(height: 15.0),
                Obx(() {
                  return authController.loginuserLoad.value
                      ? const Center(
                          child: CircularProgressIndicator(),
                        )
                      : ElevatedButton(
                          style: ThemeHelper().buttonStyle(),
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(40, 10, 40, 10),
                            child: Text(
                              (authController.resetPassword.isTrue
                                      ? 'Reset'
                                      : 'Send')
                                  .toUpperCase(),
                              style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white),
                            ),
                          ),
                          onPressed: () {
                            if (authController
                                .adminresetPassWordFormKey.currentState!
                                .validate()) {
                              if (authController.resetPassword.isTrue) {
                                authController.resetPasswordOtp();
                              } else {
                                authController.resetPasswordEmail(
                                    email: authController.emailController.text,
                                    password:
                                        authController.passwordController.text,
                                    type: "admin");
                              }
                            }
                          },
                        );
                }),
              ],
            ),
          )),
    );
  }
}

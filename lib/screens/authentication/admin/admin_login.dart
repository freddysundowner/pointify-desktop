import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/authcontroller.dart';
import 'package:pointify/controllers/homecontroller.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/screens/authentication/admin/forgot_password.dart';
import 'package:pointify/screens/authentication/admin/sign_up.dart';
import 'package:pointify/screens/authentication/landing.dart';

import '../../../utils/app_config.dart';
import '../../../utils/colors.dart';
import '../../../utils/themer.dart';

class AdminLogin extends StatefulWidget {
  AdminLogin({Key? key}) : super(key: key);

  @override
  State<AdminLogin> createState() => _AdminLoginState();
}

class _AdminLoginState extends State<AdminLogin> {
  final AuthController authController = Get.find<AuthController>();

  final HomeController homeController = Get.find<HomeController>();

  final AuthController appController = Get.find<AuthController>();
  bool agreeToTerms = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
            backgroundColor: Colors.white,
            elevation: 0.0,
            leading: IconButton(
                onPressed: () {
                  Get.to(() => const Landing());
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
                  if (AppConfig.app_logo.isNotEmpty)
                    CachedNetworkImage(
                      imageUrl: AppConfig.app_logo,
                      width: 250,
                    ),
                  Text(AppConfig.app_slogan ?? "An enterprise in your hands."),
                  const SizedBox(
                    height: 40,
                  ),
                ],
              ),
              loginForm(context),
            ],
          ),
        ));
  }

  Padding _title() {
    return const Padding(
      padding: EdgeInsets.only(left: 20.0),
      child: Text(
        'Login as a shop owner',
        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget loginForm(context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        _title(),
        const SizedBox(
          height: 20,
        ),
        Form(
            child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 25),
          child: Column(
            children: [
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
                  decoration: ThemeHelper()
                      .textInputDecoration('Email', 'Enter your email'),
                ),
              ),
              const SizedBox(height: 20.0),
              Container(
                decoration: ThemeHelper().inputBoxDecorationShaddow(),
                child: Obx(
                  () => TextFormField(
                    controller: authController.passwordController,
                    obscureText: authController.showPassword.value,
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter your password';
                      }
                      return null;
                    },
                    decoration: ThemeHelper().textInputDecoration(
                        'Password',
                        'Enter your password',
                        authController.showPassword.value
                            ? Icons.visibility_off
                            : Icons.visibility, () {
                      authController.showPassword.value =
                          !authController.showPassword.value;
                    }),
                  ),
                ),
              ),
              const SizedBox(height: 10.0),
              Align(
                alignment: Alignment.topRight,
                child: InkWell(
                  onTap: () {
                    authController.resetPassword.value = false;
                    Get.to(() => ForgotPassword());
                  },
                  child: Text(
                    "Forgot Password?",
                    style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                        color: AppColors.mainColor,
                        decoration: TextDecoration.underline),
                  ),
                ),
              ),
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
                            'Sign In'.toUpperCase(),
                            style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Colors.white),
                          ),
                        ),
                        onPressed: () {
                          authController.login(context, type: "auth");
                        },
                      );
              }),
              Container(
                margin: const EdgeInsets.fromLTRB(10, 20, 10, 20),
                child: Text.rich(TextSpan(children: [
                  const TextSpan(text: "Don't have an account? "),
                  TextSpan(
                    text: 'Create',
                    recognizer: TapGestureRecognizer()
                      ..onTap = () {
                        Get.to(() => SignUp());
                      },
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ])),
              ),
            ],
          ),
        )),
      ],
    );
  }
}

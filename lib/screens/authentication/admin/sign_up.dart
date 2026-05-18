import 'package:cached_network_image/cached_network_image.dart';
import 'package:country_code_picker/country_code_picker.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/homecontroller.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../controllers/authcontroller.dart';
import '../../../utils/app_config.dart';
import '../../../utils/themer.dart';

class SignUp extends StatelessWidget {
  final AuthController authController = Get.find<AuthController>();
  final  HomeController homeController = Get.find<HomeController>();

  SignUp({super.key});

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
        body: ListView(
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
            const SizedBox(height: 10),
            signUpForm(context)
          ],
        ));
  }

  final FocusNode focusNode = FocusNode();

  Widget signUpForm(context) {
    return Column(
      children: [
        const Padding(
          padding: EdgeInsets.only(left: 20.0, right: 20),
          child: Text(
            "Create Business Account",
            style: TextStyle(
                color: Colors.black, fontSize: 20, fontWeight: FontWeight.bold),
          ),
        ),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.all(10),
          margin: const EdgeInsets.all(10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                decoration: ThemeHelper().inputBoxDecorationShaddow(),
                child: TextFormField(
                  controller: authController.nameController,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter your username';
                    }
                    return null;
                  },
                  keyboardType: TextInputType.text,
                  decoration: ThemeHelper().textInputDecoration(
                          'Username*', 'Enter your username'),
                ),
              ),
              const SizedBox(height: 20.0),
              Container(
                decoration: ThemeHelper().inputBoxDecorationShaddow(),
                child: TextFormField(
                  controller: authController.emailController,
                  decoration: ThemeHelper().textInputDecoration(
                          "E-mail address*", "Enter your email"),
                  keyboardType: TextInputType.emailAddress,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter your email';
                    } else if (!authController.validateEmail(value)) {
                      return 'Please enter a valid email';
                    } else {
                      return null;
                    }
                  },
                ),
              ),
              const SizedBox(height: 20.0),
              Container(
                decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(7),
                    border: Border.all(color: Colors.grey, width: 1)),
                child: Row(
                  children: [
                    CountryCodePicker(
                      onChanged: (value) {
                        authController.selectedCountry.value = value;

                      },
                      initialSelection: 'KE',
                      showCountryOnly: false,
                      showOnlyCountryWhenClosed: false,
                      alignLeft: false,
                    ),
                    Expanded(
                        child: TextFormField(
                      controller: authController.phoneController,
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      decoration: InputDecoration(
                          filled: true,
                          fillColor: Colors.grey.withOpacity(0.1),
                          border: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          enabledBorder: InputBorder.none),
                    )),
                  ],
                ),
              ),
              const SizedBox(height: 20.0),
              Container(
                decoration: ThemeHelper().inputBoxDecorationShaddow(),
                child: Obx(
                  () => TextFormField(
                    controller: authController.passwordController,
                    keyboardType: TextInputType.text,
                    obscureText: authController.showPassword.value,
                    decoration: isSmallScreen(context)
                        ? ThemeHelper().textInputDecoration(
                            "Password*",
                            "Enter your password",
                            authController.showPassword.value
                                ? Icons.visibility_off
                                : Icons.visibility, () {
                            authController.showPassword.value =
                                !authController.showPassword.value;
                          })
                        : ThemeHelper().textInputDecoration(
                            "Password*",
                            "Enter your password",
                            authController.showPassword.value
                                ? Icons.visibility_off
                                : Icons.visibility, () {
                            authController.showPassword.value =
                                !authController.showPassword.value;
                          }),
                    validator: (val) {
                      if (val!.isEmpty) {
                        return "Please enter your password";
                      }
                      return null;
                    },
                  ),
                ),
              ),
              const SizedBox(height: 20.0),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 10),
                child: Text("Did someone refer you? (Optional)"),
              ),
              const SizedBox(height: 5.0),
              Container(
                decoration: ThemeHelper().inputBoxDecorationShaddow(),
                child: TextFormField(
                  controller: authController.referalController,
                  decoration: ThemeHelper().textInputDecoration(
                      "Enter referral id here if any",
                      "Enter referral id here if any"),
                  keyboardType: TextInputType.number,
                ),
              ),
              const SizedBox(height: 20.0),
              Center(
                child: Obx(
                  () => authController.signuserLoad.isTrue
                      ? const Center(
                          child: CircularProgressIndicator(),
                        )
                      : ElevatedButton(
                          style: ThemeHelper().buttonStyle(),
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(40, 10, 40, 10),
                            child: Text(
                              "Create Account".toUpperCase(),
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          onPressed: () {
                            authController.registerAdmin(context);
                          },
                        ),
                ),
              ),
              Container(
                margin: const EdgeInsets.fromLTRB(10, 20, 10, 20),
                child: Center(
                  child: Text.rich(
                    TextSpan(children: [
                      const TextSpan(text: "By registering you agree to our "),
                      TextSpan(
                        text: 'terms and conditions and privacy policy',
                        recognizer: TapGestureRecognizer()
                          ..onTap = () async {
                            String url = AppConfig.privacy_policy;
                            await launchUrl(Uri.parse(url));
                          },
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ]),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
              const SizedBox(height: 10.0),
            ],
          ),
        ),
      ],
    );
  }
}

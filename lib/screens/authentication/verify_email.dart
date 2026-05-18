import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/utils/colors.dart';
import 'package:pointify/widgets/textbutton.dart';

import '../../controllers/authcontroller.dart';
import '../../main.dart';
import '../profile/profile_update.dart';

class EmailVerificationPage extends StatelessWidget {
  EmailVerificationPage({super.key});

  final AuthController authController = Get.find<AuthController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Icon
                Icon(
                  Icons.mark_email_unread_outlined,
                  size: 80,
                  color: AppColors.mainColor,
                ),

                const SizedBox(height: 24),

                // Title
                const Text(
                  'Email Not Verified',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),

                const SizedBox(height: 12),

                // Description
                const Text(
                  'Please verify your email address to continue using your account.',
                  style: TextStyle(fontSize: 16, color: Colors.grey),
                  textAlign: TextAlign.center,
                ),

                const SizedBox(height: 32),

                // Resend email
                SizedBox(
                  width: double.infinity,
                  child: textBtn(
                    onPressed: () {
                      userController.sendVerificationEmail();
                    },
                    text: 'Resend Verification Email',
                    color: Colors.white,
                    bgColor: AppColors.mainColor,
                  ),
                ),

                const SizedBox(height: 16),

                // Already verified
                SizedBox(
                  width: double.infinity,
                  child: textBtn(
                    onPressed: () {
                      authController.initUser();
                    },
                    text: 'I Have Already Verified',
                    color: Colors.white,
                    bgColor: AppColors.mainColor,
                  ),
                ),

                const SizedBox(height: 24),

                // Divider
                Row(
                  children: const [
                    Expanded(child: Divider()),
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 8),
                      child: Text("OR"),
                    ),
                    Expanded(child: Divider()),
                  ],
                ),

                const SizedBox(height: 24),

                // Edit email
                SizedBox(
                  width: double.infinity,
                  child: textBtn(
                    onPressed: () {
                      Get.to(() => ProfileUpdate(editemail: true));
                    },
                    text: 'Edit Email Address',
                    color: Colors.white,
                    bgColor: Colors.grey.shade700,
                  ),
                ),

                const SizedBox(height: 16),

                // Logout
                SizedBox(
                  width: double.infinity,
                  child: textBtn(
                    onPressed: () {
                      authController.logOut();
                    },
                    text: 'Logout',
                    color: Colors.white,
                    bgColor: Colors.red,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

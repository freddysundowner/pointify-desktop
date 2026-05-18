import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/homecontroller.dart';
import 'package:pointify/main.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/screens/home/profile_page.dart';

import '../../utils/colors.dart';
import '../../widgets/major_title.dart';
import '../../widgets/profile_input_widget.dart';

class ProfileUpdate extends StatelessWidget {
  final bool editemail;
  ProfileUpdate({Key? key, this.editemail = false}) : super(key: key) {
    userController.nameController.text =
        userController.currentUser.value!.username ?? "";
    userController.emailController.text =
        userController.currentUser.value!.email ?? "";
    userController.phoneController.text =
        userController.currentUser.value!.phone ?? "";
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        titleSpacing: 0,
        backgroundColor: Colors.white,
        centerTitle: false,
        elevation: 0.3,
        title:
            majorTitle(title: "Edit Profile", color: Colors.black, size: 16.0),
        leading: IconButton(
          onPressed: () {
            if (isSmallScreen(context)) {
              Get.back();
            } else {
              Get.find<HomeController>().selectedWidget.value = ProfilePage();
            }
          },
          icon: const Icon(
            Icons.arrow_back_ios,
            color: Colors.black,
          ),
        ),
      ),
      body: Container(
        width: double.infinity,
        height: MediaQuery.of(context).size.height * 0.7,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(1.0),
          color: Colors.white,
        ),
        child: ListView(
          children: [
            const SizedBox(height: 10),
            if (!editemail)
              profileInputWidget(
                  controller: userController.nameController,
                  name: "Name",
                  type: "text"),
            if (!editemail) const SizedBox(height: 10),
            profileInputWidget(
                controller: userController.emailController,
                name: "Email",
                type: "email"),
            const SizedBox(height: 10),
            if (!editemail)
              profileInputWidget(
                  controller: userController.phoneController,
                  name: "Phone",
                  type: "number"),
            if (!editemail) const SizedBox(height: 30),
            Obx(() {
              return userController.profileupdateLoading.isTrue
                  ? const Center(
                      child: CircularProgressIndicator(),
                    )
                  : InkWell(
                      splashColor: Colors.transparent,
                      onTap: () async {
                        await userController.profileUpdate(
                            editEmail: editemail);
                      },
                      child: Center(
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          width: isSmallScreen(context) ? double.infinity : 300,
                          decoration: BoxDecoration(
                              border: Border.all(
                                  width: 3, color: AppColors.mainColor),
                              borderRadius: BorderRadius.circular(40)),
                          child: Center(
                              child: majorTitle(
                                  title: "Update Profile",
                                  color: AppColors.mainColor,
                                  size: 18.0)),
                        ),
                      ),
                    );
            })
          ],
        ),
      ),
    );
  }
}

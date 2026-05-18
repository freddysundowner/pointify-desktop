// TODO Implement this library.
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/shopcontroller.dart';
import 'package:pointify/widgets/no_items_found.dart';

import '../../../../utils/colors.dart';
import '../../../main.dart';
import '../../../models/usermodel.dart';
import '../../../widgets/attendant_card.dart';
import '../../../widgets/minor_title.dart';
import 'attendant_details.dart';

class AttendantsPage extends StatelessWidget {
  final String? type;

  AttendantsPage({super.key, this.type});

  final ShopController shopController = Get.find<ShopController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
            child: SingleChildScrollView(
          child: Container(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                createAttendantWidget(context),
                const Divider(),
                Obx(() {
                  return userController.attendantsloading.isTrue
                      ? const Center(child: CircularProgressIndicator())
                      : userController.attendants.isEmpty
                          ? noItemsFound(context, true)
                          : ListView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: userController.attendants.length,
                              itemBuilder: (context, index) {
                                UserModel attendantModel =
                                    userController.attendants.elementAt(index);
                                return attendantCard(
                                    userModel: attendantModel,
                                    function: type != "switch"
                                        ? null
                                        : (UserModel userModel) {
                                            switchInit(usermodel: userModel);
                                          });
                              });
                }),
              ],
            ),
          ),
        )));
  }

  Future<void> switchInit({UserModel? usermodel}) async {
    userController.switcheduser.value = usermodel;

    await authController.initUser();
    Get.back();
    userController.switcheduser.refresh();
  }

  Widget createAttendantWidget(context) {
    return Padding(
      padding: const EdgeInsets.all(3.0),
      child: InkWell(
        onTap: () {
          if (type == "switch") {
            userController.switcheduser.value = null;
            switchInit();
            Get.back();
          } else {
            userController.nameController.clear();
            userController.passwordController.clear();

            Get.to(() => AttendantDetails(
                  userModel: null,
                ));
          }
        },
        child: Align(
          alignment: Alignment.topRight,
          child: Container(
            padding: const EdgeInsets.fromLTRB(10, 5, 10, 5),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.mainColor, width: 2),
            ),
            child: minorTitle(
                title: type == "switch" ? "Back to Admin" : "+ Add attendant",
                color: AppColors.mainColor),
          ),
        ),
      ),
    );
  }
}

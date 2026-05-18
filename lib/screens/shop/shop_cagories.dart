import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/shopcontroller.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/screens/shop/create_shop.dart';
import 'package:pointify/screens/shop/edit_shop_details.dart';
import 'package:pointify/utils/colors.dart';

import '../../controllers/authcontroller.dart';
import '../../controllers/homecontroller.dart';
import '../../models/shop.dart';
import '../../widgets/major_title.dart';

//ignore: must_be_immutable
class ShopCategories extends StatelessWidget {
  final String page;
  final Shop? shopModel;
  final Function? selectedItemsCallback;

  ShopCategories(
      {super.key,
      this.selectedItemsCallback,
      required this.page,
      this.shopModel}) {
    shopController.getCategories();
  }

  final AuthController authController = Get.find<AuthController>();
  final ShopController shopController = Get.find<ShopController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: false, // set
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.clear, color: Colors.black),
          onPressed: () {
            if (page == "home") {
              Get.back();
            } else if (isSmallScreen(context)) {
              Get.back();
            } else {
              if (page == "details") {
                Get.find<HomeController>().selectedWidget.value =
                    EditShopDetails(shopModel: shopModel!);
              } else {
                Get.find<HomeController>().selectedWidget.value = CreateShop(
                  page: page,
                  clearInputs: false,
                );
              }
            }

            // Navigator.of(context).pop();
          },
        ),
        iconTheme: const IconThemeData(
          color: Colors.black, //change your color here
        ),
        title: const Text(
          "Choose Shop Category",
          style: TextStyle(
              color: Colors.black, fontSize: 16, fontWeight: FontWeight.bold),
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(10),
          height: isSmallScreen(context) ? kToolbarHeight * 1.5 : 0.0,
          decoration:
              BoxDecoration(border: Border.all(width: 1, color: Colors.grey)),
          child: InkWell(
            splashColor: Colors.transparent,
            onTap: () {
              Get.back();
            },
            child: Container(
              padding: const EdgeInsets.all(10),
              width: double.infinity,
              decoration: BoxDecoration(
                  border: Border.all(width: 3, color: AppColors.mainColor),
                  borderRadius: BorderRadius.circular(40)),
              child: Center(
                  child: majorTitle(
                      title: "Continue",
                      color: AppColors.mainColor,
                      size: 18.0)),
            ),
          ),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(10.0),
        child: Obx(() {
          return shopController.loadingcateries.isFalse
              ? SingleChildScrollView(
                  child: SizedBox(
                    width: 650,
                    child: Wrap(
                      children: listMyWidgets(),
                    ),
                  ),
                )
              : SizedBox(
                  child: Center(
                      child: CircularProgressIndicator(
                  color: AppColors.mainColor,
                )));
        }),
      ),
    );
  }

  bool getColor(String itemName) {
    bool val = false;
    if (shopController.selectedCategory.value == null) {
      return false;
    }
    if (shopController.selectedCategory.value!.name == itemName) {
      val = true;
    } else {
      val = false;
    }

    return val;
  }

  List<Widget> listMyWidgets() {
    List<Widget> list = [];

    for (var item in shopController.categories) {
      list.add(GestureDetector(
        child: Obx(
          () => Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            margin: const EdgeInsets.symmetric(horizontal: 5, vertical: 10),
            decoration: BoxDecoration(
              color: getColor(item.name!) ? AppColors.mainColor : Colors.white,
              borderRadius: BorderRadius.circular(25),
              border: Border.all(
                  color: getColor(item.name!)
                      ? AppColors.mainColor
                      : AppColors.lightDeepPurple),
              boxShadow: const [
                BoxShadow(
                  color: Colors.black26,
                  blurRadius: 4,
                ),
              ],
            ),
            child: Text(
              item.name!,
              style: TextStyle(
                  fontSize: 12,
                  color: getColor(item.name!) ? Colors.white : Colors.black),
            ),
          ),
        ),
        onTap: () {
          shopController.selectedCategory.value = item;
        },
      ));
    }
    return list;
  }

  // List<Widget> listMyWidgets(){
  //
  //
  //   List<Widget> list = [];
  //
  //   for (var item in shopController.categories) {
  //     list.add(Column(
  //       crossAxisAlignment: CrossAxisAlignment.start,
  //       children: [
  //         InkWell(
  //           onTap: () async {
  //             selectedItemsCallback!(item);
  //           },
  //           child: Row(
  //             mainAxisAlignment: MainAxisAlignment.spaceBetween,
  //             children: [
  //               Container(
  //                 padding:
  //                     const EdgeInsets.symmetric(horizontal: 15, vertical: 7),
  //                 margin:
  //                     const EdgeInsets.symmetric(horizontal: 5, vertical: 10),
  //                 child: Text(
  //                   item.name!.capitalizeFirst!,
  //                   style: TextStyle(fontSize: 15),
  //                 ),
  //               ),
  //               const Icon(Icons.arrow_forward_ios_rounded)
  //             ],
  //           ),
  //         ),
  //         const Divider()
  //       ],
  //     ));
  //   }
  //   return list;
  // }
}

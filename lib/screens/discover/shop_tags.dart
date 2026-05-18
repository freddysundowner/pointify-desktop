import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/ordercontroller.dart';
import 'package:pointify/controllers/salescontroller.dart';
import 'package:pointify/controllers/shopcontroller.dart';
import 'package:pointify/screens/discover/shops_around.dart';
import 'package:pointify/utils/colors.dart';

import '../../controllers/authcontroller.dart';
import '../../widgets/major_title.dart';

//ignore: must_be_immutable
class ShopTags extends StatelessWidget {
  final Function? selectedItemsCallback;

  ShopTags({super.key, this.selectedItemsCallback}) {
    shopController.getCategories();
  }

  final AuthController authController = Get.find<AuthController>();
  final ShopController shopController = Get.find<ShopController>();
  final OrderController orderController = Get.find<OrderController>();
  final SalesController salesController = Get.find<SalesController>();

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
            Get.back();
          },
        ),
        iconTheme: const IconThemeData(
          color: Colors.black, //change your color here
        ),
        title:  Text(
          "Explore",
          style: TextStyle(
              color: AppColors.mainColor,
              fontSize: 16,
              fontWeight: FontWeight.bold),
        ),
      ),
      bottomNavigationBar: Obx(
        () => Container(
          width: double.infinity,
          padding: const EdgeInsets.all(10),
          height: shopController.selectedDiscoverCategories.isEmpty
              ? 0
              : kToolbarHeight * 1.5,
          decoration:
              BoxDecoration(border: Border.all(width: 1, color: Colors.grey)),
          child: InkWell(
            splashColor: Colors.transparent,
            onTap: () {
              orderController.allowLocation();
              Get.to(() => ShopsAround());
            },
            child: Container(
              padding: const EdgeInsets.all(10),
              width: double.infinity,
              decoration: BoxDecoration(
                  border: Border.all(width: 3, color: AppColors.mainColor),
                  borderRadius: BorderRadius.circular(40)),
              child: Center(
                  child: majorTitle(
                      title: "Discover",
                      color: AppColors.mainColor,
                      size: 18.0)),
            ),
          ),
        ),
      ),
      body: Container(
        padding: const EdgeInsets.all(10.0),
        child: ListView(
          children: [
            Column(
              children: [
                 Text(
                    'Enter your Customer number to track Previous Orders',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: AppColors.mainColor,
                    )),
                const SizedBox(
                  height: 10,
                ),
                TextFormField(
                  keyboardType: TextInputType.number,
                  controller: orderController.trackingNumber,
                  decoration: InputDecoration(
                    hintText: "Enter Customer Number",
                    fillColor: Colors.white,
                    filled: true,
                    suffix: InkWell(
                      onTap: () {
                        orderController.getCustomerdata(
                            orderController.trackingNumber.text,
                            to: "");
                      },
                      child:  Icon(
                        Icons.search,
                        color: AppColors.mainColor,
                      ),
                    ),
                    contentPadding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
                    focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(100.0),
                        borderSide: const BorderSide(color: Colors.grey)),
                    enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(100.0),
                        borderSide: BorderSide(color: Colors.grey.shade400)),
                    errorBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(100.0),
                        borderSide: const BorderSide(color: Colors.red, width: 2.0)),
                    focusedErrorBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(100.0),
                        borderSide: const BorderSide(color: Colors.red, width: 2.0)),
                  ),
                ),
                const SizedBox(
                  height: 20,
                ),
              ],
            ),
             Center(
              child: Text('Pick categories and\nDiscover Shops Around you',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.mainColor,
                  )),
            ),
            const SizedBox(
              height: 10,
            ),
            Obx(() {
              return shopController.loadingcateries.isFalse
                  ? Wrap(
                      direction: Axis.horizontal,
                      children: listMyWidgets(),
                    )
                  :  SizedBox(
                      child: Center(
                          child: CircularProgressIndicator(
                      color: AppColors.mainColor,
                    )));
            }),
          ],
        ),
      ),
    );
  }

  bool getColor(String itemName) {
    var index = shopController.selectedDiscoverCategories
        .indexWhere((element) => element.name == itemName);
    bool val = false;
    if (index == -1) {
      return false;
    }
    if (index != -1) {
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
            padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 7),
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
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  item.name!,
                  style: TextStyle(
                      fontSize: 13,
                      color:
                          getColor(item.name!) ? Colors.white : Colors.black),
                ),
                const SizedBox(
                  width: 5,
                ),
                if (getColor(item.name!))
                  Container(
                    padding: const EdgeInsets.all(5),
                    decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(50),
                        color: Colors.white),
                    child:  Icon(
                      Icons.check,
                      size: 10,
                      color: AppColors.mainColor,
                    ),
                  )
              ],
            ),
          ),
        ),
        onTap: () {
          FocusScope.of(Get.context!).requestFocus(FocusNode());
          var index = shopController.selectedDiscoverCategories
              .indexWhere((element) => element.id == item.id);
          if (index != -1) {
            shopController.selectedDiscoverCategories.removeAt(index);
          } else {
            shopController.selectedDiscoverCategories.add(item);
          }
        },
      ));
    }
    return list;
  }
}

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/shopcontroller.dart';
import 'package:pointify/responsive/responsiveness.dart';
import 'package:pointify/utils/constants.dart';
import 'package:pointify/utils/themer.dart';
import 'package:switcher_button/switcher_button.dart';

import '../../utils/colors.dart';
import '../../widgets/major_title.dart';
import '../../widgets/minor_title.dart';
import '../../widgets/shop_widget.dart';

class CreateWarehouse extends StatelessWidget {
  final String page;
  final bool? clearInputs;
  final String? type;

  CreateWarehouse(
      {Key? key, required this.page, this.clearInputs = false, this.type})
      : super(key: key);

  final ShopController shopController = Get.find<ShopController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        titleSpacing: 3,
        backgroundColor: Colors.white,
        elevation: 0.3,
        centerTitle: false,
        leading: page == "home"
            ? null
            : IconButton(
                onPressed: () {
                  Get.back();
                },
                icon: const Icon(
                  Icons.arrow_back_ios,
                  color: Colors.black,
                ),
              ),
        title: majorTitle(
            title: "Create Warehouse", color: Colors.black, size: 16.0),
      ),
      body: SingleChildScrollView(
        child: Container(
          decoration: const BoxDecoration(boxShadow: []),
          padding: EdgeInsets.all(page == "home" ? 20 : 10),
          // margin: EdgeInsets.symmetric(horizontal: page == "home" ? 50 : 0),
          height: MediaQuery.of(context).size.height,
          child: shopDetails(context),
        ),
      ),
    );
  }

  Widget saveButton(context) {
    return InkWell(
      splashColor: Colors.transparent,
      onTap: () async {
        await shopController.createShop(
            page: page, context: context, type: "warehouse");
      },
      child: Center(
        child: Container(
          padding: const EdgeInsets.all(10),
          width: isSmallScreen(context) ? double.infinity : 300,
          decoration: BoxDecoration(
              border: Border.all(width: 3, color: AppColors.mainColor),
              borderRadius: BorderRadius.circular(40)),
          child: Center(
              child: majorTitle(
                  title: "Create ", color: AppColors.mainColor, size: 18.0)),
        ),
      ),
    );
  }

  Widget shopDetails(context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 10),
        shopWidget(controller: shopController.nameController, name: "Name"),
        const SizedBox(height: 10),
        majorTitle(title: "Email", color: Colors.black, size: 16.0),
        const SizedBox(height: 10),
        TextFormField(
          controller: shopController.warehouseemail,
          decoration: ThemeHelper().textInputDecoration(
              // 'Shop Address',
              // 'Enter your shop address',
              ),
        ),
        const SizedBox(height: 20),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  majorTitle(
                      title: "Production?", color: Colors.black, size: 16.0),
                  const SizedBox(width: 4),
                  minorTitle(
                      title:
                          "This warehouse will only be used to manage production, when production is done, it will be sent to the outlet for sale",
                      color: AppColors.mainColor,
                      size: 11)
                ],
              ),
            ),
            SwitcherButton(
                onChange: (value) {
                  shopController.productionEnabled.value = value;
                },
                onColor: AppColors.mainColor,
                value: shopController.productionEnabled.value,
                offColor: Colors.grey)
          ],
        ),
        const SizedBox(height: 20.0),
        majorTitle(
            title: "Which currency are you using",
            color: Colors.black,
            size: 16.0),
        const SizedBox(height: 5),
        Card(
          elevation: 1,
          child: InkWell(
            onTap: () {
              showDialog(
                  context: context,
                  builder: (context) {
                    return SimpleDialog(
                      children: List.generate(
                          Constants.currenciesData.length,
                          (index) => SimpleDialogOption(
                                onPressed: () {
                                  shopController.currency.value =
                                      Constants.currenciesData.elementAt(index);

                                  Navigator.pop(context);
                                },
                                child: Text(
                                    Constants.currenciesData.elementAt(index)),
                              )),
                    );
                  });
            },
            child: Container(
              padding: const EdgeInsets.all(10),
              child: Row(
                children: [
                  Obx(() {
                    return Text(
                        " ${shopController.currency.value == "" ? Constants.currenciesData[0] : shopController.currency}",
                        style: const TextStyle(
                            color: Colors.black, fontSize: 12.0));
                  }),
                  const Spacer(),
                  const Icon(Icons.arrow_drop_down)
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 30),
        Obx(() {
          return shopController.createShopLoad.value
              ? const Center(child: CircularProgressIndicator())
              : saveButton(context);
        })
      ],
    );
  }
}

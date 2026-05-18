import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/screens/stock/transfer_history.dart';
import 'package:pointify/widgets/shop_card.dart';

import '../../controllers/shopcontroller.dart';
import '../../main.dart';
import '../../models/shop.dart';
import '../../utils/colors.dart';
import '../../widgets/major_title.dart';
import '../../widgets/minor_title.dart';

// ignore: must_be_immutable
class StockTransfer extends StatelessWidget {
  String type;
  StockTransfer({super.key, this.type = "stockTransfer"});

  final ShopController shopController = Get.find<ShopController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white,
          centerTitle: false,
          elevation: 0.3,
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              majorTitle(
                  title: "Stock Transfer", color: Colors.black, size: 16.0),
              minorTitle(
                  title:
                      "${userController.currentUser.value?.primaryShop?.name}",
                  color: Colors.grey)
            ],
          ),
          leading: IconButton(
            onPressed: () {
              Get.back();
            },
            icon: const Icon(
              Icons.arrow_back_ios,
              color: Colors.black,
            ),
          ),
          actions: [
            Center(
              child: InkWell(
                onTap: () {
                  Get.to(() => TransferHistoryPage());
                },
                child: Container(
                  margin: const EdgeInsets.all(5),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.mainColor, width: 2)),
                  child: majorTitle(
                      title: "Transfer History",
                      color: AppColors.mainColor,
                      size: 12.0),
                ),
              ),
            ),
          ],
        ),
        body: SingleChildScrollView(
          child: Container(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(10.0),
                  child: majorTitle(
                      title: "Select Shop to transfer to",
                      color: Colors.black,
                      size: 16.0),
                ),
                Container(
                  padding: const EdgeInsets.all(10),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: shopController.searchController,
                          onChanged: (value) {
                            shopController.getShops(name: value);
                          },
                          decoration: InputDecoration(
                              contentPadding:
                                  const EdgeInsets.fromLTRB(10, 3, 10, 3),
                              suffixIcon: IconButton(
                                onPressed: () {},
                                icon: const Icon(Icons.search),
                              ),
                              hintText: "Search shop to transfer to",
                              border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10))),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                Obx(() {
                  return shopController.gettingShopsLoad.value
                      ? const Align(
                          alignment: Alignment.center,
                          child: CircularProgressIndicator())
                      : shopController.allShops.isEmpty
                          ? Center(
                              child: majorTitle(
                                  title: "You do not have shop yet",
                                  color: Colors.black,
                                  size: 16.0),
                            )
                          : ListView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: shopController.allShops
                                  .where((element) =>
                                      element.id !=
                                      userController
                                          .currentUser.value!.primaryShop!.id)
                                  .length,
                              itemBuilder: (context, index) {
                                List<Shop> shops = shopController.allShops
                                    .where((element) =>
                                        element.id !=
                                        userController
                                            .currentUser.value!.primaryShop!.id)
                                    .toList();
                                Shop shopModel = shops.elementAt(index);
                                return shopCard(
                                    shopModel: shopModel,
                                    page: type,
                                    context: context);
                              });
                })
              ],
            ),
          ),
        ));
  }
}

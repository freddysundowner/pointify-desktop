import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/main.dart';
import 'package:pointify/utils/colors.dart';

import '../../controllers/shopcontroller.dart';
import '../../controllers/stockcontroller.dart';
import '../../models/transferhistory.dart';
import '../../widgets/no_items_found.dart';
import '../../widgets/transfer_history_card.dart';

class TransferHistoryPage extends StatelessWidget {
  TransferHistoryPage({Key? key}) : super(key: key) {
    stockTransferController.gettingTransferHistory(
        direction: "to",
        shopid: userController.currentUser.value?.primaryShop?.id);
  }

  final ShopController createShopController = Get.find<ShopController>();
  final StockController stockTransferController = Get.find<StockController>();

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0.0,
          centerTitle: false,
          leading: IconButton(
              onPressed: () {
                Get.back();
              },
              icon: const Icon(
                Icons.arrow_back_ios,
                color: Colors.black,
              )),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Stock Transfer',
                style: TextStyle(color: Colors.black, fontSize: 14),
              ),
              Text(
                userController.currentUser.value!.primaryShop!.name!,
                style: const TextStyle(color: Colors.grey, fontSize: 12),
              ),
            ],
          ),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(50.0),
            child: Container(
              height: 55,
              margin:
                  const EdgeInsets.only(top: 2, bottom: 2, right: 5, left: 5),
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(
                  25.0,
                ),
              ),
              child: TabBar(
                onTap: (value) {
                  if (value == 0) {
                    stockTransferController.gettingTransferHistory(
                        direction: "to",
                        shopid:
                            userController.currentUser.value?.primaryShop?.id);
                  } else {
                    stockTransferController.gettingTransferHistory(
                        direction: "from",
                        shopid:
                            userController.currentUser.value?.primaryShop?.id);
                  }
                },
                indicator: BoxDecoration(
                  borderRadius: BorderRadius.circular(
                    25.0,
                  ),
                ),
                tabs: const [
                  Tab(
                    child: Text("IN"),
                  ),
                  Tab(
                    child: Text(
                      "OUT",
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        body: TabBarView(
          physics: const NeverScrollableScrollPhysics(),
          children: [
            INWidget(
              typekey: "in",
            ),
            INWidget(
              typekey: "out",
            ),
          ],
        ),
      ),
    );
  }
}

class INWidget extends StatelessWidget {
  final String? typekey;
  INWidget({Key? key, this.typekey}) : super(key: key);
  final ShopController createShopController = Get.find<ShopController>();
  final StockController stockTransferController = Get.find<StockController>();

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      return stockTransferController.gettingTransferHistoryLoad.value
          ? const Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Center(
                  child: CircularProgressIndicator(),
                ),
              ],
            )
          : stockTransferController.transferHistory.isEmpty
              ? noItemsFound(context, true)
              : ListView.builder(
                  itemCount: stockTransferController.transferHistory.length,
                  shrinkWrap: true,
                  itemBuilder: (context, index) {
                    TransferHistory stockTransferHistory =
                        stockTransferController.transferHistory
                            .elementAt(index);
                    return transferHistoryCard(
                        typeKey: typekey,
                        stockTransferHistory: stockTransferHistory);
                  });
    });
  }
}

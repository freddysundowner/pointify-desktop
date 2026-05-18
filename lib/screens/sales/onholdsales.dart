import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../controllers/salescontroller.dart';
import '../../models/salemodel.dart';
import '../../widgets/major_title.dart';
import '../../widgets/no_items_found.dart';
import 'components/sales_card.dart';

class OnHoldSales extends StatelessWidget {
  OnHoldSales({super.key});

  final SalesController salesController = Get.find<SalesController>();
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        backgroundColor: Colors.white,
        elevation: 0.3,
        centerTitle: false,
        leading: IconButton(
          onPressed: () {
            Get.back();
          },
          icon: const Icon(
            Icons.arrow_back_ios,
            color: Colors.black,
          ),
        ),
        title:
            majorTitle(title: "On Hold Sales", color: Colors.black, size: 16.0),
      ),
      body: Obx(
        () => salesController.isVoiding.isTrue ||
                salesController.loadingSales.isTrue
            ? const Center(
                child: CircularProgressIndicator(),
              )
            : salesController.onholdSales.isEmpty
                ? Center(child: noItemsFound(context, false))
                : ListView.builder(
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: salesController.onholdSales.length,
                    shrinkWrap: true,
                    scrollDirection: Axis.vertical,
                    itemBuilder: (context, index) {
                      SaleModel salesModel =
                          salesController.onholdSales.elementAt(index);
                      return salesCard(salesModel: salesModel);
                    }),
      ),
    );
  }
}

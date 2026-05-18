import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/salescontroller.dart';
import 'package:pointify/models/order.dart';
import 'package:pointify/screens/authentication/landing.dart';
import 'package:pointify/screens/discover/order_card.dart';
import 'package:pointify/utils/colors.dart';
import 'package:pointify/utils/themer.dart';

import '../../controllers/ordercontroller.dart';

class CustomerProfile extends StatelessWidget {
  final String customerNo;
  CustomerProfile({super.key, required this.customerNo});

  final SalesController salesController = Get.find<SalesController>();
  final OrderController orderController = Get.find<OrderController>();
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade200,
      appBar: AppBar(
        backgroundColor: AppColors.mainColor,
        elevation: 0.0,
        leading: InkWell(
          onTap: () {
            Get.to(() => const Landing());
          },
          child: const Icon(
            Icons.clear,
            color: Colors.white,
            size: 20,
          ),
        ),
        toolbarHeight: 50,
      ),
      body: Obx(
        () => orderController.isLoading.isTrue
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                children: [
                  Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            vertical: 40, horizontal: 20),
                        width: double.infinity,
                        color: AppColors.mainColor,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Hello ${orderController.currentCustomer.value?.name}",
                              style: const TextStyle(
                                  fontSize: 23,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white),
                            ),
                            const SizedBox(
                              height: 5,
                            ),
                            const Text(
                              "Welcome to Pointify online ",
                              style:
                                  TextStyle(fontSize: 13, color: Colors.white),
                            )
                          ],
                        ),
                      ),
                      Positioned(
                        bottom: -30,
                        left: 10,
                        child: SizedBox(
                          width: MediaQuery.of(context).size.width * 0.9,
                          child: TextFormField(
                            decoration: ThemeHelper().textInputDecoration(
                              "Search Quotation No.",
                            ),
                            onChanged: (value) {
                              salesController.getSalesByDate(
                                  customerid: orderController
                                      .currentCustomer.value?.sId,
                                  type: "order",
                                  order: orderController.selectedOption.value
                                      .toLowerCase(),
                                  receiptNo: value);
                            },
                          ),
                        ),
                      )
                    ],
                  ),
                  const SizedBox(
                    height: 50,
                  ),
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 20),
                    child: Obx(
                      () => Wrap(
                          spacing: 10,
                          runSpacing: 10,
                          alignment: WrapAlignment.start,
                          children: List.generate(
                              orderController.filterOptions.length,
                              (index) => InkWell(
                                    onTap: () {
                                      orderController.selectedOption.value =
                                          orderController.filterOptions[index];
                                      if (index == 0) {
                                        salesController.getSalesByDate(
                                            customerid: orderController
                                                .currentCustomer.value?.sId,
                                            order: "all");
                                      } else if (index == 1) {
                                        salesController.getSalesByDate(
                                            customerid: orderController
                                                .currentCustomer.value?.sId,
                                            order: 'pending');
                                      } else {
                                        salesController.getSalesByDate(
                                            customerid: orderController
                                                .currentCustomer.value?.sId,
                                            order: 'completed');
                                      }
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 15, vertical: 7),
                                      margin: const EdgeInsets.symmetric(
                                          horizontal: 5, vertical: 10),
                                      decoration: BoxDecoration(
                                        color: getColor(orderController
                                                .filterOptions[index])
                                            ? AppColors.mainColor
                                            : Colors.white,
                                        borderRadius: BorderRadius.circular(25),
                                        border: Border.all(
                                            color: getColor(orderController
                                                    .filterOptions[index])
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
                                        orderController.filterOptions[index],
                                        style: TextStyle(
                                            fontSize: 13,
                                            color: getColor(orderController
                                                    .filterOptions[index])
                                                ? Colors.white
                                                : Colors.black),
                                      ),
                                    ),
                                  ))),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.all(10),
                    child: Obx(() {
                      return salesController.loadingSales.value
                          ? const Center(child: CircularProgressIndicator())
                          : salesController.allSales.isEmpty
                              ? Container(
                                  margin: const EdgeInsets.only(top: 50),
                                  child: const Text(
                                    "No quotes yet",
                                    textAlign: TextAlign.center,
                                  ))
                              : ListView.builder(
                                  itemCount: salesController.orders.length,
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  itemBuilder: (context, index) {
                                    OrderItem orderitem =
                                        salesController.orders.elementAt(index);
                                    return orderCard(
                                        salesModel: orderitem,
                                        from: 'customerpage');
                                  });
                    }),
                  )
                ],
              ),
      ),
    );
  }

  bool getColor(String itemName) {
    if (itemName != orderController.selectedOption.value) {
      return false;
    }
    return true;
  }
}

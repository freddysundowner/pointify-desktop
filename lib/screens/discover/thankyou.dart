import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/ordercontroller.dart';
import 'package:pointify/models/salemodel.dart';
import 'package:pointify/utils/colors.dart';
import 'package:printing/printing.dart';

import '../../controllers/salescontroller.dart';
import '../receipts/pdf/sales/online_order_quote.dart';

class ThankYouPage extends StatelessWidget {
  final SaleModel? order;

  ThankYouPage({Key? key, this.order}) : super(key: key);

  final Color textColor = const Color(0xFF32567A);
  final OrderController orderController = Get.find<OrderController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: <Widget>[
            Container(
              height: 170,
              padding: const EdgeInsets.all(35),
              decoration:  BoxDecoration(
                color: AppColors.mainColor,
                shape: BoxShape.circle,
              ),
              child: Image.asset(
                "assets/images/card.png",
                fit: BoxFit.contain,
              ),
            ),
            SizedBox(height: MediaQuery.of(context).size.height * 0.1),
             Text(
              "Customer No.",
              style: TextStyle(
                color: AppColors.mainColor,
                fontWeight: FontWeight.w600,
                fontSize: 36,
              ),
            ),
            const SizedBox(
              height: 20,
            ),
            Center(
              child: Column(
                children: [
                  InkWell(
                    onTap: () async {
                      await Clipboard.setData(ClipboardData(
                          text: order!.customerId!.customerNo.toString()));
                      Get.snackbar("Copied", "Customer No. copied to clipboard",
                          colorText: Colors.white,
                          backgroundColor: AppColors.mainColor);
                    },
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 40),
                      decoration: BoxDecoration(
                          color: AppColors.mainColor,
                          borderRadius: BorderRadius.circular(6),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.grey.withOpacity(0.5),
                              spreadRadius: 5,
                            )
                          ]),
                      padding: const EdgeInsets.symmetric(
                          vertical: 6, horizontal: 10),
                      child: Center(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              order!.customerId!.customerNo.toString(),
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 36),
                            ),
                            const SizedBox(
                              width: 5,
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 1),
                              decoration: BoxDecoration(
                                  color: Colors.amber,
                                  borderRadius: BorderRadius.circular(50)),
                              child: const Text("Copy"),
                            )
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(
                    height: 10,
                  ),
                   Text(
                    "This is the number that you will use to track your quote status",
                    style: TextStyle(
                      color: AppColors.mainColor,
                      fontStyle: FontStyle.italic,
                      fontSize: 11,
                    ),
                  )
                ],
              ),
            ),
            SizedBox(height: MediaQuery.of(context).size.height * 0.05),
            InkWell(
              onTap: () {
                // Get.to(() => OrderReceipt(order!));
                Get.to(() => Scaffold(
                      appBar: AppBar(
                          title:  Text("Quotation",
                              style: TextStyle(
                                color: AppColors.mainColor,
                              )),
                          backgroundColor: Colors.transparent,
                          elevation: 0,
                          leading: IconButton(
                              icon:  Icon(
                                Icons.clear,
                                color: AppColors.mainColor,
                              ),
                              onPressed: () {
                                Get.back();
                              })),
                      body: PdfPreview(
                        build: (context) => onlineQuote(order!, "Quotation"),
                      ),
                    ));
              },
              child: const Text(
                "Print/Share Quote",
                style: TextStyle(
                  color: Colors.black87,
                  fontWeight: FontWeight.w400,
                  fontSize: 17,
                ),
              ),
            ),
            SizedBox(height: MediaQuery.of(context).size.height * 0.05),
            InkWell(
              onTap: () {
                Get.back();

                Get.find<SalesController>().loadingSales.value = false;
                Get.find<SalesController>().getSalesByDate(
                    customerid: order!.customerId?.sId, order: "all");
                orderController.getCustomerdata(
                    order!.customerId!.customerNo!.toString(),
                    confirm: false,
                    to: "");
              },
              child:  Text(
                "<< Back",
                style: TextStyle(
                  color: AppColors.mainColor,
                  fontWeight: FontWeight.w400,
                  fontSize: 13,
                ),
              ),
            )
          ],
        ),
      ),
    );
  }
}

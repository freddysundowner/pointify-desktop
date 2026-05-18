import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/widgets/alert.dart';
import 'package:pointify/widgets/textbutton.dart';
import 'package:printing/printing.dart';

import '../../../controllers/salescontroller.dart';
import '../../../controllers/shopcontroller.dart';
import '../../../models/salereturn.dart';
import '../../../utils/colors.dart';
import '../../../widgets/major_title.dart';
import '../../../widgets/normal_text.dart';
import '../pdf/sales/sales_returned_receipt.dart';

class ReturnedReceipt extends StatelessWidget {
  final SaleRetuns? saleRetuns;
  final String? type;
  final String? from;

  ReturnedReceipt({super.key, this.saleRetuns, this.type = "", this.from = ""});

  final ShopController shopController = Get.find<ShopController>();
  final SalesController salesController = Get.find<SalesController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          color: Colors.black,
          onPressed: () {
            Get.back();
          },
          icon: const Icon(Icons.clear),
        ),
        title: Text(
          "Returned Receipt #${saleRetuns!.saleReturnNo!}".toUpperCase(),
          style: const TextStyle(color: Colors.black, fontSize: 16),
        ),
        actions: [
          IconButton(
              onPressed: () {
                Get.to(() => Scaffold(
                      appBar: AppBar(
                        title: const Text("Returned Receipt"),
                      ),
                      body: PdfPreview(
                          build: (context) => salesReturnedReceipt(
                              saleRetuns!, "RETURNED RECEIPT")),
                    ));
              },
              icon:  Icon(
                Icons.picture_as_pdf,
                color: AppColors.mainColor,
              )),
          IconButton(
              onPressed: () {
                generalAlert(
                    title: "Delete",
                    message: "Are you sure you want to delete this?",
                    function: () {
                      salesController.deleteSaleReturn(saleRetuns!.sId!);
                    });
              },
              icon: const Icon(
                Icons.delete,
                color: Colors.red,
              ))
        ],
      ),
      body: Container(
        margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
        child: Obx(
          () => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (saleRetuns!.customerId != null)
                Row(
                  children: [
                    Text(
                      "Customer: ${saleRetuns!.customerId!.name!}",
                      style: const TextStyle(fontSize: 13),
                    ),
                    const Spacer(),
                    Row(
                      children: [
                        normalText(
                            title: "Date:", color: Colors.black, size: 14.0),
                        const SizedBox(
                          width: 5,
                        ),
                        majorTitle(
                            title: DateFormat("yyyy/MM/dd hh:mm")
                                .format(DateTime.parse(saleRetuns!.createdAt!)),
                            color: Colors.grey,
                            size: 11.0)
                      ],
                    )
                  ],
                ),
              const SizedBox(
                height: 20,
              ),
              Row(
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      normalText(
                          title: "Total", color: Colors.black, size: 14.0),
                      const SizedBox(
                        height: 10,
                      ),
                      majorTitle(
                          title: htmlPrice(saleRetuns!.refundAmount),
                          color: Colors.black,
                          size: 18.0)
                    ],
                  ),
                ],
              ),
              const SizedBox(
                height: 20,
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 5),
                decoration: BoxDecoration(
                    color: Colors.red, borderRadius: BorderRadius.circular(5)),
                child: Text(
                  "Returned".toUpperCase(),
                  style: const TextStyle(color: Colors.white),
                ),
              ),
              const Divider(
                color: Colors.grey,
              ),
              Expanded(
                flex: saleRetuns!.items!.length,
                child: Column(
                  children: [
                    Expanded(
                      child: ListView.builder(
                          itemCount: saleRetuns!.items!.length,
                          itemBuilder: (BuildContext c, int i) {
                            Items receiptitem = saleRetuns!.items![i];
                            print("receiptitem ${receiptitem.quantity}");
                            return Row(
                              children: [
                                Expanded(
                                  child: Table(children: [
                                    TableRow(children: [
                                      Text(
                                        receiptitem.product!.name!.capitalize!,
                                        style: const TextStyle(fontSize: 16),
                                      ),
                                      Text(
                                        "${receiptitem.quantity ?? 0} @${htmlPrice(receiptitem.unitPrice ?? 0)}",
                                        style: const TextStyle(fontSize: 16),
                                      ),
                                      Row(
                                        children: [
                                          Text(
                                            htmlPrice(receiptitem.unitPrice ??
                                                0 * receiptitem.quantity!),
                                            style: TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.bold,
                                                decoration:
                                                    receiptitem.quantity == 0
                                                        ? TextDecoration
                                                            .lineThrough
                                                        : null),
                                          ),
                                          if (receiptitem.quantity == 0)
                                            const Icon(
                                              Icons.file_download,
                                              color: Colors.red,
                                              size: 15,
                                            )
                                        ],
                                      ),
                                    ]),
                                  ]),
                                ),
                              ],
                            );
                          }),
                    ),
                    const Divider(
                      color: Colors.black,
                    ),
                    Expanded(
                      flex: 3,
                      child: Table(children: [
                        TableRow(children: [
                          const Text(
                            "",
                            style: TextStyle(fontSize: 16),
                          ),
                          const Text(
                            "",
                            style: TextStyle(fontSize: 16),
                          ),
                          Column(
                            children: [
                              Text(
                                htmlPrice(saleRetuns!.refundAmount!),
                                style: const TextStyle(
                                    fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                              const Divider(
                                thickness: 3,
                                color: Colors.black,
                              )
                            ],
                          ),
                        ]),
                      ]),
                    ),
                  ],
                ),
              ),
              Expanded(
                flex: 2,
                child: Row(
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        normalText(
                            title: "Date", color: Colors.black, size: 14.0),
                        const SizedBox(
                          height: 10,
                        ),
                        if (saleRetuns?.createdAt != null)
                          majorTitle(
                              title: DateFormat("yyyy-MM-dd hh:mm").format(
                                  DateTime.parse(saleRetuns!.createdAt!)),
                              color: Colors.black,
                              size: 18.0)
                      ],
                    ),
                    const Spacer(),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        normalText(
                            title: "Served by",
                            color: Colors.black,
                            size: 14.0),
                        const SizedBox(
                          height: 10,
                        ),
                        majorTitle(
                            title: saleRetuns?.attendantId?.username,
                            color: Colors.black,
                            size: 18.0)
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: Container(
          height: 80,
          margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          child: Center(
            child: textBtn(
                hPadding: 20,
                onPressed: () {
                  Get.to(() => Scaffold(
                        appBar: AppBar(
                          title: const Text("Returned Receipt"),
                        ),
                        body: PdfPreview(
                            build: (context) => salesReturnedReceipt(
                                saleRetuns!, "RETURNED RECEIPT")),
                      ));
                },
                text: "Print",
                radius: 10,
                bgColor: AppColors.mainColor,
                color: Colors.white),
          )),
    );
  }
}

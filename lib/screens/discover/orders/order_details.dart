import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/paymentcontroller.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/saleitem.dart';
import 'package:pointify/screens/cash_flow/payment_history.dart';
import 'package:pointify/widgets/textbutton.dart';
import 'package:printing/printing.dart';

import '../../../controllers/salescontroller.dart';
import '../../../controllers/shopcontroller.dart';
import '../../../models/product.dart';
import '../../../models/salemodel.dart';
import '../../../pdfFiles/pdfpreview.dart';
import '../../../utils/colors.dart';
import '../../../utils/themer.dart';
import '../../../widgets/alert.dart';
import '../../../widgets/major_title.dart';
import '../../../widgets/normal_text.dart';
import '../../receipts/pdf/delivery_note_pdf.dart';

class OrderDetails extends StatelessWidget {
  final SaleModel? salesModel;
  final String? type;
  final String? from;

  OrderDetails({super.key, this.salesModel, this.type = "", this.from = ""}) {
    salesController.currentReceipt.value = salesModel;
  }

  final ShopController shopController = Get.find<ShopController>();
  final SalesController salesController = Get.find<SalesController>();
  final PaymentController paymentController = Get.find<PaymentController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                    onPressed: () {
                      Get.back();
                    },
                    icon:  Icon(
                      Icons.clear,
                      color: AppColors.mainColor,
                    )),
                Text(
                  "Order#${salesController.currentReceipt.value?.receiptNo}"
                      .toUpperCase(),
                  style:  TextStyle(
                      color: AppColors.mainColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 16),
                ),
                const Spacer()
              ],
            ),
            Expanded(
              child: Container(
                margin:
                    const EdgeInsets.symmetric(vertical: 20, horizontal: 20),
                child: Obx(
                  () => Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (owner() &&
                          salesController.currentReceipt.value!.order ==
                              "completed")
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            InkWell(
                              onTap: () {
                                saleReceiptActions(
                                    saleModel:
                                        salesController.currentReceipt.value!,
                                    from: from ?? "");
                              },
                              child: Container(
                                margin: const EdgeInsets.only(right: 10),
                                decoration: BoxDecoration(
                                    color: Colors.red,
                                    borderRadius: BorderRadius.circular(6),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.grey.withOpacity(0.5),
                                        spreadRadius: 5,
                                      )
                                    ]),
                                padding: const EdgeInsets.symmetric(
                                    vertical: 10, horizontal: 10),
                                child: const Row(
                                  children: [
                                    Text(
                                      "Refund",
                                      style: TextStyle(
                                          color: Colors.white, fontSize: 12),
                                    ),
                                    SizedBox(
                                      width: 5,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            InkWell(
                              onTap: () {
                                Get.to(() => Scaffold(
                                      appBar: AppBar(
                                        title: const Text("Delivery Note"),
                                      ),
                                      body: PdfPreview(
                                        build: (context) => deliveryNotePdf(
                                            salesController
                                                .currentReceipt.value!,
                                            "Delivery Note"),
                                      ),
                                    ));
                              },
                              child: Container(
                                margin: const EdgeInsets.only(right: 10),
                                decoration: BoxDecoration(
                                    color: AppColors.mainColor,
                                    borderRadius: BorderRadius.circular(6)),
                                padding: const EdgeInsets.symmetric(
                                    vertical: 6, horizontal: 10),
                                child: const Row(
                                  children: [
                                    Text(
                                      "Delivery Note",
                                      style: TextStyle(
                                          color: Colors.white, fontSize: 12),
                                    ),
                                    SizedBox(
                                      width: 5,
                                    ),
                                    Icon(Icons.print, color: Colors.white),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      const SizedBox(
                        height: 10,
                      ),
                      if (owner() &&
                          salesController.currentReceipt.value!.order ==
                              "pending")
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            InkWell(
                              onTap: () {
                                salesController.updateSaleReceipt(
                                    data: {"order": "cancelled"},
                                    salesModel:
                                        salesController.currentReceipt.value!);
                              },
                              child: Container(
                                margin: const EdgeInsets.only(right: 10),
                                decoration: BoxDecoration(
                                    color: Colors.red,
                                    borderRadius: BorderRadius.circular(6),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.grey.withOpacity(0.5),
                                        spreadRadius: 5,
                                      )
                                    ]),
                                padding: const EdgeInsets.symmetric(
                                    vertical: 10, horizontal: 10),
                                child: const Row(
                                  children: [
                                    Text(
                                      "Cancel Order",
                                      style: TextStyle(
                                          color: Colors.white, fontSize: 12),
                                    ),
                                    SizedBox(
                                      width: 5,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            InkWell(
                              onTap: () {
                                salesController.updateSaleReceipt(
                                    data: {
                                      "order": "completed",
                                      "status": "cashed"
                                    },
                                    salesModel:
                                        salesController.currentReceipt.value!);
                              },
                              child: Container(
                                margin: const EdgeInsets.only(right: 10),
                                decoration: BoxDecoration(
                                    color: Colors.green,
                                    borderRadius: BorderRadius.circular(6),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.grey.withOpacity(0.5),
                                        spreadRadius: 5,
                                      )
                                    ]),
                                padding: const EdgeInsets.symmetric(
                                    vertical: 10, horizontal: 10),
                                child: const Row(
                                  children: [
                                    Text(
                                      "Approve Order",
                                      style: TextStyle(
                                          color: Colors.white, fontSize: 12),
                                    ),
                                    SizedBox(
                                      width: 5,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      const SizedBox(
                        height: 20,
                      ),
                      const Divider(
                        height: 0,
                        thickness: 1,
                      ),
                      const SizedBox(
                        height: 10,
                      ),
                      if (salesController.currentReceipt.value!.customerId ==
                          null)
                        const SizedBox(
                          height: 10,
                        ),
                      Row(
                        children: [
                          if (owner() &&
                              salesController
                                      .currentReceipt.value!.customerId !=
                                  null)
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  "Customer Details",
                                  style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold),
                                ),
                                Text(
                                  "Name: ${salesController.currentReceipt.value!.customerId?.name!}",
                                  style: const TextStyle(fontSize: 13),
                                ),
                                Text(
                                  "Phone: ${salesController.currentReceipt.value!.customerId?.phoneNumber!}",
                                  style: const TextStyle(fontSize: 13),
                                ),
                                Text(
                                  "email: ${salesController.currentReceipt.value!.customerId?.email!}",
                                  style: const TextStyle(fontSize: 13),
                                ),
                              ],
                            ),
                          if (notOwner())
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  "Shop Details",
                                  style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold),
                                ),
                                Text(
                                  "Name: ${salesController.currentReceipt.value!.shopId!.name!}",
                                  style: const TextStyle(fontSize: 13),
                                ),
                                Text(
                                  "Phone: ${salesController.currentReceipt.value!.shopId!.owner?.phone!}",
                                  style: const TextStyle(fontSize: 13),
                                ),
                                Text(
                                  "email: ${salesController.currentReceipt.value!.shopId!.owner?.email!}",
                                  style: const TextStyle(fontSize: 13),
                                ),
                              ],
                            ),
                          const Spacer(),
                          const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "Delivery Address",
                                style: TextStyle(
                                    fontSize: 13, fontWeight: FontWeight.bold),
                              ),
                              Text(
                                "N/A:",
                                style: TextStyle(fontSize: 13),
                              ),
                              SizedBox(
                                width: 5,
                              ),
                            ],
                          )
                        ],
                      ),
                      const SizedBox(
                        height: 10,
                      ),
                      Row(
                        children: [
                          normalText(
                              title: "Date:", color: Colors.black, size: 14.0),
                          const SizedBox(
                            width: 5,
                          ),
                          majorTitle(
                              title: DateFormat("yyyy/MM/dd HH:mm").format(
                                  DateTime.parse(salesController
                                          .currentReceipt.value!.createdAt!)
                                      .toLocal()),
                              color: Colors.grey,
                              size: 11.0)
                        ],
                      ),
                      const SizedBox(
                        height: 20,
                      ),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 20, vertical: 5),
                            decoration: BoxDecoration(
                                color: _chechPaymentColor(
                                    salesController.currentReceipt.value!,
                                    type!),
                                borderRadius: BorderRadius.circular(5)),
                            child: Text(
                              _chechPayment(
                                  salesController.currentReceipt.value!, type!),
                              style: const TextStyle(color: Colors.white),
                            ),
                          ),
                          const SizedBox(
                            width: 20,
                          ),
                        ],
                      ),
                      const Divider(
                        color: Colors.grey,
                      ),
                      Expanded(
                        child: Column(
                          children: [
                            ListView.builder(
                                shrinkWrap: true,
                                itemCount: salesController
                                    .currentReceipt.value?.items!.length,
                                physics: const NeverScrollableScrollPhysics(),
                                itemBuilder: (BuildContext c, int i) {
                                  SaleItem receiptitem = salesController
                                      .currentReceipt.value!.items![i];
                                  return Row(
                                    children: [
                                      Expanded(
                                        child: Table(children: [
                                          TableRow(children: [
                                            Text(
                                              receiptitem
                                                  .product!.name!.capitalize!,
                                              style: TextStyle(
                                                  fontSize: 12,
                                                  decoration:
                                                      receiptitem.quantity == 0
                                                          ? TextDecoration
                                                              .lineThrough
                                                          : null),
                                            ),
                                            Text(
                                              "${receiptitem.quantity!} @${htmlPrice(receiptitem.unitPrice! + receiptitem.lineDiscount!)}",
                                              style: TextStyle(
                                                  fontSize: 13,
                                                  decoration:
                                                      receiptitem.quantity == 0
                                                          ? TextDecoration
                                                              .lineThrough
                                                          : null),
                                            ),
                                            InkWell(
                                              onTap: () {
                                                if (verifyPermission(
                                                    category: "sales",
                                                    permission: "return")) {
                                                  saleReceiptActions(
                                                      saleItem: receiptitem,
                                                      from: from!);
                                                }
                                              },
                                              child: Row(
                                                children: [
                                                  Text(
                                                    htmlPrice((receiptitem
                                                                .unitPrice! *
                                                            receiptitem
                                                                .quantity!) +
                                                        receiptitem
                                                            .lineDiscount!),
                                                    style: TextStyle(
                                                        fontSize: 13,
                                                        fontWeight:
                                                            FontWeight.bold,
                                                        decoration: receiptitem
                                                                    .quantity ==
                                                                0
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
                                            ),
                                          ]),
                                        ]),
                                      ),
                                      if (salesController.currentReceipt.value
                                                  ?.order ==
                                              "pending" &&
                                          verifyPermission(
                                              category: "sales",
                                              permission: "return"))
                                        InkWell(
                                            onTap: () {
                                              saleReceiptActions(
                                                  saleItem: receiptitem,
                                                  from: from ?? "");
                                            },
                                            child: const Icon(
                                              Icons.undo,
                                              color: Colors.red,
                                            )),
                                    ],
                                  );
                                }),
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
                                    "Sub Total: ",
                                    style: TextStyle(fontSize: 13),
                                  ),
                                  Column(
                                    children: [
                                      Text(
                                        htmlPrice(salesController.currentReceipt
                                                .value!.totalAmount! -
                                            salesController.currentReceipt
                                                .value!.totaltax!),
                                        style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.bold),
                                      ),
                                      const Divider(
                                        thickness: 0.5,
                                        color: Colors.black,
                                      )
                                    ],
                                  ),
                                ]),
                                TableRow(children: [
                                  const Text(
                                    "",
                                    style: TextStyle(fontSize: 16),
                                  ),
                                  const Text(
                                    "VAT: ",
                                    style: TextStyle(fontSize: 13),
                                  ),
                                  Column(
                                    children: [
                                      Text(
                                        htmlPrice(salesController
                                            .currentReceipt.value!.totaltax!),
                                        style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.bold),
                                      ),
                                      const Divider(
                                        thickness: 0.5,
                                        color: Colors.black,
                                      )
                                    ],
                                  ),
                                ]),
                                TableRow(children: [
                                  const Text(
                                    "",
                                    style: TextStyle(fontSize: 16),
                                  ),
                                  const Text(
                                    "Total: ",
                                    style: TextStyle(fontSize: 13),
                                  ),
                                  Column(
                                    children: [
                                      Text(
                                        htmlPrice(salesController.currentReceipt
                                            .value!.totalWithDiscount!),
                                        style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.bold),
                                      ),
                                      const Divider(
                                        thickness: 1,
                                        height: 0,
                                        color: Colors.black,
                                      ),
                                      const Divider(
                                        thickness: 2,
                                        height: 5,
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
                      const SizedBox(
                        height: 60,
                      ),
                      Expanded(
                        child: Row(
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                normalText(
                                    title: "Date",
                                    color: Colors.black,
                                    size: 12.0),
                                const SizedBox(
                                  height: 10,
                                ),
                                if (salesController
                                        .currentReceipt.value!.createdAt !=
                                    null)
                                  majorTitle(
                                      title: DateFormat("yyyy-MM-dd hh:mm")
                                          .format(DateTime.parse(salesController
                                              .currentReceipt
                                              .value!
                                              .createdAt!)),
                                      color: Colors.black,
                                      size: 12.0)
                              ],
                            ),
                            const Spacer(),
                            if (salesModel?.attendant != null)
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  normalText(
                                      title: "Served by",
                                      color: Colors.black,
                                      size: 12.0),
                                  const SizedBox(
                                    height: 10,
                                  ),
                                  majorTitle(
                                      title: salesModel?.attendant?.username,
                                      color: Colors.black,
                                      size: 12.0)
                                ],
                              ),
                            const Spacer(),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                normalText(
                                    title: "Paid via",
                                    color: Colors.black,
                                    size: 12.0),
                                const SizedBox(
                                  height: 10,
                                ),
                                majorTitle(
                                    title: salesModel?.paymentType,
                                    color: Colors.black,
                                    size: 12.0)
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Container(
          height: 80,
          margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              Center(
                child: InkWell(
                  onTap: () {
                    salesController.sharePdf(salesModel!);
                  },
                  child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(50),
                          color: AppColors.mainColor,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.grey.withOpacity(0.5),
                              spreadRadius: 3,
                            )
                          ]),
                      child: const Icon(Icons.share, color: Colors.white)),
                ),
              ),
              Center(
                child: InkWell(
                  onTap: () {
                    Get.to(() => PdfPreviewPage(
                        invoice: salesModel!,
                        type:
                            "${_chechPayment(salesModel!, type!) != "PROCESSED" ? _chechPayment(salesModel!, type!) : "ORDER"} RECEIPT"));
                  },
                  child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(50),
                          color: AppColors.mainColor,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.grey.withOpacity(0.5),
                              spreadRadius: 3,
                            )
                          ]),
                      child: const Icon(Icons.print, color: Colors.white)),
                ),
              ),
              if (salesController.currentReceipt.value?.paymentType == "credit")
                Center(
                  child: textBtn(
                      hPadding: 20,
                      fontSize: 13,
                      text: "Payments",
                      onPressed: () {
                        paymentController.getSalesPaymentBySaleId(
                            salesController.currentReceipt.value!.sId!);
                        Get.to(() => PaymentHistory());
                      },
                      radius: 10,
                      bgColor: Colors.red,
                      color: Colors.white),
                ),
            ],
          )),
    );
  }

  bool notOwner() {
    return userController.currentUser.value != null &&
            salesController.currentReceipt.value!.shopId?.id !=
                userController.currentUser.value!.primaryShop!.id ||
        userController.currentUser.value == null;
  }

  bool owner() {
    return userController.currentUser.value != null &&
        salesController.currentReceipt.value!.shopId?.id ==
            userController.currentUser.value!.primaryShop!.id;
  }
}

String _chechPayment(SaleModel salesModel, String? type) {
  if (salesModel.order == 'pending') return "PENDING APPROVAL";
  if (salesModel.order == 'cancelled') return "CANCELLED";
  if (salesModel.order == 'completed') return "PROCESSED";
  return "";
}

onCredit(SaleModel salesModel) => salesModel.outstandingBalance! > 0;

Color _chechPaymentColor(SaleModel salesModel, String? type) {
  if (salesModel.totalWithDiscount! == 0 || type == "returns") {
    return Colors.red;
  }
  if (salesModel.order == 'pending') return Colors.amber;
  if (salesModel.order == 'cancelled') return Colors.red;
  if (salesModel.order == 'completed') return Colors.green;
  return Colors.black;
}

void saleReceiptActions(
    {SaleItem? saleItem,
    SaleModel? saleModel,
    bool delete = false,
    String from = ""}) {
  SalesController salesController = Get.find<SalesController>();
  if (saleModel != null) {
    generalAlert(
        title: "Warning",
        positiveText: "Yes",
        negativeText: "Not now",
        message:
            "Are you sure you want to ${delete ? "delete" : "return"} ${salesController.currentReceipt.value?.items!.length} items?",
        function: () {
          var items = salesController.currentReceipt.value?.items!
              .map((e) => {"product": e.product?.sId, "quantity": e.quantity})
              .toList();

          salesController.returnSale(
              saledId: salesController.currentReceipt.value!.sId,
              returnItems: items,
              from: from,
              deleteReceipt: delete);
        });
  } else {
    if (saleItem != null && saleItem.quantity! > 0) {
      returnReceiptItem(receiptItem: saleItem, from: from);
    }
  }
}

returnReceiptItem(
    {required SaleItem receiptItem, Product? product, String? from = ""}) {
  SalesController salesController = Get.find<SalesController>();
  TextEditingController textEditingController = TextEditingController();
  return showDialog(
      context: Get.context!,
      builder: (_) {
        return AlertDialog(
          title: const Text("Return Product?"),
          content: Container(
            decoration: ThemeHelper().inputBoxDecorationShaddow(),
            child: TextFormField(
              controller: textEditingController,
              decoration: ThemeHelper()
                  .textInputDecoration('Quantity', 'Enter quantity'),
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            ),
          ),
          actions: [
            TextButton(
                onPressed: () {
                  Get.back();
                },
                child: Text(
                  "Cancel".toUpperCase(),
                  style:  TextStyle(color: AppColors.mainColor),
                )),
            TextButton(
                onPressed: () {
                  if (receiptItem.quantity! <
                      int.parse(textEditingController.text)) {
                    generalAlert(
                        title: "Error",
                        message:
                            "You cannot return more than ${receiptItem.quantity}");
                  } else if (int.parse(textEditingController.text) <= 0) {
                    generalAlert(
                        title: "Error",
                        message: "You must atleast return 1 item");
                  } else {
                    Get.back();
                    salesController.returnSale(
                        saledId: receiptItem.currentSale?.sId,
                        returnItems: [
                          {
                            "product": receiptItem.product?.sId,
                            "quantity": int.parse(textEditingController.text)
                          }
                        ],
                        from: from ?? "");
                  }
                },
                child: Text(
                  "Okay".toUpperCase(),
                  style:  TextStyle(color: AppColors.mainColor),
                ))
          ],
        );
      });
}

showAmountDialog(SaleModel salesBody) {
  SalesController salesController = Get.find<SalesController>();
  showDialog(
      context: Get.context!,
      builder: (_) {
        return AlertDialog(
          title: const Text(
            "Pay invoice",
            style: TextStyle(
              color: Colors.black,
              fontWeight: FontWeight.bold,
            ),
          ),
          content: SizedBox(
            child: Form(
                child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  "Payment via",
                  style: TextStyle(color: Colors.black, fontSize: 12),
                ),
                const SizedBox(
                  height: 10,
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  margin: const EdgeInsets.only(bottom: 10),
                  decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey),
                      borderRadius: BorderRadius.circular(5)),
                  child: InkWell(
                    onTap: () {
                      showDialog(
                          context: Get.context!,
                          builder: (context) {
                            return SimpleDialog(
                              children: List.generate(
                                  salesController.receiptpaymentMethods.length,
                                  (index) => SimpleDialogOption(
                                        onPressed: () {
                                          salesController.paynowMethod.value =
                                              salesController
                                                  .receiptpaymentMethods[index];
                                          Navigator.pop(context);
                                        },
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(
                                              vertical: 5),
                                          child: Text(
                                            "${salesController.receiptpaymentMethods[index]}",
                                            style:
                                                const TextStyle(fontSize: 18),
                                          ),
                                        ),
                                      )),
                            );
                          });
                    },
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Obx(
                          () => Text(salesController.paynowMethod.value),
                        ),
                        const Icon(Icons.arrow_drop_down)
                      ],
                    ),
                  ),
                ),
                const Text(
                  "Enter Amount",
                  style: TextStyle(color: Colors.black, fontSize: 12),
                ),
                const SizedBox(
                  height: 10,
                ),
                TextFormField(
                  controller: salesController.amountController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                      hintText: "eg ${salesBody.totalWithDiscount}",
                      hintStyle: const TextStyle(fontSize: 10),
                      fillColor: Colors.white,
                      filled: true,
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8))),
                ),
              ],
            )),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Get.back();
              },
              child: Text(
                "Cancel".toUpperCase(),
                style:  TextStyle(
                  color: AppColors.mainColor,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            TextButton(
              onPressed: () {
                Get.back();
                var amountPaid = int.parse(
                    salesController.amountController.text.isEmpty
                        ? "0"
                        : salesController.amountController.text);
                if (salesBody.outstandingBalance! < amountPaid) {
                  generalAlert(
                      title: "Error",
                      message:
                          "You cannot pay more than ${htmlPrice(salesBody.outstandingBalance!.abs())}");
                } else {
                  if (salesController.paynowMethod.value == "Wallet") {
                    var walletBalance = (salesBody.customerId!.wallet ?? 0);
                    if (walletBalance == 0) {
                      generalAlert(
                          title: "Error",
                          message: "Wallet balance is ${htmlPrice(0)}");
                    } else {
                      if (walletBalance < amountPaid) {
                        generalAlert(
                            title: "Warning",
                            message: walletBalance < 0
                                ? "Wallet balance is not sufficient to pay ${htmlPrice(amountPaid)}"
                                : "Wallet balance can only pay ${htmlPrice(walletBalance)} continue?",
                            function: () {
                              salesController.payCredit(
                                  salesBody: salesBody, amount: amountPaid);
                            });
                      } else {
                        salesController.payCredit(
                            salesBody: salesBody, amount: amountPaid);
                      }
                    }
                  } else {
                    salesController.payCredit(
                        salesBody: salesBody, amount: amountPaid);
                  }
                }
              },
              child: Text(
                "Pay".toUpperCase(),
                style:  TextStyle(
                  color: AppColors.mainColor,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        );
      });
}

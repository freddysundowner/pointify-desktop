import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/controllers/warehousecontroller.dart';
import 'package:pointify/main.dart';
import 'package:pointify/models/warehouseitem.dart';
import 'package:pointify/widgets/textbutton.dart';
import 'package:printing/printing.dart';

import '../../functions/functions.dart';
import '../../models/product.dart';
import '../../utils/colors.dart';
import '../../widgets/alert.dart';
import '../../widgets/major_title.dart';
import '../receipts/pdf/sales/warehouse_invoice.dart';

class SingleWarehouseInvoice extends StatelessWidget {
  String? from = "home";
  SingleWarehouseInvoice({super.key, this.from});
  WareHouseController wareHouseController = Get.put(WareHouseController());
  @override
  Widget build(BuildContext context) {
    return Scaffold(
        appBar: AppBar(
          title: Text(
            "Invoice No. #${wareHouseController.currentwarehouseItem.value?.invoiceNumber ?? ""}",
            style: const TextStyle(fontSize: 16),
          ),
          actions: <Widget>[
            PopupMenuButton<String>(
              onSelected: (String value) {
                if (value == 'Share') {
                  wareHouseController.sharePdfInvoice(
                      wareHouseController.currentwarehouseItem.value?.items);
                }
                if (value == 'Delete') {
                  if (verifyPermission(
                      category: "wahinvoice", permission: "delete")) {
                    wareHouseController.delete(
                        wareHouseController.currentwarehouseItem.value!);
                  }
                }
                if (value == 'download') {
                  Get.to(() => Scaffold(
                        appBar: AppBar(
                          title: const Text("Invoice"),
                        ),
                        body: PdfPreview(
                          build: (context) => warehouseInvoicePdf(
                            "Invoice #${wareHouseController.currentwarehouseItem.value?.invoiceNumber ?? ""}",
                            wareHouseItems: wareHouseController
                                .currentwarehouseItem.value?.items,
                          ),
                        ),
                      ));
                }
              },
              itemBuilder: (BuildContext context) {
                return [
                  if (verifyPermission(
                          category: "warehouse",
                          permission: "invoice_delete") &&
                      wareHouseController.currentwarehouseItem.value!.status !=
                          "completed")
                    const PopupMenuItem<String>(
                      value: 'Delete',
                      child: Text('Delete Receipt'),
                    ),
                  const PopupMenuItem<String>(
                    value: 'download',
                    child: Text('Download Receipt'),
                  ),
                  const PopupMenuItem<String>(
                    value: 'Share',
                    child: Text('Share receipt'),
                  )
                ];
              },
              icon: Icon(Icons.more_vert), // This can be any icon you prefer
            ),
          ],
        ),
        body: Container(
          margin: const EdgeInsets.symmetric(horizontal: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  majorTitle(
                      title: wareHouseController
                              .currentwarehouseItem.value?.shop?.name ??
                          "",
                      color: AppColors.mainColor,
                      size: 13.0),
                  Spacer(),
                  majorTitle(
                      title: DateFormat('yyyy-MM-dd HH:mm a').format(
                          wareHouseController
                              .currentwarehouseItem.value!.createdDate!
                              .toLocal()),
                      color: AppColors.mainColor,
                      size: 13.0),
                  SizedBox(
                    width: 30,
                  ),
                  // Expanded(
                  //   child: TextFormField(
                  //     // controller: wareHouseController.invoiceSearchController,
                  //     decoration: InputDecoration(
                  //         focusedBorder: OutlineInputBorder(
                  //             borderRadius: BorderRadius.circular(8),
                  //             borderSide: const BorderSide(
                  //                 color: Colors.grey, width: 0.5)),
                  //         enabledBorder: OutlineInputBorder(
                  //             borderRadius: BorderRadius.circular(8),
                  //             borderSide: const BorderSide()),
                  //         hintText: "Search",
                  //         hintStyle: TextStyle(color: Colors.grey.shade400),
                  //         contentPadding: const EdgeInsets.symmetric(
                  //             horizontal: 10, vertical: 0)),
                  //   ),
                  // )
                ],
              ),
              Divider(),
              const SizedBox(height: 10),
              Expanded(
                child: Obx(() => wareHouseController.isLoadingCount.isTrue
                        ? const Center(child: CircularProgressIndicator())
                        : ListView.builder(
                            shrinkWrap: true,
                            itemCount: wareHouseController
                                .currentwarehouseItem.value?.items!.length,
                            itemBuilder: (BuildContext c, int i) {
                              WareHouseItem wareHouseItem = wareHouseController
                                  .currentwarehouseItem.value!.items![i];
                              var misingItems = wareHouseItem.quantity! -
                                  wareHouseItem.received!;
                              return Container(
                                margin: const EdgeInsets.only(bottom: 5),
                                decoration: const BoxDecoration(
                                  border: Border(
                                    bottom: BorderSide(
                                        color: Colors.grey, // Border color
                                        width: 0.5 // Border thickness
                                        ),
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            "${wareHouseItem.product?["name"]}${wareHouseItem.items!.isNotEmpty ? " ~ bundle" : ""}",
                                            style: const TextStyle(
                                                fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                        if (wareHouseItem.items != null &&
                                            wareHouseItem.items!.isNotEmpty)
                                          InkWell(
                                            onTap: () {
                                              showModalBottomSheet(
                                                context: context,
                                                backgroundColor: Colors.white,
                                                shape:
                                                    const RoundedRectangleBorder(
                                                  borderRadius:
                                                      BorderRadius.only(
                                                          topRight:
                                                              Radius.circular(
                                                                  15),
                                                          topLeft:
                                                              Radius.circular(
                                                                  15)),
                                                ),
                                                builder: (context) =>
                                                    SingleChildScrollView(
                                                  child: Container(
                                                    padding:
                                                        const EdgeInsets.only(
                                                            top: 10),
                                                    child: ListView.builder(
                                                        itemCount: wareHouseItem
                                                            .items?.length,
                                                        shrinkWrap: true,
                                                        physics:
                                                            const NeverScrollableScrollPhysics(),
                                                        itemBuilder:
                                                            (context, index) {
                                                          var option =
                                                              wareHouseItem
                                                                      .items?[
                                                                  index];
                                                          return Column(
                                                            children: [
                                                              Container(
                                                                padding:
                                                                    const EdgeInsets
                                                                        .all(
                                                                        10),
                                                                width: MediaQuery.of(
                                                                        context)
                                                                    .size
                                                                    .width,
                                                                child: Row(
                                                                  mainAxisAlignment:
                                                                      MainAxisAlignment
                                                                          .spaceBetween,
                                                                  children: [
                                                                    Text(
                                                                      "${option["item"]["product"]["name"]} =  ${option["quantity"]} ${option["item"]["product"]["measure"]}",
                                                                    ),
                                                                    const Icon(
                                                                      Icons
                                                                          .arrow_forward_ios_outlined,
                                                                      size: 16,
                                                                    ),
                                                                  ],
                                                                ),
                                                              ),
                                                              const Divider()
                                                            ],
                                                          );
                                                        }),
                                                  ),
                                                ),
                                              );
                                            },
                                            child:  Icon(
                                              Icons.info,
                                              color: AppColors.mainColor,
                                            ),
                                          )
                                      ],
                                    ),
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Row(
                                          children: [
                                            Text(
                                                wareHouseController
                                                            .currentwarehouseItem
                                                            .value
                                                            ?.status ==
                                                        "pending"
                                                    ? "Requested: ${wareHouseItem.quantity} ${wareHouseItem.product!['measure'] ?? ""}"
                                                    : "Dispatched: ${wareHouseItem.quantity} ${wareHouseItem.product == null ? "" : wareHouseItem.product!['measure'] ?? ""}",
                                                style: const TextStyle(
                                                    fontSize: 12)),
                                            const SizedBox(
                                              width: 20,
                                            ),
                                            if (wareHouseItem.received! > 0 ||
                                                wareHouseController
                                                        .currentwarehouseItem
                                                        .value
                                                        ?.status ==
                                                    "completed")
                                              Text(
                                                  "Received: ${misingItems == 0 ? wareHouseItem.quantity : wareHouseItem.received} ${wareHouseItem.product == null ? "" : wareHouseItem.product!['measure'] ?? ""}",
                                                  style: const TextStyle(
                                                      fontSize: 12)),
                                            const SizedBox(
                                              width: 20,
                                            ),
                                            if (misingItems > 0 &&
                                                wareHouseItem.received != 0 &&
                                                verifyPermission(
                                                    category: "warehouse",
                                                    permission:
                                                        "accept_warehouse_orders"))
                                              Text(
                                                "Missing: ${wareHouseItem.quantity! - wareHouseItem.received!} ${wareHouseItem.product == null ? "" : wareHouseItem.product!['measure'] ?? ""}",
                                                style: const TextStyle(
                                                    color: Colors.red,
                                                    fontSize: 12),
                                              ),
                                          ],
                                        ),
                                        Row(
                                          children: [
                                            if (verifyPermission(
                                                    category: "warehouse",
                                                    permission: "return") &&
                                                ((wareHouseController
                                                            .currentwarehouseItem
                                                            .value
                                                            ?.status ==
                                                        "processed" &&
                                                    userController
                                                            .currentUser
                                                            .value
                                                            ?.primaryShop
                                                            ?.warehouse ==
                                                        false)))
                                              InkWell(
                                                onTap: () {
                                                  showDialog(
                                                      context: Get.context!,
                                                      builder: (_) {
                                                        return AlertDialog(
                                                          title: Row(
                                                            mainAxisAlignment:
                                                                MainAxisAlignment
                                                                    .spaceBetween,
                                                            children: [
                                                              const Text(
                                                                "Enter items received",
                                                                style: TextStyle(
                                                                    fontSize:
                                                                        14),
                                                              ),
                                                              InkWell(
                                                                onTap: () {
                                                                  Get.back();
                                                                },
                                                                child:
                                                                    const Icon(
                                                                  Icons.cancel,
                                                                  color: Colors
                                                                      .red,
                                                                ),
                                                              )
                                                            ],
                                                          ),
                                                          actions: [
                                                            TextFormField(
                                                                decoration:
                                                                    const InputDecoration(
                                                                  hintText:
                                                                      "Quantity",
                                                                ),
                                                                keyboardType:
                                                                    TextInputType
                                                                        .number,
                                                                controller:
                                                                    wareHouseController
                                                                        .textEditingQtyReceived,
                                                                onFieldSubmitted:
                                                                    (value) {
                                                                  if (value
                                                                      .isNotEmpty) {}
                                                                }),
                                                            const SizedBox(
                                                              height: 20,
                                                            ),
                                                            textBtn(
                                                                onPressed: () {
                                                                  wareHouseController
                                                                      .updateInvoice({
                                                                    "received":
                                                                        wareHouseController
                                                                            .textEditingQtyReceived
                                                                            .text,
                                                                    "productId":
                                                                        wareHouseItem
                                                                            .product?["_id"]
                                                                  }, "receive");
                                                                },
                                                                text: "Save")
                                                          ],
                                                        );
                                                      });
                                                },
                                                child: Container(
                                                  decoration: BoxDecoration(
                                                    border: Border.all(
                                                        color: AppColors
                                                            .mainColor),
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                            5),
                                                  ),
                                                  padding: const EdgeInsets
                                                      .symmetric(
                                                      horizontal: 3,
                                                      vertical: 4),
                                                  child:  Text(
                                                    "Receive",
                                                    style: TextStyle(
                                                        color:
                                                            AppColors.mainColor,
                                                        fontSize: 13),
                                                  ),
                                                ),
                                              ),
                                            if (verifyPermission(
                                                    category: "warehouse",
                                                    permission: "return") &&
                                                ((wareHouseController
                                                            .currentwarehouseItem
                                                            .value
                                                            ?.status ==
                                                        "pending") ||
                                                    wareHouseController
                                                            .currentwarehouseItem
                                                            .value
                                                            ?.status ==
                                                        "void"))
                                              InkWell(
                                                  onTap: () {
                                                    wareHouseController
                                                        .incrementQuantityWidget(
                                                            context,
                                                            type:
                                                                "updateinvoice",
                                                            product: Product(
                                                              sId: wareHouseItem
                                                                      .product?[
                                                                  "_id"],
                                                            ));
                                                  },
                                                  child: const Icon(
                                                    Icons.undo,
                                                    color: Colors.red,
                                                  )),
                                            if (verifyPermission(
                                                    category: "warehouse",
                                                    permission: "return") &&
                                                ((wareHouseController
                                                            .currentwarehouseItem
                                                            .value
                                                            ?.status ==
                                                        "pending") ||
                                                    wareHouseController
                                                            .currentwarehouseItem
                                                            .value
                                                            ?.status ==
                                                        "void"))
                                              InkWell(
                                                  onTap: () {
                                                    generalAlert(
                                                        title: "Warning",
                                                        message:
                                                            "Are you sure you want to edit this item quantity?",
                                                        function: () {
                                                          wareHouseController
                                                              .currentwarehouseItem
                                                              .value!
                                                              .items
                                                              ?.removeWhere(
                                                                  (element) =>
                                                                      element
                                                                          .id ==
                                                                      wareHouseItem
                                                                          .id);
                                                          wareHouseController
                                                              .currentwarehouseItem
                                                              .refresh();
                                                          wareHouseController
                                                              .deleteSingleItem(
                                                            item: wareHouseItem
                                                                .id,
                                                          );
                                                          if (wareHouseController
                                                              .currentwarehouseItem
                                                              .value!
                                                              .items!
                                                              .isEmpty) {
                                                            wareHouseController
                                                                .warehouseInvoices
                                                                .removeWhere((element) =>
                                                                    element
                                                                        .id ==
                                                                    wareHouseController
                                                                        .currentwarehouseItem
                                                                        .value
                                                                        ?.id);
                                                            wareHouseController
                                                                .warehouseInvoices
                                                                .refresh();
                                                            Get.back();
                                                          }
                                                        });
                                                  },
                                                  child: const Icon(
                                                    Icons.delete,
                                                    color: Colors.red,
                                                  )),
                                          ],
                                        )
                                      ],
                                    )
                                  ],
                                ),
                              );
                            },
                          )
                    // : ListView.builder(
                    //     shrinkWrap: true,
                    //     itemCount: wareHouseController
                    //         .currentwarehouseItem.value?.items!.length,
                    //     itemBuilder: (BuildContext c, int i) {
                    //       WareHouseItem wareHouseItem = wareHouseController
                    //           .currentwarehouseItem.value!.items![i];
                    //       return Row(
                    //         children: [
                    //           Expanded(
                    //             child: Table(children: [
                    //               TableRow(
                    //                   decoration: BoxDecoration(
                    //                     color: wareHouseItem.inventory![
                    //                                     'quantity'] <
                    //                                 wareHouseItem.quantity &&
                    //                             userController
                    //                                     .currentUser
                    //                                     .value
                    //                                     ?.primaryShop
                    //                                     ?.warehouse ==
                    //                                 true
                    //                         ? Colors.amber.shade200
                    //                         : null,
                    //                   ),
                    //                   children: [
                    //                     Text(
                    //                       wareHouseItem.product?["name"],
                    //                       style: TextStyle(
                    //                           fontSize: 12,
                    //                           decoration:
                    //                               wareHouseItem.quantity == 0
                    //                                   ? TextDecoration
                    //                                       .lineThrough
                    //                                   : null),
                    //                     ),
                    //                     Text(
                    //                       "${wareHouseItem.quantity!} @${wareHouseItem.product!['buyingPrice']}",
                    //                       style: TextStyle(
                    //                           fontSize: 13,
                    //                           decoration:
                    //                               wareHouseItem.quantity == 0
                    //                                   ? TextDecoration
                    //                                       .lineThrough
                    //                                   : null),
                    //                     ),
                    //                     if (userController.currentUser.value
                    //                             ?.primaryShop?.warehouse ==
                    //                         true)
                    //                       Text(
                    //                         "Available: ${wareHouseItem.inventory!['quantity']}",
                    //                         style: TextStyle(fontSize: 11),
                    //                       ),
                    //                     Row(
                    //                       children: [
                    //                         Text(
                    //                           htmlPrice(wareHouseItem
                    //                                       .product![
                    //                                   'buyingPrice'] *
                    //                               wareHouseItem.quantity!),
                    //                           style: TextStyle(
                    //                               fontSize: 13,
                    //                               fontWeight: FontWeight.bold,
                    //                               decoration: wareHouseItem
                    //                                           .quantity ==
                    //                                       0
                    //                                   ? TextDecoration
                    //                                       .lineThrough
                    //                                   : null),
                    //                         ),
                    //                         if (wareHouseItem.quantity == 0)
                    //                           const Icon(
                    //                             Icons.file_download,
                    //                             color: Colors.red,
                    //                             size: 15,
                    //                           )
                    //                       ],
                    //                     ),
                    //                   ]),
                    //             ]),
                    //           ),
                    //           if (verifyPermission(
                    //                   category: "warehouse",
                    //                   permission: "return") &&
                    //               ((wareHouseController.currentwarehouseItem
                    //                               .value?.status ==
                    //                           "pending" &&
                    //                       userController.currentUser.value
                    //                               ?.primaryShop?.warehouse ==
                    //                           true) ||
                    //                   wareHouseController.currentwarehouseItem
                    //                           .value?.status ==
                    //                       "void"))
                    //             InkWell(
                    //                 onTap: () {
                    //                   wareHouseController
                    //                       .incrementQuantityWidget(context,
                    //                           type: "updateinvoice",
                    //                           product: Product(
                    //                             sId: wareHouseItem
                    //                                 .product?["_id"],
                    //                           ));
                    //                 },
                    //                 child: const Icon(
                    //                   Icons.undo,
                    //                   color: Colors.red,
                    //                 )),
                    //           if (verifyPermission(
                    //                   category: "warehouse",
                    //                   permission: "return") &&
                    //               ((wareHouseController.currentwarehouseItem
                    //                               .value?.status ==
                    //                           "pending" &&
                    //                       userController.currentUser.value
                    //                               ?.primaryShop?.warehouse ==
                    //                           true) ||
                    //                   wareHouseController.currentwarehouseItem
                    //                           .value?.status ==
                    //                       "void"))
                    //             InkWell(
                    //                 onTap: () {
                    //                   generalAlert(
                    //                       title: "Warning",
                    //                       message:
                    //                           "Are you sure you want to edit this item quantity?",
                    //                       function: () {
                    //                         wareHouseController
                    //                             .currentwarehouseItem
                    //                             .value!
                    //                             .items
                    //                             ?.removeWhere((element) =>
                    //                                 element.id ==
                    //                                 wareHouseItem.id);
                    //                         wareHouseController
                    //                             .currentwarehouseItem
                    //                             .refresh();
                    //                         wareHouseController
                    //                             .deleteSingleItem(
                    //                           item: wareHouseItem.id,
                    //                         );
                    //                         if (wareHouseController
                    //                             .currentwarehouseItem
                    //                             .value!
                    //                             .items!
                    //                             .isEmpty) {
                    //                           wareHouseController
                    //                               .warehouseInvoices
                    //                               .removeWhere((element) =>
                    //                                   element.id ==
                    //                                   wareHouseController
                    //                                       .currentwarehouseItem
                    //                                       .value
                    //                                       ?.id);
                    //                           wareHouseController
                    //                               .warehouseInvoices
                    //                               .refresh();
                    //                           Get.back();
                    //                         }
                    //                       });
                    //                 },
                    //                 child: const Icon(
                    //                   Icons.delete,
                    //                   color: Colors.red,
                    //                 )),
                    //         ],
                    //       );
                    //     }),
                    ),
              ),
            ],
          ),
        ),
        bottomNavigationBar: Container(
          margin: const EdgeInsets.only(bottom: 10),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(
                height: 10,
              ),
              if (verifyPermission(
                      category: "warehouse", permission: "completed") &&
                  wareHouseController.currentwarehouseItem.value?.status ==
                      "completed")
                Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      Text(
                          "Accepted by ${wareHouseController.currentwarehouseItem.value?.acceptedBy?.username} on ${DateFormat("yyyy-MM-dd HH:mm a").format(wareHouseController.currentwarehouseItem.value!.acceptedDate ?? DateTime.now())}"),
                    ]),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  if (verifyPermission(
                          category: "warehouse", permission: "recall") &&
                      userController
                              .currentUser.value?.primaryShop?.warehouse ==
                          true &&
                      wareHouseController.currentwarehouseItem.value!.status ==
                          "pending" &&
                      userController
                              .currentUser.value?.primaryShop?.production ==
                          false)
                    textBtn(
                      bgColor: Colors.red,
                      color: Colors.white,
                      hPadding: 20,
                      onPressed: () {
                        generalAlert(
                            title: "Warning",
                            message:
                                "Are you sure you want to reject this invoice?",
                            function: () {
                              wareHouseController.updateStatus(
                                  wareHouseController
                                      .currentwarehouseItem.value!,
                                  "void");
                            });
                      },
                      text: "Reject ",
                    ),
                  if (verifyPermission(
                          category: "warehouse", permission: "approve") &&
                      userController
                              .currentUser.value?.primaryShop?.warehouse ==
                          true &&
                      wareHouseController.currentwarehouseItem.value!.status ==
                          "pending" &&
                      userController
                              .currentUser.value?.primaryShop?.production ==
                          false)
                    textBtn(
                      hPadding: 30,
                      bgColor: Colors.green,
                      color: Colors.white,
                      onPressed: () {
                        generalAlert(
                            title: "Warning",
                            message:
                                "Are you sure you want to approve this invoice?",
                            function: () {
                              wareHouseController.approve(wareHouseController
                                  .currentwarehouseItem.value!);
                            });
                      },
                      text: "Dispatch",
                    ),
                  if (verifyPermission(
                          category: "warehouse", permission: "create_orders") &&
                      userController.currentUser.value?.primaryShop?.id ==
                          wareHouseController
                              .currentwarehouseItem.value?.shop?.id &&
                      wareHouseController.currentwarehouseItem.value!.status ==
                          "void")
                    textBtn(
                      hPadding: 30,
                      bgColor: Colors.green,
                      color: Colors.white,
                      onPressed: () {
                        generalAlert(
                            title: "Warning",
                            message:
                                "Are you sure you want to approve this invoice?",
                            function: () {
                              wareHouseController.updateStatus(
                                  wareHouseController
                                      .currentwarehouseItem.value!,
                                  "pending");
                            });
                      },
                      text: "Resubmit",
                    ),
                  if (verifyPermission(
                          category: "warehouse",
                          permission: "accept_warehouse_orders") &&
                      userController.currentUser.value?.primaryShop?.id ==
                          wareHouseController
                              .currentwarehouseItem.value?.shop?.id &&
                      wareHouseController.currentwarehouseItem.value!.status ==
                          "processed")
                    textBtn(
                      hPadding: 30,
                      bgColor: Colors.green,
                      color: Colors.white,
                      onPressed: () {
                        generalAlert(
                            title: "Warning",
                            message:
                                "Are you sure you want to Accept this invoice?",
                            function: () {
                              wareHouseController.acceptOrder(
                                wareHouseController.currentwarehouseItem.value!,
                                from!,
                              );
                            });
                      },
                      text: "Accept Invoice",
                    ),
                ],
              )
            ],
          ),
        ));
  }

  void WareHouseIvoiceActions({
    WareHouseItem? wareHouseItem,
    bool delete = false,
  }) {
    if (wareHouseItem != null) {
      generalAlert(
          title: "Warning",
          positiveText: "Yes",
          negativeText: "Not now",
          message:
              "Are you sure you want to ${delete ? "delete" : "return"} ${wareHouseItem.quantity} items?",
          function: () {
            // if (delete == true) {
            //   salesController.voidReceipt(salesController.currentReceipt.value!);
            //   return;
            // }
            // var items = salesController.currentReceipt.value?.items!
            //     .map((e) => {"product": e.product?.sId, "quantity": e.quantity})
            //     .toList();
            //
            // if (from == "sales") {
            //   Get.back();
            // }
            // salesController.returnSale(
            //     saledId: salesController.currentReceipt.value!.sId,
            //     returnItems: items,
            //     from: from,
            //     deleteReceipt: delete);
          });
    } else {
      // if (saleItem != null && saleItem.quantity! > 0) {
      //   returnReceiptItem(receiptItem: saleItem);
      // }
    }
  }
}

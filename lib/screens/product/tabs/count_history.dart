import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';

import '../../../controllers/productcontroller.dart';
import '../../../controllers/salescontroller.dart';
import '../../../models/counthistory.dart';
import '../../../models/product.dart';
import '../../../responsive/responsiveness.dart';

class ProductCountHistory extends StatelessWidget {
  final  Product? product;

    ProductCountHistory({Key? key, this.product}) : super(key: key);
final  ProductController productController = Get.find<ProductController>();
final  SalesController salesController = Get.find<SalesController>();

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      return productController.countHistory.isEmpty
          ? const Center(
              child: Text("There are no items to display"),
            )
          : isSmallScreen(context)
              ? ListView.builder(
                  shrinkWrap: true,
                  itemCount: productController.countHistory.length,
                  itemBuilder: (context, index) {
                    CountHistory productModel =
                        productController.countHistory.elementAt(index);
                    return InkWell(
                      onTap: () {
                        Map<String, dynamic> data = {};
                        String title = "";
                        if (productModel.products![0].variance! < 0) {
                          data = {
                            "quantity":
                                productModel.products![0].variance!.abs() +
                                    product!.quantity!,
                          };
                          title =
                              "Deleting this history will increase ${product!.name!} quantity by ${productModel.products![0].variance!.abs()}";
                        } else {
                          data = {
                            "quantity": product!.quantity! -
                                productModel.products![0].variance!.abs(),
                          };
                          title =
                              "Deleting this history will decrease ${product!.name!} quantity by ${productModel.products![0].variance!.abs()}";
                        }
                        deleteFunction(
                            context, productModel, index, data, title);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 10),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                        '${DateFormat("MMM dd,yyyy, hh:m a").format(DateTime.parse(productModel.products![0].createdAt!))} ',
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 13)),
                                    const SizedBox(
                                      height: 3,
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 6, vertical: 3),
                                      decoration: BoxDecoration(
                                          borderRadius:
                                              BorderRadius.circular(10),
                                          color: Colors.black12),
                                      child: Text(
                                        'previously ${productModel.products![0].initialCount}, updated to ${productModel.products![0].physicalCount}',
                                        style: const TextStyle(fontSize: 12),
                                      ),
                                    ),
                                    const SizedBox(
                                      height: 3,
                                    ),
                                    Text(
                                        "By~ ${productModel.attendantId?.username}")
                                  ],
                                ),
                                const Spacer(),
                                const Icon(
                                  Icons.delete,
                                  color: Colors.red,
                                  size: 20,
                                )
                              ],
                            ),
                            const Divider()
                          ],
                        ),
                      ),
                    );
                  })
              : Container();
      // : Container(
      //     width: double.infinity,
      //     margin: const EdgeInsets.symmetric(horizontal: 5)
      //         .copyWith(bottom: 10),
      //     padding:
      //         const EdgeInsets.symmetric(horizontal: 5, vertical: 10),
      //     child: Theme(
      //       data: Theme.of(context).copyWith(dividerColor: Colors.grey),
      //       child: DataTable(
      //         decoration: BoxDecoration(
      //             border: Border.all(
      //           width: 1,
      //           color: Colors.black,
      //         )),
      //         columnSpacing: 30.0,
      //         columns: const [
      //           DataColumn(
      //               label: Text('Previous Count',
      //                   textAlign: TextAlign.center)),
      //           DataColumn(
      //               label: Text('Updated Count',
      //                   textAlign: TextAlign.center)),
      //           DataColumn(
      //               label:
      //                   Text('Attendant', textAlign: TextAlign.center)),
      //           DataColumn(
      //               label: Text('Date', textAlign: TextAlign.center)),
      //           DataColumn(
      //               label:
      //                   Text('Actions', textAlign: TextAlign.center)),
      //         ],
      //         rows: List.generate(productController.countHistory.length,
      //             (index) {
      //           ProductCountModel productCountModel =
      //               productController.countHistory.elementAt(index);
      //
      //           final y = productCountModel.initialquantity;
      //           final h = productCountModel.quantity;
      //           final z = productCountModel.attendantId?.username;
      //           final w = productCountModel.createdAt;
      //
      //           return DataRow(cells: [
      //             DataCell(Text(y.toString())),
      //             DataCell(Text(h.toString())),
      //             DataCell(Text(z.toString())),
      //             DataCell(Text(DateFormat("yyyy-dd-MMM ").format(w!))),
      //             DataCell(
      //               InkWell(
      //                 onTap: () {
      //                   deleteFunction(
      //                       context, productCountModel, index);
      //                 },
      //                 child: const Icon(
      //                   Icons.more_vert,
      //                   color: Colors.black,
      //                 ),
      //               ),
      //             ),
      //           ]);
      //         }),
      //       ),
      //     ));
    });
  }

  //
  void deleteFunction(
      BuildContext context, CountHistory productModel, int index, data, title) {
    String message = title;
    showDialog(
        context: context,
        builder: (_) {
          return AlertDialog(
            content: Text(message),
            actions: [
              TextButton(
                  onPressed: () {
                    Get.back();
                  },
                  child: const Text("Cancel")),
              TextButton(
                  onPressed: () async {
                    Get.back();
                    await productController.updateQuantity(data,
                        index: index, productId: product!.sId!);
                    await productController
                        .deleteProductCount(productModel.sId!);
                    Get.back();
                  },
                  child: const Text("Ok"))
            ],
          );
        });
  }
}

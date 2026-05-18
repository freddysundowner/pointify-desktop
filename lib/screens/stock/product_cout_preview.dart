import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/stockcontroller.dart';

import '../../models/product.dart';
import '../../utils/colors.dart';
import '../../widgets/minor_title.dart';
import '../../widgets/product_image.dart';

class ProductCountPreview extends StatelessWidget {
  ProductCountPreview({super.key});
  StockController stockController = Get.find<StockController>();
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Stock Count Preview'),
      ),
      body: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10),
        child: Obx(
          () => Column(
            children: [
              Center(
                child: Text(
                  'Products Counted ${stockController.productsCountCart.length}',
                  style:
                       TextStyle(color: AppColors.mainColor, fontSize: 16),
                ),
              ),
              Expanded(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: stockController.productsCountCart.length,
                  itemBuilder: (context, index) {
                    Product product = stockController.productsCountCart[index];
                    return InkWell(
                      onTap: () {
                        stockController.incrementQuantityWidget(
                            context, product);
                      },
                      child: Padding(
                        padding: const EdgeInsets.all(3.0),
                        child: Card(
                          elevation: 1,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(5.0),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: Row(
                              children: [
                                ProductImage(
                                  element: product.images != null &&
                                          product.images!.isNotEmpty
                                      ? product.images![0].path
                                      : "",
                                  radius: 10,
                                  size: 50,
                                ),
                                const SizedBox(
                                  width: 10,
                                ),
                                Expanded(
                                  child: Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.center,
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: <Widget>[
                                      Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            product.name!.capitalizeFirst!,
                                            style:
                                                const TextStyle(fontSize: 16.0),
                                            softWrap: false,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          Text(
                                            "Qty ${product.quantity?.toStringAsFixed(1)}",
                                            style: const TextStyle(
                                                color: Colors.black),
                                          ),
                                        ],
                                      ),
                                      Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.end,
                                        children: [
                                          minorTitle(
                                              title:
                                                  "New Qty  ${product.lastCount?.toStringAsFixed(1)}",
                                              color: AppColors.mainColor),
                                          InkWell(
                                            onTap: () {
                                              stockController.productsCountCart
                                                  .removeAt(index);
                                            },
                                            child: const Icon(
                                              Icons.delete,
                                              color: Colors.red,
                                            ),
                                          )
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
                    );
                  },
                ),
              )
            ],
          ),
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
        child: Obx(
          () => ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.mainColor,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(5),
                ),
              ),
              onPressed: stockController.productsCountCart.isEmpty
                  ? null
                  : () {
                      stockController.countProduct();
                    },
              child: const Text(
                'Submit Count',
                style: TextStyle(color: Colors.white),
              )),
        ),
      ),
    );
  }
}

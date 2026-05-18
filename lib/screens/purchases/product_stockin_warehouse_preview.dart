import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/warehousecontroller.dart';

import '../../models/product.dart';
import '../../models/shop.dart';
import '../../utils/colors.dart';
import '../../widgets/product_image.dart';

class ProductStockinWarehousePreview extends StatelessWidget {
  Shop shop;
  ProductStockinWarehousePreview({super.key, required this.shop});
  WareHouseController wareHouseController = Get.find<WareHouseController>();
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Restock Preview'),
      ),
      body: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10),
        child: Obx(
          () => Column(
            children: [
              Center(
                child: Text(
                  'Products ${wareHouseController.productsCountCart.length}',
                  style:
                       TextStyle(color: AppColors.mainColor, fontSize: 16),
                ),
              ),
              Expanded(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: wareHouseController.productsCountCart.length,
                  itemBuilder: (context, index) {
                    Product product =
                        wareHouseController.productsCountCart[index];
                    return InkWell(
                      onTap: () {
                        wareHouseController.incrementQuantityWidget(context,
                            product: product);
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
                                            "Items : ${product.lastCount?.toStringAsFixed(1)}",
                                            style: const TextStyle(
                                                color: Colors.black),
                                          ),
                                        ],
                                      ),
                                      InkWell(
                                        onTap: () {
                                          wareHouseController.productsCountCart
                                              .removeAt(index);
                                        },
                                        child: const Icon(
                                          Icons.delete,
                                          color: Colors.red,
                                        ),
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
              onPressed: wareHouseController.productsCountCart.isEmpty
                  ? null
                  : () {
                      wareHouseController.productStockinRequest(shop: shop);
                    },
              child: const Text(
                'Submit Request',
                style: TextStyle(color: Colors.white),
              )),
        ),
      ),
    );
  }
}

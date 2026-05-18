import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/functions/functions.dart';
import 'package:pointify/main.dart';
import 'package:pointify/widgets/alert.dart';

import '../../../models/product.dart';
import '../../../widgets/product_image.dart';

Widget productListItemCard(
    {required Product product, required type, Function? function}) {
  return Padding(
    padding: const EdgeInsets.fromLTRB(0, 3, 0, 0),
    child: InkWell(
      onTap: () {
        if (type == "purchase") {
          function!(product);
        } else {
          if (userController
                  .currentUser.value?.primaryShop?.allownegativeselling ==
              false) {
            if ((product.quantity == 0 || product.quantity! < 0) &&
                product.type == 'product') {
              generalAlert(title: "Error", message: "Out of stock");
              return;
            }
          }
          function!(product);
        }
      },
      child: Card(
        child: Container(
          padding: const EdgeInsets.all(10),
          color: Colors.white.withOpacity(0.7),
          width: double.infinity,
          child: Row(
            children: [
              ProductImage(
                element: product.images != null && product.images!.isNotEmpty
                    ? product.images![0].path
                    : "",
                radius: 50,
                size: 50,
              ),
              const SizedBox(
                width: 10,
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            "${product.name}".capitalize!,
                            style: const TextStyle(
                                color: Colors.black, fontSize: 15),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Text(
                          " ${product.measureUnit}".capitalize!,
                          style: const TextStyle(
                              color: Colors.black, fontSize: 13),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                    if (product.manufacturer != "" &&
                        product.manufacturer != null)
                      SizedBox(
                          width: MediaQuery.of(Get.context!).size.width * 0.6,
                          child: Text(
                            "${product.manufacturer}".capitalize!,
                            style: const TextStyle(
                                color: Colors.grey, fontSize: 13),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          )),
                    const SizedBox(
                      height: 5,
                    ),
                    if (product.type == 'product')
                      Text(
                        "@ ${htmlPrice(product.sellingPrice?.toStringAsFixed(2))}, ${product.quantity?.toStringAsFixed(2)} Left",
                        style: const TextStyle(
                            color: Colors.grey,
                            fontSize: 13,
                            fontWeight: FontWeight.bold),
                      ),
                    if (product.type == 'service')
                      Text(
                        "@ ${htmlPrice(product.sellingPrice)}",
                        style: const TextStyle(
                            color: Colors.grey,
                            fontSize: 13,
                            fontWeight: FontWeight.bold),
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
}

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/intl.dart';
import 'package:pointify/main.dart';
import 'package:pointify/widgets/minor_title.dart';
import 'package:pointify/widgets/product_image.dart';

import '../../../controllers/productcontroller.dart';
import '../../../controllers/salescontroller.dart';
import '../../../functions/functions.dart';
import '../../../models/product.dart';
import '../../../utils/colors.dart';
import '../../../widgets/delete_dialog.dart';
import '../create_product.dart';
import '../tabs/receipts_sales.dart';

Widget serviceCard({
  required Product product,
  Function? function,
  type = "",
}) {
  return InkWell(
    onTap: () {
      if (type == "salemodule") {
        function!(product);
      } else {
        showProductModal(Get.context!, product);
      }
    },
    child: Padding(
      padding: const EdgeInsets.all(3.0),
      child: Card(
        color: AppColors.mainColor,
        elevation: 2,
        child: Padding(
          padding: const EdgeInsets.all(8.0),
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
                child: Row(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SizedBox(
                              width:
                                  MediaQuery.of(Get.context!).size.width * 0.4,
                              child: Text(
                                product.name!,
                                style: const TextStyle(
                                    color: Colors.white, fontSize: 16.0),
                                softWrap: false,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(height: 5),
                            minorTitle(
                                title: "By ~ ${product.attendantId?.username}",
                                color: Colors.white,
                                size: 11),
                          ],
                        )
                      ],
                    ),
                    const Spacer(),
                    Row(children: [
                      Column(
                        children: [
                          minorTitle(
                              title:
                                  "Cost/=  ${userController.currentUser.value!.primaryShop?.currency}.${product.sellingPrice}",
                              color: Colors.white),
                          const SizedBox(height: 5),
                          minorTitle(
                              title: product.productCategoryId == null
                                  ? "Uncategorized"
                                  : "Category: ${product.productCategoryId?.name}",
                              color: Colors.white,
                              size: 11),
                        ],
                      ),
                      const SizedBox(width: 10),
                    ])
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

showProductModal(context, Product product) {
  ProductController productController = Get.find<ProductController>();
  SalesController salesController = Get.find<SalesController>();

  return showModalBottomSheet<void>(
      context: context,
      builder: (BuildContext context) {
        return SizedBox(
          height: MediaQuery.of(context).size.height * 0.5,
          child: Column(
            children: [
              if (userController.currentUser.value?.usertype == "admin")
                ListTile(
                    leading: const Icon(Icons.list),
                    onTap: () {
                      Get.back();
                      var firstday =
                          DateFormat("yyy-MM-dd").format(DateTime.now());
                      var lastday =
                          DateFormat("yyy-MM-dd").format(DateTime.now());
                      salesController.getProductSales(
                          product: product.sId,
                          fromDate: firstday,
                          toDate: lastday);
                      salesController.getReturns(
                          product: product,
                          fromDate: firstday,
                          shopid: userController
                              .currentUser.value!.primaryShop!.id!,
                          toDate: lastday,
                          type: "return");

                      Get.to(() => ProductReceiptsSales(
                            product: product,
                            i: DateTime.now().month,
                          ));
                    },
                    title: const Text('Sales')),
              if (verifyPermission(category: "products", permission: "manage"))
                ListTile(
                    leading: const Icon(Icons.edit),
                    onTap: () {
                      Get.back();
                      Get.to(() => CreateProduct(
                            page: "edit",
                            productModel: product,
                          ));
                    },
                    title: const Text('Edit')),
              if (verifyPermission(category: "products", permission: "manage"))
                ListTile(
                    leading: const Icon(Icons.delete),
                    onTap: () {
                      deleteDialog(
                          context: context,
                          onPressed: () {
                            productController.deleteProduct(
                              product: product,
                            );
                          });
                    },
                    title: const Text('Delete')),
              ListTile(
                  leading: const Icon(Icons.clear),
                  onTap: () {
                    Get.back();
                  },
                  title: const Text('Close')),
            ],
          ),
        );
      });
}

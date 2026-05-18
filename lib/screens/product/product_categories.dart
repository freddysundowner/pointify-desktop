import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/models/productcategory.dart';
import 'package:pointify/utils/colors.dart';
import 'package:pointify/widgets/textbutton.dart';

import '../../controllers/productcontroller.dart';
import '../../widgets/major_title.dart';

class ProductCategories extends StatelessWidget {
  ProductCategories({super.key}) {
    productController.getProductCategiories();
  }

  final ProductController productController = Get.find<ProductController>();
  Widget searchWidget() {
    return TextFormField(
      controller: productController.searchProductController,
      onChanged: (value) {
        if (value == "") {
          productController.getProductsBySort(
            type: "all",
          );
        } else {
          productController.getProductsBySort(
              type: "search",
              text: productController.searchProductController.text);
        }
      },
      decoration: InputDecoration(
        contentPadding: const EdgeInsets.fromLTRB(10, 2, 10, 2),
        suffixIcon: IconButton(
          onPressed: () {
            productController.getProductsBySort(
                type: "search",
                text: productController.searchProductController.text);
          },
          icon: const Icon(Icons.search),
        ),
        hintText: "Quick Search",
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        title: majorTitle(
            title: "Select Category", color: Colors.black, size: 16.0),
        elevation: 0.5,
        leading: IconButton(
            onPressed: () {
              Get.back();
            },
            icon: const Icon(Icons.arrow_back_ios, color: Colors.black)),
        actions: [
          IconButton(
              onPressed: () {
                showDialog(
                    context: Get.context!,
                    builder: (context) {
                      return AlertDialog(
                        title: const Text(
                          "Category name",
                          style: TextStyle(fontSize: 16),
                        ),
                        content: Padding(
                          padding: const EdgeInsets.all(5.0),
                          child: TextFormField(
                              controller: productController.categoryName,
                              decoration: InputDecoration(
                                  border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(10),
                              ))),
                        ),
                        actions: [
                          TextButton(
                            onPressed: () {
                              Navigator.pop(context);
                            },
                            child: Text(
                              "Cancel".toUpperCase(),
                              style: const TextStyle(color: Colors.blue),
                            ),
                          ),
                          TextButton(
                            onPressed: () {
                              Navigator.pop(context);
                              productController.createCategory();
                            },
                            child: Text(
                              "Add".toUpperCase(),
                              style: const TextStyle(color: Colors.blue),
                            ),
                          ),
                        ],
                      );
                    });
              },
              icon: const Icon(Icons.add_circle_outline))
        ],
      ),
      body: Column(
        children: [
          Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
              child: searchWidget()),
          Expanded(
            child: Obx(
              () => productController.loadingproductCategories.isTrue
                  ? const Center(
                      child: CircularProgressIndicator(),
                    )
                  : ListView.builder(
                      itemCount: productController.productCategories.length,
                      shrinkWrap: true,
                      itemBuilder: (BuildContext context, int index) {
                        ProductCategory category = productController
                            .productCategories
                            .elementAt(index);

                        return Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10.0, vertical: 15),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(category.name!),
                              textBtn(
                                  text: "Select",
                                  onPressed: () {
                                    productController.selecteProductCategoty
                                        .value = category;
                                    Get.back();
                                  },
                                  vPadding: 10,
                                  hPadding: 10,
                                  fontSize: 16,
                                  color: Colors.black,
                                  bgColor: AppColors.lightDeepPurple)
                            ],
                          ),
                        );
                      }),
            ),
          ),
        ],
      ),
    );
  }
}

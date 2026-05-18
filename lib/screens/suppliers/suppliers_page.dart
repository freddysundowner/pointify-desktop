import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/controllers/purchase_controller.dart';
import 'package:pointify/screens/suppliers/create_suppliers.dart';
import 'package:pointify/screens/suppliers/supplier_info_page.dart';
import 'package:pointify/widgets/no_items_found.dart';

import '../../controllers/customercontroller.dart';
import '../../controllers/productcontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../controllers/suppliercontroller.dart';
import '../../functions/functions.dart';
import '../../main.dart';
import '../../models/supplier.dart';
import '../../utils/colors.dart';
import '../../widgets/major_title.dart';
import '../../widgets/minor_title.dart';
import '../../widgets/textbutton.dart';

class SuppliersPage extends StatelessWidget {
  SuppliersPage({Key? key}) : super(key: key) {
    supplierController.getSuppliers("all");
  }

  final ShopController createShopController = Get.find<ShopController>();
  final CustomerController customerController = Get.find<CustomerController>();
  final CustomerController customersController = Get.find<CustomerController>();
  final ShopController shopController = Get.find<ShopController>();
  final SupplierController supplierController = Get.find<SupplierController>();

  @override
  Widget build(BuildContext context) {
    return defaultTab(context);
  }

  Widget defaultTab(context) {
    return DefaultTabController(
      length: 2,
      initialIndex: 0,
      child: Scaffold(
        appBar: AppBar(
          backgroundColor: Colors.white,
          titleSpacing: 0.0,
          elevation: 0.3,
          centerTitle: false,
          leading: IconButton(
            onPressed: () {
              Get.back();
            },
            icon: const Icon(
              Icons.arrow_back_ios,
              color: Colors.black,
            ),
          ),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              majorTitle(title: "Supplier", color: Colors.black, size: 16.0),
              minorTitle(
                  title:
                      "${userController.currentUser.value?.primaryShop?.name}",
                  color: Colors.grey)
            ],
          ),
          actions: [
            if (verifyPermission(category: "suppliers", permission: "manage"))
              InkWell(
                onTap: () {
                  Get.to(() => CreateSuppliers(
                        page: "suppliersPage",
                      ));
                },
                child: Padding(
                  padding: const EdgeInsets.all(10),
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(5, 2, 5, 2),
                    decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: (BorderRadius.circular(10)),
                        border:
                            Border.all(color: AppColors.mainColor, width: 1)),
                    child: Center(
                      child: majorTitle(
                          title: "Add Supplier",
                          color: AppColors.mainColor,
                          size: 12.0),
                    ),
                  ),
                ),
              )
          ],
          bottom: TabBar(
            indicatorColor: AppColors.mainColor,
            labelColor: AppColors.mainColor,
            unselectedLabelColor: Colors.grey,
            onTap: (value) {
              if (value == 1) {
                supplierController.filteredSuppliers.value = supplierController
                    .suppliers
                    .where((p0) => p0.totalDebt! > 0)
                    .toList();
              } else {
                supplierController.filteredSuppliers.value =
                    supplierController.suppliers;
              }
            },
            tabs: const [
              Tab(text: "All"),
              Tab(text: "Debtors"),
            ],
          ),
        ),
        body: TabBarView(
          physics: const NeverScrollableScrollPhysics(),
          children: [
            Suppliers(
              from: "all",
            ),
            Suppliers(
              from: "debtors",
            )
          ],
        ),
      ),
    );
  }
}

class Suppliers extends StatelessWidget {
  Suppliers({super.key, this.from = "", this.function});
  final CustomerController customersController = Get.find<CustomerController>();
  final ShopController shopController = Get.find<ShopController>();
  final SupplierController supplierController = Get.find<SupplierController>();
  final String? from;
  final Function? function;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Padding(
        padding: const EdgeInsets.only(top: 5),
        child: Column(
          children: [
            if (from == "addproduct" || from == "purchases")
              Column(
                children: [
                  const SizedBox(height: 40),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    child: Row(
                      children: [
                        IconButton(
                          icon: const Icon(
                            Icons.arrow_back_ios_new_rounded,
                            color: Colors.black,
                          ),
                          onPressed: () {
                            Get.back();
                          },
                        ),
                        Expanded(
                          child: majorTitle(
                            title: "Select Supplier",
                            color: Colors.black,
                            size: 16.0,
                          ),
                        ),
                        InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: () async {
                            await Get.to(
                              () => CreateSuppliers(
                                page: "purchases",
                              ),
                            );

                            supplierController.getSuppliers("all");
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.mainColor,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Row(
                              children: [
                                Icon(
                                  Icons.add,
                                  color: Colors.white,
                                  size: 15,
                                ),
                                SizedBox(width: 4),
                                Text(
                                  "Add",
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w700,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                ],
              ),
            Container(
              padding: const EdgeInsets.all(10),
              child: TextFormField(
                controller: supplierController.supplierController,
                onChanged: (value) {
                  if (value.isEmpty) {
                    if (supplierController.sType.value == 'debtors') {
                      supplierController.filteredSuppliers.value =
                          supplierController.suppliers
                              .where((p0) => p0.totalDebt! > 0)
                              .toList();
                    } else {
                      supplierController.filteredSuppliers.value =
                          supplierController.suppliers;
                    }
                  } else {
                    supplierController.filteredSuppliers.value =
                        supplierController.suppliers
                            .where((element) =>
                                element.name
                                    .toString()
                                    .trim()
                                    .contains(value.toString().toString()) ||
                                element.phoneNumber
                                    .toString()
                                    .trim()
                                    .contains(value.toString().toString()))
                            .toList();
                  }
                },
                decoration: InputDecoration(
                  contentPadding: const EdgeInsets.fromLTRB(10, 2, 10, 2),
                  suffixIcon: IconButton(
                    onPressed: () {
                      if (supplierController.sType.value == 'debtors') {
                        supplierController.filteredSuppliers.value =
                            supplierController.suppliers
                                .where((p0) => p0.totalDebt! > 0)
                                .toList();
                      } else {
                        supplierController.filteredSuppliers.value =
                            supplierController.suppliers;
                      }
                      supplierController.supplierController.clear();
                    },
                    icon: const Icon(Icons.clear),
                  ),
                  hintText: "Quick Search",
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ),
            Expanded(
              child: Obx(() => supplierController.loadingsuppliers.isTrue
                  ? const Center(
                      child: CircularProgressIndicator(),
                    )
                  : supplierController.filteredSuppliers.isEmpty
                      ? noItemsFound(context, true)
                      : ListView.builder(
                          padding: EdgeInsets.zero,
                          itemCount:
                              supplierController.filteredSuppliers.length,
                          itemBuilder: (context, index) {
                            Supplier supplierModel = supplierController
                                .filteredSuppliers
                                .elementAt(index);
                            return InkWell(
                              onTap: () {
                                if (function == null) {
                                  Get.to(() => SupplierInfoPage(
                                        supplierModel: supplierModel,
                                      ));
                                } else {
                                  function!(supplierModel);
                                }
                              },
                              child: Card(
                                  child: Container(
                                padding: const EdgeInsets.all(10),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Row(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          const Icon(
                                            Icons.person_outline,
                                            color: Colors.black,
                                          ),
                                          const SizedBox(width: 10),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                majorTitle(
                                                    title:
                                                        "Name: ${supplierModel.name}",
                                                    color: Colors.black,
                                                    size: 15.0),
                                                const SizedBox(
                                                  height: 10,
                                                ),
                                              ],
                                            ),
                                          )
                                        ],
                                      ),
                                    ),
                                    from == "purchases" || from == "addproduct"
                                        ? textBtn(
                                            text: "Select",
                                            onPressed: () {
                                              Get.back();
                                              if (from == "purchases") {
                                                Get.find<PurchaseController>()
                                                    .selectedSupplierController
                                                    .text = supplierModel.name!;
                                                Get.find<PurchaseController>()
                                                    .selectedSupplier
                                                    .value = supplierModel;
                                              } else {
                                                Get.find<ProductController>()
                                                    .pickedSupplier
                                                    .value = supplierModel;
                                              }
                                              if (function != null) {
                                                function!(supplierModel);
                                              }
                                            })
                                        : Column(
                                            children: [
                                              const SizedBox(
                                                height: 10,
                                              ),
                                              if (supplierModel.totalDebt! > 0)
                                                Container(
                                                  decoration: BoxDecoration(
                                                      border: Border.all(
                                                          color: Colors.red),
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                              5)),
                                                  padding: const EdgeInsets
                                                      .symmetric(
                                                      horizontal: 5,
                                                      vertical: 2),
                                                  child: minorTitle(
                                                      title:
                                                          "Unpaid ${htmlPrice(supplierModel.totalDebt)}",
                                                      color: Colors.red),
                                                ),
                                            ],
                                          )
                                  ],
                                ),
                              )),
                            );
                          })),
            ),
          ],
        ),
      ),
    );
  }
}

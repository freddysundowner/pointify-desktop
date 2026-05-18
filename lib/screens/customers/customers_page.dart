import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:pointify/main.dart';
import 'package:pointify/screens/customers/create_customers.dart';
import 'package:pointify/widgets/no_items_found.dart';

import '../../controllers/customercontroller.dart';
import '../../controllers/salescontroller.dart';
import '../../controllers/shopcontroller.dart';
import '../../controllers/suppliercontroller.dart';
import '../../functions/functions.dart';
import '../../models/customer.dart';
import '../../utils/colors.dart';
import '../../widgets/alert.dart';
import '../../widgets/customer_card.dart';
import '../../widgets/major_title.dart';
import '../../widgets/minor_title.dart';

enum MenuAction { archive, delete, block, report }

class CustomersPage extends StatelessWidget {
  CustomersPage({Key? key}) : super(key: key);

  final ShopController createShopController = Get.find<ShopController>();
  final CustomerController customerController = Get.find<CustomerController>();
  final CustomerController customersController = Get.find<CustomerController>();
  final ShopController shopController = Get.find<ShopController>();
  final SupplierController supplierController = Get.find<SupplierController>();
  void handleMenuAction(MenuAction value) {
    switch (value) {
      case MenuAction.archive:
        // Handle archive action
        break;
      case MenuAction.delete:
        // Handle delete action
        break;
      case MenuAction.block:
        // Handle block action
        break;
      case MenuAction.report:
        // Handle report action
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
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
              majorTitle(title: "Customer", color: Colors.black, size: 16.0),
              minorTitle(
                  title:
                      "${userController.currentUser.value?.primaryShop?.name}",
                  color: Colors.grey)
            ],
          ),
          actions: [
            InkWell(
              onTap: () {
                Get.to(() => CreateCustomer(
                      page: "customersPage",
                    ));
              },
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Container(
                  padding: const EdgeInsets.fromLTRB(5, 2, 5, 2),
                  decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: (BorderRadius.circular(10)),
                      border: Border.all(color: AppColors.mainColor, width: 1)),
                  child: Center(
                    child: majorTitle(
                        title: "Add Customer",
                        color: AppColors.mainColor,
                        size: 12.0),
                  ),
                ),
              ),
            ),
            PopupMenuButton<MenuAction>(
              onSelected: (value) => handleMenuAction(value),
              itemBuilder: (BuildContext context) =>
                  <PopupMenuEntry<MenuAction>>[
                PopupMenuItem<MenuAction>(
                  value: MenuAction.archive,
                  child: InkWell(
                    onTap: () async {
                      List<List<Object?>> data = [
                        ['Name', 'Contacts', 'Total Debt', "Account Balance"],
                      ];

                      data.addAll(customersController.customers
                          .map((element) => [
                                element.name,
                                element.phoneNumber,
                                element.totalDebt,
                                element.wallet
                              ])
                          .toList());

                      String? filePath = await exportToExcel(data, "customers");
                      await openFile(filePath!);
                      Get.back();
                    },
                    child: const ListTile(
                      title: Text('Export to xls'),
                    ),
                  ),
                ),
                PopupMenuItem<MenuAction>(
                  value: MenuAction.delete,
                  child: InkWell(
                    onTap: () async {
                      FilePickerResult? result = await pickExcelFile();
                      if (result != null) {
                        List<List<String>>? excelData =
                            await readExcel(result.files.single.path!);
                        if (excelData.isNotEmpty) {
                          Get.find<CustomerController>()
                              .importCustomers(excelData);
                        } else {
                          generalAlert(
                              message:
                                  "No data found or document is of wrong type, make sure its of type xlsx",
                              title: "Error");
                        }
                      }
                    },
                    child: const ListTile(
                      title: Text('Import from xls'),
                    ),
                  ),
                ),
              ],
            ),
          ],
          bottom: TabBar(
            indicatorColor: AppColors.mainColor,
            labelColor: AppColors.mainColor,
            unselectedLabelColor: Colors.grey,
            onTap: (value) {
              customersController
                  .getCustomersInShop(value == 0 ? "all" : "debtors");
            },
            tabs: const [
              Tab(text: "All"),
              Tab(text: "Creditors"),
            ],
          ),
        ),
        body: TabBarView(
          physics: const NeverScrollableScrollPhysics(),
          children: [
            Customers(
              type: "",
            ),
            Debtors(
              type: "",
            )
          ],
        ),
      ),
    );
  }
}

class Customers extends StatelessWidget {
  final String type;
  final Function? function;

  Customers({Key? key, required this.type, this.function}) : super(key: key);
  final CustomerController customersController = Get.find<CustomerController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: type == "sale"
          ? AppBar(
              backgroundColor: Colors.white,
              title: majorTitle(
                  title: "Select Customer", color: Colors.black, size: 16.0),
              elevation: 0.5,
              leading: IconButton(
                  onPressed: () {
                    Get.back();
                  },
                  icon: const Icon(Icons.arrow_back_ios, color: Colors.black)),
              actions: [
                // if (verifyPermission(category: "customers", permission: "add"))
                InkWell(
                  onTap: () {
                    Get.to(() => CreateCustomer(
                          page: "customersPage",
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
                            title: "Add Customer",
                            color: AppColors.mainColor,
                            size: 12.0),
                      ),
                    ),
                  ),
                )
              ],
            )
          : null,
      body: Padding(
        padding: const EdgeInsets.only(top: 5),
        child: Obx(() => customersController.gettingCustomersLoad.isTrue
            ? const Center(
                child: CircularProgressIndicator(),
              )
            : Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    child: TextFormField(
                      controller: customersController.searchCustomerController,
                      onChanged: (value) {
                        if (value.isEmpty) {
                          customersController.filteredCustomers.value =
                              customersController.customers;
                        } else {
                          customersController.filteredCustomers.value =
                              customersController.customers
                                  .where((element) =>
                                      element.name
                                          .toString()
                                          .toLowerCase()
                                          .trim()
                                          .contains(
                                              value.toLowerCase().toString()) ||
                                      element.phoneNumber
                                          .toString()
                                          .trim()
                                          .toLowerCase()
                                          .contains(
                                              value.toString().toLowerCase()))
                                  .toList();
                        }
                      },
                      decoration: InputDecoration(
                        contentPadding: const EdgeInsets.fromLTRB(10, 2, 10, 2),
                        suffixIcon: IconButton(
                          onPressed: () {
                            customersController.filteredCustomers.value =
                                customersController.customers;
                            customersController.searchCustomerController
                                .clear();
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
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (customersController.filteredCustomers.isEmpty)
                          Center(
                            child: InkWell(
                              onTap: () {
                                Get.to(() => CreateCustomer(
                                      page: "customersPage",
                                    ));
                              },
                              child:  Column(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    "Add",
                                    style: TextStyle(
                                        color: AppColors.mainColor,
                                        fontSize: 21),
                                  ),
                                  Icon(
                                    Icons.add_circle_outline_outlined,
                                    size: 60,
                                    color: AppColors.mainColor,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        if (customersController.filteredCustomers.isEmpty)
                          Expanded(child: noItemsFound(context, true)),
                        if (customersController.filteredCustomers.isNotEmpty)
                          Expanded(
                            child: ListView.builder(
                                itemCount: customersController
                                    .filteredCustomers.length,
                                itemBuilder: (context, index) {
                                  Customer customerModel = customersController
                                      .filteredCustomers
                                      .elementAt(index);
                                  return customerWidget(
                                      customerModel: customerModel,
                                      context: context,
                                      function: (customerModel) {
                                        if (type == "sale") {
                                          if (customerModel.creditLimit != 0 &&
                                              customerModel.creditLimit! <
                                                  Get.find<SalesController>()
                                                      .receipt
                                                      .value!
                                                      .totalWithDiscount!) {
                                            Get.find<SalesController>()
                                                .currentCustomer
                                                .value = null;
                                            generalAlert(
                                              title: "Error",
                                              message: "Credit limit exceeded",
                                            );
                                            return;
                                          }
                                        }
                                        if (function != null) {
                                          function!(customerModel);
                                        }
                                      },
                                      type: type);
                                }),
                          )
                      ],
                    ),
                  ),
                ],
              )),
      ),
    );
  }
}

class Debtors extends StatelessWidget {
  final String type;

  Debtors({Key? key, required this.type}) : super(key: key);
  final CustomerController customersController = Get.find<CustomerController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Padding(
        padding: const EdgeInsets.only(top: 5),
        child: Obx(() {
          return customersController.gettingCustomersLoad.value
              ? const Center(
                  child: CircularProgressIndicator(),
                )
              : customersController.filteredCustomers.isEmpty
                  ? noItemsFound(context, true)
                  : ListView.builder(
                      itemCount: customersController.filteredCustomers.length,
                      itemBuilder: (context, index) {
                        Customer customerModel = customersController
                            .filteredCustomers
                            .elementAt(index);
                        return customerWidget(
                            customerModel: customerModel,
                            context: context,
                            type: type);
                      });
        }),
      ),
    );
  }
}
